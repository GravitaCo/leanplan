/* Duplicate saved foods (boards dup-1 to dup-4): the match rule (nutrition-accuracy, Oct 2026),
   barcode updates, merging (logs and usuals move, logged calories unchanged) and dismissed pairs.
   Run from scripts/test-core.ts (npm test); returns the number of failures. */
import type { AppState, DayLog, Food, LoggedFood } from '@/core/types'
import { DEFAULT_PROFILE, DEFAULT_TARGET } from '@/core/data/constants'
import { usuals } from '@/core/domain/insights'
import { dismissed, figuresMatch, foodChanges, hasChanges, likelyPairs, likelySame, likelySaved, markDifferent, mergeFoods, moveLogs, nameWords, namesMatch, savedWithBarcode, timesLogged, updatedFood } from '@/core/domain/duplicates'
import { loadStateFrom, type PersistedState } from '@/data/persistence'
import { fromServerFood, toServerFood } from '@/data/sync'

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

export function duplicatesSuite(): number {
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
  const fresh = (): { customFoods: Food[]; days: Record<string, DayLog> } => {
    const day = (foods: LoggedFood[]): DayLog => ({ foods, supps: {}, weight: null, workout: null })
    const e = (n: string, k: number, src: LoggedFood['src'] = 'custom'): LoggedFood => ({ n, grams: 90, k, p: 7.7, c: 51.3, f: 15.3, meal: 'lunch', src, how: 'serv', serv: 1 })
    return {
      customFoods: [{ ...mine }, { ...scanned }, { ...beef }],
      days: {
        '2026-10-01': day([e(mine.n, 385)]),
        '2026-10-02': day([e(mine.n, 385)]),
        '2026-10-03': day([e(scanned.n, 387), { n: 'Butter', grams: 5, k: 37, p: 0, c: 0, f: 4.1, src: 'fat', fatFor: scanned.n, meal: 'lunch' }]),
        '2026-10-04': day([e(scanned.n, 387), e('Banana', 89, 'db')]),
      },
    }
  }
  const asState = (x: ReturnType<typeof fresh>): AppState => ({ target: { ...DEFAULT_TARGET }, schedule: {} as AppState['schedule'], profile: { ...DEFAULT_PROFILE }, recipes: [], routines: [], trainingPlans: [], ...x })
  {
    const s = fresh()
    const kcalBefore = Object.values(s.days).flatMap((d) => d.foods).reduce((a, x) => a + x.k, 0)
    const r = mergeFoods(s, ID1, ID2, true)
    const kcalAfter = Object.values(s.days).flatMap((d) => d.foods).reduce((a, x) => a + x.k, 0)
    const keep = s.customFoods.find((f) => f.id === ID1)!
    const u = usuals(asState(s), '2026-10-11', 'lunch')
    report('merge', [
      ['the other food is removed and reported for the delete', !s.customFoods.some((f) => f.id === ID2) && r?.removed === ID2],
      ['its logs move to the kept food', timesLogged(s.days, mine.n) === 4 && timesLogged(s.days, scanned.n) === 0],
      ['the cooking fat follows', s.days['2026-10-03'].foods[1].fatFor === mine.n],
      ['logged calories unchanged', kcalBefore === kcalAfter && s.days['2026-10-03'].foods[0].k === 387],
      ['changed days listed for sync', JSON.stringify(r?.days) === JSON.stringify(['2026-10-03', '2026-10-04'])],
      ['a database food of another name untouched', s.days['2026-10-04'].foods[1].n === 'Banana'],
      ['usuals: one usual lunch, counted across both', u.length === 1 && u[0].n === mine.n && u[0].count === 4],
      ['takes the other barcode when asked', keep.barcode === scanned.barcode],
      ['keeps its own barcode when not', (() => { const t = fresh(); mergeFoods(t, ID1, ID2, false); return t.customFoods[0].barcode === mine.barcode })()],
      ['merging a food into itself does nothing', mergeFoods(fresh(), ID1, ID1, true) === null],
    ])
  }
  {
    const s = fresh()
    const next: Omit<Food, 'id'> = { ...scanned, id: undefined, barcode: mine.barcode, k: 430 } as Omit<Food, 'id'>
    const ch = foodChanges(mine, next)
    const up = updatedFood({ ...mine, notSame: [ID3], _u: 'x' }, next)
    const keepName = updatedFood(mine, next, true)
    const moved = moveLogs(s.days, mine.n, up.n)
    report('barcode update', [
      ['savedWithBarcode finds the saved food', savedWithBarcode(s.customFoods, mine.barcode)?.id === ID1],
      ['a UPC-A with its EAN-13 leading 0 is the same code', savedWithBarcode([{ ...mine, barcode: '0012345678905' }], '012345678905')?.id === ID1],
      ['no barcode, no match', savedWithBarcode(s.customFoods, undefined) === undefined],
      ['changes: name and energy only', ch.name?.[1] === scanned.n && ch.figures.length === 1 && ch.figures[0].field === 'k' && ch.figures[0].was === 428 && ch.figures[0].now === 430],
      ['changes: the rest summed up as unchanged', ch.same.join(',') === 'g,p,f,c'],
      ['nothing changes: no sheet', !hasChanges(foodChanges(mine, mine))],
      ['update keeps the id, notSame and takes the new figures', up.id === ID1 && up.k === 430 && up.n === scanned.n && up.notSame?.[0] === ID3],
      ['"Use the scanned one" keeps the saved name', keepName.n === mine.n && keepName.k === 430],
      ['logs follow a renamed food, numbers as logged', moved.join(',') === '2026-10-01,2026-10-02' && s.days['2026-10-01'].foods[0].n === scanned.n && s.days['2026-10-01'].foods[0].k === 385],
    ])
  }
  {
    const a = { ...mine }, b = { ...scanned }
    markDifferent(a, b)
    const st = loadStateFrom({ ...asState({ customFoods: [a, b, { ...beef, notSame: ['nope', 42 as unknown as string, ID1] }], days: {} }) } as PersistedState)
    const row = toServerFood(a, 'u1') as { meta: Record<string, unknown> }
    const back = fromServerFood({ id: ID1, name: a.n, kcal: 428, protein: 8.6, carbs: 57, fat: 17, grams: 90, ml: false, meta: row.meta })
    report('dismissed pairs', [
      ['"They\'re different" clears the pair for good', dismissed(a, b) && likelyPairs([a, b]).length === 0],
      ['either side remembering is enough', dismissed({ ...a, notSame: undefined }, b)],
      ['saved data keeps it; odd values dropped by the migration', st.customFoods[0].notSame?.[0] === ID2 && JSON.stringify(st.customFoods[2].notSame) === JSON.stringify([ID1])],
      ['syncs in custom_foods.meta like the rest', JSON.stringify(row.meta.notSame) === JSON.stringify([ID2]) && back.notSame?.[0] === ID2],
      ['merging keeps the dropped food\'s other dismissals', (() => { const t = fresh(); t.customFoods[1].notSame = [ID3]; mergeFoods(t, ID1, ID2, false); return t.customFoods[0].notSame?.[0] === ID3 })()],
    ])
  }
  return bad
}
