/**
 * Offline-first sync engine. localStorage is the instant working store; writes mark
 * records dirty and, when online, upsert to Supabase. On load/reconnect we pull and
 * merge with last-write-wins per record. Ported from the LeanPlan vanilla app and kept
 * framework-agnostic so it can back a native client later.
 */
import type { DayLog, Food, Profile, Recipe, Routine, TrainingPlan } from '@/core/types'
import { sbGet, sbUpsert, sbDelete, getUid, nowIso, uuid, HttpError, UUID_RE } from './supabase'
import type { AccountRows, PersistedState, SyncMeta } from './persistence'
import { cleanPhases } from '@/core/domain/plans'
import { pushConsents, pullConsents, latestConsent, healthSyncPaused, holdHealth, profileHealth, withProfileHealth } from './consent'

/* ---- client <-> server row mapping ---- */

/**
 * Send custom foods' extra fields (per-item, source, category, barcode …) in the additive
 * `custom_foods.meta` jsonb column (docs/migrations/2026-09-custom-foods-meta.sql, applied
 * 26 Sept 2026). Once any build with this on has shipped, never drop the column: installed apps
 * still running it would 400 on every custom-food upsert. To roll back, turn this off and deploy
 * first. A pull never drops a device's fields when a row has no meta (see fromServerFood).
 */
export const CUSTOM_FOOD_META = true

/** The Food fields that travel in `meta` (everything the named columns don't hold). */
const FOOD_META_KEYS = ['each', 'src', 'ref', 'cat', 'cook', 'barcode', 'eat'] as const
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
/**
 * `held`: health sync is paused (consent.ts HealthPause). The row then has no `weight` column, so
 * the server keeps the weight it has (an upsert only sets the columns it sends), and its check-in
 * is the server's own (`serverCheckin`, read just before), never this device's.
 */
export function toServerDay(s: PersistedState, d: string, uid: string, held?: { serverCheckin: unknown }) {
  const x = s.days[d] || { foods: [], supps: {}, weight: null, workout: null }
  const checkin = held ? held.serverCheckin : x.checkin
  const { [CHECKIN_KEY]: _drop, ...own } = (x.supps || {}) as Record<string, unknown>
  void _drop
  const supps = checkin ? { ...own, [CHECKIN_KEY]: checkin } : own
  // sessions: an additive day_logs column (workout plan P2); workout stays as the legacy mirror
  const row = { user_id: uid, log_date: d, foods: x.foods || [], supps, weight: x.weight ?? null, workout: x.workout ?? null, sessions: Array.isArray(x.sessions) ? x.sessions : null }
  if (!held) return row
  const { weight: _w, ...rest } = row
  void _w
  return rest
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
/* training_plans: weekly plans (plan P5), one row each like routines; never hard-deleted */
function toServerPlan(p: TrainingPlan, uid: string) {
  return {
    id: p.id, user_id: uid, name: p.name, source: p.source === 'recommended' ? 'recommended' : 'custom', state: p.state,
    phases: Array.isArray(p.phases) ? p.phases : [], started_at: p.startedAt ?? null, completed_at: p.completedAt ?? null,
    reflection: p.reflection ?? null, base_template_id: p.baseTemplateId ?? null, cloned_from_id: p.clonedFromId ?? null,
  }
}
function fromServerPlan(r: any): TrainingPlan {
  return {
    // made valid here too, so a row from a newer or buggy client can't break the next launch
    id: r.id, name: typeof r.name === 'string' && r.name ? r.name : 'My plan', source: r.source === 'recommended' ? 'recommended' : 'custom',
    state: ['active', 'completed', 'archived', 'template'].includes(r.state) ? r.state : 'archived',
    phases: cleanPhases((Array.isArray(r.phases) ? r.phases : []).filter((x: unknown) => !!x && typeof x === 'object')),
    ...(r.started_at ? { startedAt: String(r.started_at).slice(0, 10) } : {}), ...(r.completed_at ? { completedAt: r.completed_at } : {}),
    ...(r.reflection ? { reflection: r.reflection } : {}), ...(r.base_template_id ? { baseTemplateId: r.base_template_id } : {}),
    ...(r.cloned_from_id ? { clonedFromId: r.cloned_from_id } : {}), _u: r.updated_at, _dirty: false,
  }
}
/* routines: the user's own workouts (plan P4), one row each like recipes; never hard-deleted */
function toServerRoutine(r: Routine, uid: string) {
  return {
    id: r.id, user_id: uid, name: r.name, modality: r.modality, effort: r.effort === 'light' ? 'light' : 'hard', source: r.source === 'recommended' ? 'recommended' : 'custom',
    base_id: r.baseId ?? null, blocks: Array.isArray(r.blocks) ? r.blocks : [], est_mins: r.estMins != null ? Math.min(1440, Math.max(0, Math.round(r.estMins))) : null, archived: !!r.archived,
  }
}
function fromServerRoutine(r: any): Routine {
  return {
    id: r.id, name: r.name, modality: r.modality, effort: r.effort === 'light' ? 'light' : 'hard', source: r.source === 'recommended' ? 'recommended' : 'custom',
    ...(r.base_id ? { baseId: r.base_id } : {}), blocks: Array.isArray(r.blocks) ? r.blocks : [], ...(r.est_mins != null ? { estMins: r.est_mins } : {}),
    ...(r.archived ? { archived: true } : {}), _u: r.updated_at, _dirty: false,
  }
}

/** A table this version knows but the server doesn't have yet (a migration still to apply): treated
 *  as empty, so it can't stop the rest of the sync. */
const missing = <T,>(p: Promise<T[]>): Promise<T[] | null> =>
  p.catch((e) => { if (e instanceof HttpError && e.status === 404) return null; throw e })

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
    // no name to match (tables without a name index): only the 403 repair applies
    if (e.status === 409 && nameOf(x)) {
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
  // consent first: a record reaches the server before (or with) the health data it covers
  // a health answer recorded under a clock the server refuses (before 2026, e.g. a phone reset to
  // 1970) would never upload and would hold the data back for good: it isn't on the server yet,
  // so give it the real time of this upload instead
  const health = latestConsent(s, 'health')
  if (health?._dirty && !(Date.parse(health.at) >= Date.parse('2026-01-01'))) health.at = nowIso()
  await step('consents', () => pushConsents(s))
  // enforced, not hoped for: while the person's current health answer isn't on the server, no data
  // goes up (it stays dirty on the device and the next run retries). Only the latest record counts:
  // an older one the server refuses mustn't block everything behind it.
  if (latestConsent(s, 'health')?._dirty) {
    if (!failed.length) failed.push('consents: health consent not uploaded yet')
    return failed
  }
  const dirtyDays = Object.keys(meta.days).filter((d) => meta.days[d].dirty)
  // health sync paused ("Not now", consent.ts): health fields stay on this device, and what the
  // server already has for them is sent back unchanged
  const paused = healthSyncPaused(s)
  await step('days', async () => {
    if (!paused) return upsertEach('day_logs', dirtyDays, (d) => toServerDay(s, d, uid), 'user_id,log_date', (d) => (meta.days[d].dirty = false))
    if (!dirtyDays.length) return
    const have = await sbGet<{ log_date: string; supps: Record<string, unknown> | null }[]>('/day_logs?user_id=eq.' + uid + '&select=log_date,supps')
    const theirs = new Map(have.map((r) => [r.log_date, r.supps?.[CHECKIN_KEY] ?? null]))
    await upsertEach('day_logs', dirtyDays, (d) => toServerDay(s, d, uid, { serverCheckin: theirs.get(d) ?? null }), 'user_id,log_date', (d) => { meta.days[d].dirty = false; holdHealth(s, { day: d }) })
  })
  if (meta.settings.dirty) {
    await step('settings', async () => {
      let profile = s.profile
      if (paused) {
        const have = await sbGet<{ profile: Profile | null }[]>('/settings?user_id=eq.' + uid + '&select=profile')
        profile = withProfileHealth(s.profile, profileHealth(have[0]?.profile))
      }
      await sbUpsert('settings', [{ user_id: uid, target: s.target, schedule: s.schedule, profile }], 'user_id')
      meta.settings.dirty = false
      if (paused) holdHealth(s, { settings: true })
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
  // workouts have no name index (two may share a name), so only the 403 repair can apply
  const dirtyRoutines = (s.routines || []).filter((r) => r._dirty)
  const dirtyPlans = (s.trainingPlans || []).filter((p) => p._dirty)
  await step('plans', () => upsertEach('training_plans', dirtyPlans, (p) => toServerPlan(p, uid), 'id', (p) => (p._dirty = false), repairs('training_plans', () => '', uid, [], s.trainingPlans)))
  await step('workouts', () => upsertEach('routines', dirtyRoutines, (r) => toServerRoutine(r, uid), 'id', (r) => (r._dirty = false), repairs('routines', () => '', uid, [], s.routines)))
  return failed
}

export async function pullAll(s: PersistedState, meta: SyncMeta): Promise<void> {
  const uid = getUid()
  const settings = await sbGet<any[]>('/settings?user_id=eq.' + uid + '&select=*')
  // health sync paused: what this device held back stays as it is here (the server's is older)
  const pause = healthSyncPaused(s) ? s.consents!.healthPause! : null
  if (settings.length && !meta.settings.dirty) {
    s.target = settings[0].target
    s.schedule = settings[0].schedule
    if (settings[0].profile) {
      const mine = pause?.heldSettings ? profileHealth(s.profile) : null
      // keep the earliest D5 switch date across devices (and one from an older app version's
      // copy that lacks it), so days between two dates never flip back and forth
      const sw = s.profile.burnSwitch
      s.profile = settings[0].profile
      if (sw && (!s.profile.burnSwitch || sw < s.profile.burnSwitch)) { s.profile.burnSwitch = sw; meta.settings.dirty = true }
      if (mine) s.profile = withProfileHealth(s.profile, mine)
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
    if (mine && !hasMeta(row)) {
      for (const k of FOOD_META_KEYS) if (mine[k] !== undefined) (f as any)[k] = mine[k]
      // the server's row predates meta (or came from an older build): upload this device's extra
      // fields on the next push, on top of the server's newest name and values
      if (CUSTOM_FOOD_META && FOOD_META_KEYS.some((k) => mine[k] !== undefined)) f._dirty = true
    }
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
    const mine = pause?.heldDays?.includes(d) ? s.days[d] : null
    s.days[d] = fromServerDay(row)
    if (mine) { s.days[d].weight = mine.weight ?? null; s.days[d].checkin = mine.checkin ?? null }
    meta.days[d] = { u: row.updated_at, dirty: false }
  })

  // after the log, so trouble with workouts can never hold up the days; no table yet = keep local
  const rt = await missing(sbGet<any[]>('/routines?user_id=eq.' + uid + '&select=*'))
  if (rt) {
    const wById: Record<string, Routine> = {}
    rt.map(fromServerRoutine).forEach((r) => { wById[r.id] = r })
    ;(s.routines || []).filter((r) => r._dirty).forEach((r) => { wById[r.id] = r })
    s.routines = Object.values(wById)
  }
  const tp = await missing(sbGet<any[]>('/training_plans?user_id=eq.' + uid + '&select=*'))
  if (tp) {
    const pById: Record<string, TrainingPlan> = {}
    tp.map(fromServerPlan).forEach((p) => { pById[p.id] = p })
    ;(s.trainingPlans || []).filter((p) => p._dirty).forEach((p) => { pById[p.id] = p })
    s.trainingPlans = Object.values(pById)
  }
  // after the log; no table yet = keep the device's records (they upload once it exists)
  await pullConsents(s)
  meta.lastPull = nowIso()
}

/** The rows sameAccount compares, read with a session that isn't applied yet. */
export async function accountRows(uid: string, token: string): Promise<AccountRows> {
  const q = '?user_id=eq.' + uid + '&select='
  const [days, foods, recipes, routines, plans] = await Promise.all([
    sbGet<AccountRows['days']>('/day_logs' + q + 'log_date,updated_at', token),
    sbGet<AccountRows['foods']>('/custom_foods' + q + 'id', token),
    sbGet<AccountRows['recipes']>('/recipes' + q + 'id', token),
    // before the table exists no workout can have synced, so none counts either way
    missing(sbGet<AccountRows['routines']>('/routines' + q + 'id', token)).then((x) => x ?? []),
    missing(sbGet<AccountRows['plans']>('/training_plans' + q + 'id', token)).then((x) => x ?? []),
  ])
  return { days, foods, recipes, routines, plans }
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error'
