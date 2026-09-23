/** `npm test` — unit tests for the accuracy checks and unit maths (core/, no DOM). */
import { checkPer100, checkRecipe, isCookedState } from '@/core/domain/checks'
import { rankByName } from '@/core/domain/search'
import { FOODS } from '@/core/data/foods'
import { SOURCES } from '@/core/data/sources'
import { buildEntry, scaleEntry } from '@/core/domain/estimate'
import { refMismatches } from '@/core/data/validate'
import { entryAmount, relog } from '@/core/domain/insights'
import LIVE from './fixtures-live-servings.json'
import { DEFAULT_PROFILE } from '@/core/data/constants'
import { suggestedTargets, PROTEIN_PER_KG } from '@/core/domain/nutrition'
import { DEMOS } from '@/core/data/media'
import { WORKOUTS } from '@/core/data/workouts'
import { tempoAt } from '@/core/domain/tempo'
import { lowSignals, offerLighter, shorterPrescription, shorterSets } from '@/core/domain/dayOptions'
import { SWAPS } from '@/core/data/workouts'
import { catchUp, sessionsThisWeek, welcomeBack, easyUntil } from '@/core/domain/training'
import { rangeFor, showBurnNote } from '@/core/domain/insights'
import { workoutBurn, workoutNetBurn } from '@/core/domain/workout'
import { CARDIO_MET, CARDIO_OPTIONS, LEGACY_CARDIO_MET, MET_SOURCES } from '@/core/data/constants'
import { existsSync } from 'node:fs'
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
// The guardrail itself: the original bacon-roll bug and its variants must be caught.
{
  const roll = { n: 'Test roll', k: 268.62, p: 15.9, c: 27.62, f: 10.04, g: 119.5, ref: { g: 119.5, k: 321, p: 19, c: 33, f: 12 } }
  const cases: [string, object, boolean][] = [
    ['exact data passes', roll, true],
    ['portion rounded to 120 g is caught', { ...roll, g: 120 }, false],
    ['per-100 kcal off by 1 is caught', { ...roll, k: 270.5 }, false],
    ['macro off by 0.5 g is caught', { ...roll, p: 16.4 }, false],
    ['pack-size serving allowed', { ...roll, n: 'Juice 500ml', g: 500 }, true],
  ]
  for (const [n, f, pass] of cases) {
    const ok = (refMismatches(f as never).length === 0) === pass; if (!ok) bad++
    console.log(ok ? 'PASS' : 'FAIL', 'guardrail:', n)
  }
}
// Multiples must equal the source's own figure times the multiple (Subway BMT x2 = 772, not 773)
{
  const off: string[] = []
  for (const f of FOODS) {
    const r = f.ref
    if (!r || r.g !== f.g) continue
    for (const v of [0.5, 2, 3]) {
      const e = buildEntry(f, { mode: 'serv', serv: v }, 'lunch', DEFAULT_PROFILE as never, { custom: false, fat: null, askFat: false }).entry
      if (Math.abs(e.k - r.k * v) >= 0.55) off.push(`${f.n} x${v}: ${Math.round(e.k)} vs ${r.k * v}`)
    }
  }
  const ok = off.length === 0; if (!ok) bad++
  console.log(ok ? 'PASS' : 'FAIL', 'multiples of published servings', off.slice(0, 5).join(', '))
}
// Re-logging a usual uses today's corrected data, not the old snapshot (a pre-fix Whopper at 640)
{
  const stale = { n: 'Burger King Whopper', grams: 287, k: 640, p: 83, c: 146, f: 103, src: 'db' as const, how: 'serv' as const, err: 0.2 }
  const got = String(Math.round(relog(stale, 'lunch').k))
  const ok = got === '595'; if (!ok) bad++
  console.log(ok ? 'PASS' : 'FAIL', 'relog refreshes a stale Whopper to 595', got)
  // live-era entries stored the serving rounded to whole grams: 119.5 g bacon roll saved as 120 g
  const roll = relog({ n: 'Greggs Bacon Breakfast Roll', grams: 120, k: 323, p: 19, c: 33, f: 12, src: 'db', how: 'serv', err: 0.2, serv: 1 }, 'lunch')
  const ok2 = Math.round(roll.k) === 321 && roll.grams === 119.5; if (!ok2) bad++
  console.log(ok2 ? 'PASS' : 'FAIL', 'relog of a live-era bacon roll (120 g) gives 321 kcal at 119.5 g', Math.round(roll.k), roll.grams)
  // every chain food: an entry exactly as the live build stored it (its own whole-gram serving
  // from the shipped data, x count, rounded) re-logs AND reopens to the published figure
  const off: string[] = []
  for (const f of FOODS.filter((x) => x.ref && x.ref.g === x.g && (LIVE as Record<string, number>)[x.n] != null)) {
    const liveG = (LIVE as Record<string, number>)[f.n]
    for (const v of [0.5, 1, 1.5, 2, 3]) {
      const x = { n: f.n, grams: f.each ? v : Math.round(liveG * v), k: 0, p: 0, c: 0, f: 0, src: 'db' as const, how: 'serv' as const, err: 0.2, serv: v, unit: f.each ? ('item' as const) : f.ml ? ('ml' as const) : undefined }
      const e = relog(x, 'lunch')
      const amt = entryAmount(x, f)
      const sheet = buildEntry(f, { mode: 'g', grams: amt, learned: amt }, 'lunch', DEFAULT_PROFILE as never, { custom: false, fat: null, askFat: false }).entry
      if (Math.abs(e.k - f.ref!.k * v) >= 0.55 || Math.abs(sheet.k - f.ref!.k * v) >= 0.55) off.push(`${f.n} x${v}: relog ${Math.round(e.k)}, sheet ${Math.round(sheet.k)} vs ${f.ref!.k * v}`)
    }
  }
  // opening the food again (search / Recent): the learned amount is today's exact serving
  const rollFood = FOODS.find((x) => x.n === 'Greggs Bacon Breakfast Roll')!
  const learned = entryAmount({ n: rollFood.n, grams: 120, k: 323, p: 19, c: 33, f: 12, src: 'db', how: 'serv', serv: 1 }, rollFood)
  const viaSheet = buildEntry(rollFood, { mode: 'g', grams: learned, learned }, 'lunch', DEFAULT_PROFILE as never, { custom: false, fat: null, askFat: false }).entry
  const ok4 = learned === 119.5 && Math.round(viaSheet.k) === 321 && viaSheet.how === 'usual'; if (!ok4) bad++
  console.log(ok4 ? 'PASS' : 'FAIL', 'portion sheet: live-era 120 g roll opens as 119.5 g = 321 kcal (usual)', learned, Math.round(viaSheet.k), viaSheet.how)
  // an edited entry keeps its own amount (10 g serving edited x1.25 = 12.5 g, serv rounded 1.3)
  const small = { n: 'x', k: 100, p: 0, c: 0, f: 0, g: 10 }
  const ok5 = entryAmount({ n: 'x', grams: 12.5, k: 12.5, p: 0, c: 0, f: 0, src: 'db', serv: 1.3 }, small) === 12.5; if (!ok5) bad++
  console.log(ok5 ? 'PASS' : 'FAIL', 'edited small serving keeps 12.5 g')
  const ok3 = off.length === 0; if (!ok3) bad++
  console.log(ok3 ? 'PASS' : 'FAIL', 'live-era entries (as actually stored) re-log and reopen to the published figure, x0.5-x3', off.slice(0, 5).join(', '))
}
// No rounding drift anywhere in the logging path, for every food: one serving, a fractional
// amount, and an edit (x1.5) must equal the exact maths to the stored precision (0.1).
{
  const drift: string[] = []
  const exact = (f: (typeof FOODS)[number], amt: number) => (f.k * amt) / (f.each ? 1 : 100)
  for (const f of FOODS) {
    const opts = { custom: false, fat: null, askFat: false }
    const one = buildEntry(f, { mode: 'serv', serv: 1 }, 'lunch', DEFAULT_PROFILE as never, opts).entry
    if (Math.abs(one.k - exact(f, f.g)) > 0.051) drift.push(`${f.n} serving`)
    if (!f.each) {
      const frac = buildEntry(f, { mode: 'g', grams: 123.4, learned: null }, 'lunch', DEFAULT_PROFILE as never, opts).entry
      if (Math.abs(frac.k - exact(f, 123.4)) > 0.051) drift.push(`${f.n} 123.4 g`)
    }
    const edited = scaleEntry(one, 1.5)
    if (Math.abs(edited.k - one.k * 1.5) > 0.051) drift.push(`${f.n} edit x1.5`)
  }
  const ok = drift.length === 0; if (!ok) bad++
  console.log(ok ? 'PASS' : 'FAIL', `no rounding drift in logging (${FOODS.length} foods)`, drift.slice(0, 5).join(', '))
}
// demo clips: every attached clip exists, its tempo is ordered and fits the clip, and the counter
// reads the phase on screen
{
  const clips = Object.values(WORKOUTS).flatMap((w) => w.ex.flatMap((e) => (e.video ? [[e.n, e.video] as const] : [])))
  const off = clips.flatMap(([n, m]) => {
    const why: string[] = []
    if (m.tempo[0]?.at !== 0) why.push('tempo must start at 0')
    m.tempo.forEach((p, i) => { if (i && p.at <= m.tempo[i - 1].at) why.push('phase ' + i + ' out of order') })
    if (m.tempo[m.tempo.length - 1].at >= m.durationSec) why.push('last phase starts after the clip ends')
    for (const f of [m.src, m.poster]) if (f && !/^https?:/.test(f) && !existsSync('public/videos/' + f)) why.push('missing public/videos/' + f)
    return why.map((w) => n + ': ' + w)
  })
  const ok = clips.length === 4 && off.length === 0; if (!ok) bad++
  console.log(ok ? 'PASS' : 'FAIL', 'demo clips', clips.length, off.join('; '))
  const at = (t: number) => { const s = tempoAt(DEMOS.romanianDeadlift, t); return [s.kind, s.rep, s.reps, s.count].join(':') }
  const got = [at(0), at(3.7), at(7.5), at(99)].join(' ')
  const want = 'ready::2:1 lower:1:2:2 stretch:1:2:1 squeeze:2:2:3'
  const ok2 = got === want; if (!ok2) bad++
  console.log(ok2 ? 'PASS' : 'FAIL', 'tempo counter', JSON.stringify(got), ok2 ? '' : 'want ' + JSON.stringify(want))
}
// workout plan D5: logged workouts stop widening the food range from profile.burnSwitch
// (activity level already counts training); sedentary users get net burn; history is frozen
{
  const lift = { type: 'Push' as const, ex: [] }
  const day = (workout: any) => ({ foods: [], supps: {}, weight: 75, workout })
  const st = (activityLevel: string, extra: any = {}) => ({
    target: { kcal: 2000, p: 0, c: 0, f: 0 }, schedule: {}, customFoods: [], recipes: [],
    profile: { activityLevel, rangeWidth: 100, burnSwitch: '2026-09-20', ...extra },
    days: { '2026-09-10': day(lift), '2026-09-21': day(lift) },
  }) as any
  const got = [
    workoutBurn(lift, 75), workoutNetBurn(lift, 75), // 3.5 × 75 × 0.75 = 197; 2.5 × 75 × 0.75 = 141
    rangeFor(st('light'), '2026-09-10').mid, rangeFor(st('light'), '2026-09-21').mid,
    rangeFor(st('sedentary'), '2026-09-21').mid, rangeFor(st('light', { burnSwitch: undefined }), '2026-09-21').mid,
    showBurnNote(st('light')), showBurnNote(st('light', { burnNoteSeen: true })),
    showBurnNote({ ...st('light'), days: { '2026-09-21': day(lift) } }),
  ].join(' ')
  const want = '197 141 2197 2000 2141 2197 true false false'
  const ok = got === want; if (!ok) bad++
  console.log(ok ? 'PASS' : 'FAIL', 'range: burn switch', JSON.stringify(got), ok ? '' : 'want ' + JSON.stringify(want))
  // no screen frames exercise as earning food (plan §0.8)
  const { readFileSync, readdirSync } = require('node:fs')
  const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e: any) => e.isDirectory() ? walk(d + '/' + e.name) : [d + '/' + e.name])
  const hits = walk('src').filter((f) => /\.tsx?$/.test(f) && /kcal of room|more room today/.test(readFileSync(f, 'utf8')))
  const ok2 = hits.length === 0; if (!ok2) bad++
  console.log(ok2 ? 'PASS' : 'FAIL', 'no "earn food" copy', hits.join(', '))
}
// cardio MET values (plan D11): every key has a 2024 Compendium code or a stated reason, the
// picker only offers real keys, old keys still resolve, and pre-switch days use the old values
{
  const noSource = Object.keys(CARDIO_MET).filter((k) => !MET_SOURCES[k])
  const noCode = Object.entries(MET_SOURCES).filter(([k, v]) => k !== 'Other' && !/^\d{5} /.test(v)).map(([k]) => k)
  const badOpt = CARDIO_OPTIONS.filter((k) => CARDIO_MET[k] == null)
  const lost = Object.keys(LEGACY_CARDIO_MET).filter((k) => CARDIO_MET[k] == null)
  const cardio = (cardioType: string, mins = '60') => ({ type: 'Cardio' as const, cardioType, mins })
  const got = [
    workoutBurn(cardio('Brisk walk'), 70), workoutBurn(cardio('Rower'), 70), workoutBurn(cardio('Rower'), 70, true),
    workoutBurn(cardio(''), 70), workoutBurn(cardio('', ''), 70, true), workoutNetBurn(cardio('Mobility', '10'), 75),
  ].join(' ')
  // 4.8×70=336; 5.0×70=350; legacy 6.0×70=420; blank → Other 3.0×70=210; legacy blank 4.0×70×25/60=117; (2.3−1)×75/6=16
  const want = '336 350 420 210 117 16'
  const ok = !noSource.length && !noCode.length && !badOpt.length && !lost.length && got === want; if (!ok) bad++
  console.log(ok ? 'PASS' : 'FAIL', 'cardio MET sources', JSON.stringify(got), noSource, noCode, badOpt, lost)
}
// day-of choices (plan §0.2, §4.0.5): own-pattern comparison, the 2-low rule, no score, and the
// shorter-version maths on every built-in prescription
{
  const ci = (x: any) => ({ mood: 0, hunger: 0, ...x })
  const week = (x: any) => Array.from({ length: 8 }, () => ci(x))
  const got = [
    lowSignals(ci({ sleep: 1, stress: 3 }), []).join('+'),              // no history: only the worst step counts
    lowSignals(ci({ sleep: 2, stress: 2 }), []).join('+') || '-',       // middling answers aren't low without history
    lowSignals(ci({ sleep: 2, energy: 2 }), week({ sleep: 3, energy: 3 })).join('+'), // worse than their usual
    lowSignals(ci({ sleep: 1, stress: 3 }), week({ sleep: 1, stress: 3 })).join('+') || '-', // their usual isn't flagged
    String(offerLighter(ci({ sleep: 1 }), [])), String(offerLighter(ci({ sleep: 1, energy: 1 }), [])),
    String(offerLighter(null, [])),
  ].join(' ')
  const want = 'sleep+stress - sleep+energy - false true false'
  const noScore = !('score' in (require('@/core/domain/dayOptions') as object))
  const ok = got === want && noScore; if (!ok) bad++
  console.log(ok ? 'PASS' : 'FAIL', 'day-of signals', JSON.stringify(got), ok ? '' : 'want ' + JSON.stringify(want))
  const ts = [...new Set([...Object.values(WORKOUTS).flatMap((w) => w.ex.map((e) => e.t))])].sort()
  const table = ts.map((t) => t + ' -> ' + shorterPrescription(t)).join('; ')
  const wantT = '20–30 min -> 12–18 min; 2–3 × 12 -> 2 × 12; 2–3 × 12–15 -> 2 × 12–15; 2–3 × 15 -> 2 × 15; 3 × 10 -> 2 × 10; 3 × 10–12 -> 2 × 10–12; 3 × 12–15 -> 2 × 12–15; 3 × 20–40 sec -> 2 × 20–40 sec'
  const edge = [shorterSets('2 × 8'), shorterSets('1 × 5'), shorterSets('5 × 5'), shorterPrescription('10 each way')].join(' ')
  const ok2 = table === wantT && edge === '1 1 3 10 each way'; if (!ok2) bad++
  console.log(ok2 ? 'PASS' : 'FAIL', 'shorter version', ok2 ? '' : JSON.stringify(table) + ' ' + edge)
  const ok3 = SWAPS.mobility.ex.length === 7 && SWAPS.mobility.cardioType === 'Mobility' && CARDIO_MET[SWAPS.walk.cardioType] === 3.0
  if (!ok3) bad++
  console.log(ok3 ? 'PASS' : 'FAIL', 'swap routines use sourced cardio keys')
}
// plans slide (plan §0.3, §0.4): catch-up picks at most one session, never edits the schedule,
// ignores days before the person started, and "welcome back" is asked once per 10+ day break
{
  // 2026-09-21 is a Monday. Schedule: Mon Legs, Wed Push, Fri Pull, others Rest.
  const schedule = { 0: 'Rest', 1: 'Legs', 2: 'Rest', 3: 'Push', 4: 'Rest', 5: 'Pull', 6: 'Rest' }
  const w = (type: string) => ({ foods: [], supps: {}, weight: null, workout: { type } })
  const e = { foods: [{ n: 'x' }], supps: {}, weight: null, workout: null }
  const st = (days: any, profile: any = {}) => ({ target: { kcal: 2000 }, schedule: { ...schedule }, profile, days, customFoods: [], recipes: [] }) as any
  const s1 = st({ '2026-09-20': e })                                // started Sunday; Monday Legs not done
  const before = JSON.stringify(s1.schedule)
  const got = [
    catchUp(s1, '2026-09-23'),                                       // Wed (Push): pick up Legs
    catchUp(st({ '2026-09-20': e, '2026-09-21': w('Legs') }), '2026-09-23') ?? '-', // Legs was done
    catchUp(st({ '2026-09-20': e, '2026-09-22': w('Legs') }), '2026-09-23') ?? '-', // done a day late: nothing to pick up
    catchUp(st({ '2026-09-22': e }), '2026-09-23') ?? '-',           // Monday was before they started
    catchUp(st({ '2026-09-20': e }), '2026-09-21') ?? '-',           // nothing planned in the window yet
    catchUp(st({ '2026-09-20': e, '2026-09-23': w('Push') }), '2026-09-23') ?? '-', // today already logged
    String(sessionsThisWeek(st({ '2026-09-21': w('Legs'), '2026-09-23': w('Push'), '2026-09-20': w('Pull') }), '2026-09-23')),
    String(welcomeBack(st({ '2026-09-01': w('Legs') }), '2026-09-23')),
    String(welcomeBack(st({ '2026-09-01': w('Legs') }, { welcomeAsked: '2026-09-15' }), '2026-09-23')),
    String(welcomeBack(st({ '2026-09-18': w('Legs') }), '2026-09-23')),
    String(welcomeBack(st({}), '2026-09-23')),
    easyUntil('2026-09-23'),
  ].join(' ')
  const want = 'Legs - - - - - 2 true false false false 2026-09-29'
  const ok = got === want && JSON.stringify(s1.schedule) === before; if (!ok) bad++
  console.log(ok ? 'PASS' : 'FAIL', 'plans slide', JSON.stringify(got), ok ? '' : 'want ' + JSON.stringify(want))
}
// fifth goal "feel better and move more" (plan D6): maintenance energy, sourced 1.2 g/kg protein
{
  const pr = { ...DEFAULT_PROFILE, sex: 'M', age: 35, height: 175, activityLevel: 'light', goal: 'feel-better', targetRate: 'aggressive' } as any
  const t = suggestedTargets(pr, 75) as any
  const got = [t.adjustPct, t.kcal === t.maint, t.p, PROTEIN_PER_KG['feel-better']].join(' ')
  const ok = got === '0 true 90 1.2'; if (!ok) bad++
  console.log(ok ? 'PASS' : 'FAIL', 'feel-better goal', JSON.stringify(got))
}
process.exit(bad ? 1 : 0)
