/** `npm test` — unit tests for the accuracy checks and unit maths (core/, no DOM). */
import { checkPer100, checkRecipe, isCookedState } from '@/core/domain/checks'
import { rankByName } from '@/core/domain/search'
import { FOODS } from '@/core/data/foods'
import { SOURCES } from '@/core/data/sources'
import { buildEntry } from '@/core/domain/estimate'
import { DEFAULT_PROFILE } from '@/core/data/constants'
import { scaleFood, recipeTotals, amountText, roundAmount } from '@/core/domain/nutrition'
const G = { k: true, macros: true }
const lv = (v: any, g = G) => checkPer100(v, g).map((c) => c.level + (c.fix ? ':' + c.fix.k : '')).join(',')
const cases: [string, string, string][] = [
  ['ok chicken', lv({ k: 165, p: 31, c: 0, f: 3.6 }), ''],
  ['kJ typed', lv({ k: 690, p: 31, c: 0, f: 3.6 }), 'warn:165'],
  ['kJ > 900', lv({ k: 2250, p: 20, c: 50, f: 30 }), 'warn:538'],
  ['per-serving', lv({ k: 700, p: 40, c: 60, f: 30 }).startsWith('warn') ? 'y' : 'n', 'y'],
  ['missing kcal', lv({ k: 0, p: 10, c: 20, f: 5 }, { k: false, macros: true }), 'warn:165'],
  ['beer: macros too small to judge', lv({ k: 43, p: 0.5, c: 3.6, f: 0 }), ''],
  ['prosecco: alcohol not kJ', lv({ k: 84, p: 0.3, c: 5.1, f: 0 }), 'info'],
  ['sugar: CoFID 105 g carbs', lv({ k: 394, p: 0, c: 105, f: 0 }), ''],
  ['per-item burger', checkPer100({ k: 595, p: 29, c: 53, f: 30 }, G, true).length === 0 ? 'ok' : 'bad', 'ok'],
  ['only kcal typed', lv({ k: 250, p: 0, c: 0, f: 0 }, { k: true, macros: false }), ''],
  ['negative', lv({ k: -1, p: 0, c: 0, f: 0 }), 'warn'],
  ['cooked state', String(isCookedState('Chicken breast, cooked') && !isCookedState('Oats, dry') && isCookedState('Potato, boiled')), 'true'],
  ['recipe empty amt', checkRecipe([{ n: 'Oil', k: 884, p: 0, c: 0, f: 100, grams: 0 }]).map((c) => c.level).join(), 'warn'],
]
let bad = 0
for (const [n, got, want] of cases) { const ok = got === want; if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', n, JSON.stringify(got), ok ? '' : 'want ' + JSON.stringify(want)) }
// per-item maths
const zinger = { n: 'Z', k: 468, p: 23, c: 43, f: 22, g: 1, each: true }
const extra: [string, string, string][] = [
  ['scale 2 items', String(scaleFood(zinger, 2).k), '936'],
  ['scale 150 g', String(scaleFood({ n: 'C', k: 148, p: 32, c: 0, f: 2.2, g: 150 }, 150).k), '222'],
  ['recipe with item', String(Math.round(recipeTotals({ id: '', name: '', servings: 1, items: [{ ...zinger, grams: 1 }, { n: 'Rice', k: 138, p: 2.6, c: 31, f: 0.4, grams: 200 }] }).k)), '744'],
  ['amount text', [amountText(0.5, 'item'), amountText(2, 'item'), amountText(150, 'g')].join('|'), '½ item|2 items|150 g'],
  ['round items to ¼', String(roundAmount(1.3, 'item')), '1.25'],
  ['search: greggs sausage', rankByName(['Greggs 6 Mini Sausage Rolls', 'Greggs Bacon & Sausage Breakfast Baguette', 'Greggs Sausage Roll', 'Pork sausage, cooked'], (x) => x, ['greggs', 'sausage'])[0], 'Greggs Sausage Roll'],
  ['search: word start beats mid-word', rankByName(['Pineapple', 'Apple'], (x) => x, ['apple'])[0], 'Apple'],
  ['search: egg ignores "Greggs"', rankByName(['Greggs BLT', 'Egg, whole', 'Greggs Free Range Egg Pot'], (x) => x, ['egg']).join('|'), 'Egg, whole|Greggs Free Range Egg Pot'],
  ['search: eggs -> egg', rankByName(['Greggs BLT', 'Egg, whole'], (x) => x, ['eggs']).join('|'), 'Egg, whole'],
  ['search: whole word first', rankByName(['Milkshake', 'Milk, whole'], (x) => x, ['milk'])[0], 'Milk, whole'],
  ['search: burger keeps Cheeseburger', rankByName(['Beef burger patty', 'Cheeseburger, fast food'], (x) => x, ['burger']).join('|'), 'Beef burger patty|Cheeseburger, fast food'],
  ['search: berries keeps Strawberries', rankByName(['Mixed berries', 'Strawberries'], (x) => x, ['berries']).join('|'), 'Mixed berries|Strawberries'],
  ['search: peas keeps Chickpeas (no pea->pear)', rankByName(['Pear', 'Peach', 'Chickpeas, cooked'], (x) => x, ['peas']).join('|'), 'Chickpeas, cooked'],
  ['search: eggs -> egg, not Greggs', rankByName(['Greggs BLT', 'Egg, whole', 'Greggs Free Range Egg Pot'], (x) => x, ['eggs']).join('|'), 'Egg, whole|Greggs Free Range Egg Pot'],
  ['search: ties keep db order', rankByName(['Chicken breast, cooked', 'Chicken soup'], (x) => x, ['chicken'])[0], 'Chicken breast, cooked'],
]
for (const [n, got, want] of extra) { const ok = got === want; if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', n, JSON.stringify(got), ok ? '' : 'want ' + JSON.stringify(want)) }
// Chain foods: one serving, through the app's real logging path, must show exactly the kcal the
// data implies (the importers separately assert that equals the chain's published per-portion kcal).
{
  const chain = FOODS.filter((f) => f.src && SOURCES[f.src.split(':')[0]]?.err)
  const off = chain.filter((f) => {
    const e = buildEntry(f, { mode: 'serv', serv: 1 }, 'lunch', DEFAULT_PROFILE as never, { custom: false, fat: null, askFat: false }).entry
    return Math.round(e.k) !== Math.round((f.k * f.g) / (f.each ? 1 : 100))
  })
  const ok = off.length === 0; if (!ok) bad++
  console.log(ok ? 'PASS' : 'FAIL', `chain servings match their data (${chain.length} foods)`, ok ? '' : off.map((f) => f.n).join(', '))
  const whopper = FOODS.find((f) => f.n === 'Burger King Whopper')!, roll = FOODS.find((f) => f.n === 'Greggs Bacon Breakfast Roll')!
  const serving = (f: typeof roll) => String(Math.round(buildEntry(f, { mode: 'serv', serv: 1 }, 'lunch', DEFAULT_PROFILE as never, { custom: false, fat: null, askFat: false }).entry.k))
  for (const [n, got, want] of [['Greggs bacon roll = 321 (published)', serving(roll), '321'], ['Whopper = 595 (published)', serving(whopper), '595']]) {
    const ok2 = got === want; if (!ok2) bad++; console.log(ok2 ? 'PASS' : 'FAIL', n, JSON.stringify(got))
  }
}
process.exit(bad ? 1 : 0)
