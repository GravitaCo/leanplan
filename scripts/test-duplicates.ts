/* Duplicate saved foods (boards dup-1 to dup-4): the match rule (nutrition-accuracy, Oct 2026),
   barcode updates, merging (logs and usuals follow through aliases; no day is rewritten), dismissed
   pairs, the store actions, and a merge made offline on one device against newer logs from another.
   Run from scripts/test-core.ts (npm test); returns the number of failures. */
import type { AppState, DayLog, Food, LoggedFood } from '@/core/types'
import { DEFAULT_PROFILE, DEFAULT_TARGET } from '@/core/data/constants'
import { entriesToRepeat, lastUse, recentFoods, sameAsYesterdayRow, usualEntries, usuals } from '@/core/domain/insights'
import { ALIAS_MAX, META_BUDGET, aliasNames, dismissed, figuresMatch, foodChanges, hasChanges, likelyPairs, likelySame, likelySaved, markDifferent, mergeFoods, nameAfterUpdate, nameWords, namesMatch, savedWithBarcode, timesLogged, updatedFood } from '@/core/domain/duplicates'
import { ensureMeta, loadStateFrom, stateFromBackup, type PersistedState } from '@/data/persistence'
import { fromServerFood, pullAll, pushDirty, toServerFood } from '@/data/sync'
import { LOCAL_USER } from '@/data/supabase'

type FakeServer = (rows: Record<string, any[]>, broken?: string[]) => { fetchFn: typeof fetch; calls: string[] }
async function withFetch<T>(f: typeof fetch, run: () => Promise<T>): Promise<T> {
  const real = globalThis.fetch
  globalThis.fetch = f
  try { return await run() } finally { globalThis.fetch = real }
}

let bad = 0
const report = (area: string, checks: [string, boolean, unknown?][]) => {
  for (const [n, ok, detail] of checks) { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', `duplicates: ${area}: ${n}`, !ok && detail !== undefined ? JSON.stringify(detail) : '') }
}

const ID1 = '11111111-1111-4111-8111-111111111111'
const ID2 = '22222222-2222-4222-8222-222222222222'
const ID3 = '33333333-3333-4333-8333-333333333333'
const mine: Food = { id: ID1, n: 'Chicken & Mushroom Pot Noodle', k: 428, p: 8.6, c: 57, f: 17, g: 90, src: 'label', barcode: '5012345678960', eat: true }
const scanned: Food = { id: ID2, n: 'Pot Noodle Chicken & Mushroom Flavour', k: 430, p: 8.6, c: 57, f: 17, g: 90, src: 'off:5012345678900', barcode: '5012345678900', eat: true }
const beef: Food = { id: ID3, n: 'Beef & Tomato Pot Noodle', k: 425, p: 8.4, c: 56.5, f: 17, g: 90 }

export async function duplicatesSuite(fakeServer: FakeServer): Promise<number> {
  report('names', [
    ['Pot Noodle pair matches', namesMatch(mine.n, scanned.n)],
    ['Beef & Tomato does not', !namesMatch(mine.n, beef.n) && !namesMatch(scanned.n, beef.n)],
    ['King Size 114g matches the regular pot', namesMatch('Chicken & Mushroom Pot Noodle King Size 114g', mine.n)],
    ['accents, + and punctuation', namesMatch('Crème fraîche + chives', 'creme fraiche, chives')],
    ['plural s stripped on longer words', namesMatch('Oat biscuits', 'oat biscuit')],
    ['variant words kept: Diet Coke is not Coke', !namesMatch('Diet Coke', 'Coke')],
    ['variant words kept: light vs regular', !namesMatch('Philadelphia Light', 'Philadelphia')],
    ['percentages kept', !namesMatch('Greek yoghurt 0%', 'Greek yoghurt 10%')],
    ['pack sizes dropped (1.5kg, 500ml)', [...nameWords('Milk semi skimmed 1.5kg')].join(' ') === 'milk semi skimmed' && !nameWords('Orange juice 500ml').has('500ml')],
    ['an empty word set never matches', !namesMatch('The pot', 'Pot of the')],
  ])
  report('figures', [
    ['428 vs 430 kcal within max(5, 3%)', figuresMatch(mine, scanned)],
    ['kcal 10 apart on 300 is out', !figuresMatch({ ...mine, k: 300 }, { ...mine, k: 310 })],
    ['kcal 3% of 500 (15) is in', figuresMatch({ ...mine, k: 500 }, { ...mine, k: 515 })],
    ['protein 1 g apart is in, 1.2 g apart on 8 g is out', figuresMatch({ ...mine, p: 8 }, { ...mine, p: 9 }) && !figuresMatch({ ...mine, p: 8 }, { ...mine, p: 9.2 })],
    ['fat 5% of 40 (2 g) is in', figuresMatch({ ...mine, f: 40 }, { ...mine, f: 42 })],
    ['g vs ml never matches', !figuresMatch(mine, { ...mine, ml: true })],
    ['each vs per-100 never matches; two each compared per item', !figuresMatch(mine, { ...mine, each: true }) && figuresMatch({ ...mine, each: true }, { ...mine, each: true, k: 431 })],
    ['serving size ignored', figuresMatch(mine, { ...scanned, g: 114 })],
  ])
  report('match and no-match', [
    ['likelySame: the Pot Noodle pair', likelySame(mine, scanned)],
    ['likelySame: Beef & Tomato no (name)', !likelySame(mine, beef)],
    ['likelySame: same name, other figures no', !likelySame(mine, { ...scanned, k: 470 })],
    ['likelySaved finds the saved one for a new food', likelySaved([beef, mine], { ...scanned, id: undefined, barcode: '5012345678901' })?.id === ID1],
    ['likelySaved skips a barcode match (that is dup-1)', likelySaved([mine], { ...scanned, id: undefined, barcode: mine.barcode }) === undefined],
    ['likelyPairs: one pair among three', likelyPairs([mine, scanned, beef]).length === 1],
  ])
  const day = (foods: LoggedFood[]): DayLog => ({ foods, supps: {}, weight: null, workout: null })
  const e = (n: string, k: number, src: LoggedFood['src'] = 'custom', meal: LoggedFood['meal'] = 'lunch'): LoggedFood => ({ n, grams: 90, k, p: 7.7, c: 51.3, f: 15.3, meal, src, how: 'serv', serv: 1 })
  const fresh = (): { customFoods: Food[]; days: Record<string, DayLog> } => ({
    customFoods: [{ ...mine }, { ...scanned }, { ...beef }],
    days: {
      '2026-10-01': day([e(mine.n, 385)]),
      '2026-10-02': day([e(mine.n, 385)]),
      '2026-10-03': day([e(scanned.n, 387), { n: 'Butter · cooking', grams: 5, k: 37, p: 0, c: 0, f: 4.1, src: 'fat', how: 'fat', fatFor: scanned.n, meal: 'lunch' }]),
      '2026-10-04': day([e(scanned.n, 387), e('Banana', 89, 'db')]),
    },
  })
  const asState = (x: ReturnType<typeof fresh>): AppState => ({ target: { ...DEFAULT_TARGET }, schedule: {} as AppState['schedule'], profile: { ...DEFAULT_PROFILE }, recipes: [], routines: [], trainingPlans: [], ...x })
  {
    const s = fresh()
    const before = JSON.stringify(s.days)
    const r = mergeFoods(s, ID1, ID2, true)
    const keep = s.customFoods.find((f) => f.id === ID1)!
    const st = asState(s)
    const u = usuals(st, '2026-10-11', 'lunch')
    const again = usualEntries({ ...st, days: { '2026-10-03': s.days['2026-10-03'] } }, mine.n, 'dinner')
    const y = { ...st, days: { '2026-10-03': s.days['2026-10-03'] } }
    const rep = entriesToRepeat(y, '2026-10-04', 'lunch').entries
    const row = sameAsYesterdayRow(y, '2026-10-04', 'lunch')
    report('merge', [
      ['the other food is removed and reported for the delete', !s.customFoods.some((f) => f.id === ID2) && r?.removed === ID2],
      ['no day is rewritten: logged names and calories unchanged', JSON.stringify(s.days) === before],
      ['the other name becomes an alias of the kept food', JSON.stringify(keep.alias) === JSON.stringify([scanned.n])],
      ['timesLogged counts both names', timesLogged(s.days, keep) === 4],
      ['usuals: one usual lunch, counted across both names', u.length === 1 && u[0].n === mine.n && u[0].count === 4],
      ['usualEntries re-logs under the kept name with its cooking fat, numbers as logged', again.length === 2 && again[0].n === mine.n && again[0].k === 387 && again[1].fatFor === mine.n],
      ['lastUse finds the last log under the old name', lastUse(st, mine.n)?.k === 387],
      ['Same as yesterday copies under the kept name', rep.length === 2 && rep[0].n === mine.n && rep[1].fatFor === mine.n && row?.sub.startsWith(mine.n) === true],
      ['recent foods lists the kept food once', recentFoods(st, s.customFoods).filter((f) => f.id === ID1).length === 1],
      ['a database food of another name untouched', aliasNames(s.customFoods).get('Banana') === undefined],
      ['takes the other barcode when asked', keep.barcode === scanned.barcode],
      ['keeps its own barcode when not', (() => { const t = fresh(); mergeFoods(t, ID1, ID2, false); return t.customFoods[0].barcode === mine.barcode })()],
      ['merging a food into itself does nothing', mergeFoods(fresh(), ID1, ID1, true) === null],
      ['the dropped food\'s own aliases come along', (() => { const t = fresh(); t.customFoods[1].alias = ['Old pot']; mergeFoods(t, ID1, ID2, false); return JSON.stringify(t.customFoods[0].alias) === JSON.stringify(['Old pot', scanned.n]) })()],
      ['an alias that is another saved food\'s name never counts', (() => { const t = fresh(); t.customFoods[0].alias = [beef.n]; return aliasNames(t.customFoods).get(beef.n) === undefined })()],
    ])
  }
  {
    const s = fresh()
    // the scanned food isn't saved here (saved, its name would clash and stay as it was)
    s.customFoods.splice(1, 1)
    const next = { ...scanned, barcode: mine.barcode, k: 430, cat: undefined, eat: undefined } as Omit<Food, 'id'>
    const ch = foodChanges(mine, next)
    const up = updatedFood({ ...mine, notSame: [ID3], cat: 'ready', cook: true, _u: 'x' }, next, nameAfterUpdate(s.customFoods, mine, next))
    const keepName = updatedFood(mine, next, nameAfterUpdate(s.customFoods, mine, next, true))
    const st = asState({ ...s, customFoods: [up, s.customFoods[1]] })
    report('barcode update', [
      ['savedWithBarcode finds the saved food', savedWithBarcode(s.customFoods, mine.barcode)?.id === ID1],
      ['a UPC-A with its EAN-13 leading 0 is the same code', savedWithBarcode([{ ...mine, barcode: '0012345678905' }], '012345678905')?.id === ID1],
      ['no barcode, no match', savedWithBarcode(s.customFoods, undefined) === undefined],
      ['changes: name and energy only', ch.name?.[1] === scanned.n && ch.figures.length === 1 && ch.figures[0].field === 'k' && ch.figures[0].was === 428 && ch.figures[0].now === 430],
      ['changes: the rest summed up as unchanged', ch.same.join(',') === 'g,p,f,c'],
      ['nothing changes: no sheet', !hasChanges(foodChanges(mine, mine))],
      ['update keeps the id and notSame, takes the new figures and name', up.id === ID1 && up.k === 430 && up.n === scanned.n && up.notSame?.[0] === ID3],
      ['a new name keeps the old one as an alias; days untouched', JSON.stringify(up.alias) === JSON.stringify([mine.n]) && s.days['2026-10-01'].foods[0].n === mine.n && usuals(st, '2026-10-11', 'lunch')[0]?.n === scanned.n],
      ['category, cook and eat stay when the new version lacks them', up.cat === 'ready' && up.cook === true && up.eat === true],
      ['"Use the scanned one" keeps the saved name, no alias', keepName.n === mine.n && keepName.k === 430 && !keepName.alias],
      ['a name another saved food has is not taken', nameAfterUpdate(s.customFoods, mine, { n: 'beef & tomato POT NOODLE' }) === mine.n],
    ])
  }
  {
    const a = { ...mine }, b = { ...scanned }
    markDifferent(a, b)
    const longs = Array.from({ length: 30 }, (_, i) => `A very long earlier name for this food that goes on and on, number ${i} ` + 'x'.repeat(80))
    const st = loadStateFrom({ ...asState({ customFoods: [a, b, { ...beef, notSame: ['nope', 42 as unknown as string, ID1], alias: [7 as unknown as string, '  ', beef.n, 'Beef pot', ...longs] }], days: {} }) } as PersistedState)
    const cleaned = st.customFoods[2]
    const row = toServerFood({ ...a, alias: ['Old pot'] }, 'u1') as { meta: Record<string, unknown> }
    const back = fromServerFood({ id: ID1, name: a.n, kcal: 428, protein: 8.6, carbs: 57, fat: 17, grams: 90, ml: false, meta: row.meta })
    report('dismissed pairs and aliases', [
      ['"They\'re different" clears the pair for good', dismissed(a, b) && likelyPairs([a, b]).length === 0],
      ['either side remembering is enough', dismissed({ ...a, notSame: undefined }, b)],
      ['likelyPairs is memoised per list', (() => { const l = [mine, scanned]; return likelyPairs(l) === likelyPairs(l) && likelyPairs(l).length === 1 })()],
      ['saved data keeps notSame; odd values dropped on load', st.customFoods[0].notSame?.[0] === ID2 && JSON.stringify(cleaned.notSame) === JSON.stringify([ID1])],
      ['aliases on load: strings only, not its own name, capped, under the meta budget', !!cleaned.alias && cleaned.alias.length <= ALIAS_MAX && cleaned.alias.every((x) => typeof x === 'string' && x.trim() && x !== beef.n && x.length <= 120) && new TextEncoder().encode(JSON.stringify(toServerFood(cleaned, 'u1').meta)).length <= META_BUDGET],
      ['syncs in custom_foods.meta like the rest', JSON.stringify(row.meta.notSame) === JSON.stringify([ID2]) && back.notSame?.[0] === ID2 && back.alias?.[0] === 'Old pot'],
      ['merging keeps the dropped food\'s other dismissals', (() => { const t = fresh(); t.customFoods[1].notSame = [ID3]; mergeFoods(t, ID1, ID2, false); return t.customFoods[0].notSame?.[0] === ID3 })()],
    ])
  }
  await storeTests(fakeServer, fresh)
  await twoDevices(fakeServer, fresh)
  return bad
}

/** A Map-backed localStorage, so the store can load in node. */
function shimStorage(): void {
  const m = new Map<string, string>()
  const g = globalThis as { localStorage?: Storage }
  g.localStorage ??= { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, String(v)), removeItem: (k: string) => void m.delete(k), clear: () => m.clear(), key: () => null, length: 0 } as Storage
}

const serverFood = (f: Food) => ({ ...toServerFood(f, LOCAL_USER), updated_at: 'x' })

async function storeTests(fakeServer: FakeServer, fresh: () => { customFoods: Food[]; days: Record<string, DayLog> }): Promise<void> {
  shimStorage()
  const { useStore } = await import('@/store/store')
  const load = (drop?: string) => {
    const s = stateFromBackup({ ...fresh() } as never)
    if (drop) s.customFoods = s.customFoods.filter((f) => f.id !== drop)
    for (const f of s.customFoods) f._dirty = false
    const m = ensureMeta(s, false)
    m.settings.dirty = false
    for (const d of Object.keys(m.days)) m.days[d].dirty = false
    useStore.setState((st) => { st.data = s })
  }
  const data = () => useStore.getState().data
  const food = (id: string) => data().customFoods.find((f) => f.id === id)

  load()
  const daysBefore = JSON.stringify(data().days)
  useStore.getState().mergeCustomFoods(ID1, ID2, true)
  const afterMerge = structuredClone(data()) as PersistedState
  const rows: Record<string, any[]> = { settings: [], day_logs: [], recipes: [], custom_foods: [serverFood(mine), serverFood(scanned), serverFood(beef)] }
  await withFetch(fakeServer(rows).fetchFn, () => pushDirty(afterMerge, afterMerge._meta!))
  const kept = rows.custom_foods.find((r) => r.id === ID1)
  report('store: mergeCustomFoods', [
    ['the dropped food is gone and queued for delete', !food(ID2) && data()._meta!.foodDeletes.includes(ID2)],
    ['the kept food is dirty with the alias', food(ID1)?._dirty === true && food(ID1)?.alias?.[0] === scanned.n],
    ['no day is marked dirty or rewritten', !Object.values(data()._meta!.days).some((d) => d.dirty) && JSON.stringify(data().days) === daysBefore],
    ['on the server: the dropped food deleted, the kept one carries the alias', !rows.custom_foods.some((r) => r.id === ID2) && JSON.stringify(kept?.meta?.alias) === JSON.stringify([scanned.n]) && kept?.meta?.barcode === scanned.barcode],
    ['no day uploaded by the merge', rows.day_logs.length === 0],
  ])

  // the scanned food isn't saved here, so its name is free to take
  load(ID2)
  const up = useStore.getState().updateCustomFood(ID1, { ...scanned, barcode: mine.barcode, k: 430 } as Omit<Food, 'id'>)
  const upDays = JSON.stringify(data().days)
  const upClean = !Object.values(data()._meta!.days).some((d) => d.dirty)
  load()
  const clash = useStore.getState().updateCustomFood(ID1, { ...beef, n: 'BEEF & Tomato Pot Noodle', k: 999 } as Omit<Food, 'id'>)
  load()
  const kept2 = useStore.getState().updateCustomFood(ID1, { ...scanned, k: 431 } as Omit<Food, 'id'>, true)
  report('store: updateCustomFood', [
    ['takes the new name and figures, same id, dirty', up?.id === ID1 && up.n === scanned.n && up.k === 430 && up._dirty === true],
    ['the old name stays as an alias; days untouched', JSON.stringify(up?.alias) === JSON.stringify([mine.n]) && upDays === JSON.stringify(fresh().days) && upClean],
    ['a name another saved food holds is not taken (the name-collision guard)', clash?.n === mine.n && clash.k === 999 && !clash.alias && data().customFoods.filter((f) => f.n.toLowerCase() === beef.n.toLowerCase()).length === 1],
    ['keepName keeps the saved name', kept2?.n === mine.n && kept2.k === 431 && kept2._dirty === true],
    ['an unknown id changes nothing', useStore.getState().updateCustomFood('00000000-0000-4000-8000-000000000000', mine as Omit<Food, 'id'>) === null],
  ])
}

/** The phone logs on Tuesday (newer); the tablet, offline, merges the two foods; the tablet then
 *  syncs. The phone's Tuesday log must survive, and the tablet must end with it. */
async function twoDevices(fakeServer: FakeServer, fresh: () => { customFoods: Food[]; days: Record<string, DayLog> }): Promise<void> {
  const { useStore } = await import('@/store/store')
  const TUE = '2026-10-06'
  const rows: Record<string, any[]> = { settings: [], day_logs: [], recipes: [], custom_foods: [] }
  const srv = fakeServer(rows)
  // both devices start from the same synced state: both foods, and Tuesday's log of the other one
  const base = stateFromBackup({ ...fresh(), days: { [TUE]: { foods: [{ n: scanned.n, grams: 90, k: 387, p: 7.7, c: 51.3, f: 15.3, meal: 'lunch', src: 'custom' }], supps: {}, weight: null, workout: null } } } as never)
  const bm = ensureMeta(base, false)
  bm.days[TUE] = { u: '2026-10-06T12:00:00.000Z', dirty: true }
  for (const f of base.customFoods) f._dirty = true
  await withFetch(srv.fetchFn, () => pushDirty(base, bm))
  const phone = structuredClone(base) as PersistedState
  const tablet = structuredClone(base) as PersistedState

  // the phone (online) adds a newer Tuesday log and syncs it
  phone.days[TUE].foods.push({ n: 'Apple', grams: 100, k: 52, p: 0.3, c: 14, f: 0.2, meal: 'snack', src: 'db' })
  phone._meta!.days[TUE] = { u: '2026-10-06T19:00:00.000Z', dirty: true }
  await withFetch(srv.fetchFn, () => pushDirty(phone, phone._meta!))

  // the tablet (offline, older Tuesday) merges the other food into its own, then syncs
  useStore.setState((st) => { st.data = tablet })
  useStore.getState().mergeCustomFoods(ID1, ID2, false)
  const t = structuredClone(useStore.getState().data) as PersistedState
  await withFetch(srv.fetchFn, async () => { await pushDirty(t, t._meta!); await pullAll(t, t._meta!) })
  const tue = rows.day_logs.find((r) => r.log_date === TUE)
  const tueFoods = (tue?.foods || []) as LoggedFood[]
  report('two devices: a merge on an offline tablet', [
    ["the phone's newer Tuesday log survives on the server", tueFoods.some((x) => x.n === 'Apple') && tueFoods.some((x) => x.n === scanned.n)],
    ['the tablet ends with it after its sync', t.days[TUE].foods.some((x) => x.n === 'Apple')],
    ['the merge reached the server: one food, with the alias', rows.custom_foods.length === 2 && !rows.custom_foods.some((r) => r.id === ID2) && rows.custom_foods.find((r) => r.id === ID1)?.meta?.alias?.[0] === scanned.n],
    ["the tablet counts Tuesday's log as the kept food", timesLogged(t.days, t.customFoods.find((f) => f.id === ID1)!) === 1],
  ])
}
