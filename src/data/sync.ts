/**
 * Offline-first sync engine. localStorage is the instant working store; writes mark
 * records dirty and, when online, upsert to Supabase. On load/reconnect we pull and
 * merge with last-write-wins per record; pulls fetch only rows changed since the last one
 * (see pullAll). Ported from the LeanPlan vanilla app and kept framework-agnostic so it can back a native client later.
 */
import type { DayLog, Food, Recipe } from '@/core/types'
import { sbGet, sbCount, sbUpsert, sbDelete, getUid, nowIso } from './supabase'
import type { PersistedState, PullMark, SyncMeta } from './persistence'

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

/* ---- incremental pull ----
   Each table keeps a high-water mark: the newest server `updated_at` seen (set by the database
   on insert and by the set_updated_at trigger on update, so device clocks never matter). A pull
   asks only for rows newer than that. `now()` is the transaction start, so a write that commits
   just after our read can carry a timestamp a moment older than rows we already hold; to catch
   it we re-ask for a small window below the mark and exclude, by (key, updated_at), the rows in
   that window we already have. A quiet second sync therefore returns no rows at all.
   Deletes are hard deletes (no tombstones), so custom foods and recipes also compare a row count
   (HEAD, no body): only when it differs do we fetch keys and drop what the server no longer has.
   A missing mark (first sync, older app version, another account, a restored backup) means a
   full pull, exactly as before. */
const OVERLAP_MS = 5000
/** Above this many rows inside the window (a big first upload shares one timestamp), fall back
 *  to a strict `gt.mark` rather than build a long URL. */
const EDGE_MAX = 40

/** Server timestamp to microseconds since the epoch; NaN if unreadable. Parsed by hand because
 *  Postgres gives 6 fractional digits, which Date.parse drops (and older Safari rejects). */
export function tsMicros(ts: unknown): number {
  if (typeof ts !== 'string') return NaN
  const m = ts.match(/\.(\d+)/)
  const ms = Date.parse(m ? ts.replace(m[0], '') : ts)
  return ms * 1000 + (m ? parseInt((m[1] + '000000').slice(0, 6), 10) : 0)
}
/** Lower edge of the overlap window, in whole ms: the query and the exclusion list both use it,
 *  so no row can fall inside the query yet outside the list. */
const windowFloorMs = (markMicros: number) => Math.floor(markMicros / 1000) - OVERLAP_MS
const quote = (v: string) => '"' + v.replace(/["\\]/g, '\\$&') + '"'

/** The GET path for one table: everything on first sync, otherwise only rows past the mark. */
export function sinceQuery(table: string, key: string, uid: string, m: PullMark | undefined): string {
  const q = '/' + table + '?user_id=eq.' + uid + '&select=*'
  const mu = m ? tsMicros(m.mark) : NaN
  if (!m || !Number.isFinite(mu)) return q
  if (!m.edge) return q + '&updated_at=gt.' + encodeURIComponent(m.mark)
  const lo = new Date(windowFloorMs(mu)).toISOString()
  const parts = ['updated_at.gt.' + quote(lo)].concat(
    m.edge.map(([k, t]) => 'not.and(' + key + '.eq.' + quote(k) + ',updated_at.eq.' + quote(t) + ')'),
  )
  return q + '&and=' + encodeURIComponent('(' + parts.join(',') + ')')
}

/** Move the mark past the rows just received and keep the ones inside the overlap window. */
export function advance(prev: PullMark | undefined, rows: any[], key: string): PullMark | undefined {
  let best = prev ? prev.mark : ''
  let bestU = tsMicros(best)
  const seen = new Map<string, [string, number]>()
  for (const [k, t] of prev?.edge || []) seen.set(k, [t, tsMicros(t)])
  for (const r of rows) {
    const u = tsMicros(r.updated_at)
    if (!Number.isFinite(u)) continue
    if (!(u <= bestU)) { best = r.updated_at; bestU = u }
    // the row as just received is the server's current version, even if a late commit gave it
    // an older timestamp than the one we held
    seen.set(String(r[key]), [r.updated_at, u])
  }
  if (!best || !Number.isFinite(bestU)) return prev
  const edge: [string, string][] = []
  for (const [k, [t, u]] of seen) if (u > windowFloorMs(bestU) * 1000) edge.push([k, t])
  return { mark: best, edge: edge.length > EDGE_MAX ? null : edge }
}

/** Keys the server still has for a table, but only if its row count says something changed
 *  that the mark can't show (a delete, or a row we somehow missed). */
async function serverKeysIfChanged(table: string, key: string, uid: string, localCount: number, onlyIfMore = false): Promise<string[] | null> {
  // the count is only a safety net: if it fails, skip it rather than fail the whole sync
  const n = await sbCount('/' + table + '?user_id=eq.' + uid + '&select=' + key).catch(() => null)
  if (n === null || n === localCount || (onlyIfMore && n < localCount)) return null
  const rows = await sbGet<any[]>('/' + table + '?user_id=eq.' + uid + '&select=' + key)
  return rows.map((r) => String(r[key]))
}
async function fetchByKeys(table: string, key: string, uid: string, keys: string[]): Promise<any[]> {
  const out: any[] = []
  for (let i = 0; i < keys.length; i += 100) {
    const list = keys.slice(i, i + 100).map(quote).join(',')
    out.push(...(await sbGet<any[]>('/' + table + '?user_id=eq.' + uid + '&select=*&' + key + '=in.' + encodeURIComponent('(' + list + ')'))))
  }
  return out
}

export async function pullAll(s: PersistedState, meta: SyncMeta): Promise<void> {
  const uid = getUid()
  if (!meta.pull || meta.pull.uid !== uid) meta.pull = { uid, tables: {} }
  const marks = meta.pull.tables
  const pull = async (table: string, key: string) => {
    const full = !marks[table]
    const rows = await sbGet<any[]>(sinceQuery(table, key, uid, marks[table]))
    return { rows, full }
  }

  const st = await pull('settings', 'user_id')
  const settings = st.rows
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
  marks.settings = advance(marks.settings, settings, 'user_id')

  // custom foods and recipes: a full pull replaces the list (server + unpushed local), an
  // incremental one merges changed rows in; local dirty records always win (last write wins)
  const mergeFoods = (rows: any[], replace: boolean) => {
    const byId: Record<string, Food> = {}
    if (!replace) (s.customFoods || []).forEach((f) => { if (f.id) byId[f.id] = f })
    rows.map(fromServerFood).forEach((f) => { if (f.id && !byId[f.id]?._dirty && !meta.foodDeletes.includes(f.id)) byId[f.id] = f })
    if (replace) (s.customFoods || []).filter((f) => f._dirty).forEach((f) => { if (f.id) byId[f.id] = f })
    s.customFoods = Object.values(byId)
  }
  const cf = await pull('custom_foods', 'id')
  mergeFoods(cf.rows, cf.full)
  marks.custom_foods = advance(marks.custom_foods, cf.rows, 'id')
  if (!cf.full) {
    const keys = await serverKeysIfChanged('custom_foods', 'id', uid, s.customFoods.length)
    if (keys) {
      const have = new Set(keys)
      s.customFoods = s.customFoods.filter((f) => f._dirty || (f.id && have.has(f.id)))
      const local = new Set(s.customFoods.map((f) => f.id))
      const rows = await fetchByKeys('custom_foods', 'id', uid, keys.filter((k) => !local.has(k)))
      mergeFoods(rows, false)
      marks.custom_foods = advance(marks.custom_foods, rows, 'id')
    }
  }

  const mergeRecipes = (rows: any[], replace: boolean) => {
    const rById: Record<string, Recipe> = {}
    if (!replace) (s.recipes || []).forEach((r) => { rById[r.id] = r })
    rows.map(fromServerRecipe).forEach((r) => { if (!rById[r.id]?._dirty && !meta.recipeDeletes.includes(r.id)) rById[r.id] = r })
    if (replace) (s.recipes || []).filter((r) => r._dirty).forEach((r) => { rById[r.id] = r })
    s.recipes = Object.values(rById)
  }
  const rc = await pull('recipes', 'id')
  mergeRecipes(rc.rows, rc.full)
  marks.recipes = advance(marks.recipes, rc.rows, 'id')
  if (!rc.full) {
    const keys = await serverKeysIfChanged('recipes', 'id', uid, s.recipes.length)
    if (keys) {
      const have = new Set(keys)
      s.recipes = s.recipes.filter((r) => r._dirty || have.has(r.id))
      const local = new Set(s.recipes.map((r) => r.id))
      const rows = await fetchByKeys('recipes', 'id', uid, keys.filter((k) => !local.has(k)))
      mergeRecipes(rows, false)
      marks.recipes = advance(marks.recipes, rows, 'id')
    }
  }

  const mergeDays = (rows: any[]) => rows.forEach((row) => {
    const d = row.log_date
    if (meta.days[d] && meta.days[d].dirty) return // keep unpushed local day
    s.days[d] = fromServerDay(row)
    meta.days[d] = { u: row.updated_at, dirty: false }
  })
  const dl = await pull('day_logs', 'log_date')
  mergeDays(dl.rows)
  marks.day_logs = advance(marks.day_logs, dl.rows, 'log_date')
  if (!dl.full) {
    // days are never deleted, so only a server count above ours (a missed row) needs a look
    const known = Object.keys(meta.days).filter((d) => !meta.days[d].dirty)
    const keys = await serverKeysIfChanged('day_logs', 'log_date', uid, known.length, true)
    if (keys) {
      const rows = await fetchByKeys('day_logs', 'log_date', uid, keys.filter((k) => !meta.days[k]))
      mergeDays(rows)
      marks.day_logs = advance(marks.day_logs, rows, 'log_date')
    }
  }
  meta.lastPull = nowIso()
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error'
