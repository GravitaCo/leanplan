/* Onboarding safety routing, skipped-answer defaults, units and starting targets
   (first-run-onboarding §2.1, §3, §5, §13, §14). Run from scripts/test-core.ts (npm test);
   returns the number of failures. */
import type { OnboardingOutcomes, Profile } from '@/core/types'
import { DEFAULT_PROFILE } from '@/core/data/constants'
import { SIGNPOSTS, beatFor, urgentAdviceFor } from '@/core/data/signposts'
import { asksMedical, legacySex, pregnancyReaskDue, routeSafety, safetyAnswersFrom, sexOf, type SafetyAnswers } from '@/core/domain/onboarding'
import { ABSOLUTE_FLOOR, JOB_MULT, KCAL_PER_KG_LOST, PROTEIN_RANGE_PER_KG, SEX_FLOOR, STEPS_MULT, activityLevelFor, movementMultiplier, startingTargets, trainingKcalPerDay, type TrainingLoad } from '@/core/domain/targets'
import { PROTEIN_PER_KG, suggestedTargets } from '@/core/domain/nutrition'
import { cmFromFtIn, formatHeight, formatWeight, ftInFromCm, kgFromLb, kgFromStLb, lbFromKg, stLbFromKg } from '@/core/domain/units'

let bad = 0
const report = (area: string, checks: [string, boolean][]) => {
  for (const [n, ok] of checks) { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', area + ':', n) }
}
const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) <= eps

const CLEAR: OnboardingOutcomes = { readiness: 'clear', medical: 'clear', wellbeing: 'clear', baseline: 'ok' }
const adult = (x: Partial<Profile> = {}): Profile => ({
  ...DEFAULT_PROFILE, sex: 'F', sexAnswer: 'female', age: 35, height: 165, weight: 70, goal: 'lose-fat',
  movement: { kind: 'steps', band: '5k-7.5k' }, outcomes: CLEAR, ...x,
})
const answers = (x: Partial<SafetyAnswers> = {}): SafetyAnswers => ({ age: 35, heightCm: 165, weightKg: 70, goal: 'lose-fat', outcomes: CLEAR, healthConsent: true, ...x })
const lift3: TrainingLoad = { daysPerWeek: 3, minutes: 45 }
const targetsFor = (p: Profile, t: TrainingLoad | null = lift3, consent = true, kg = p.weight ?? null) =>
  startingTargets(p, t, routeSafety(safetyAnswersFrom(p, kg, consent)), kg)
/** no calorie, maintenance or protein number anywhere in the output */
const noNumbers = (t: ReturnType<typeof startingTargets>) =>
  t.kcal === null && t.maintenance === null && t.protein === null && t.adjustPct === null && t.effectiveMultiplier === null &&
  !Object.values(t).some((v) => typeof v === 'number')

function units(): void {
  let stRound = true, ftRound = true
  for (let st = 5; st <= 30; st++) for (let lb = 0; lb < 14; lb += 0.5) {
    const back = stLbFromKg(kgFromStLb(st, lb))
    if (back.st !== st || back.lb !== lb) stRound = false
  }
  for (let ft = 4; ft <= 7; ft++) for (let i = 0; i < 12; i += 0.5) {
    const back = ftInFromCm(cmFromFtIn(ft, i))
    if (back.ft !== ft || back.in !== i) ftRound = false
  }
  let kgRound = true
  for (let kg = 40; kg <= 160; kg += 0.1) {
    const { st, lb } = stLbFromKg(kg)
    if (Math.abs(kgFromStLb(st, lb) - kg) > kgFromLb(0.25) + 1e-9) kgRound = false
  }
  report('units', [
    ['1 lb is exactly 0.45359237 kg, 1 st is 14 lb', kgFromLb(1) === 0.45359237 && near(kgFromStLb(1), 14 * 0.45359237)],
    ['1 ft is exactly 30.48 cm, 6 ft is 182.88 cm', near(cmFromFtIn(1), 30.48) && near(cmFromFtIn(6, 0), 182.88)],
    ['kg → lb → kg is exact', near(kgFromLb(lbFromKg(83.7)), 83.7) && near(lbFromKg(kgFromLb(200)), 200)],
    ['every st/lb (½ lb) round-trips exactly', stRound],
    ['every ft/in (½ in) round-trips exactly', ftRound],
    ['kg → st/lb → kg stays within ¼ lb', kgRound],
    ['13.9 lb rounds up into the next stone, never 14 lb', JSON.stringify(stLbFromKg(kgFromStLb(10, 13.9))) === '{"st":11,"lb":0}'],
    ['11.9 in rounds up into the next foot', JSON.stringify(ftInFromCm(cmFromFtIn(5, 11.9))) === '{"ft":6,"in":0}'],
    ['formatting', formatWeight(70, 'kg') === '70 kg' && formatWeight(70, 'st-lb') === '11 st 0.5 lb' && formatWeight(70, 'lb') === '154.5 lb'
      && formatHeight(170, 'ft-in') === '5 ft 7 in' && formatHeight(170.4, 'cm') === '170 cm'],
  ])
}

function routing(): void {
  const r = (x: Partial<SafetyAnswers>) => routeSafety(answers(x))
  const clear = r({})
  const u16 = r({ age: 15 })
  const t16 = r({ age: 16 }), t17 = r({ age: 17 }), a18 = r({ age: 18 })
  const preg = r({ pregnant: true })
  const thin = r({ weightKg: 50, heightCm: 170 }) // BMI 17.3
  const okBmi = r({ weightKg: 54, heightCm: 170 }) // BMI 18.7
  const wb = r({ outcomes: { ...CLEAR, wellbeing: 'flagged' } })
  const wbTeen = r({ age: 17, outcomes: { ...CLEAR, wellbeing: 'flagged' } })
  const wbUnsaid = r({ outcomes: { ...CLEAR, wellbeing: 'undisclosed' } })
  const ready = r({ outcomes: { ...CLEAR, readiness: 'flagged' } })
  const med = r({ outcomes: { ...CLEAR, medical: 'flagged' } })
  const noConsent = r({ healthConsent: false })
  const noAge = r({ age: null })
  report('routing', [
    ['clear adult: nothing fires', !clear.stop && !clear.noDeficit && !clear.hideWeight && !clear.noAI && !clear.gentle && !clear.maintenanceOnly
      && !clear.hideCalories && !clear.signpost.length && !clear.gentlerStart && !clear.reasons.length && !clear.defaults.length],
    ['under 16: kind stop, nothing shown', u16.stop === 'under16' && u16.hideCalories && u16.hiddenReason === 'under16' && u16.noAI && u16.hideWeight],
    ['16 and 17: no deficit, weight hidden, no AI, calories still shown', [t16, t17].every((x) => !x.stop && x.noDeficit && x.hideWeight && x.noAI && !x.hideCalories && x.reasons.includes('age-16-17'))],
    ['18: adult rules', !a18.noDeficit && !a18.hideWeight && !a18.noAI],
    ['pregnant or breastfeeding: maintenance only, no calorie number, gentle training, midwife/GP', preg.maintenanceOnly && preg.hideCalories && preg.hiddenReason === 'pregnancy' && preg.gentlerStart && preg.signpost.includes('midwife')],
    ['BMI under 18.5: no deficit, nothing else, nothing shown', thin.noDeficit && thin.reasons.join() === 'low-bmi' && !thin.hideCalories && !thin.hideWeight && !Object.keys(thin).some((k) => /bmi/i.test(k)) && !okBmi.noDeficit],
    ['wellbeing Yes/Sometimes: no deficit, gentle on, weight hidden, calm signposting', wb.noDeficit && wb.gentle && wb.hideWeight && wb.hiddenReason === 'gentle' && !wb.quietSignpost
      && ['beat', 'samaritans', 'nhs111', 'emergency'].every((k) => wb.signpost.includes(k as never)) && !wb.signpost.includes('childline')],
    ['wellbeing at 17 adds Childline', wbTeen.signpost.includes('childline')],
    ['wellbeing "Rather not say": maintenance pre-selected, gentle offered not on', wbUnsaid.startAtMaintenance && wbUnsaid.offerGentle && !wbUnsaid.gentle && !wbUnsaid.noDeficit && !wbUnsaid.defaults.includes('wellbeing')],
    ['readiness yes: gentler start plus signposting (not quiet)', ready.gentlerStart && ready.signpost.join() === 'nhs111,gp' && !ready.quietSignpost && !ready.noDeficit],
    ['medical flag: maintenance allowed, no high-protein anchor, GP note', med.noDeficit && !med.maintenanceOnly && !med.hideCalories && med.noProteinAnchor && med.gpNote && med.signpost.includes('gp')],
    ['medical question only when the goal means eating less', asksMedical('lose-fat') && !asksMedical('build-muscle') && !asksMedical('increase-strength') && !asksMedical('increase-endurance') && !asksMedical('feel-better') && !asksMedical(undefined)],
    ['consent declined: no calorie numbers, no weight', noConsent.hideCalories && noConsent.hiddenReason === 'no-consent' && noConsent.hideWeight],
    ['signposts come in a fixed order, no repeats', new Set(wb.signpost).size === wb.signpost.length && wb.signpost[0] === 'emergency'],
    // §2.1 skipped answers
    ['age skipped: 16–17 rules and no calorie number', noAge.noDeficit && noAge.hideWeight && noAge.noAI && noAge.hiddenReason === 'no-age' && noAge.defaults.includes('age')],
    ['readiness skipped: gentler start, signposting quietly', (() => { const x = r({ outcomes: { ...CLEAR, readiness: undefined } }); return x.gentlerStart && x.quietSignpost && x.signpost.join() === 'nhs111,gp' && x.defaults.includes('readiness') && !x.reasons.includes('readiness') })()],
    ['readiness skipped beside a louder row: not quiet', (() => { const x = r({ outcomes: { ...CLEAR, readiness: undefined, wellbeing: 'flagged' } }); return !x.quietSignpost && !x.signpost.includes('gp') })()],
    ['sleep/stress skipped: treated as poor (near maintenance, gentler)', (() => { const x = r({ outcomes: { ...CLEAR, baseline: undefined } }); return x.nearMaintenance && x.gentlerStart && x.defaults.includes('baseline') })()],
    ['wellbeing skipped: maintenance pre-selected, gentle offered, not on', (() => { const x = r({ outcomes: { ...CLEAR, wellbeing: undefined } }); return x.startAtMaintenance && x.offerGentle && !x.gentle && x.defaults.includes('wellbeing') })()],
    ['everything skipped never blocks', (() => { const x = r({ outcomes: {} }); return !x.stop && !x.hideCalories })()],
  ])
}

function signposts(): void {
  report('signposts', [
    ['Beat per nation (checked 27 Sept 2026)', beatFor('england') === '0808 801 0677' && beatFor('scotland') === '0808 801 0432' && beatFor('wales') === '0808 801 0433' && beatFor('northern-ireland') === '0808 801 0434'],
    ['Beat hours', SIGNPOSTS.beat.hours === '3pm–8pm, Monday to Friday'],
    ['Samaritans 116 123, Childline 0800 1111, 999', SIGNPOSTS.samaritans.phone === '116 123' && SIGNPOSTS.childline.phone === '0800 1111' && SIGNPOSTS.emergency.phone === '999'],
    ['NHS 111 in England, Wales, Scotland; GP in Northern Ireland', urgentAdviceFor('wales').kind === 'nhs111' && urgentAdviceFor('northern-ireland').kind === 'gp' && !SIGNPOSTS.nhs111.nations!.includes('northern-ireland')],
  ])
}

function profileBits(): void {
  report('profile', [
    ['sex answer read from older profiles', sexOf({ sex: 'M' }) === 'male' && sexOf({ sex: 'F' }) === 'female' && sexOf({ sex: 'M', sexAnswer: 'unspecified' }) === 'unspecified'],
    ['legacy sex for "Prefer not to say" is the lower estimate', legacySex('unspecified') === 'F' && legacySex('male') === 'M'],
    ['pregnancy re-asked after 12 weeks', pregnancyReaskDue({ flagged: true, askedAt: '2026-07-01' }, '2026-09-23') && !pregnancyReaskDue({ flagged: true, askedAt: '2026-07-01' }, '2026-09-22') && !pregnancyReaskDue(undefined, '2027-01-01')],
    ['steps and job multipliers stay within sedentary…moderate (training is separate)', Object.values({ ...STEPS_MULT, ...JOB_MULT }).every((m) => m >= 1.2 && m <= 1.55)],
    ['movement skipped → the lowest multiplier', movementMultiplier(undefined) === 1.2],
    ['activity level re-mapped from the effective multiplier', activityLevelFor(1.2) === 'sedentary' && activityLevelFor(1.34) === 'light' && activityLevelFor(1.6) === 'moderate' && activityLevelFor(1.9) === 'active'],
    ['training counted once, as a weekly average of net burn', near(trainingKcalPerDay(lift3, 70), (2.5 * 70 * 0.75 * 3) / 7) && trainingKcalPerDay(null, 70) === 0],
  ])
}

function targets(): void {
  // Female, 35, 165 cm, 70 kg, 5,000–7,500 steps, lifting 3 × 45 min, lose fat, no body fat given.
  // BMR 1395.25; maintenance 1395.25 × 1.3 + 56.25 = 1870.08; band −13.5% → 1617.6 → 1,600.
  const base = targetsFor(adult())
  const baseJson = JSON.stringify({ k: base.kcal, m: base.maintenance, p: base.protein, a: base.adjustPct, f: base.floorsApplied, h: base.hidden, r: base.reviewAfter })
  const want = JSON.stringify({ k: 1600, m: { low: 1590, high: 2150 }, p: { low: 110, high: 155, anchor: true }, a: -13, f: [], h: null, r: '3–4 weeks' })
  const male = targetsFor(adult({ sex: 'M', sexAnswer: 'male' }))
  const unsaid = targetsFor(adult({ sexAnswer: 'unspecified' }))
  const w = (t: typeof base) => t.maintenance!.high - t.maintenance!.low
  // floors
  const small = { age: 60, height: 160, weight: 60, bodyFat: 35, movement: undefined } as Partial<Profile>
  const mSmall = targetsFor(adult({ ...small, sex: 'M', sexAnswer: 'male' }), null)
  const fSmall = targetsFor(adult({ ...small }), null)
  const uSmall = targetsFor(adult({ ...small, sexAnswer: 'unspecified' }), null)
  const big = targetsFor(adult({ age: 25, height: 180, weight: 120, bodyFat: 40, targetRate: 'aggressive', movement: undefined }), null)
  // BMR 2039 is the floor; the band asked for −25% (1835)
  const capped = targetsFor(adult({ sex: 'M', sexAnswer: 'male', age: 20, height: 190, weight: 70, bodyFat: 30, targetRate: 'aggressive', movement: { kind: 'steps', band: 'over-12.5k' } }), { daysPerWeek: 5, minutes: 60, met: 8 })
  // a sweep: every target a multiple of 50, at or above every floor, within 1% a week
  let sweepOk = true, sweepN = 0
  for (const sexAnswer of ['female', 'male', 'unspecified'] as const) for (const age of [18, 30, 50, 70, 90]) for (const height of [140, 160, 180, 200])
    for (const weight of [45, 60, 80, 110, 150]) for (const goal of ['lose-fat', 'build-muscle', 'increase-strength', 'increase-endurance', 'feel-better'] as const)
      for (const targetRate of ['steady', 'aggressive'] as const) {
        const p = adult({ sexAnswer, sex: legacySex(sexAnswer), age, height, weight, goal, targetRate, bodyFat: 45, movement: undefined })
        const t = targetsFor(p, null)
        if (t.kcal == null) continue // low BMI etc. still produce numbers; only hidden cases skip
        sweepN++
        const bmr = 10 * weight + 6.25 * height - 5 * age + { male: 5, female: -161, unspecified: -78 }[sexAnswer]
        const maint = bmr * 1.2
        if (t.kcal % 50 || t.kcal < ABSOLUTE_FLOOR || t.kcal < SEX_FLOOR[sexAnswer] || t.kcal < bmr - 1e-9
          || (t.kcal < maint && maint - t.kcal > (weight * 0.01 * KCAL_PER_KG_LOST) / 7 + 1e-9)
          || t.maintenance!.low % 10 || t.maintenance!.high % 10) sweepOk = false
      }
  // routing into targets
  const teen = targetsFor(adult({ age: 17 }))
  const flaggedWb = targetsFor(adult({ outcomes: { ...CLEAR, wellbeing: 'flagged' } }))
  const unsaidWb = adult({ outcomes: { ...CLEAR, wellbeing: 'undisclosed' } })
  const unsaidT = targetsFor(unsaidWb)
  const unsaidChosen = startingTargets(unsaidWb, lift3, routeSafety(safetyAnswersFrom(unsaidWb, 70, true)), 70, { acceptDeficit: true })
  const thinT = targetsFor(adult({ weight: 50, height: 170 }))
  const med = targetsFor(adult({ outcomes: { ...CLEAR, medical: 'flagged' } }))
  const poorSleep = targetsFor(adult({ bodyFat: 35, outcomes: { ...CLEAR, baseline: 'low' } }))
  const muscle = targetsFor(adult({ goal: 'build-muscle', age: 17 }))
  // hidden
  const hiddenCases = {
    'no-weight': targetsFor(adult({ weight: null })),
    'no-height': targetsFor(adult({ height: null })),
    'no-consent': targetsFor(adult(), lift3, false),
    pregnancy: targetsFor(adult({ pregnancy: { flagged: true, askedAt: '2026-09-27' } })),
    gentle: flaggedWb,
    'no-age': targetsFor(adult({ age: null })),
    under16: targetsFor(adult({ age: 15 })),
  }
  // endurance energy availability: female 55 kg, 6 × 90 min running at 9.8 MET, cutting
  const runner = adult({ age: 30, weight: 55, bodyFat: 20 })
  const ea = targetsFor(runner, { daysPerWeek: 6, minutes: 90, met: 9.8, endurance: true })
  const eaMaint = targetsFor({ ...runner, goal: 'increase-endurance' }, { daysPerWeek: 3, minutes: 45, met: 7 })
  const skipped = targetsFor(adult({ sexAnswer: 'unspecified', movement: undefined, outcomes: {} }), null)

  report('targets', [
    ['worked example: 1,600 kcal, maintenance 1,590–2,150, protein 110–155 g, review after 3–4 weeks', baseJson === want],
    ['target rounded to 50, range to 10', [base, male, unsaid].every((t) => t.kcal! % 50 === 0 && t.maintenance!.low % 10 === 0 && t.maintenance!.high % 10 === 0)],
    ['range is about ±15% of maintenance', Math.abs(w(base) / ((base.maintenance!.low + base.maintenance!.high) / 2) - 0.30) < 0.01],
    ['"Prefer not to say": midpoint constant, a wider range', w(unsaid) > w(base) && w(unsaid) > w(male)
      && unsaid.maintenance!.low + unsaid.maintenance!.high > base.maintenance!.low + base.maintenance!.high
      && unsaid.maintenance!.low + unsaid.maintenance!.high < male.maintenance!.low + male.maintenance!.high],
    ['floor: men 1,500', mSmall.kcal === 1500 && mSmall.floorsApplied.join() === 'sex-minimum'],
    ['floor: women 1,200', fSmall.kcal === 1200 && fSmall.floorsApplied.join() === 'sex-minimum'],
    ['floor: "Prefer not to say" 1,200', uSmall.kcal! >= 1200 && SEX_FLOOR.unspecified === 1200],
    ['floor: never below BMR', big.floorsApplied.join() === 'bmr' && big.kcal! >= 2039 && big.kcal === 2050],
    ['at most 1% of body weight a week', capped.floorsApplied.join() === 'weekly-loss-cap' && capped.kcal === 2400],
    [`sweep of ${sweepN} profiles: multiples of 50, every floor, ≤1%/week, never below 800`, sweepOk && sweepN > 1000],
    ['16–17: no deficit (maintenance), numbers still shown', teen.kcal !== null && teen.adjustPct === 0],
    ['16–17 building muscle may still eat a little more, never less', muscle.hidden === null && muscle.adjustPct! > 0],
    ['BMI under 18.5: maintenance, no BMI in the output', thinT.adjustPct === 0 && !('bmi' in thinT)],
    ['wellbeing "Rather not say": maintenance until they choose otherwise', unsaidT.adjustPct === 0 && unsaidChosen.adjustPct! < 0],
    ['medical: maintenance allowed, protein at 0.75 g/kg (no anchor)', med.adjustPct === 0 && med.kcal !== null && JSON.stringify(med.protein) === JSON.stringify({ low: 55, high: 55, anchor: false })],
    ['poor sleep/stress: no deeper than −10%', poorSleep.adjustPct === -10],
    ['every hidden reason: no calorie, maintenance or protein number', Object.entries(hiddenCases).every(([why, t]) => t.hidden === why && noNumbers(t))],
    ['endurance: low energy availability warns', ea.lowEnergyAvailability && !base.lowEnergyAvailability],
    ['endurance at maintenance: no warning', !eaMaint.lowEnergyAvailability && eaMaint.kcal !== null],
    ['skipped sex, movement and outcomes are listed as defaults', ['sex', 'movement', 'readiness', 'baseline', 'wellbeing'].every((d) => skipped.defaults.includes(d as never)) && skipped.effectiveMultiplier === 1.2],
    ['no weight lists the weight default', hiddenCases['no-weight'].defaults.includes('weight')],
    ['protein ranges contain the goal anchors', (Object.keys(PROTEIN_RANGE_PER_KG) as (keyof typeof PROTEIN_RANGE_PER_KG)[]).every((g) => PROTEIN_RANGE_PER_KG[g].low <= PROTEIN_PER_KG[g] && PROTEIN_PER_KG[g] <= PROTEIN_RANGE_PER_KG[g].high)],
  ])

  // suggestedTargets keeps working; "Prefer not to say" lands between the two
  const s = (sexAnswer?: 'unspecified') => suggestedTargets({ ...DEFAULT_PROFILE, sex: 'M', sexAnswer, age: 40, height: 175, activityLevel: 'light', goal: 'feel-better' }, 75) as { maint: number }
  const sF = suggestedTargets({ ...DEFAULT_PROFILE, sex: 'F', age: 40, height: 175, activityLevel: 'light', goal: 'feel-better' }, 75) as { maint: number }
  report('suggestedTargets', [
    ['M / F unchanged, unspecified at the midpoint', s().maint === Math.round((750 + 1093.75 - 200 + 5) * 1.375) && s('unspecified').maint < s().maint && s('unspecified').maint > sF.maint],
  ])
}

export function onboardingSuite(): number {
  bad = 0
  units(); routing(); signposts(); profileBits(); targets()
  return bad
}
