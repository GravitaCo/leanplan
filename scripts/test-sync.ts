/** `npm test` (part 2) — the sync engine's incremental pull, against an in-memory stand-in for
 *  PostgREST that understands exactly the filters sync.ts sends. */
import { pushDirty, pullAll, tsMicros } from '@/data/sync'
import { setSession } from '@/data/supabase'
import { ensureMeta, loadStateFrom, type PersistedState } from '@/data/persistence'

const UID = '11111111-1111-1111-1111-111111111111'
type Row = Record<string, any>
const KEYS: Record<string, string> = { settings: 'user_id', custom_foods: 'id', recipes: 'id', day_logs: 'log_date' }
const db: Record<string, Row[]> = { settings: [], custom_foods: [], recipes: [], day_logs: [] }

/* server clock: microsecond timestamps in Postgres' own format; `now()` can be set back to model
   a transaction that started before a row we already pulled but committed after it */
let clock = Date.parse('2026-09-24T10:00:00Z') * 1000
const fmt = (us: number) => new Date(Math.floor(us / 1000)).toISOString().replace(/\.\d+Z$/, '') + '.' + String(us % 1000000).padStart(6, '0') + '+00:00'
const now = () => fmt((clock += 1234))

function put(table: string, row: Row, at = now()) {
  const k = KEYS[table]
  const list = db[table]
  const i = list.findIndex((r) => r[k] === row[k] && r.user_id === row.user_id)
  const next = { ...(i >= 0 ? list[i] : {}), ...row, updated_at: at }
  if (i >= 0) list[i] = next; else list.push(next)
}

/* the fake PostgREST */
let failHead = false
let bodyRows = 0 // full rows sent back by GET select=*
let keyRows = 0 // key-only rows (select=<key>)
const unq = (v: string) => (v.startsWith('"') ? v.slice(1, -1).replace(/\\(.)/g, '$1') : v)
function splitTop(s: string): string[] {
  const out: string[] = []; let depth = 0, q = false, cur = ''
  for (const ch of s) {
    if (ch === '"') q = !q
    if (!q && ch === '(') depth++
    if (!q && ch === ')') depth--
    if (!q && depth === 0 && ch === ',') { out.push(cur); cur = '' } else cur += ch
  }
  return out.concat(cur)
}
function cond(expr: string): (r: Row) => boolean {
  if (expr.startsWith('not.and(')) {
    const parts = splitTop(expr.slice(8, -1)).map(cond)
    return (r) => !parts.every((p) => p(r))
  }
  const [col, op, ...rest] = expr.split('.')
  const v = unq(rest.join('.'))
  if (op === 'eq') return (r) => (col === 'updated_at' ? tsMicros(r[col]) === tsMicros(v) : String(r[col]) === v)
  if (op === 'gt') return (r) => tsMicros(r[col]) > tsMicros(v)
  if (op === 'in') { const set = new Set(splitTop(v.slice(1, -1)).map(unq)); return (r) => set.has(String(r[col])) }
  throw new Error('unsupported filter ' + expr)
}
function query(url: string): { table: string; rows: Row[]; select: string } {
  const u = new URL(url)
  const table = u.pathname.split('/').pop()!
  let rows = db[table]
  let select = '*'
  for (const [k, v] of u.searchParams) {
    if (k === 'select') select = v
    else if (k === 'on_conflict') continue
    else if (k === 'and') { const cs = splitTop(v.slice(1, -1)).map(cond); rows = rows.filter((r) => cs.every((c) => c(r))) }
    else rows = rows.filter(cond(k + '.' + v))
  }
  return { table, rows, select }
}
;(globalThis as any).fetch = async (url: string, opts: RequestInit = {}) => {
  const method = opts.method || 'GET'
  const { table, rows, select } = query(url)
  if (method === 'HEAD' && failHead) return new Response(null, { status: 500 })
  if (method === 'HEAD') return new Response(null, { status: 200, headers: { 'Content-Range': '*/' + rows.length } })
  if (method === 'GET') {
    const out = select === '*' ? rows.map((r) => ({ ...r })) : rows.map((r) => ({ [select]: r[select] }))
    if (select === '*') bodyRows += out.length; else keyRows += out.length
    if (process.env.DBG && select === "*" && out.length) console.log("  GET", table, decodeURIComponent(url.split("?")[1]), JSON.stringify(out.map((r) => [r[KEYS[table]], r.updated_at])))
    return new Response(JSON.stringify(out), { status: 200 })
  }
  if (method === 'POST') { const at = now(); for (const r of JSON.parse(String(opts.body))) put(table, r, at); return new Response(null, { status: 201 }) }
  if (method === 'DELETE') { db[table] = db[table].filter((r) => !rows.includes(r)); return new Response(null, { status: 204 }) }
  throw new Error(method)
}

/* a device: its own local state, synced the way store.runSync does it */
function device(): PersistedState { const s = loadStateFrom(null); ensureMeta(s, false); return s }
async function sync(s: PersistedState) {
  const m = ensureMeta(s, false)
  await pushDirty(s, m)
  bodyRows = 0; keyRows = 0
  await pullAll(s, m)
  return { rows: bodyRows, keys: keyRows }
}
const food = (id: string, name: string, k = 100) => ({ id, user_id: UID, name, kcal: k, protein: 1, carbs: 1, fat: 1, grams: 100, ml: false })
const day = (d: string, weight: number) => ({ user_id: UID, log_date: d, foods: [], supps: {}, weight, workout: null, sessions: null })
const id = (n: number) => '00000000-0000-0000-0000-' + String(n).padStart(12, '0')

let bad = 0
const check = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) bad++
  console.log(ok ? 'PASS' : 'FAIL', 'sync:', name, ok ? '' : JSON.stringify(got) + ' want ' + JSON.stringify(want))
}

;(async () => {
  setSession('token', UID)
  put('settings', { user_id: UID, target: { kcal: 2000 }, schedule: {}, profile: null })
  put('custom_foods', food(id(1), 'Oat bar'))
  put('custom_foods', food(id(2), 'Soup'))
  put('recipes', { id: id(3), user_id: UID, name: 'Chilli', items: [], servings: 4 })
  for (let i = 1; i <= 3; i++) put('day_logs', day('2026-09-0' + i, 70 + i))

  const a = device()
  check('first sync is a full pull', await sync(a), { rows: 7, keys: 0 })
  check('first sync fills the device', [a.customFoods.length, a.recipes.length, Object.keys(a.days).length, a.target.kcal], [2, 1, 3, 2000])
  check('second sync with no remote changes transfers no rows', await sync(a), { rows: 0, keys: 0 })

  // another device edits a day and adds a food
  put('day_logs', day('2026-09-02', 80))
  put('custom_foods', food(id(4), 'Flapjack'))
  check('only changed rows come down', await sync(a), { rows: 2, keys: 0 })
  check('changes applied', [a.days['2026-09-02'].weight, a.customFoods.map((f) => f.n).sort()], [80, ['Flapjack', 'Oat bar', 'Soup']])
  check('quiet again', await sync(a), { rows: 0, keys: 0 })

  // a local edit is pushed, echoed back once in the same sync, then quiet
  a.days['2026-09-05'] = { foods: [], supps: {}, weight: 69, workout: null }
  a._meta!.days['2026-09-05'] = { u: new Date().toISOString(), dirty: true }
  check('own push echoes once', await sync(a), { rows: 1, keys: 0 })
  check('then no rows', await sync(a), { rows: 0, keys: 0 })

  // last write wins: an unpushed local day is not overwritten by a pull
  put('day_logs', day('2026-09-01', 99))
  a.days['2026-09-01'].weight = 60
  a._meta!.days['2026-09-01'].dirty = true
  await pullAll(a, a._meta!)
  check('dirty local day kept', a.days['2026-09-01'].weight, 60)
  await sync(a)
  check('and pushed', db.day_logs.find((r) => r.log_date === '2026-09-01')!.weight, 60)

  // a write that started before our last read but committed after it (older timestamp)
  await sync(a)
  const mark = a._meta!.pull!.tables.day_logs!.mark
  put('day_logs', day('2026-09-03', 75), fmt(tsMicros(mark) - 2_000_000))
  check('late commit inside the window is caught', await sync(a), { rows: 1, keys: 0 })
  check('late commit applied', a.days['2026-09-03'].weight, 75)
  check('quiet after late commit', await sync(a), { rows: 0, keys: 0 })

  // a row right at the bottom of the window (sub-ms below mark - 5 s) is not re-sent forever
  await sync(a)
  const m2 = a._meta!.pull!.tables.day_logs!.mark
  put('day_logs', day('2026-09-02', 81), fmt(Math.floor(tsMicros(m2) / 1000) * 1000 - 5_000_000 + 1))
  check('row at the window floor pulled once', await sync(a), { rows: 1, keys: 0 })
  check('then quiet', await sync(a), { rows: 0, keys: 0 })

  // hard delete on another device: count differs, keys fetched, food dropped, no full rows
  db.custom_foods = db.custom_foods.filter((r) => r.id !== id(2))
  check('delete found by count', await sync(a), { rows: 0, keys: 2 })
  check('deleted food gone', a.customFoods.map((f) => f.n).sort(), ['Flapjack', 'Oat bar'])
  check('quiet after delete', await sync(a), { rows: 0, keys: 0 })

  // local delete pushes and doesn't come back
  a.customFoods = a.customFoods.filter((f) => f.id !== id(4))
  a._meta!.foodDeletes.push(id(4))
  await sync(a)
  check('local delete sticks', [a.customFoods.map((f) => f.n), db.custom_foods.length], [['Oat bar'], 1])

  // a failing count request (HEAD) doesn't break sync
  failHead = true
  put('recipes', { id: id(3), user_id: UID, name: 'Chilli', items: [], servings: 6 })
  const r = await sync(a).then((x) => x, () => 'threw')
  failHead = false
  check('failed count is skipped', [r, a.recipes[0].servings], [{ rows: 1, keys: 0 }, 6])

  // a row the mark missed (e.g. a bug, or restored state) is healed by the count
  const b = device()
  await sync(b)
  delete b.days['2026-09-02']; delete b._meta!.days['2026-09-02']
  check('missing day healed by count', await sync(b), { rows: 1, keys: 4 })
  check('healed day present', b.days['2026-09-02']?.weight, 81)

  // a big upload in one transaction (many rows share a timestamp): strict gt, still quiet after
  const big = Array.from({ length: 60 }, (_, i) => day('2025-01-' + String(i + 1).padStart(2, '0'), 70))
  const at = now(); big.forEach((r) => put('day_logs', r, at))
  check('big batch pulled', (await sync(b)).rows, 60)
  check('big batch falls back to strict gt', b._meta!.pull!.tables.day_logs!.edge, null)
  check('quiet after big batch', await sync(b), { rows: 0, keys: 0 })

  // another account on this device: marks don't carry over
  const other = '22222222-2222-2222-2222-222222222222'
  setSession('token', other)
  put('day_logs', { ...day('2026-09-01', 55), user_id: other })
  check('new account gets a full pull', (await sync(b)).rows, 1)
  check('marks belong to the new account', b._meta!.pull!.uid, other)
  setSession('token', UID)

  // stored meta from older versions or corrupted storage migrates to a full pull
  const old = loadStateFrom({ ...loadStateFrom(null), _meta: { settings: { u: '', dirty: false }, days: {}, foodDeletes: [], recipeDeletes: [], lastPull: null } } as PersistedState)
  check('meta without marks migrates', 'pull' in ensureMeta(old, false), false)
  const broken = loadStateFrom(null)
  broken._meta = { settings: { u: '', dirty: false }, days: {}, foodDeletes: [], recipeDeletes: [], lastPull: null, pull: { uid: UID, tables: { day_logs: { mark: 5, edge: 'x' } as any, recipes: { mark: '2026-01-01T00:00:00+00:00', edge: [] } } } }
  check('malformed marks dropped, good ones kept', Object.keys(ensureMeta(broken, false).pull!.tables), ['recipes'])
  const c = device()
  c._meta!.pull = { uid: UID, tables: {} }
  check('empty marks = full pull', (await sync(c)).rows, db.settings.length + db.custom_foods.length + db.recipes.length + db.day_logs.filter((r) => r.user_id === UID).length)

  process.exit(bad ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
