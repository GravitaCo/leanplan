/* The Food screens' view model (src/screens/food/foodModel.ts, duplicateModel.ts): what the web and
   native Food screens both show. Run from scripts/test-core.ts (npm test); returns the failures. */
import type { Food, LoggedFood } from '@/core/types'
import { FOODS } from '@/core/data/foods'
import { loadStateFrom, type PersistedState } from '@/data/persistence'
import { buildEntry, type Portion } from '@/core/domain/estimate'
import {
  allFoods, asIngredient, browseFoods, draftProblem, draftTotals, editAmount, foodDay, gramsMax, ingredientMatches, isMine, kitchenAdds, mealGroups,
  mealKcal, mealNames, numIn, portionModes, portionPreview, portionStart, quickEntry, recipeSteps, searchFoods, swapText,
} from '@/screens/food/foodModel'
import { barcodeEnd, barcodeUpdate, duplicateSaveStep, likelySame, originLine, sameFood } from '@/screens/food/duplicateModel'

const DAY = '2026-11-14', YDAY = '2026-11-13'
const food = (n: string): Food => FOODS.find((f) => f.n === n)!
const e = (n: string, k: number, meal: LoggedFood['meal'], x: Partial<LoggedFood> = {}): LoggedFood => ({ n, k, p: 10, c: 10, f: 5, grams: 100, meal, how: 'serv', ...x })
function st(x: Partial<PersistedState> = {}, profile: Record<string, unknown> = {}): PersistedState {
  const s = loadStateFrom(null)
  s.days[DAY] = { foods: [e('Porridge', 300, 'breakfast'), e('Banana', 100, 'breakfast'), e('Apple', 80, undefined)], supps: {}, weight: 70, workout: null }
  s.days[YDAY] = { foods: [e('Soup', 250, 'lunch'), e('Bread', 90, 'lunch')], supps: {}, weight: null, workout: null }
  Object.assign(s.profile, profile)
  return Object.assign(s, x)
}

export function foodModelSuite(): number {
  let bad = 0
  const check = (n: string, ok: boolean, detail?: unknown) => { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', 'food model:', n, !ok && detail !== undefined ? JSON.stringify(detail) : '') }

  // the day: groups keep each entry's index; shortcuts offered only where a meal qualifies
  const s = st()
  const g = mealGroups(s.days[DAY].foods)
  check('groups by meal, with day indexes', g.breakfast.map((x) => x._i).join() === '0,1' && g.other[0]._i === 2 && !g.lunch.length)
  check('meal names: three, then …', mealNames([{ n: 'a' }, { n: 'b' }, { n: 'c' }, { n: 'd' }]) === 'a, b, c…' && mealNames([{ n: 'a' }]) === 'a')
  check('meal kcal', mealKcal(g.breakfast) === 400)
  const fd = foodDay(s, DAY)
  check('numbers card by default', fd.card === 'numbers' && !fd.noKcal && fd.totals.k === 480)
  check('same as yesterday: lunch, empty today', fd.sameAsYesterday.length === 1 && fd.sameAsYesterday[0].m === 'lunch' && fd.sameAsYesterday[0].yd.length === 2)
  check('save as recipe: breakfast, two items', fd.saveable.join() === 'breakfast')
  check('gentle: numbers card, kcal hidden', (() => { const d = foodDay(st({}, { gentle: true }), DAY); return d.card === 'numbers' && d.noKcal && d.gentle })())
  const yes = foodDay(st({}, { outcomes: { readiness: 'clear', wellbeing: 'flagged', baseline: 'ok' }, gentle: true }), DAY)
  check('Yes: words card, no kcal anywhere', yes.card === 'yes' && yes.noKcal, yes.card)
  const some = foodDay(st({}, { outcomes: { readiness: 'clear', wellbeing: 'sometimes', baseline: 'ok' } }), DAY)
  check('Sometimes: range card with a protein range', some.card === 'sometimes' && !!some.proteinRange, { card: some.card, pr: some.proteinRange })

  // search and browse: built-ins first, then the user's own ("Mine")
  const mine: Food = { id: '11111111-1111-4111-8111-111111111111', n: 'Whopper style burger, homemade', k: 200, p: 12, c: 15, f: 10, g: 250 }
  const all = allFoods([mine])
  check('all foods: built-ins then mine', all.length === FOODS.length + 1 && isMine(FOODS.length) && !isMine(0))
  const sr = searchFoods(st(), all, '  Burger King WHOPPER ')
  check('search: the Whopper first, trimmed and any case', sr.foods[0]?.f.n === 'Burger King Whopper', sr.foods.slice(0, 3).map((o) => o.f.n))
  check('search: my food found, with its index', searchFoods(st(), all, 'whopper').foods.some((o) => o.f === mine && isMine(o.i)))
  check('search: at most 50', searchFoods(st(), all, 'chicken').foods.length === 50)
  const withRecipe = st({ recipes: [{ id: 'r1', name: 'Chicken curry', servings: 4, items: [asIngredient(food('Chicken breast, raw, skinless'))] }] })
  check('search: recipes holding every word', searchFoods(withRecipe, all, 'curry chicken').recipes.length === 1 && searchFoods(withRecipe, all, 'beef curry').recipes.length === 0)
  const br = browseFoods(st({ customFoods: [] }), allFoods([]), DAY, 'lunch')
  check('browse: nothing recent or saved → eight common foods', br.common.length === 8 && br.common[0] === FOODS[0], br.common.length)

  // portion: where it opens, and what it logs
  const roll = food('Greggs Sausage Roll'), whopper = food('Burger King Whopper'), chicken = food('Chicken breast, raw, skinless')
  const fresh = st()
  const p0 = portionStart(fresh, roll)
  check('portion: a new food opens at one serving', p0.mode === 'serv' && p0.serv === 1 && p0.grams === roll.g && p0.learned === null)
  check('portion: precise users open in grams', portionStart(st({}, { accuracy: 'precise' }), chicken).mode === 'g')
  const served = st(); served.days[YDAY].foods.push({ ...buildEntry(roll, { mode: 'serv', serv: 2 }, 'lunch', served.profile, { custom: false, fat: null, askFat: false }).entry })
  const p1 = portionStart(served, roll)
  check('portion: last time two servings → opens at two servings', p1.mode === 'serv' && p1.serv === 2, p1)
  const weighed = st(); weighed.days[YDAY].foods.push({ ...buildEntry(chicken, { mode: 'g', grams: 180, learned: null }, 'dinner', weighed.profile, { custom: false, fat: null, askFat: false }).entry })
  const p2 = portionStart(weighed, chicken)
  check('portion: last time 180 g → opens in grams at 180', p2.mode === 'g' && p2.grams === 180 && p2.learned === 180, p2)
  check('portion modes: hands for meat, none for a per-item food', portionModes(chicken)?.map((m) => m[0]).join() === 'serv,g,hand' && portionModes({ ...roll, each: true }) === null)
  check('portion modes: millilitres for a drink', portionModes(food('Coffee, black'))?.[1][1] === 'Millilitres')
  const one: Portion = { mode: 'serv', serv: 1 }
  check('one Whopper = 595 kcal, as Burger King publishes', Math.round(portionPreview(whopper, one, 'lunch', fresh.profile, false, null).kcal) === 595)
  const pv = portionPreview(chicken, one, 'dinner', fresh.profile, false, 'tsp')
  check('cooking fat: asked for raw chicken, added as its own entry', pv.askFat && pv.toLog?.length === 2 && pv.kcal === pv.entry.k + pv.fatEntry!.k)
  check('nothing to log at 0 g', portionPreview(chicken, { mode: 'g', grams: 0, learned: null }, 'dinner', fresh.profile, false, null).toLog === null)
  check('grams slider: four servings, at least 50', gramsMax(roll) === Math.round(roll.g * 4) && gramsMax({ ...roll, g: 5 }) === 50)

  // edit entry: items snap to quarters and the multiplier follows
  const item = e('Egg', 80, 'breakfast', { grams: 2, unit: 'item' })
  const ea = editAmount(item, 1.1)
  check('edit: 2 items × 1.1 snaps to 2.25 items, ×1.125', ea.amount === 2.25 && ea.mult === 1.125, ea)
  check('edit: grams keep the slider multiplier', editAmount(e('Rice', 200, 'lunch', { grams: 150 }), 1.1).mult === 1.1)

  // recipes
  check('draft: unreadable servings count as 1', draftTotals({ name: 'x', servings: '', items: [] }).servings === 1)
  const rs = [{ id: 'a', name: 'Curry', servings: 2, items: [] }]
  check('draft problems: name, items, a taken name', draftProblem({ name: ' ', servings: '1', items: [] }, rs) === 'name'
    && draftProblem({ name: 'Soup', servings: '1', items: [] }, rs) === 'items'
    && draftProblem({ id: 'b', name: 'curry ', servings: '1', items: [asIngredient(roll)] }, rs) === 'taken'
    && draftProblem({ id: 'b', name: 'Stew', servings: '1', items: [asIngredient(roll)] }, rs) === null)
  check('ingredient search: nothing typed, nothing shown; at most 30', ingredientMatches(all, ' ').length === 0 && ingredientMatches(all, 'chicken').length === 30)
  check('serving steps: an odd count slots in', recipeSteps(1).join() === '0.5,1,1.5,2,3' && recipeSteps(2.5).join() === '0.5,1,1.5,2,2.5')

  // What can I make?
  check('kitchen adds: up to six, never a chip already there', (() => { const a = kitchenAdds(all, ['Onion'], 'onion'); return a.length <= 6 && !a.some((f) => f.n === 'Onion') })())
  check('swap text: per serving, gentle hides kcal',
    swapText({ from: 'Beef mince', to: { n: 'Quorn mince' } as Food, delta: { k: -128, p: -18 }, reason: 'meat' } as never, false, 2) === 'Swap Beef mince → Quorn mince (−64 kcal, −9 g protein per serving)'
    && swapText({ from: 'Beef mince', to: { n: 'Quorn mince' } as Food, delta: { k: -128, p: -18 }, reason: 'meat' } as never, true, 2) === 'Swap Beef mince → Quorn mince (−9 g protein per serving)')

  // quick estimate
  check('quick estimate: needs calories', quickEntry({ n: '', k: '0', p: '', c: '', fat: '' }, 'lunch', 0.3) === null)
  const q = quickEntry({ n: ' ', k: '650', p: '30', c: 'x', fat: '' }, 'lunch', 0.3)
  check('quick estimate: named "Quick estimate", unreadable fields 0', q?.n === 'Quick estimate' && q.k === 650 && q.p === 30 && q.c === 0 && q.how === 'quick' && q.err === 0.3)

  check('typed numbers: comma decimals, thousands, junk', numIn('12,5') === 12.5 && numIn('1,200') === 1200 && numIn('1,200.5') === 1200.5 && numIn(' 7 ') === 7 && numIn('') === 0 && numIn('x') === 0 && numIn('150') === 150)

  // duplicates
  const saved: Food = { id: '22222222-2222-4222-8222-222222222222', n: 'Tesco Greek Style Yogurt', k: 93, p: 5.6, c: 4.9, f: 5.7, g: 150, barcode: '5000000000017' }
  check('save: same barcode, same figures → open it', duplicateSaveStep([saved], { ...saved }).kind === 'open')
  check('save: same barcode, new figures → ask to update', duplicateSaveStep([saved], { ...saved, k: 99 }).kind === 'barcode')
  check('save: looks like a saved one → show both', duplicateSaveStep([saved], { n: 'Greek Style Yogurt Tesco', k: 93, p: 5.6, c: 4.9, f: 5.7, g: 150 }).kind === 'like')
  check('save: something new → save', duplicateSaveStep([saved], { n: 'Flapjack', k: 450, p: 5, c: 60, f: 20, g: 80 }).kind === 'save')
  const bu = barcodeUpdate([saved], saved, { ...saved, k: 99, g: 125 })
  check('dup-1: what changes, old → new', bu.figures.map((x) => `${x.label} ${x.was}→${x.now}`).join('; ') === 'Energy (kcal) 93→99; Serving 150 g→125 g' && bu.title === 'Update your saved Tesco Greek Style Yogurt?', bu)
  const ls = likelySame(saved, { n: 'Greek yogurt', k: 93, p: 5.6, c: 4.9, f: 5.7, g: 150 }, 'typed')
  check('dup-2: typed reads "New", barcode row while either has one', ls.theirs === 'New' && ls.rows.map((r) => r.label).join() === 'Energy (kcal),Protein,Serving,Barcode ends' && ls.rows[3].theirs === '—')
  check('barcode end and origin', barcodeEnd('5000000000017') === '…0017' && originLine({ ...saved, src: 'off:1' }) === 'From Open Food Facts · barcode …0017')
  const other: Food = { ...saved, id: '33333333-3333-4333-8333-333333333333', n: 'Greek Style Yogurt Tesco', barcode: undefined }
  const sd = st(); sd.days[YDAY].foods.push(e(other.n, 140, 'snack'), e(other.n, 140, 'snack'))
  const sf = sameFood(sd, DAY, [saved, other])
  check('dup-4: keeps the one with more logs', sf.defaultKeep === 1 && sf.logs.join() === '0,2')
  check('dup-4: what keeping does', sf.outcome(1).what === 'Tesco Greek Style Yogurt has no logs to move.' && sf.outcome(0).what.startsWith('The 2 logs of Greek Style Yogurt Tesco move to Tesco Greek Style Yogurt.'), sf.outcome(0).what)
  check('dup-4: barcode switch only when the dropped one has a different barcode', sf.outcome(1).switchable && !sf.outcome(0).switchable)
  return bad
}
