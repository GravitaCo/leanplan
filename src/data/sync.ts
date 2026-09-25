/**
 * Offline-first sync engine. localStorage is the instant working store; writes mark
 * records dirty and, when online, upsert to Supabase. On load/reconnect we pull and
 * merge with last-write-wins per record. Ported from the LeanPlan vanilla app and kept
 * framework-agnostic so it can back a native client later.
 */
import type { DayLog, Food, Recipe } from '@/core/types'
import { sbGet, sbUpsert, sbDelete, getUid, nowIso, uuid, HttpError, UUID_RE } from './supabase'
import type { AccountRows, PersistedState, SyncMeta } from './persistence'

/* ---- client <-> server row mapping ---- */

/**
 * Send custom foods' extra fields (per-item, source, category, barcode …) in the additive
 * `custom_foods.meta` jsonb column (docs/migrations/2026-09-custom-foods-meta.sql). Off until that
 * migration is applied: PostgREST rejects an upsert naming a column that doesn't exist, so turning
 * this on early would stop every custom food syncing. The fields persist on the device either way,
 * and a pull never drops them (see pullAll).
 */
export const CUSTOM_FOOD_META = false

/** The Food fields that travel in `meta` (everything the named columns don't hold). */
const FOOD_META_KEYS = ['each', 'src', 'ref', 'cat', 'cook', 'barcode'] as const
type FoodMeta = Partial<Pick<Food, (typeof FOOD_META_KEYS)[number]>>

function foodMeta(f: Food): FoodMeta | null {
  const m: Record<string, unknown> = {}
  for (const k of FOOD_META_KEYS) if (f[k] !== undefined && f[k] !== false) m[k] = f[k]
  return Object.keys(m).length ? (m as FoodMeta) : null
}

export function toServerFood(f: Food, uid: string, withMeta = CUSTOM_FOOD_META) {
  const row = {
    id: f.id,
    user_id: uid,
    name: f.n,
    kcal: +f.k || 0,
    protein: +f.p || 0,
    carbs: +f.c || 0,
    fat: +f.f || 0,
    grams: +f.g || 100,
    ml: !!f.ml,
  }
  // always an object, so clearing a field (e.g. a barcode) clears it on the server too
  return withMeta ? { ...row, meta: foodMeta(f) ?? {} } : row
}
export function fromServerFood(r: any): Food {
  const f: Food = { id: r.id, n: r.name, k: r.kcal, p: r.protein, c: r.carbs, f: r.fat, g: r.grams, ml: !!r.ml, _u: r.updated_at, _dirty: false }
  const m = hasMeta(r) ? r.meta : null
  if (m) for (const k of FOOD_META_KEYS) if (m[k] !== undefined && m[k] !== null) (f as any)[k] = m[k]
  return f
}
const hasMeta = (r: any) => !!r.meta && typeof r.meta === 'object' && !Array.isArray(r.meta)
/* day_logs has no check-in column, so the check-in travels inside the supps jsonb under a
   reserved key and is unpacked on pull. Additive: no table or column changes. */
const CHECKIN_KEY = '_checkin'
function toServerDay(s: PersistedState, d: string, uid: string) {
  const x = s.days[d] || { foods: [], supps: {}, weight: null, workout: null }
  const supps = x.checkin ? { ...(x.supps || {}), [CHECKIN_KEY]: x.checkin } : x.supps || {}
  // sessions: an additive day_logs column (workout plan P2); workout stays as the legacy mirror
  return { user_id: uid, log_date: d, foods: x.foods || [], supps, weight: x.weight ?? null, workout: x.workout ?? null, sessions: Array.isArray(x.sessions) ? x.sessions : null }
}
function fromServerDay(row: any): DayLog {
  const { [CHECKIN_KEY]: checkin, ...supps } = row.supps || {}
  const day: DayLog = { foods: row.foods || [], supps, weight: row.weight ?? null, workout: row.workout || null, checkin: checkin || null }
  if (Array.isArray(row.sessions)) day.sessions = row.sessions
  return day
}
function toServerRecipe(r: Recipe, uid: string) {
  return { id: r.id, user_id: uid, name: r.name, items: r.items || [], servings: +r.servings || 1 }
}
function fromServerRecipe(r: any): Recipe {
  return { id: r.id, name: r.name, items: r.items || [], servings: +r.servings || 1, _u: r.updated_at, _dirty: false }
}

type Undo = () => void

/** A refusal of the whole request (signed-out token, rate limit, server trouble), as opposed to
 *  one record the server won't take: retrying record by record would only repeat it N times, so
 *  the table's step fails once and its records wait for the next sync. */
const wholeRequest = (e: HttpError) => e.status === 401 || e.status === 429 || e.status >= 500

/**
 * Upsert records in one request; if the server rejects it, retry them one by one so a single bad
 * record can't hold up the rest. `fix` may repair a rejected record (new id) and return how to
 * undo that if the retry still fails, so a record is only changed when the server accepts it.
 * Throws the last rejection once the others are through; a lost connection throws at once.
 */
async function upsertEach<T>(
  table: string, items: T[], row: (x: T) => object, onConflict: string, done: (x: T) => void,
  fix?: (x: T, e: HttpError) => Promise<Undo | null>,
): Promise<void> {
  if (!items.length) return
  try {
    await sbUpsert(table, items.map(row), onConflict)
    items.forEach(done)
    return
  } catch (e) {
    if (!(e instanceof HttpError) || wholeRequest(e)) throw e
  }
  let last: HttpError | null = null
  for (const x of items) {
    const undos: Undo[] = []
    for (;;) {
      try {
        await sbUpsert(table, [row(x)], onConflict)
        done(x)
        break
      } catch (e) {
        if (!(e instanceof HttpError)) throw e
        if (wholeRequest(e)) { undos.reverse().forEach((u) => u()); throw e }
        const undo = undos.length < 2 && fix ? await fix(x, e) : null
        if (undo) { undos.push(undo); continue }
        undos.reverse().forEach((u) => u())
        last = e
        break
      }
    }
  }
  if (last) throw last
}

/**
 * Repairs for a rejected custom food or recipe:
 * - 409: the (user_id, lower(name)) unique index says this account already has that name under
 *   another id (restored backup, re-created on another device). Adopt the server's id so this
 *   record overwrites it: last write wins by name, as food names are stable ids here.
 * - 403: RLS refused the id, so it belongs to another account (someone else's backup). Only
 *   when this account can't see that id do we give the record a fresh one.
 */
function repairs<T extends { id?: string }>(table: string, nameOf: (x: T) => string, uid: string, deletes: string[], local: T[]) {
  let names: { id: string; name: string }[] | null = null
  return async (x: T, e: HttpError): Promise<Undo | null> => {
    const was = x.id
    if (e.status === 409) {
      names ??= await sbGet<{ id: string; name: string }[]>('/' + table + '?user_id=eq.' + uid + '&select=id,name')
      const key = nameOf(x).toLowerCase()
      const hit = names.find((r) => r.id !== x.id && (r.name || '').toLowerCase() === key)
      // another local record already holds that id: adopting it would make one overwrite the
      // other (and the pull keep only one), so leave this one dirty and report it instead
      if (!hit || local.some((o) => o !== x && o.id === hit.id)) return null
      x.id = hit.id
      const i = deletes.indexOf(hit.id)
      if (i >= 0) deletes.splice(i, 1)
      return () => { x.id = was; if (i >= 0) deletes.splice(i, 0, hit.id) }
    }
    if (e.status === 403 && x.id) {
      const seen = await sbGet<unknown[]>('/' + table + '?id=eq.' + encodeURIComponent(x.id) + '&select=id')
      if (seen.length) return null // ours, so the refusal is about something else
      x.id = uuid()
      return () => { x.id = was }
    }
    return null
  }
}

/**
 * Push every dirty record. The log (days) and settings go first, then each other table in its
 * own step, so one rejected record can't block the rest or the pull that follows. Rejected
 * records stay dirty and are returned as messages; a lost connection throws.
 */
export async function pushDirty(s: PersistedState, meta: SyncMeta): Promise<string[]> {
  const uid = getUid()
  const failed: string[] = []
  const step = async (what: string, fn: () => Promise<void>): Promise<boolean> => {
    try {
      await fn()
      return true
    } catch (e) {
      if (!(e instanceof HttpError)) throw e
      failed.push(what + ': ' + e.message)
      return false
    }
  }
  const dirtyDays = Object.keys(meta.days).filter((d) => meta.days[d].dirty)
  await step('days', () => upsertEach('day_logs', dirtyDays, (d) => toServerDay(s, d, uid), 'user_id,log_date', (d) => (meta.days[d].dirty = false)))
  if (meta.settings.dirty) {
    await step('settings', async () => {
      await sbUpsert('settings', [{ user_id: uid, target: s.target, schedule: s.schedule, profile: s.profile }], 'user_id')
      meta.settings.dirty = false
    })
  }
  // Deletes before upserts: a food deleted and re-created under the same name would otherwise
  // hit the name index while the old row is still there.
  const deletes = async (table: string, list: 'foodDeletes' | 'recipeDeletes') => {
    for (const id of [...meta[list]]) {
      // an id the server can't hold (old fallback ids) was never uploaded: nothing to delete
      const gone = !UUID_RE.test(id) || (await step(table + ' delete', () => sbDelete(table, 'id=eq.' + encodeURIComponent(id))))
      if (!gone) break // the rest wait for the next sync rather than failing one by one
      meta[list] = meta[list].filter((x) => x !== id)
    }
  }
  await deletes('custom_foods', 'foodDeletes')
  await deletes('recipes', 'recipeDeletes')
  const dirtyFoods = (s.customFoods || []).filter((f) => f._dirty)
  await step('custom foods', () => upsertEach('custom_foods', dirtyFoods, (f) => toServerFood(f, uid), 'id', (f) => (f._dirty = false), repairs('custom_foods', (f: Food) => f.n, uid, meta.foodDeletes, s.customFoods)))
  const dirtyRecipes = (s.recipes || []).filter((r) => r._dirty)
  await step('recipes', () => upsertEach('recipes', dirtyRecipes, (r) => toServerRecipe(r, uid), 'id', (r) => (r._dirty = false), repairs('recipes', (r: Recipe) => r.name, uid, meta.recipeDeletes, s.recipes)))
  return failed
}

export async function pullAll(s: PersistedState, meta: SyncMeta): Promise<void> {
  const uid = getUid()
  const settings = await sbGet<any[]>('/settings?user_id=eq.' + uid + '&select=*')
  if (settings.length && !meta.settings.dirty) {
    s.target = settings[0].target
    s.schedule = settings[0].schedule
    if (settings[0].profile) {
      // keep the earliest D5 switch date across devices (and one from an older app version's
      // copy that lacks it), so days between two dates never flip back and forth
      const sw = s.profile.burnSwitch
      s.profile = settings[0].profile
      if (sw && (!s.profile.burnSwitch || sw < s.profile.burnSwitch)) { s.profile.burnSwitch = sw; meta.settings.dirty = true }
    }
    meta.settings.u = settings[0].updated_at
  }
  const cf = await sbGet<any[]>('/custom_foods?user_id=eq.' + uid + '&select=*')
  const byId: Record<string, Food> = {}
  const local = new Map((s.customFoods || []).map((f) => [f.id, f]))
  cf.forEach((row) => {
    const f = fromServerFood(row)
    if (!f.id) return
    // a row without `meta` (the column isn't there yet, or an older version wrote it) keeps this
    // device's extra fields for the same food, so a pull never strips a scan's barcode or source
    const mine = local.get(f.id)
    if (mine && !hasMeta(row)) for (const k of FOOD_META_KEYS) if (mine[k] !== undefined) (f as any)[k] = mine[k]
    byId[f.id] = f
  })
  ;(s.customFoods || []).filter((f) => f._dirty).forEach((f) => { if (f.id) byId[f.id] = f })
  s.customFoods = Object.values(byId)

  const rc = await sbGet<any[]>('/recipes?user_id=eq.' + uid + '&select=*')
  const rById: Record<string, Recipe> = {}
  rc.map(fromServerRecipe).forEach((r) => { rById[r.id] = r })
  ;(s.recipes || []).filter((r) => r._dirty).forEach((r) => { rById[r.id] = r })
  s.recipes = Object.values(rById)

  const dl = await sbGet<any[]>('/day_logs?user_id=eq.' + uid + '&select=*')
  dl.forEach((row) => {
    const d = row.log_date
    if (meta.days[d] && meta.days[d].dirty) return // keep unpushed local day
    s.days[d] = fromServerDay(row)
    meta.days[d] = { u: row.updated_at, dirty: false }
  })
  meta.lastPull = nowIso()
}

/** The rows sameAccount compares, read with a session that isn't applied yet. */
export async function accountRows(uid: string, token: string): Promise<AccountRows> {
  const q = '?user_id=eq.' + uid + '&select='
  const [days, foods, recipes] = await Promise.all([
    sbGet<AccountRows['days']>('/day_logs' + q + 'log_date,updated_at', token),
    sbGet<AccountRows['foods']>('/custom_foods' + q + 'id', token),
    sbGet<AccountRows['recipes']>('/recipes' + q + 'id', token),
  ])
  return { days, foods, recipes }
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error'
