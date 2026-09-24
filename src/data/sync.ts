/**
 * Offline-first sync engine. localStorage is the instant working store; writes mark
 * records dirty and, when online, upsert to Supabase. On load/reconnect we pull and
 * merge with last-write-wins per record. Ported from the LeanPlan vanilla app and kept
 * framework-agnostic so it can back a native client later.
 */
import type { DayLog, Food, Recipe } from '@/core/types'
import { sbGet, sbUpsert, sbDelete, getUid, nowIso } from './supabase'
import type { PersistedState, SyncMeta } from './persistence'

/* ---- client <-> server row mapping ---- */
function toServerFood(f: Food, uid: string) {
  return {
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
}
function fromServerFood(r: any): Food {
  return { id: r.id, n: r.name, k: r.kcal, p: r.protein, c: r.carbs, f: r.fat, g: r.grams, ml: !!r.ml, _u: r.updated_at, _dirty: false }
}
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

export async function pushDirty(s: PersistedState, meta: SyncMeta): Promise<void> {
  const uid = getUid()
  if (meta.settings.dirty) {
    await sbUpsert('settings', [{ user_id: uid, target: s.target, schedule: s.schedule, profile: s.profile }], 'user_id')
    meta.settings.dirty = false
  }
  const dirtyFoods = (s.customFoods || []).filter((f) => f._dirty)
  if (dirtyFoods.length) {
    await sbUpsert('custom_foods', dirtyFoods.map((f) => toServerFood(f, uid)), 'id')
    dirtyFoods.forEach((f) => (f._dirty = false))
  }
  for (const id of [...meta.foodDeletes]) {
    await sbDelete('custom_foods', 'id=eq.' + id)
    meta.foodDeletes = meta.foodDeletes.filter((x) => x !== id)
  }
  const dirtyRecipes = (s.recipes || []).filter((r) => r._dirty)
  if (dirtyRecipes.length) {
    await sbUpsert('recipes', dirtyRecipes.map((r) => toServerRecipe(r, uid)), 'id')
    dirtyRecipes.forEach((r) => (r._dirty = false))
  }
  for (const id of [...meta.recipeDeletes]) {
    await sbDelete('recipes', 'id=eq.' + id)
    meta.recipeDeletes = meta.recipeDeletes.filter((x) => x !== id)
  }
  const dirtyDays = Object.keys(meta.days).filter((d) => meta.days[d].dirty)
  if (dirtyDays.length) {
    await sbUpsert('day_logs', dirtyDays.map((d) => toServerDay(s, d, uid)), 'user_id,log_date')
    dirtyDays.forEach((d) => (meta.days[d].dirty = false))
  }
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
  cf.map(fromServerFood).forEach((f) => { if (f.id) byId[f.id] = f })
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

/**
 * Fold a finished sync back into state that may have changed while it was in flight.
 * `base` is the state the sync cloned, `live` the state now, `synced` the clone that
 * pushDirty/pullAll worked on. A record the user touched meanwhile is a new object in `live`
 * (callers update state immutably, as the Immer store does), so it keeps its live version
 * and dirty flag and uploads on the next sync; everything else comes from `synced`. Fields
 * sync doesn't handle come from `live`. Neither `base` nor `live` is mutated.
 */
export function mergeAfterSync(base: PersistedState, live: PersistedState, synced: PersistedState): PersistedState {
  const bm = base._meta, lm = live._meta
  const sm = synced._meta!
  const meta: SyncMeta = { ...sm, days: { ...sm.days } }
  const out: PersistedState = { ...live, days: { ...synced.days }, _meta: meta }

  // settings travel as one row: target, schedule and profile together
  if (live.target === base.target && live.schedule === base.schedule && live.profile === base.profile) {
    out.target = synced.target; out.schedule = synced.schedule; out.profile = synced.profile
  }
  if (lm && lm.settings !== bm?.settings) meta.settings = lm.settings

  const dayKeys = new Set([...Object.keys(base.days || {}), ...Object.keys(live.days || {}), ...Object.keys(lm?.days || {})])
  for (const d of dayKeys) {
    if (live.days?.[d] !== base.days?.[d]) {
      if (live.days?.[d]) out.days[d] = live.days[d]
      else delete out.days[d]
    }
    if (lm && lm.days?.[d] !== bm?.days?.[d]) {
      if (lm.days?.[d]) meta.days[d] = lm.days[d]
      else delete meta.days[d]
    }
  }

  const added = (now: string[] = [], then: string[] = []) => now.filter((id) => !then.includes(id))
  meta.foodDeletes = [...new Set([...sm.foodDeletes, ...added(lm?.foodDeletes, bm?.foodDeletes)])]
  meta.recipeDeletes = [...new Set([...sm.recipeDeletes, ...added(lm?.recipeDeletes, bm?.recipeDeletes)])]
  out.customFoods = mergeList(base.customFoods, live.customFoods, synced.customFoods, meta.foodDeletes)
  out.recipes = mergeList(base.recipes, live.recipes, synced.recipes, meta.recipeDeletes)
  return out
}

/** Synced list order, with records edited during the sync swapped in (new ones last) and
 *  records removed during the sync left out. */
function mergeList<T extends { id?: string }>(base: T[] = [], live: T[] = [], synced: T[] = [], deletes: string[]): T[] {
  const baseRefs = new Set(base)
  const changed = live.filter((x) => !baseRefs.has(x))
  const edited = new Map(changed.filter((x) => x.id).map((x) => [x.id, x]))
  const liveIds = new Set(live.map((x) => x.id))
  const baseIds = new Set(base.map((x) => x.id))
  const out: T[] = []
  for (const x of synced) {
    if (x.id && deletes.includes(x.id)) continue
    if (baseIds.has(x.id) && !liveIds.has(x.id)) continue // removed while syncing
    const e = edited.get(x.id)
    if (e) { out.push(e); edited.delete(x.id) } else out.push(x)
  }
  return out.concat([...edited.values()], changed.filter((x) => !x.id)) // id-less: kept as they are
}

/** True when anything still waits to upload. */
export function hasDirty(s: PersistedState): boolean {
  const m = s._meta
  if (!m) return false
  return m.settings.dirty || m.foodDeletes.length > 0 || m.recipeDeletes.length > 0
    || Object.values(m.days).some((x) => x.dirty)
    || (s.customFoods || []).some((f) => f._dirty) || (s.recipes || []).some((r) => r._dirty)
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error'
