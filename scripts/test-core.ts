/** `npm test` — unit tests for the accuracy checks and unit maths (core/, no DOM). */
import { checkPer100, checkRecipe, isCookedState } from '@/core/domain/checks'
import { rankByName } from '@/core/domain/search'
import { FOODS } from '@/core/data/foods'
import { SOURCES } from '@/core/data/sources'
import { buildEntry, scaleEntry } from '@/core/domain/estimate'
import { refMismatches } from '@/core/data/validate'
import { entryAmount, relog } from '@/core/domain/insights'
import { dietFit, partsOf, swapsFor } from '@/core/domain/diet'
import { isStaple, suggestRecipes } from '@/core/domain/suggest'
import LIVE from './fixtures-live-servings.json'
import { DEFAULT_PROFILE } from '@/core/data/constants'
import { suggestedTargets, PROTEIN_PER_KG } from '@/core/domain/nutrition'
import { DEMOS } from '@/core/data/media'
import { WORKOUTS } from '@/core/data/workouts'
import { tempoAt } from '@/core/domain/tempo'
import { lowSignals, offerLighter, shorterPrescription, shorterSets } from '@/core/domain/dayOptions'
import { SWAPS } from '@/core/data/workouts'
import { catchUp, daysMovedThisWeek, welcomeBack, easyUntil } from '@/core/domain/training'
import { activitySuggestion, bandFor, trainingWeeks, onOrAfterBreak } from '@/core/domain/activity'
import { isTrainingSession } from '@/core/domain/workout'
import { shiftDay } from '@/core/domain/date'
import { sessionsOf, fromLegacy, mirrorOf, sessionBurn, sessionNetBurn, isHardSession } from '@/core/domain/sessions'
import { loadSignals, showLoadNote } from '@/core/domain/load'
import { MODALITY_MET } from '@/core/data/modalities'
import { rangeFor, showBurnNote, ensureBurnSwitch } from '@/core/domain/insights'
import { workoutBurn, workoutNetBurn } from '@/core/domain/workout'
import { CARDIO_MET, CARDIO_OPTIONS, LEGACY_CARDIO_MET, MET_SOURCES } from '@/core/data/constants'
import { existsSync } from 'node:fs'
import { backupSummary, ensureMeta, freshForAccount, keepForAccount, ownerCheck, stateFromBackup, type PersistedState } from '@/data/persistence'
import { pushDirty, pullAll } from '@/data/sync'
import { uuid, UUID_RE, LOCAL_USER } from '@/data/supabase'
import { EXERCISES, EXERCISE_BY_ID } from '@/core/data/exercises'
import { alternativesFor, fmtSet, holdAt, holdTarget, lastLogged, setHasData, stepOf } from '@/core/domain/library'
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
    lowSignals(ci({ sleep: 1, stress: 3 }), week({ sleep: 1, stress: 3 })).join('+') || '-', // the worst step always counts, even when usual
    lowSignals(ci({ sleep: 2, stress: 2 }), week({ sleep: 2, stress: 2 })).join('+') || '-', // their usual middle isn't flagged
    String(offerLighter(ci({ sleep: 1 }), [])), String(offerLighter(ci({ sleep: 1, energy: 1 }), [])),
    String(offerLighter(null, [])),
  ].join(' ')
  const want = 'sleep+stress - sleep+energy sleep+stress - false true false'
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
    catchUp(s1, '2026-09-23')?.type,                                 // Wed (Push): pick up Legs
    catchUp(st({ '2026-09-20': e }, { pickUpDismissed: '2026-09-21' }), '2026-09-23') ?? '-', // waved off with "Not this time"
    catchUp(st({ '2026-09-20': e, '2026-09-21': w('Legs') }), '2026-09-23')?.type ?? '-', // Legs was done
    catchUp(st({ '2026-09-20': e, '2026-09-22': w('Legs') }), '2026-09-23')?.type ?? '-', // done a day late: nothing to pick up
    catchUp(st({ '2026-09-22': e }), '2026-09-23')?.type ?? '-',           // Monday was before they started
    catchUp(st({ '2026-09-20': e }), '2026-09-21')?.type ?? '-',           // nothing planned in the window yet
    catchUp(st({ '2026-09-20': e, '2026-09-23': w('Push') }), '2026-09-23')?.type ?? '-', // today already logged
    String(daysMovedThisWeek(st({ '2026-09-21': w('Legs'), '2026-09-23': w('Push'), '2026-09-20': w('Pull') }), '2026-09-23')),
    String(welcomeBack(st({ '2026-09-01': w('Legs') }), '2026-09-23')),
    String(welcomeBack(st({ '2026-09-01': w('Legs') }, { welcomeAsked: '2026-09-15' }), '2026-09-23')),
    String(welcomeBack(st({ '2026-09-18': w('Legs') }), '2026-09-23')),
    String(welcomeBack(st({}), '2026-09-23')),
    easyUntil('2026-09-23'),
  ].join(' ')
  const want = 'Legs - - - - - - 2 true false false false 2026-09-29'
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
// feel-better fat at the UK RI share (31.5%) keeps carbs within the 45–60% guideline across sizes
{
  const rows = [[60, 'F', 160, 'sedentary'], [75, 'M', 175, 'light'], [95, 'M', 185, 'active'], [55, 'F', 155, 'moderate']].map(([kg, sex, height, act]) => {
    const t = suggestedTargets({ ...DEFAULT_PROFILE, sex, age: 40, height, activityLevel: act, goal: 'feel-better' } as any, kg as number) as any
    return { cPct: (t.c * 4) / t.kcal, fPct: (t.f * 9) / t.kcal, sum: Math.abs(t.p * 4 + t.c * 4 + t.f * 9 - t.kcal) }
  })
  const ok = rows.every((r) => r.cPct <= 0.6 && r.cPct >= 0.45 && r.fPct >= 0.3 && r.fPct <= 0.35 && r.sum <= 8); if (!ok) bad++
  console.log(ok ? 'PASS' : 'FAIL', 'feel-better split', JSON.stringify(rows.map((r) => [r.cPct.toFixed(3), r.fPct.toFixed(3)])))
}
// nutrition-accuracy's extra checks: switch day uses the new maths, sedentary before the switch
// is legacy gross, legacy maths equals the shipped formula for every old key, a new type on a
// pre-switch day uses its cited value, loadStateFrom only sets a missing switch, and each
// source string carries the same MET as the table
{
  const lift = { type: 'Legs' as const, ex: [] }
  const day = (workout: any) => ({ foods: [], supps: {}, weight: 75, workout })
  const st = (activityLevel: string, days: any) => ({ target: { kcal: 2000 }, schedule: {}, customFoods: [], recipes: [],
    profile: { activityLevel, rangeWidth: 100, burnSwitch: '2026-09-20' }, days }) as any
  // origin/main formula: (CARDIO_MET_old[t] || 4.0) × kg × (mins || 25)/60; strength 3.5 × kg × 0.75
  const old = (t: string, mins: string) => Math.round((LEGACY_CARDIO_MET[t] || 4.0) * 80 * ((parseFloat(mins) || 25) / 60))
  const legacyOk = [...Object.keys(LEGACY_CARDIO_MET), '', 'Zumba'].every((t) => ['', '0', '30'].every((m) => workoutBurn({ type: 'Cardio', cardioType: t, mins: m }, 80, true) === old(t, m)))
  const got = [
    rangeFor(st('light', { '2026-09-20': day(lift) }), '2026-09-20').mid,        // switch day itself: new maths
    rangeFor(st('sedentary', { '2026-09-19': day(lift) }), '2026-09-19').mid,   // sedentary before the switch: gross
    String(legacyOk),
    workoutBurn({ type: 'Cardio', cardioType: 'Incline walk 11–20%', mins: '25' }, 75, true), // 8.8 × 75 × 25/60 = 275
    (() => { const p = { burnSwitch: '2026-01-01' } as any; ensureBurnSwitch(p, '2026-09-23'); return p.burnSwitch })(),
    (() => { const p = {} as any; ensureBurnSwitch(p, '2026-09-23'); return p.burnSwitch })(),
  ].join(' ')
  const want = '2000 2197 true 275 2026-01-01 2026-09-23'
  const metMismatch = Object.keys(CARDIO_MET).filter((k) => { const m = MET_SOURCES[k]?.match(/^\d{5} \(([\d.]+)\)/); return m ? +m[1] !== CARDIO_MET[k] : k !== 'Other' })
  const ok = got === want && !metMismatch.length; if (!ok) bad++
  console.log(ok ? 'PASS' : 'FAIL', 'burn switch edge cases', JSON.stringify(got), metMismatch, ok ? '' : 'want ' + JSON.stringify(want))
}
// activity-level suggestion (plan P1.5, nutrition-accuracy's rule): band edges, 3-of-4 weeks,
// 28 days of history, 28-day cool-down, never up from sedentary, never down with no sessions
{
  const T = '2026-10-20'
  const lift = { type: 'Push', ex: [] }
  // n training days in each of the 4 weeks before T (days 1..n of each week), plus an old entry
  const mk = (perWeek: number[], level: string, extra: any = {}) => {
    const days: any = { [shiftDay(T, -40)]: { foods: [{ n: 'x' }], supps: {}, weight: null, workout: null } }
    perWeek.forEach((n, w) => { for (let i = 0; i < n; i++) days[shiftDay(T, -(28 - w * 7) + i)] = { foods: [], supps: {}, weight: null, workout: lift } })
    return { target: { kcal: 2000 }, schedule: {}, customFoods: [], recipes: [], days, profile: { activityLevel: level, ...extra } } as any
  }
  const sug = (perWeek: number[], level: string, extra?: any) => { const r = activitySuggestion(mk(perWeek, level, extra), T); return r ? r.level + (r.up ? '↑' : '↓') : '-' }
  const got = [
    [0.9, 1, 2.9, 3, 5.4, 5.5].map((x) => bandFor(x) ?? '-').join(','),
    trainingWeeks(mk([1, 2, 3, 4], 'light'), T).join(','),
    sug([4, 4, 3, 5], 'light'),                     // clearly moderate: suggest up
    sug([4, 4, 1, 1], 'light'),                     // average 2.5 = light already
    sug([4, 4, 2, 5], 'light'),                     // average 3.75 but only 3 of 4 weeks moderate: suggest
    sug([4, 2, 2, 5], 'light'),                     // average 3.25 but only 2 weeks moderate: no
    sug([4, 4, 4, 4], 'sedentary'),                 // never up from sedentary
    sug([1, 1, 2, 1], 'active'),                    // down, with sessions: suggest light
    sug([0, 0, 0, 0], 'active'),                    // nothing logged: no evidence, no suggestion
    sug([6, 6, 7, 6], 'moderate'),                  // active
    sug([4, 4, 4, 4], 'light', { activityAsked: shiftDay(T, -10) }), // cool-down
    sug([4, 4, 4, 4], 'light', { activityAsked: shiftDay(T, -28) }), // cool-down over
    sug([4, 4, 4, 4], 'light', { activityAsked: shiftDay(T, -5) }),        // chose a level themselves 5 days ago
    sug([4, 4, 4, 4], 'light', { activityAsked: shiftDay(T, -27) }),       // cool-down at 27 days
    String(isTrainingSession({ type: 'Cardio', cardioType: '', mins: '' } as any)) + '/' + String(isTrainingSession({ type: 'Cardio', cardioType: 'Incline treadmill', mins: '20' } as any)) + '/' + String(isTrainingSession({ type: 'Cardio', cardioType: 'Rower', mins: '0' } as any)),
    sug([1, 1, 2, 1], 'active', { easyUntil: shiftDay(T, 2) }),            // easier week: no downward nudge
    sug([1, 1, 2, 1], 'active', { welcomeAsked: shiftDay(T, -5) }),        // just back from a break: no downward nudge
    sug([4, 4, 4, 4], 'light', { easyUntil: shiftDay(T, 2) }),             // upward is fine then
    sug([4, 4, 4, 4], 'light', { activityShown: shiftDay(T, -1) }),        // shown yesterday, unanswered: still showing
    sug([4, 4, 4, 4], 'light', { activityShown: shiftDay(T, -3) }),        // unanswered 3 days: counts as "Keep as is"
    String(activitySuggestion({ ...mk([4, 4, 4, 4], 'light'), days: Object.fromEntries(Object.entries(mk([4, 4, 4, 4], 'light').days).filter(([d]) => d >= shiftDay(T, -27))) }, T)), // under 28 days of logs
    [isTrainingSession({ type: 'Cardio', cardioType: 'Mobility', mins: '10' } as any), isTrainingSession({ type: 'Cardio', cardioType: 'Easy walk', mins: '20' } as any),
      isTrainingSession({ type: 'Cardio', cardioType: 'Easy walk', mins: '10' } as any), isTrainingSession(lift as any)].join(','),
  ].join(' ')
  // mid-break and just-back cases, from the log alone (nutrition-accuracy's scratch case)
  const at = (offs: number[], level = 'active') => {
    const days: any = { [shiftDay(T, -40)]: { foods: [{ n: 'x' }], supps: {}, weight: null, workout: null } }
    offs.forEach((o) => { days[shiftDay(T, -o)] = { foods: [], supps: {}, weight: null, workout: lift } })
    return { target: { kcal: 2000 }, schedule: {}, customFoods: [], recipes: [], days, profile: { activityLevel: level } } as any
  }
  const brk = [
    activitySuggestion(at([28, 26, 20, 13]), T)?.level ?? '-',           // weeks [2,1,1,0], nothing for 13 days: mid-break
    activitySuggestion(at([28, 21, 14, 3]), T)?.level ?? '-',            // back 3 days ago after an 11-day gap
    activitySuggestion(at([27, 20, 13, 6]), T)?.level ?? '-',            // steady once a week, no break: light
    String(onOrAfterBreak(at([28, 26, 20, 13]), T)), String(onOrAfterBreak(at([27, 20, 13, 6]), T)),
    // a 10-min mobility swap in the middle of an 18-day break doesn't hide it
    String(onOrAfterBreak((() => { const x = at([27, 20, 2]); x.days[shiftDay(T, -11)] = { foods: [], supps: {}, weight: null, workout: { type: 'Cardio', cardioType: 'Mobility', mins: '10' } }; return x })(), T)),
    workoutBurn({ type: 'Cardio', cardioType: 'Walk', mins: '-5' }, 75), // negative minutes clamp to 0
  ].join(' ')
  const okB = brk === '- - light true false true 0'; if (!okB) bad++
  console.log(okB ? 'PASS' : 'FAIL', 'activity suggestion: breaks', JSON.stringify(brk))
  const want = '-,light,light,moderate,moderate,active 1,2,3,4 moderate↑ - moderate↑ - - light↓ - active↑ - moderate↑ - - true/true/false - - moderate↑ moderate↑ - null false,true,false,true'
  const ok = got === want; if (!ok) bad++
  console.log(ok ? 'PASS' : 'FAIL', 'activity-level suggestion', JSON.stringify(got), ok ? '' : 'want ' + JSON.stringify(want))
}
// Phase 2 sessions (plan §2.5, P2 accuracy checks): real stored shapes convert and mirror back
// losslessly, a converted legacy day's burn equals the old workoutBurn to the kcal, a non-mirror
// workout from an older install is folded in, malformed input never throws, the day's burn is the
// sum of its sessions, and every modality MET matches its cited source
{
  const D = '2026-09-10'
  const lift = { type: 'Push', ex: [{ name: 'Barbell bench press', sets: [{ w: '40', reps: '10' }] }, { name: 'Plank', sets: [{ w: '', reps: '30' }] }] } as any
  const walk = { type: 'Cardio', cardioType: 'Brisk walk', mins: '30' } as any
  const blank = { type: 'Cardio', cardioType: '', mins: '' } as any
  const round = (wk: any) => { const m = mirrorOf([fromLegacy(wk, D)]); delete (m as any)._mirror; return JSON.stringify(m) === JSON.stringify(wk) }
  const same = (wk: any) => sessionNetBurn(fromLegacy(wk, D), 70) === workoutNetBurn(wk, 70) && sessionBurn(fromLegacy(wk, D), 70) === workoutBurn(wk, 70)
  const day = (x: any) => ({ foods: [], supps: {}, weight: null, workout: null, ...x })
  const yoga = { id: 'y1', modality: 'yoga', title: 'Evening yoga', mins: 30 } as any
  const got = [
    [lift, walk].map(round).join(','),
    [lift, walk, blank, { type: 'Cardio', cardioType: 'Rower', mins: '0' }, { type: 'Cardio', cardioType: 'Mobility', mins: '' }].map(same).join(','),
    sessionsOf(day({ workout: lift }), D).map((x) => x.id + ':' + x.routineId).join(','),
    sessionsOf(day({ workout: { ...lift, _mirror: true }, sessions: [yoga] }), D).length,           // mirror: not folded in
    sessionsOf(day({ workout: walk, sessions: [yoga] }), D).map((x) => x.title).join('+'),          // older install wrote after us
    sessionsOf(day({ sessions: 'bad' }), D).length, sessionsOf(day({ sessions: [null, {}, yoga] }), D).length, sessionsOf(undefined, D).length,
    JSON.stringify(mirrorOf([yoga])), String(mirrorOf([]) === null),
    JSON.stringify(mirrorOf([yoga, fromLegacy(lift, D)])?.type),                                   // a lift wins the mirror
    sessionBurn(yoga, 70),                                                                          // 2.7 × 70 × 0.5 = 94.5
    sessionBurn({ ...yoga, effort: 'easy' }, 70), sessionBurn({ ...yoga, effort: 'hard' }, 70),     // 2.3 → 81; 4.0 → 140
    sessionBurn({ id: 'm', modality: 'mobility', title: 'M' } as any, 70),                          // 10 min default: 2.3 × 70 / 6 = 27
  ].join(' ')
  const want = 'true,true true,true,true,true,true legacy-2026-09-10:builtin-Push 1 Evening yoga+Brisk walk 0 1 0 {"type":"Cardio","cardioType":"Other","mins":"30","_mirror":true} true "Push" 95 81 140 27'
  const metOk = Object.values(MODALITY_MET).every((m) => ['light', 'moderate', 'vigorous'].every((k) => m.src.includes('(' + (m as any)[k].toFixed(1) + ')')))
  const ok = got === want && metOk; if (!ok) bad++
  console.log(ok ? 'PASS' : 'FAIL', 'sessions: legacy, mirror, burn', JSON.stringify(got), metOk, ok ? '' : 'want ' + JSON.stringify(want))
  // an older install re-saving the same card replaces that session (no double count); a different
  // card is added; a pre-switch day keeps the old maths and adds only its extra sessions
  const push = { id: 'p1', modality: 'strength', title: 'Push', routineId: 'builtin-Push', ex: [] } as any
  const fold = [
    sessionsOf(day({ workout: { type: 'Push', ex: [{ name: 'x', sets: [] }] }, sessions: [push, yoga] }), D).map((x) => x.id + ':' + (x.ex?.length ?? '-')).join(','),
    sessionsOf(day({ workout: { type: 'Legs', ex: [] }, sessions: [push] }), D).map((x) => x.routineId).join(','),
  ].join(' ')
  const pre = { target: { kcal: 2000 }, schedule: {}, customFoods: [], recipes: [], profile: { activityLevel: 'light', rangeWidth: 100, burnSwitch: '2026-12-01' },
    days: { [D]: day({ weight: 70, workout: { ...lift, _mirror: true }, sessions: [fromLegacy(lift, D), yoga] }) } } as any
  const preMid = rangeFor(pre, D).mid  // old lift 3.5 × 70 × 0.75 = 184 + yoga gross 95
  // a lone new session on a pre-switch day counts at its own value, not through the old mirror maths
  const lone = rangeFor({ ...pre, days: { [D]: day({ weight: 70, workout: mirrorOf([yoga]), sessions: [yoga] }) } }, D).mid
  // an older install writing a different card to a pre-switch day: the old maths goes with that card,
  // the earlier lift counts at its own gross value (legacy run 30 min at 70 kg 140 + Push 184)
  const run = rangeFor({ ...pre, days: { [D]: day({ weight: 70, workout: { type: 'Cardio', cardioType: 'Running', mins: '30' }, sessions: [push] }) } }, D).mid
  const ok3 = fold === 'p1:1,y1:- builtin-Push,builtin-Legs' && preMid === 2000 + 184 + 95 && lone === 2000 + 95 && run === 2000 + 140 + 184; if (!ok3) bad++
  console.log(ok3 ? 'PASS' : 'FAIL', 'sessions: older-install fold-in and pre-switch extras', JSON.stringify(fold), preMid, lone, run)
  // sedentary net burn after the switch sums every session; other levels add nothing
  const st = (level: string) => ({ target: { kcal: 2000 }, schedule: {}, customFoods: [], recipes: [],
    profile: { activityLevel: level, rangeWidth: 100, burnSwitch: '2026-09-01' },
    days: { [D]: day({ weight: 70, workout: { ...walk, _mirror: true }, sessions: [fromLegacy(walk, D), yoga] }) } }) as any
  const sum = sessionNetBurn(fromLegacy(walk, D), 70) + sessionNetBurn(yoga, 70)
  // hard-coded: brisk walk net 3.8 × 70 × 0.5 = 133, yoga net 1.7 × 70 × 0.5 = 59.5 → 60
  const ok2 = sum === 193 && rangeFor(st('sedentary'), D).mid === 2193 && rangeFor(st('light'), D).mid === 2000; if (!ok2) bad++
  console.log(ok2 ? 'PASS' : 'FAIL', 'sessions: day burn is the sum', rangeFor(st('sedentary'), D).mid, 2000 + sum)
}
// load guardrail (plan §3.3): hard sessions, doubles, once-a-week note
{
  const T = '2026-09-30'
  const hard = (n: number) => Array.from({ length: n }, (_, i) => ({ id: 'h' + i, modality: 'strength', title: 'Lift' }))
  const mk = (perDay: Record<number, number>, extra: any = {}) => ({ target: { kcal: 2000 }, schedule: {}, customFoods: [], recipes: [], profile: { activityLevel: 'light', ...extra },
    days: Object.fromEntries(Object.entries(perDay).map(([o, n]) => [shiftDay(T, -+o), { foods: [], supps: {}, weight: null, workout: null, sessions: hard(n) }])) }) as any
  const got = [
    JSON.stringify(loadSignals(mk({ 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 }), T)), String(showLoadNote(mk({ 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 }), T)),  // 6: not more than 6
    String(showLoadNote(mk({ 0: 2, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 }), T)),                               // 7 hard in a week
    JSON.stringify(loadSignals(mk({ 0: 2, 1: 2, 2: 2 }), T)), String(showLoadNote(mk({ 0: 2, 1: 2 }), T)), // doubles 3 running; 2 isn't
    String(showLoadNote(mk({ 0: 2, 1: 2, 2: 2 }, { loadNoteSeen: shiftDay(T, -3) }), T)),              // seen this week
    [isHardSession({ modality: 'yoga' } as any), isHardSession({ modality: 'yoga', effort: 'hard' } as any), isHardSession({ modality: 'cardio', cardio: { key: 'Brisk walk' }, mins: 40 } as any),
      isHardSession({ modality: 'cardio', cardio: { key: 'Incline walk 6–10%' }, mins: 30 } as any), isHardSession({ modality: 'strength', effort: 'easy' } as any)].join(','),
  ].join(' ')
  const morning = String(showLoadNote(mk({ 1: 2, 2: 2, 3: 2 }), T))  // three days of doubles, nothing yet today
  const want = '{"hard7":6,"doublesRun":0} false true {"hard7":6,"doublesRun":3} false false false,true,false,true,false'
  const ok = got === want && morning === 'true'; if (!ok) bad++
  console.log(ok ? 'PASS' : 'FAIL', 'load guardrail', morning, JSON.stringify(got), ok ? '' : 'want ' + JSON.stringify(want))
}
// exercise library in use (P3): hold targets and timer, set words, "last time" by id or old name,
// swaps that keep the slot, and every demo clip reachable from the library
{
  const got = [
    JSON.stringify(holdTarget('3 × 20–40 sec')), JSON.stringify(holdTarget('45 sec each side')), JSON.stringify(holdTarget('1 × 60 sec')), String(holdTarget('5 slow breaths')),
    JSON.stringify(holdAt(12.7, { lo: 20, hi: 40 })), JSON.stringify(holdAt(47, { lo: 45, hi: 45 }, true)), JSON.stringify(holdAt(30, { lo: 45, hi: 45 }, true)).includes('"logSec":30'),
    fmtSet({ w: '40', reps: '8' }, 'weight-reps'), fmtSet({ w: '20', reps: '6', assist: true }, 'reps'), fmtSet({ w: '10', reps: '8' }, 'reps'), fmtSet({ w: '', reps: '30' }, 'hold'), fmtSet({ w: '', reps: '', sec: '25' }, 'hold'),
    [setHasData({ w: '', reps: '' }, 'weight-reps'), setHasData({ w: '', reps: '', sec: '20' }, 'hold'), setHasData({ w: '', reps: '', done: true }, 'check')].join(','),
  ].join(' ')
  const want = '{"lo":20,"hi":40} {"lo":45,"hi":45} {"lo":60,"hi":60} null {"side":1,"sec":12,"reached":false,"switchNow":false,"logSec":12} {"side":2,"sec":2,"reached":false,"switchNow":true,"logSec":2} true 40 kg × 8 6 reps (assisted 20 kg) 8 reps (+10 kg) 30 sec 25 sec false,true,true'
  const ok = got === want; if (!ok) bad++
  console.log(ok ? 'PASS' : 'FAIL', 'library: holds and set words', JSON.stringify(got), ok ? '' : 'want ' + JSON.stringify(want))
}
{
  const S = (ex: any[]) => ({ foods: [], supps: {}, weight: null, workout: null, sessions: [{ id: 'a', modality: 'strength', title: 'Legs', routineId: 'builtin-Legs', ex }] }) as any
  const days = {
    '2026-09-01': S([{ name: 'Leg press', sets: [{ w: '80', reps: '10' }] }]),                                  // before ids: by name
    '2026-09-05': S([{ name: 'Barbell squat', exId: 'back-squat', sets: [{ w: '40', reps: '10' }] }]),
    '2026-09-08': S([{ name: 'Barbell squat', exId: 'back-squat', sets: [] }]),                                 // no sets: skipped
    '2026-09-20': S([{ name: 'Barbell squat', exId: 'back-squat', sets: [{ w: '50', reps: '8' }] }]),           // on or after the day: not "last time"
  }
  const got = [
    lastLogged(days, '2026-09-10', 'back-squat', 'Barbell squat')?.sets[0].w, lastLogged(days, '2026-09-10', 'leg-press', 'Leg press')?.sets[0].w,
    String(lastLogged(days, '2026-09-03', 'back-squat', 'Barbell squat')),
  ].join(' ')
  const sq = EXERCISE_BY_ID['back-squat'], bench = EXERCISE_BY_ID['barbell-bench-press']
  const altSq = alternativesFor(sq).similar.map((x) => x.id), altBench = alternativesFor(bench).similar.map((x) => x.id)
  const push = EXERCISE_BY_ID['push-up']
  const chainOk = stepOf(push, -1)?.id === 'incline-push-up' && stepOf(push, 1)?.id === 'decline-push-up'
  const dd = EXERCISE_BY_ID['downward-dog']
  const gentlerFirst = alternativesFor(dd).similar[0]?.id === dd.gentler
  // every swap keeps the slot: same pattern and main muscle for resistance work
  const slotOk = EXERCISES.filter((e) => e.pattern).every((e) => alternativesFor(e).similar.every((x) => x.id === e.gentler || (x.pattern === e.pattern && x.primary === e.primary)))
  // every named gentler option is reachable from the Swap sheet
  const gentlerOk = EXERCISES.filter((e) => e.gentler).every((e) => { const a = alternativesFor(e); return a.similar.some((x) => x.id === e.gentler) || a.easier?.id === e.gentler })
  const clips = Object.values(DEMOS).every((m) => EXERCISES.some((e) => e.video === m))
  const ok = got === '40 80 null' && altSq.includes('leg-press') && altBench.includes('chest-press') && chainOk && gentlerFirst && slotOk && gentlerOk && clips; if (!ok) bad++
  console.log(ok ? 'PASS' : 'FAIL', 'library: last time, swaps, chains, clips', JSON.stringify(got), altSq.includes('leg-press'), altBench.includes('chest-press'), chainOk, gentlerFirst, slotOk, gentlerOk, clips)
}
// Diet rules: conservative tags, swaps from the database, meals never hidden
{
  const P = (n: string, c?: string) => partsOf(n, c as never).sort().join('+')
  const cases: [string, string, string][] = [
    ['raw chicken is meat', P('Chicken breast, raw, skinless', 'meat'), 'meat'],
    ['oat milk is not dairy', P('Oat milk', 'drinks'), ''],
    ['peanut butter is plant', P('Peanut butter', 'fats'), ''],
    ['butter beans are plant', P('Butter beans, canned, drained', 'eggs'), ''],
    ['kidney beans are not kidney', P('Kidney beans, cooked', 'eggs'), ''],
    ['Quorn contains egg', P('Quorn mince', 'meat'), 'egg'],
    ['vegan-labelled has no animal parts', P('Greggs Vegan Roll Pork-Free', 'fastfood'), ''],
    ['Worcestershire contains fish', P('Worcestershire sauce', 'sauces'), 'fish'],
    ['Greggs is not egg', P('Greggs Baguette', 'fastfood'), ''],
    ['Quorn: vegetarian fits, vegan conflicts', dietFit({ n: 'Quorn mince', cat: 'meat' as never }, 'vegetarian') + '/' + dietFit({ n: 'Quorn mince', cat: 'meat' as never }, 'vegan'), 'fits/conflict'],
    ['unknown ready meal is check', dietFit({ n: 'Lasagne', cat: 'ready' }, 'vegetarian'), 'check'],
    ['veggie pizza: vegetarian fits, vegan never fits', dietFit({ n: 'Greggs Veggie Feast Pizza', cat: 'fastfood' }, 'vegetarian') + '/' + dietFit({ n: 'Greggs Veggie Feast Pizza', cat: 'fastfood' }, 'vegan'), 'fits/check'],
    ['pesto not vegan', dietFit({ n: 'Pesto', cat: 'sauces' }, 'vegan'), 'conflict'],
    ['gravy is check', dietFit({ n: 'Gravy (made)', cat: 'sauces' }, 'vegetarian'), 'check'],
    ['soy sauce fits vegan', dietFit({ n: 'Soy sauce (tbsp ~16g)', cat: 'sauces' }, 'vegan'), 'fits'],
  ]
  for (const [n, got, want] of cases) { const ok = got === want; if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', 'diet:', n, ok ? '' : `${got} vs ${want}`) }
  const items = [{ n: 'Beef mince, extra lean (about 5% fat), raw', k: 1, p: 1, c: 1, f: 1, grams: 500 }, { n: 'Onion', k: 1, p: 1, c: 1, f: 1, grams: 100 }, { n: 'Milk, semi-skimmed', k: 1, p: 1, c: 1, f: 1, grams: 100 }]
  const MAP = new Map(FOODS.map((f) => [f.n, f]))
  const sw = (d: 'vegetarian' | 'vegan', its = items) => swapsFor(its as never, d, MAP).map((w) => `${w.from.split(',')[0]}>${w.to?.n ?? '-'}`).join('|')
  const stocky = [{ n: 'Chicken stock, ready-made', k: 12, p: 1, c: 1, f: 0.5, grams: 250 }, { n: 'Lard', k: 891, p: 0, c: 0, f: 99, grams: 10 }, { n: 'Worcestershire sauce', k: 65, p: 1, c: 15, f: 0, grams: 5 }, { n: 'Greggs Sausage Roll', k: 337, p: 8.8, c: 23, f: 23, grams: 103 }]
  for (const [n, got, want] of [
    ['vegetarian swaps (sourced Quorn pieces)', sw('vegetarian'), 'Beef mince>Quorn pieces'],
    ['vegan swaps (no Quorn: egg; soya milk)', sw('vegan'), 'Beef mince>Tofu, firm|Milk>Soya milk'],
    ['stock, lard, sauces and dishes never swap to a whole protein', sw('vegetarian', stocky as never), 'Chicken stock>-|Lard>-|Worcestershire sauce>-|Greggs Sausage Roll>-'],
    ['tea with no milk is vegan', dietFit({ n: 'Tea, no milk', cat: 'drinks' }, 'vegan'), 'fits'],
    ['tuna steak fits pescatarian', dietFit({ n: 'Tuna steak, raw', cat: 'fish' }, 'pescatarian'), 'fits'],
    ['parmesan not vegetarian', dietFit({ n: 'Parmesan', cat: 'dairy' }, 'vegetarian'), 'conflict'],
    ['mashed potato not vegan', dietFit({ n: 'Mashed potato', cat: 'potato' }, 'vegan'), 'conflict'],
    ['wine is check', dietFit({ n: 'Red wine', cat: 'drinks' }, 'vegetarian'), 'check'],
    ['scotch egg / fish fingers never swap whole', sw('vegetarian', [{ n: 'Scotch egg', k: 1, p: 1, c: 1, f: 1, grams: 120 }, { n: 'Fish fingers, cooked (3)', k: 1, p: 1, c: 1, f: 1, grams: 90 }] as never), 'Scotch egg>-|Fish fingers>-'],
    ['sausage roll and bone-in weights never swap whole', sw('vegetarian', [{ n: 'Sausage roll', k: 1, p: 1, c: 1, f: 1, grams: 60 }, { n: 'Chicken thigh or drumstick, raw, with skin, weighed with bone', k: 1, p: 1, c: 1, f: 1, grams: 200 }] as never), 'Sausage roll>-|Chicken thigh or drumstick>-'],
    ['babybel is check for vegetarians', dietFit({ n: 'Babybel', cat: 'dairy' }, 'vegetarian'), 'check'],
    ['muesli is check for vegans', dietFit({ n: 'Muesli', cat: 'grains' }, 'vegan'), 'check'],
    ['cream crackers not dairy', dietFit({ n: 'Cream cracker', cat: 'snacks' }, 'vegan'), 'check'],
  ] as const) {
    const ok = got === want; if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', 'diet:', n, ok ? '' : got)
  }
  const sug = suggestRecipes([{ id: 'r', name: 'Chilli', servings: 4, items: items as never }], [0], ['Onion', 'Quorn pieces'], 'vegetarian', FOODS)[0]
  const okS = sug.missing.join('|') === 'Milk, semi-skimmed'; if (!okS) bad++
  console.log(okS ? 'PASS' : 'FAIL', 'suggest: a vegetarian with Quorn is only missing the milk', sug.missing.join('|'))
  const staples = [['Salt', 'sauces'], ['Olive oil (tbsp ~14g)', 'fats'], ['Cumin, ground', 'sauces'], ['Pasta, dried, uncooked', 'grains'], ['Sugar snap peas', 'veg'], ['Dried apricots', 'fruit']].map(([n, c]) => isStaple(n, c as never) ? 'y' : 'n').join('')
  const ok = staples === 'yyynnn'; if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', 'staples assumed only for basics', staples)
}

// Backup restore: an exported-then-imported state is fully dirty, so the next sync uploads it
// before pulling, and a stale server can't overwrite or drop what was restored.
async function backupRestore(): Promise<void> {
  const day = (kcal: number) => ({ foods: [{ n: 'Toast', k: kcal, p: 1, c: 1, f: 1, grams: 40 }], supps: {}, weight: 70, workout: null })
  const F1 = '11111111-1111-4111-8111-111111111111', R1 = '22222222-2222-4222-8222-222222222222'
  const GONE = '33333333-3333-4333-8333-333333333333', RGONE = '44444444-4444-4444-8444-444444444444', HERE = '55555555-5555-4555-8555-555555555555'
  const live = stateFromBackup({ days: {} } as never)
  live.profile.burnSwitch = '2026-09-10'
  live.profile.notificationsEnabled = true
  live.days = { '2026-09-01': day(100), '2026-09-02': day(120) } as never
  live.customFoods = [{ id: F1, n: 'My flapjack', k: 400, p: 5, c: 50, f: 20, g: 100 }]
  live.recipes = [{ id: R1, name: 'Chilli', servings: 4, items: [] }]
  const m = ensureMeta(live, true)
  m.foodDeletes = [F1, GONE, 'f1727000000abc']
  m.recipeDeletes = [RGONE]
  // after a sync everything is clean; that is what exportBackup writes out
  m.settings.dirty = false
  Object.values(m.days).forEach((x) => (x.dirty = false))
  live.customFoods.forEach((f) => (f._dirty = false))
  live.recipes.forEach((r) => (r._dirty = false))
  const file = JSON.parse(JSON.stringify(live)) as PersistedState
  const device = stateFromBackup({ days: {} } as never)
  device.profile.burnSwitch = '2026-09-05'
  device.profile.notificationsEnabled = false
  device._meta!.foodDeletes = [HERE, F1]
  device._meta!.recipeDeletes = [R1]
  const got = stateFromBackup(file, device)
  const gm = got._meta!
  const checks: [string, boolean][] = [
    ['settings dirty', gm.settings.dirty],
    ['every day dirty', Object.keys(got.days).length === 2 && Object.keys(got.days).every((d) => gm.days[d]?.dirty)],
    ['custom foods dirty', got.customFoods.every((f) => f._dirty && !!f._u)],
    ['recipes dirty', got.recipes.every((r) => r._dirty && !!r._u)],
    ['earliest D5 switch date kept', got.profile.burnSwitch === '2026-09-05'],
    ["this device's reminders setting kept", got.profile.notificationsEnabled === false],
    ['queued deletes kept except restored and non-UUID ids', gm.foodDeletes.join('|') === [GONE, HERE].join('|') && gm.recipeDeletes.join('|') === RGONE],
  ]
  // a stale server: different day 1, no foods or recipes; push then pull as runSync does
  const server: Record<string, any[]> = { settings: [], custom_foods: [], recipes: [], day_logs: [{ log_date: '2026-09-01', ...day(999), updated_at: 'x' }] }
  const realFetch = globalThis.fetch
  globalThis.fetch = (async (url: string, o: RequestInit = {}) => {
    const table = String(url).split('/rest/v1/')[1].split('?')[0].replace(/^\//, '')
    if (o.method === 'POST') {
      for (const row of JSON.parse(String(o.body))) {
        const k = table === 'day_logs' ? 'log_date' : table === 'settings' ? 'user_id' : 'id'
        server[table] = [...server[table].filter((x) => x[k] !== row[k]), { ...row, updated_at: 'y' }]
      }
    }
    return new Response(o.method ? null : JSON.stringify(server[table]), { status: o.method ? 204 : 200 })
  }) as typeof fetch
  try {
    await pushDirty(got, gm)
    await pullAll(got, gm)
  } finally {
    globalThis.fetch = realFetch
  }
  checks.push(
    ['restored day survives the pull', got.days['2026-09-01'].foods[0].k === 100],
    ['restored food and recipe survive the pull', got.customFoods.some((f) => f.id === F1) && got.recipes.some((r) => r.id === R1)],
    ['restored data reached the server', server.custom_foods.length === 1 && server.recipes.length === 1 && server.day_logs.length === 2 && server.settings.length === 1],
  )
  for (const [n, ok] of checks) { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', 'backup import:', n) }
}

/** A fake PostgREST that behaves like production: RLS lets a user touch only their own rows
 *  (403 on an upsert that would update someone else's), the (user_id, lower(name)) unique index
 *  on custom_foods and recipes (409), uuid id columns (400) and tables whose writes can be broken. */
function fakeServer(rows: Record<string, any[]>, broken: string[] = []) {
  const uid = LOCAL_USER
  const keyOf = (t: string) => (t === 'day_logs' ? ['user_id', 'log_date'] : t === 'settings' ? ['user_id'] : ['id'])
  const same = (t: string, a: any, b: any) => keyOf(t).every((k) => a[k] === b[k])
  const calls: string[] = []
  const res = (status: number, body?: unknown) => new Response(body === undefined ? null : JSON.stringify(body), { status })
  const fetchFn = (async (url: string, o: RequestInit = {}) => {
    const [path, q = ''] = String(url).split('/rest/v1/')[1].split('?')
    const t = path.replace(/^\//, '')
    const params = new URLSearchParams(q)
    calls.push((o.method || 'GET') + ' ' + t)
    if (o.method && broken.includes(t)) return res(500)
    const mine = (rows[t] || []).filter((r) => r.user_id === uid)
    if (!o.method) {
      const id = params.get('id')
      return res(200, id ? mine.filter((r) => 'eq.' + r.id === id) : mine)
    }
    if (o.method === 'DELETE') {
      const id = (params.get('id') || '').replace(/^eq\./, '')
      if (!UUID_RE.test(id)) return res(400)
      rows[t] = rows[t].filter((r) => !(r.id === id && r.user_id === uid))
      return res(204)
    }
    const next = [...rows[t]]
    for (const row of JSON.parse(String(o.body))) {
      if ('id' in row && !UUID_RE.test(row.id)) return res(400)
      const cur = next.find((r) => same(t, r, row))
      if (cur && cur.user_id !== uid) return res(403)
      if ((t === 'custom_foods' || t === 'recipes') && next.some((r) => r.user_id === uid && r.id !== row.id && r.name.toLowerCase() === row.name.toLowerCase())) return res(409)
      const i = next.findIndex((r) => same(t, r, row))
      if (i >= 0) next[i] = { ...row, updated_at: 'y' }; else next.push({ ...row, updated_at: 'y' })
    }
    rows[t] = next
    return res(201)
  }) as typeof fetch
  return { fetchFn, calls }
}

// Sync resilience: one rejected record (name clash, someone else's id, a broken table) never
// blocks the log, the other records or the pull.
async function syncResilience(): Promise<void> {
  const checks: [string, boolean][] = []
  const other = '99999999-9999-4999-8999-999999999999'
  const ids = Array.from({ length: 200 }, uuid)
  checks.push(['uuid() is always v4', ids.every((x) => UUID_RE.test(x) && x[14] === '4' && '89ab'.includes(x[19])) && new Set(ids).size === 200])

  const S1 = uuid(), S2 = uuid(), THEIRS = uuid(), L1 = uuid(), L2 = uuid(), R1 = uuid()
  const rows: Record<string, any[]> = {
    settings: [],
    day_logs: [],
    custom_foods: [
      { id: S1, user_id: LOCAL_USER, name: 'My Flapjack', kcal: 1 }, // same name, other id: 409
      { id: S2, user_id: LOCAL_USER, name: 'Oat bar', kcal: 1 }, // deleted then re-created: 409 unless the delete goes first
      { id: THEIRS, user_id: other, name: 'Theirs', kcal: 1 }, // another account's id: 403
    ],
    recipes: [],
  }
  const s = stateFromBackup({ days: { '2026-09-20': { foods: [{ n: 'Toast', k: 100, p: 1, c: 1, f: 1, grams: 40 }], supps: {}, weight: null, workout: null } } } as never)
  s.customFoods = [
    { id: L1, n: 'my flapjack', k: 410, p: 5, c: 50, f: 20, g: 100, _dirty: true },
    { id: L2, n: 'Oat bar', k: 200, p: 5, c: 30, f: 8, g: 100, _dirty: true },
    { id: THEIRS, n: 'Borrowed soup', k: 50, p: 2, c: 6, f: 2, g: 100, _dirty: true },
    { id: 'f1727000000abc', n: 'Old id', k: 90, p: 1, c: 1, f: 1, g: 100, _dirty: true },
  ]
  s.recipes = [{ id: R1, name: 'Chilli', servings: 4, items: [], _dirty: true }]
  const m = ensureMeta(s, false)
  m.foodDeletes = [S2, 'f-never-uploaded']
  const f = fakeServer(rows, ['recipes'])
  const realFetch = globalThis.fetch
  globalThis.fetch = f.fetchFn
  let failed: string[] = []
  try {
    failed = await pushDirty(s, m)
    await pullAll(s, m)
  } finally {
    globalThis.fetch = realFetch
  }
  const food = (n: string) => s.customFoods.find((x) => x.n === n)
  const srv = (n: string) => rows.custom_foods.filter((x) => x.name === n)
  checks.push(
    ['the day reaches the server despite a broken table', rows.day_logs.length === 1 && !m.days['2026-09-20'].dirty],
    ['settings reach the server', rows.settings.length === 1 && !m.settings.dirty],
    ['409: adopts the server id for the same name and overwrites it', food('my flapjack')?.id === S1 && rows.custom_foods.filter((x) => x.id === S1).map((x) => x.name + x.kcal).join() === 'my flapjack410'],
    ['a delete goes before the re-create of the same name', srv('Oat bar').length === 1 && srv('Oat bar')[0].id === L2 && m.foodDeletes.length === 0],
    ["403: another account's id gets a new one; their row is untouched", food('Borrowed soup')?.id !== THEIRS && srv('Borrowed soup').length === 1 && rows.custom_foods.find((x) => x.id === THEIRS)?.name === 'Theirs'],
    ['an old non-UUID id is replaced and uploads', UUID_RE.test(food('Old id')?.id || '') && srv('Old id').length === 1],
    ['the broken table is reported and its record stays dirty', failed.length === 1 && failed[0].startsWith('recipes') && s.recipes[0]._dirty === true],
    ['the pull still ran', m.lastPull !== null],
  )

  // a rejection the repairs can't fix leaves the record exactly as it was
  const rows2: Record<string, any[]> = { settings: [], day_logs: [], recipes: [], custom_foods: [] }
  const s2 = stateFromBackup({ days: {} } as never)
  const KEEP = uuid()
  s2.customFoods = [{ id: KEEP, n: 'Fine', k: 1, p: 1, c: 1, f: 1, g: 100, _dirty: true }]
  const m2 = ensureMeta(s2, false)
  const f2 = fakeServer(rows2)
  globalThis.fetch = (async (url: string, o: RequestInit = {}) => (o.method === 'POST' && String(url).includes('custom_foods') ? new Response(null, { status: 403 }) : f2.fetchFn(url, o))) as typeof fetch
  try {
    failed = await pushDirty(s2, m2)
  } finally {
    globalThis.fetch = realFetch
  }
  checks.push(['an unfixable 403 keeps the id and the dirty flag', s2.customFoods[0].id === KEEP && s2.customFoods[0]._dirty === true && failed.length === 1])

  // a 409 never adopts an id another local record holds: renaming R1 onto R2's name must not
  // overwrite R2 (the pull would keep only one of the two)
  const RA = uuid(), RB = uuid()
  const rows4: Record<string, any[]> = { settings: [], day_logs: [], custom_foods: [], recipes: [{ id: RB, user_id: LOCAL_USER, name: 'Curry', items: [], servings: 2 }] }
  const s4 = stateFromBackup({ days: {} } as never)
  s4.recipes = [{ id: RA, name: 'curry', servings: 4, items: [], _dirty: true }, { id: RB, name: 'Curry', servings: 2, items: [], _dirty: false }]
  const m4 = ensureMeta(s4, false)
  m4.settings.dirty = false
  globalThis.fetch = fakeServer(rows4).fetchFn
  try { failed = await pushDirty(s4, m4) } finally { globalThis.fetch = realFetch }
  checks.push(["a 409 never takes another local record's id", s4.recipes[0].id === RA && s4.recipes[0]._dirty === true && rows4.recipes.length === 1 && rows4.recipes[0].servings === 2 && failed.length === 1])

  // a refused request (503, 401) is not retried per record: one request per table, all still dirty
  for (const status of [503, 401]) {
    const s5 = stateFromBackup({ days: Object.fromEntries(Array.from({ length: 50 }, (_, i) => ['2026-08-' + String(i % 28 + 1).padStart(2, '0') + (i >= 28 ? 'x' : ''), { foods: [], supps: {}, weight: null, workout: null }])) } as never)
    s5.customFoods = [{ id: uuid(), n: 'A', k: 1, p: 1, c: 1, f: 1, g: 100, _dirty: true }]
    const m5 = ensureMeta(s5, true)
    let n = 0
    globalThis.fetch = (async () => { n++; return new Response(null, { status }) }) as typeof fetch
    let f5: string[] = []
    try { f5 = await pushDirty(s5, m5) } finally { globalThis.fetch = realFetch }
    // days, settings, custom foods: 3 requests, not 50 + 1 + 1
    checks.push([`a ${status} makes one request per table and leaves everything dirty`, f5.length === 3 && n === 3 && Object.values(m5.days).every((x) => x.dirty) && m5.settings.dirty && s5.customFoods[0]._dirty === true])
  }

  // no connection: throws, nothing marked clean
  const s3 = stateFromBackup({ days: { '2026-09-21': { foods: [], supps: {}, weight: null, workout: null } } } as never)
  const m3 = ensureMeta(s3, false)
  globalThis.fetch = (async () => { throw new TypeError('Failed to fetch') }) as typeof fetch
  let threw = false
  try { await pushDirty(s3, m3) } catch { threw = true } finally { globalThis.fetch = realFetch }
  checks.push(['offline throws and leaves everything dirty', threw && m3.days['2026-09-21'].dirty && m3.settings.dirty])

  for (const [n, ok] of checks) { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', 'sync:', n) }
}


// Import keeps what the backup doesn't hold: this device's other days, foods and recipes, with
// their own sync flags; the backup wins where both have the same day, id or name.
function importCarryOver(): void {
  const dayOf = (k: number) => ({ foods: [{ n: 'Toast', k, p: 1, c: 1, f: 1, grams: 40 }], supps: {}, weight: null, workout: null })
  const A = uuid(), B = uuid(), C = uuid(), R = uuid(), R2 = uuid()
  const device = stateFromBackup({ days: {} } as never)
  device.days = { '2026-09-01': dayOf(1), '2026-09-22': dayOf(2), '2026-09-23': dayOf(3) } as never
  const dm = device._meta!
  dm.days = { '2026-09-01': { u: 'a', dirty: true }, '2026-09-22': { u: 'b', dirty: true }, '2026-09-23': { u: 'c', dirty: false } }
  device.customFoods = [
    { id: A, n: 'Only here', k: 1, p: 1, c: 1, f: 1, g: 100, _dirty: true },
    { id: B, n: 'SYNCED HERE', k: 1, p: 1, c: 1, f: 1, g: 100, _dirty: false },
    { id: C, n: 'flapjack', k: 999, p: 1, c: 1, f: 1, g: 100, _dirty: true },
  ]
  device.recipes = [{ id: R2, name: 'Soup', servings: 2, items: [], _dirty: true }]
  dm.foodDeletes = [uuid()]
  const backup = JSON.parse(JSON.stringify({
    days: { '2026-09-01': dayOf(100) }, customFoods: [{ id: uuid(), n: 'Flapjack', k: 400, p: 5, c: 50, f: 20, g: 100 }],
    recipes: [{ id: R, name: 'Chilli', servings: 4, items: [] }], target: device.target, schedule: device.schedule, profile: device.profile,
    _meta: { settings: { u: '', dirty: false }, days: { '2026-09-01': { u: '', dirty: false } }, foodDeletes: [A], recipeDeletes: [], lastPull: null },
  })) as PersistedState
  const summary = JSON.stringify(backupSummary(backup))
  const got = stateFromBackup(backup, structuredClone(device))
  const gm = got._meta!
  const food = (n: string) => got.customFoods.filter((f) => f.n === n)
  const checks: [string, boolean][] = [
    ['the backup wins on a shared day', got.days['2026-09-01'].foods[0].k === 100 && gm.days['2026-09-01'].dirty],
    ["this device's unsynced day stays and still uploads", got.days['2026-09-22'].foods[0].k === 2 && gm.days['2026-09-22'].dirty],
    ["this device's synced day stays and doesn't upload again", got.days['2026-09-23'].foods[0].k === 3 && gm.days['2026-09-23'].dirty === false],
    ["this device's own foods stay with their flags", food('Only here')[0]?._dirty === true && food('SYNCED HERE')[0]?._dirty === false],
    ['a food with the same name as the backup one: the backup wins', food('flapjack').length === 0 && food('Flapjack')[0]?.k === 400],
    ["this device's own recipe stays", got.recipes.map((r) => r.name).sort().join() === 'Chilli,Soup'],
    ["a queued delete of a food that stays is dropped; this device's own is kept", !gm.foodDeletes.includes(A) && gm.foodDeletes.join() === dm.foodDeletes.join()],
    ['summary counts the backup', summary === JSON.stringify({ days: 1, first: '2026-09-01', last: '2026-09-01', foods: 1, recipes: 1 })],
  ]
  for (const [n, ok] of checks) { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', 'import keeps:', n) }
}


// Shared devices: data recorded as another account's is never merged silently on sign-in;
// guest data still moves into the first account.
function accountOwner(): void {
  const A = uuid(), B = uuid()
  const day = { foods: [{ n: 'Toast', k: 100, p: 1, c: 1, f: 1, grams: 40 }], supps: {}, weight: null, workout: null }
  const withData = (lastPull: string | null, owner?: string) => {
    const s = stateFromBackup({ days: { '2026-09-20': structuredClone(day) } } as never)
    s.customFoods = [{ id: uuid(), n: 'Mine', k: 1, p: 1, c: 1, f: 1, g: 100, _dirty: false }]
    const m = s._meta!
    m.lastPull = lastPull
    m.days['2026-09-20'].dirty = false
    m.settings.dirty = false
    m.foodDeletes = [uuid()]
    if (owner) m.owner = owner
    return s
  }
  const synced = withData('2026-09-23T10:00:00Z', A)
  const kept = keepForAccount(structuredClone(synced), B)
  const km = kept._meta!
  const fresh = freshForAccount(B)
  const dev = withData('x', A)
  const legacy = withData('2026-09-01T00:00:00Z')
  const afterImport = stateFromBackup(JSON.parse(JSON.stringify(withData(null))), legacy)
  const restored = stateFromBackup(JSON.parse(JSON.stringify({ ...withData('x', B), days: {} })), dev)
  const checks: [string, boolean][] = [
    ['same account: carry on', ownerCheck(synced, A, false) === 'same'],
    ['another account: ask', ownerCheck(synced, B, false) === 'ask' && ownerCheck(synced, B, true) === 'ask'],
    ['guest data never synced: moves into the first account', ownerCheck(withData(null), B, false) === 'claim'],
    ['synced by an older version, still signed in: claim', ownerCheck(withData('x'), B, true) === 'claim'],
    ['synced by an older version, after a sign-out: ask', ownerCheck(withData('x'), B, false) === 'ask'],
    ['keep: owner is the new account and everything uploads', km.owner === B && km.settings.dirty && km.days['2026-09-20'].dirty && kept.customFoods.every((f) => f._dirty) && km.lastPull === null],
    ["keep: the other account's queued deletes are dropped", km.foodDeletes.length === 0],
    ['fresh: nothing from the device is left', fresh._meta!.owner === B && Object.keys(fresh.days).length === 0 && fresh.customFoods.length === 0 && fresh.recipes.length === 0 && !fresh._meta!.settings.dirty],
    ["a backup never changes whose device it is", restored._meta!.owner === A],
    ['an import keeps lastPull, so synced data still asks after a sign-out', ownerCheck(afterImport, B, false) === 'ask'],
  ]
  for (const [n, ok] of checks) { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', 'owner:', n) }
}

backupRestore().then(importCarryOver).then(accountOwner).then(syncResilience).then(() => process.exit(bad ? 1 : 0), (e) => { console.error(e); process.exit(1) })
