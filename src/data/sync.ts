/**
 * Offline-first sync engine. localStorage is the instant working store; writes mark
 * records dirty and, when online, upsert to Supabase. On load/reconnect we pull and
 * merge with last-write-wins per record. Ported from the LeanPlan vanilla app and kept
 * framework-agnostic so it can back a native client later.
 */
import type { Food, Recipe } from '@/core/types'
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
  }
}
function fromServerFood(r: any): Food {
  return { id: r.id, n: r.name, k: r.kcal, p: r.protein, c: r.carbs, f: r.fat, g: r.grams, _u: r.updated_at, _dirty: false }
}
function toServerDay(s: PersistedState, d: string, uid: string) {
  const x = s.days[d] || { foods: [], supps: {}, weight: null, workout: null }
  return { user_id: uid, log_date: d, foods: x.foods || [], supps: x.supps || {}, weight: x.weight ?? null, workout: x.workout ?? null }
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
    if (settings[0].profile) s.profile = settings[0].profile
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
    s.days[d] = { foods: row.foods || [], supps: row.supps || {}, weight: row.weight ?? null, workout: row.workout || null }
    meta.days[d] = { u: row.updated_at, dirty: false }
  })
  meta.lastPull = nowIso()
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error'
