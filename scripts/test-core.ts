/** `npm test` — unit tests for the accuracy checks and unit maths (core/, no DOM). */
import { checkPer100, checkRecipe, isCookedState } from '@/core/domain/checks'
import { scaleFood, recipeTotals, amountText, roundAmount } from '@/core/domain/nutrition'
import { currentConsent, newConsent } from '@/data/consent'
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
]
// consent: only an explicit, complete record for the current version counts
const cn = newConsent()
extra.push(
  ['consent current', String(!!currentConsent(cn)), 'true'],
  ['consent old version', String(!!currentConsent({ ...cn, v: '2000-01-01' })), 'false'],
  ['consent missing health', String(!!currentConsent({ ...cn, health: false })), 'false'],
  ['consent none', String(!!currentConsent(null)), 'false'],
  ['consent tied to account', String(newConsent('u1').uid) + '|' + String(cn.uid), 'u1|undefined'],
)
for (const [n, got, want] of extra) { const ok = got === want; if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', n, JSON.stringify(got), ok ? '' : 'want ' + JSON.stringify(want)) }
process.exit(bad ? 1 : 0)
