/* Onboarding safety routing, skipped-answer defaults, units and starting targets
   (first-run-onboarding §2.1, §3, §5, §13, §14). Run from scripts/test-core.ts (npm test);
   returns the number of failures. */
import type { OnboardingOutcomes, Profile } from '@/core/types'
import { DEFAULT_PROFILE } from '@/core/data/constants'
import { SIGNPOSTS, beatFor, signpostName, signpostsFor, urgentAdviceFor } from '@/core/data/signposts'
import { isUnderAge, reminderAction } from '@/core/domain/age'
import { MIN_AGE as LEGAL_MIN_AGE } from '@/core/legal'
import { MIN_AGE, asksMedical, legacySex, profileRouting, wellbeingOutcome, pregnancyReaskDue, routeSafety, safetyAnswersFrom, sexOf, type SafetyAnswers } from '@/core/domain/onboarding'
import { ABSOLUTE_FLOOR, JOB_QUESTION, STEPS_QUESTION, JOB_MULT, KCAL_PER_KG_LOST, PROTEIN_RANGE_PER_KG, SEX_FLOOR, STEPS_MULT, activityLevelFor, movementMultiplier, startingTargets, trainingKcalPerDay, type TrainingLoad } from '@/core/domain/targets'
import { HELD_AT_MAINTENANCE_NOTE, PROTEIN_PER_KG, calorieFloor, mifflinBmr, suggestedTargets } from '@/core/domain/nutrition'
import { RANGE_ASK_DAYS, RANGE_SNOOZE_DAYS, SOMETIMES_NO_DEFICIT_DAYS, TODAY_ASK_DAYS, answerFoodOptInIn, applyRestrictionSignalIn, foodModeOf, foodView, maintenanceRange, mealWords, proteinRangeFor, rangeAskDue, restrictionSignal, todayAskDue } from '@/core/domain/foodMode'
import { SAME_GAP, explainStart } from '@/core/domain/targets'
import { FLOOR_LINE, SUMMARY } from '../src/screens/onboarding/copy'
import { shiftDay } from '@/core/domain/date'
import { withoutHealth } from '@/data/consent'
import { MERGED_FIELDS } from '@/core/domain/profileMerge'
import { optInRows } from '../src/screens/profile/healthAnswerRows'
import { supportList } from '../src/screens/profile/supportRows'
import { SUPPORT } from '../src/screens/onboarding/copyApp'
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
  const t16 = r({ age: 16 }), t17 = r({ age: 17 }), t17b = r({ age: 17.9 }), a18 = r({ age: 18 })
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
    ['18+ (Benn): one minimum age, the legal one', MIN_AGE === 18 && MIN_AGE === LEGAL_MIN_AGE],
    ['isUnderAge: under 18 only; a missing or non-numeric age is not under age', isUnderAge(0) && isUnderAge(15) && isUnderAge(17) && isUnderAge(17.9)
      && !isUnderAge(18) && !isUnderAge(120) && !isUnderAge(null) && !isUnderAge(undefined) && !isUnderAge(NaN)],
    ['reminders and the stop: held when it shows with reminders on, retried while held, restored once it goes', (() => {
      const A = (stopped: boolean, enabled: boolean, held: boolean) => reminderAction({ stopped, enabled, held })
      return A(true, true, false) === 'hold' && A(true, false, false) === null && A(true, true, true) === 'retry' && A(true, false, true) === 'retry'
        && A(false, true, true) === 'restore' && A(false, false, true) === 'restore' && A(false, true, false) === null && A(false, false, false) === null })()],
    ['under 18 (15, 16, 17): kind stop, nothing shown', [u16, t16, t17, t17b].every((x) => x.stop === 'under16' && x.hideCalories && x.hiddenReason === 'under16' && x.noAI && x.hideWeight && x.reasons.join() === 'under16')],
    ['no 16–17 tier left: nothing under 18 gets past the stop', [t16, t17].every((x) => !x.signpost.length && x.maintenanceOnly)],
    ['18: adult rules', !a18.stop && !a18.noDeficit && !a18.hideWeight && !a18.noAI && !a18.reasons.length],
    ['pregnant or breastfeeding: maintenance only, no calorie number, gentle training, midwife/GP', preg.maintenanceOnly && preg.hideCalories && preg.hiddenReason === 'pregnancy' && preg.gentlerStart && preg.signpost.includes('midwife')],
    ['BMI under 18.5: no deficit, nothing else, nothing shown', thin.noDeficit && thin.reasons.join() === 'low-bmi' && !thin.hideCalories && !thin.hideWeight && !Object.keys(thin).some((k) => /bmi/i.test(k)) && !okBmi.noDeficit],
    ['wellbeing Yes: no deficit, gentle on, weight hidden, calm signposting', wb.noDeficit && wb.gentle && wb.hideWeight && wb.hiddenReason === 'gentle' && !wb.quietSignpost
      && ['beat', 'samaritans', 'nhs111', 'emergency'].every((k) => wb.signpost.includes(k as never)) && !wb.signpost.includes('childline')],
    ['wellbeing at 17: the stop comes first, routing adds no Childline', wbTeen.stop === 'under16' && !wbTeen.signpost.includes('childline') && !wb.signpost.includes('childline')],
    ['wellbeing "Rather not say": maintenance pre-selected, gentle offered not on', wbUnsaid.startAtMaintenance && wbUnsaid.offerGentle && !wbUnsaid.gentle && !wbUnsaid.noDeficit && !wbUnsaid.defaults.includes('wellbeing')],
    ['readiness yes: gentler start plus signposting (not quiet)', ready.gentlerStart && ready.signpost.join() === 'nhs111,gp' && !ready.quietSignpost && !ready.noDeficit],
    ['medical flag: maintenance allowed, no high-protein anchor, GP note', med.noDeficit && !med.maintenanceOnly && !med.hideCalories && med.noProteinAnchor && med.gpNote && med.signpost.includes('gp')],
    ['medical question only when the goal means eating less', asksMedical('lose-fat') && !asksMedical('build-muscle') && !asksMedical('increase-strength') && !asksMedical('increase-endurance') && !asksMedical('feel-better') && !asksMedical(undefined)],
    ['consent declined: no calorie numbers, no weight', noConsent.hideCalories && noConsent.hiddenReason === 'no-consent' && noConsent.hideWeight],
    ['signposts come in a fixed order, no repeats', new Set(wb.signpost).size === wb.signpost.length && wb.signpost[0] === 'emergency'],
    // §2.1 skipped answers
    ['age skipped: no deficit, weight hidden, no AI, no calorie number (the safe defaults)', !noAge.stop && noAge.noDeficit && noAge.hideWeight && noAge.noAI && noAge.hiddenReason === 'no-age' && noAge.defaults.includes('age')],
    ['readiness skipped: gentler start, signposting quietly', (() => { const x = r({ outcomes: { ...CLEAR, readiness: undefined } }); return x.gentlerStart && x.quietSignpost && x.signpost.join() === 'nhs111,gp' && x.defaults.includes('readiness') && !x.reasons.includes('readiness') })()],
    ['readiness skipped beside a louder row: not quiet', (() => { const x = r({ outcomes: { ...CLEAR, readiness: undefined, wellbeing: 'flagged' } }); return !x.quietSignpost && !x.signpost.includes('gp') })()],
    ['sleep/stress skipped: treated as poor (near maintenance, gentler)', (() => { const x = r({ outcomes: { ...CLEAR, baseline: undefined } }); return x.nearMaintenance && x.gentlerStart && x.defaults.includes('baseline') })()],
    ['wellbeing skipped: maintenance pre-selected, gentle offered, not on', (() => { const x = r({ outcomes: { ...CLEAR, wellbeing: undefined } }); return x.startAtMaintenance && x.offerGentle && !x.gentle && x.defaults.includes('wellbeing') })()],
    ['wellbeing board options: No → clear, Yes → flagged (its stored name), Sometimes → sometimes, Rather not say → undisclosed, skipped → absent',
      wellbeingOutcome('no') === 'clear' && wellbeingOutcome('yes') === 'flagged' && wellbeingOutcome('sometimes') === 'sometimes' && wellbeingOutcome('rather-not-say') === 'undisclosed' && wellbeingOutcome(undefined) === undefined],
    ['wellbeing No: normal targets, nothing routed', (() => { const x = r({ outcomes: { ...CLEAR, wellbeing: wellbeingOutcome('no') } }); return !x.noDeficit && !x.startAtMaintenance && !x.offerGentle && !x.gentle && !x.hideWeight && !x.signpost.length })()],
    ['wellbeing Rather not say and skipped: weight shown, deficit offered not pre-selected', [wellbeingOutcome('rather-not-say'), undefined].every((w) => { const x = r({ outcomes: { ...CLEAR, wellbeing: w } }); return !x.hideWeight && !x.noDeficit && x.startAtMaintenance && !x.hideCalories })],
    ['everything skipped never blocks', (() => { const x = r({ outcomes: {} }); return !x.stop && !x.hideCalories })()],
  ])
}

function signposts(): void {
  report('signposts', [
    ['Beat per nation (checked 27 Sept 2026)', beatFor('england') === '0808 801 0677' && beatFor('scotland') === '0808 801 0432' && beatFor('wales') === '0808 801 0433' && beatFor('northern-ireland') === '0808 801 0434'],
    ['Beat hours', SIGNPOSTS.beat.hours === '3pm–8pm, Monday to Friday'],
    ['Samaritans 116 123, Childline 0800 1111, 999', SIGNPOSTS.samaritans.phone === '116 123' && SIGNPOSTS.childline.phone === '0800 1111' && SIGNPOSTS.emergency.phone === '999'],
    ['Beat is free', SIGNPOSTS.beat.free === true],
    ['Scotland calls it NHS 24 (111)', signpostName(SIGNPOSTS.nhs111, 'scotland') === 'NHS 24 (111)' && signpostName(SIGNPOSTS.nhs111, 'england') === 'NHS 111'],
    ['NHS 111 option 2 (mental health) in England and Wales with the wellbeing signposts', SIGNPOSTS['nhs111-mental-health'].nations!.join() === 'england,wales'
      && routeSafety(answers({ outcomes: { ...CLEAR, wellbeing: 'flagged' } })).signpost.includes('nhs111-mental-health')],
    ['per nation: Northern Ireland gets the GP, no option 2', (() => {
      const kinds = routeSafety(answers({ outcomes: { ...CLEAR, wellbeing: 'flagged' } })).signpost
      const ni = signpostsFor(kinds, 'northern-ireland').map((x) => x.kind), en = signpostsFor(kinds, 'england').map((x) => x.kind)
      return !ni.includes('nhs111') && !ni.includes('nhs111-mental-health') && ni.includes('gp') && en.includes('nhs111-mental-health') && en.includes('nhs111') })()],
    ['steps and job questions say "not counting workouts"', STEPS_QUESTION.includes('not counting workouts') && JOB_QUESTION.includes('not counting workouts')],
    ['Profile support sheet: Beat by nation with its web link, option 2 where it runs, NHS 111 / NHS 24 / the GP, Samaritans, 999 (ob9-7)', (() => {
      const en = supportList('england'), sc = supportList('scotland'), wa = supportList('wales'), ni = supportList('northern-ireland')
      const names = (l: typeof en) => l.map((x) => x.name).join('|')
      return names(en) === 'Beat|NHS 111, option 2|NHS 111|Samaritans|Emergency services' && names(wa) === names(en)
        && names(sc) === 'Beat|NHS 24 (111)|Samaritans|Emergency services' && names(ni) === 'Beat|Your GP|Samaritans|Emergency services'
        && en[0].num === '0808 801 0677' && sc[0].num === '0808 801 0432' && wa[0].num === '0808 801 0433' && ni[0].num === '0808 801 0434'
        && [en, sc, wa, ni].every((l) => l[0].web === SIGNPOSTS.beat.web && l[0].webLabel === SUPPORT.beatWeb && l.at(-1)!.tel === '999' && l.at(-2)!.tel === '116 123')
        && !ni[1].tel && en[0].desc === 'Eating disorder support · 3pm–8pm, Monday to Friday' && en[1].desc === 'Mental health crisis line · 24 hours, every day'
        && en[2].desc === 'Medical help when it isn’t an emergency · 24 hours' && en[3].desc === 'Talk about anything · 24 hours, every day'
    })()],
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
  const teen16 = targetsFor(adult({ age: 16 }))
  const adult18 = targetsFor(adult({ age: 18 }))
  const flaggedWb = targetsFor(adult({ outcomes: { ...CLEAR, wellbeing: 'flagged' } }))
  const unsaidWb = adult({ outcomes: { ...CLEAR, wellbeing: 'undisclosed' } })
  const unsaidT = targetsFor(unsaidWb)
  const unsaidChosen = startingTargets(unsaidWb, lift3, routeSafety(safetyAnswersFrom(unsaidWb, 70, true)), 70, { acceptDeficit: true })
  const thinT = targetsFor(adult({ weight: 50, height: 170 }))
  const med = targetsFor(adult({ outcomes: { ...CLEAR, medical: 'flagged' } }))
  const poorSleep = targetsFor(adult({ bodyFat: 35, outcomes: { ...CLEAR, baseline: 'low' } }))
  const muscle = targetsFor(adult({ goal: 'build-muscle', age: 18 }))
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
    ['16 and 17: the stop, no numbers at all', [teen, teen16].every((t) => t.hidden === 'under16' && noNumbers(t))],
    ['18 losing fat: the adult deficit; 18 building muscle eats a little more', adult18.hidden === null && adult18.adjustPct! < 0 && muscle.hidden === null && muscle.adjustPct! > 0],
    ['BMI under 18.5: maintenance, no BMI in the output', thinT.adjustPct === 0 && !('bmi' in thinT)],
    ['wellbeing "Rather not say": maintenance until they choose otherwise', unsaidT.adjustPct === 0 && unsaidChosen.adjustPct! < 0],
    ['medical: maintenance allowed, protein a minimum of 0.75 g/kg (no anchor)', med.adjustPct === 0 && med.kcal !== null && JSON.stringify(med.protein) === JSON.stringify({ low: 55, high: null, anchor: false })],
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
  // Profile's suggestedTargets uses the same floors, so it never disagrees with the summary
  const st = (sex: 'M' | 'F', sexAnswer: 'male' | 'female' | 'unspecified', x: Partial<Profile>, kg: number) =>
    suggestedTargets({ ...DEFAULT_PROFILE, sex, sexAnswer, activityLevel: 'sedentary', goal: 'lose-fat', targetRate: 'aggressive', ...x }, kg) as { kcal: number; floored: boolean }
  const tiny = { age: 60, height: 160, bodyFat: 35 }
  let agree = true
  for (const [sex, sexAnswer] of [['M', 'male'], ['F', 'female'], ['F', 'unspecified']] as const) for (const age of [18, 40, 70]) for (const height of [150, 170, 190]) for (const kg of [50, 70, 100, 140]) {
    const t = st(sex, sexAnswer, { age, height, bodyFat: 40 }, kg)
    const floor = Math.ceil(calorieFloor(mifflinBmr(kg, height, age, sexAnswer), sexAnswer))
    if (t.kcal < floor || (t.floored && t.kcal !== Math.ceil(floor / 50) * 50)) agree = false
    const s2 = targetsFor(adult({ sex, sexAnswer, age, height, weight: kg, bodyFat: 40, targetRate: 'aggressive', movement: undefined }), null)
    if (s2.kcal !== null && s2.floorsApplied.some((f) => f !== 'weekly-loss-cap') && s2.kcal !== Math.ceil(floor / 50) * 50) agree = false
  }
  report('suggestedTargets', [
    ['floor: men 1,500 on Profile too', st('M', 'male', tiny, 60).kcal === 1500 && st('M', 'male', tiny, 60).floored],
    ['floor: women and unspecified 1,200 on Profile too', st('F', 'female', tiny, 60).kcal === 1200 && st('F', 'unspecified', { ...tiny, age: 70 }, 60).kcal === 1200 && st('F', 'unspecified', tiny, 60).kcal === 1250],
    ['floor: BMR above the sex floor holds', st('F', 'female', { age: 25, height: 180, bodyFat: 40 }, 120).kcal === 2050],
    ['Profile and summary floors agree across a sweep', agree],
    ['M / F unchanged, unspecified at the midpoint', s().maint === Math.round(((750 + 1093.75 - 200 + 5) * 1.375) / 10) * 10 && s('unspecified').maint < s().maint && s('unspecified').maint > sF.maint],
  ])
}

function profileMatchesSummary(): void {
  const kg = 70
  const onProfile = (p: Profile, consent = true) => suggestedTargets(p, kg, profileRouting(p, kg, consent)) as any
  // not onboarded: age and pregnancy rules still apply on Profile
  const legacy = { ...DEFAULT_PROFILE, sex: 'F' as const, age: 35, height: 165, activityLevel: 'light' as const, goal: 'lose-fat' as const }
  const teen = onProfile({ ...legacy, age: 17 })
  const adultLegacy = onProfile(legacy)
  const done = (x: Partial<Profile>) => ({ ...adult(x), onboardedAt: '2026-09-27T10:00:00Z' })
  const med = onProfile(done({ outcomes: { ...CLEAR, medical: 'flagged' } }))
  const med70 = onProfile(done({ age: 70, outcomes: { ...CLEAR, medical: 'flagged' } }))
  const gentle = onProfile(done({ outcomes: { ...CLEAR, wellbeing: 'flagged' } }))
  const preg = onProfile({ ...legacy, pregnancy: { flagged: true, askedAt: '2026-09-27' } })
  const unsaid = done({ outcomes: { ...CLEAR, wellbeing: 'undisclosed' } })
  const sleepy = onProfile(done({ bodyFat: 35, outcomes: { ...CLEAR, baseline: 'low' } }))
  // the summary stores its multiplier; Profile then shows the same numbers
  const same = (p0: Profile, t: TrainingLoad | null) => {
    const sum = startingTargets(p0, t, routeSafety(safetyAnswersFrom(p0, kg, true)), kg)
    const p1: Profile = { ...p0, activityMult: sum.effectiveMultiplier!, activityLevel: activityLevelFor(sum.effectiveMultiplier!) }
    const prof = onProfile(p1)
    const again = startingTargets(p1, t, routeSafety(safetyAnswersFrom(p1, kg, true)), kg)
    const mid = (sum.maintenance!.low + sum.maintenance!.high) / 2
    return sum.kcal !== null && prof.kcal === sum.kcal && prof.adjustPct === sum.adjustPct && again.kcal === sum.kcal
      && JSON.stringify(again.maintenance) === JSON.stringify(sum.maintenance) && Math.abs(prof.maint - mid) <= 10
      && (sum.protein!.high === null ? prof.p === sum.protein!.low : prof.p >= sum.protein!.low - 5 && prof.p <= sum.protein!.high! + 5)
  }
  const desk = done({ movement: { kind: 'job', job: 'desk' } })
  const walker = done({ movement: { kind: 'steps', band: '7.5k-10k' } })
  let sweep = true, n = 0
  for (const movement of [{ kind: 'steps', band: 'under-5k' }, { kind: 'steps', band: 'over-12.5k' }, { kind: 'job', job: 'manual' }, undefined] as Profile['movement'][])
    for (const goal of ['lose-fat', 'build-muscle', 'increase-strength', 'increase-endurance', 'feel-better'] as const)
      for (const t of [null, lift3, { daysPerWeek: 5, minutes: 60, met: 8, endurance: true }])
        for (const outcomes of [CLEAR, { ...CLEAR, medical: 'flagged' as const }, { ...CLEAR, baseline: 'low' as const }, { ...CLEAR, wellbeing: 'undisclosed' as const }])
          for (const sexAnswer of ['female', 'male', 'unspecified'] as const) {
            n++; if (!same(done({ movement, goal, outcomes, sexAnswer, sex: legacySex(sexAnswer), bodyFat: 30 }), t)) sweep = false
          }
  report('profile routing', [
    ['17-year-old on Profile: the stop, no numbers', teen.hidden === 'under16' && !('kcal' in teen)],
    ['older profiles keep their deficit (§12)', adultLegacy.adjustPct < 0],
    ['medical flag: no deficit on Profile, protein at least 0.75 g/kg', med.adjustPct === 0 && med.proteinMinimum && med.p === 55],
    ['medical flag at 70: at least 1.0 g/kg', med70.proteinMinimum && med70.p === 70],
    ['gentle mode and pregnancy: no calorie number on Profile', gentle.hidden === 'gentle' && preg.hidden === 'pregnancy' && !('kcal' in gentle) && !('kcal' in preg)],
    ['wellbeing undisclosed: maintenance until the deficit is chosen', onProfile(unsaid).adjustPct === 0 && onProfile({ ...unsaid, deficitChosen: true }).adjustPct < 0],
    ['poor sleep: no deeper than −10% on Profile', sleepy.adjustPct === -10],
    ['no health consent after onboarding: nothing shown', onProfile(done({}), false).hidden === 'no-consent'],
    ['held at maintenance: the note shows for BMI under 18.5, medical and "Rather not say"', med.heldAtMaintenance
      && onProfile({ ...legacy, height: 200 }).heldAtMaintenance && onProfile(unsaid).heldAtMaintenance],
    ['no note without a clamp, without a deficit goal, or once the deficit is chosen', !adultLegacy.heldAtMaintenance
      && !onProfile({ ...legacy, height: 200, goal: 'build-muscle' }).heldAtMaintenance && !onProfile({ ...legacy, height: 200, goal: 'feel-better' }).heldAtMaintenance
      && !onProfile({ ...unsaid, deficitChosen: true }).heldAtMaintenance && !sleepy.heldAtMaintenance],
    ['no note when the floor note shows', (() => {
      const x = suggestedTargets({ ...legacy, height: 150, activityLevel: 'sedentary' }, 35, profileRouting({ ...legacy, height: 150 }, 35, true)) as any
      return x.floored && !x.heldAtMaintenance })()],
    ['the note never says why', HELD_AT_MAINTENANCE_NOTE === 'Tali keeps this at maintenance for now, to keep things safe.' && !/age|bmi|weight|16|17|18/i.test(HELD_AT_MAINTENANCE_NOTE)],
    ['summary and Profile agree on the note', (() => {
      const p = done({ height: 200 }); const t = startingTargets(p, lift3, routeSafety(safetyAnswersFrom(p, kg, true)), kg)
      const p1 = { ...p, activityMult: t.effectiveMultiplier! }
      return t.heldAtMaintenance && onProfile(p1).heldAtMaintenance })()],
    ['desk job: Profile shows the summary numbers exactly', same(desk, null)],
    ['7,500–10,000 steps and 3 × 45 min: Profile shows the summary numbers exactly', same(walker, lift3)],
    [`${n} combinations: Profile and summary always match`, sweep],
    ['"Prefer not to say" stored as F still uses the midpoint', (() => {
      const u = onProfile({ ...legacy, sex: 'F', sexAnswer: 'unspecified' }), f = onProfile(legacy), m = onProfile({ ...legacy, sex: 'M' })
      return u.maint > f.maint && u.maint < m.maint })()],
  ])
}

/** Onboarding 9 (s-ob9): Sometimes split from Yes, the food rules, the asks and their timing. */
function foodMode(): void {
  const ON = '2026-06-01'
  const day = (n: number) => shiftDay(ON, n)
  const some = (x: Partial<Profile> = {}) => adult({ outcomes: { ...CLEAR, wellbeing: 'sometimes' }, onboardedAt: ON + 'T09:00:00.000Z', activityMult: 1.5, ...x })
  const yes = (x: Partial<Profile> = {}) => adult({ outcomes: { ...CLEAR, wellbeing: 'flagged' }, onboardedAt: ON + 'T09:00:00.000Z', gentle: true, activityMult: 1.5, ...x })
  const rs = routeSafety(answers({ outcomes: { ...CLEAR, wellbeing: 'sometimes' } }))
  const ry = routeSafety(answers({ outcomes: { ...CLEAR, wellbeing: 'flagged' } }))
  const goals = ['lose-fat', 'build-muscle', 'increase-strength', 'increase-endurance', 'feel-better'] as const
  const tS = targetsFor(some())
  const est = explainStart({ kcal: 1650, estimate: 1900 })
  // a small, older person losing fat: the sex minimum sets the start
  const small = targetsFor(adult({ age: 70, height: 150, weight: 45, movement: { kind: 'steps', band: 'under-5k' } }), null)
  const smallE = explainStart(small)
  const floorNear = explainStart({ kcal: 1200, estimate: 1150, floorsApplied: ['sex-minimum'] })
  const gain = explainStart({ kcal: 2150, estimate: 1900 })
  const sweep = [0, 13, 14, 27, 28, 89, 90, 91, 120, 365, 1000]
  // the asks are answered or not; the view never changes by date alone
  const answered = (p: Profile, a: Parameters<typeof answerFoodOptInIn>[1], d: string) => { const q = structuredClone(p); answerFoodOptInIn(q, a, d, d + 'T10:00:00.000Z'); return q }
  const keptOnFood = answered(some(), { ask: 'today', value: 'food' }, day(14))
  const shownToday = answered(some(), { ask: 'today', value: 'today' }, day(14))
  const notNow = answered(yes(), { ask: 'range', value: 'not-now' }, day(28))
  const shownRange = answered(yes(), { ask: 'range', value: 'shown' }, day(28))
  const undoneToday = answered(shownToday, optInRows(shownToday)[0].off, day(40))
  const undoneRange = answered(shownRange, optInRows(shownRange)[0].off, day(40))
  const restricted = some()
  const moved = applyRestrictionSignalIn(restricted, day(30) + 'T10:00:00.000Z')
  const mw = mealWords([
    { n: 'Porridge', k: 300, p: 12, c: 50, f: 6, meal: 'breakfast' } as never, { n: 'Yoghurt', k: 100, p: 8, c: 6, f: 2, meal: 'breakfast' } as never,
    { n: 'Sandwich', k: 450, p: 18, c: 50, f: 14, meal: 'lunch' } as never, { n: 'Apple', k: 80, p: 0, c: 20, f: 0, meal: 'snack' } as never,
  ])
  report('onboarding 9', [
    ['Yes stays flagged (stored data keeps its meaning); Sometimes is its own outcome', wellbeingOutcome('yes') === 'flagged' && wellbeingOutcome('sometimes') === 'sometimes' && foodModeOf(yes()) === 'yes' && foodModeOf(some()) === 'sometimes' && foodModeOf(adult()) === 'standard'],
    ['Sometimes: maintenance only, no deficit, weight hidden, numbers kept, gentle off, the same signposting as Yes', rs.foodMode === 'sometimes' && rs.maintenanceOnly && rs.noDeficit && rs.hideWeight && !rs.hideCalories && !rs.gentle && rs.signpost.join() === ry.signpost.join()],
    ['Yes: gentle, no calorie number, no deficit, weight hidden', ry.foodMode === 'yes' && ry.gentle && ry.hideCalories && ry.hiddenReason === 'gentle' && ry.noDeficit && ry.hideWeight],
    ['Sometimes: no deficit and no surplus, whatever the goal (the goal applies to training)', goals.every((g) => targetsFor(some({ goal: g })).adjustPct === 0)],
    ['Sometimes: the start is the best estimate itself', tS.kcal === tS.estimate],
    ['Yes: no calorie, protein or maintenance number at all', noNumbers(targetsFor(yes()))],
    ['Profile targets for Sometimes: maintenance, as the summary', (() => { const s = suggestedTargets(some(), 70, profileRouting(some(), 70, true)); return !!s && 'kcal' in s && s.kcal === tS.kcal })()],
    ['the range is ±15% to the nearest 50: 1,930 → 1,650–2,200', maintenanceRange(1930).lo === 1650 && maintenanceRange(1930).hi === 2200],
    ['Sometimes: protein as a range; with the medical flag a minimum only', (() => { const a = proteinRangeFor(some(), 70), b = proteinRangeFor(some({ outcomes: { ...CLEAR, wellbeing: 'sometimes', medical: 'flagged' } }), 70); return a?.low === 110 && a.high === 155 && b?.high === null })()],
    [`Sometimes: no deficit in the first ${SOMETIMES_NO_DEFICIT_DAYS} days, nor after them while the answer stands (the maintenanceOnly clamp, even with the deficit chosen)`,
      rs.maintenanceOnly && targetsFor(some({ deficitChosen: true })).adjustPct === 0 && (() => { const q = some({ deficitChosen: true }), t = suggestedTargets(q, 70, profileRouting(q, 70, true)); return !!t && 'kcal' in t && t.kcal === tS.kcal })()],
    ['only clearing the answer brings the goal back to food', targetsFor(adult({ outcomes: { ...CLEAR, wellbeing: 'clear' } })).adjustPct! < 0],
    [`day-${TODAY_ASK_DAYS} ask: not before, due on the day, for Sometimes only`, !todayAskDue(some(), day(13)) && todayAskDue(some(), day(14)) && !todayAskDue(yes(), day(14)) && !todayAskDue(adult({ onboardedAt: ON }), day(14))],
    ['day-14 ask: asked once, whatever the answer', sweep.every((n) => !todayAskDue(keptOnFood, day(14 + n)) && !todayAskDue(shownToday, day(14 + n)))],
    ['day-14 ask counts from a later Profile change of answer', !todayAskDue(some({ answeredAt: { 'outcomes.wellbeing': day(10) + 'T10:00:00.000Z' } }), day(20)) && todayAskDue(some({ answeredAt: { 'outcomes.wellbeing': day(10) + 'T10:00:00.000Z' } }), day(24))],
    [`week-4 ask: not before day ${RANGE_ASK_DAYS}, due on it, for Yes only`, !rangeAskDue(yes(), day(27)) && rangeAskDue(yes(), day(28)) && !rangeAskDue(some(), day(28))],
    [`"Not now": not asked again for ${RANGE_SNOOZE_DAYS / 7} weeks, then once more`, !rangeAskDue(notNow, day(28 + RANGE_SNOOZE_DAYS - 1)) && rangeAskDue(notNow, day(28 + RANGE_SNOOZE_DAYS))],
    ['"Show a range": never asked again', sweep.every((n) => !rangeAskDue(shownRange, day(28 + n)))],
    ['pregnant or breastfeeding: neither ask, and a chosen range waits (Compliance, register 34)', (() => {
      const preg = { pregnancy: { flagged: true, askedAt: ON } } as Partial<Profile>
      return !rangeAskDue(yes(preg), day(28)) && !todayAskDue(some(preg), day(14)) && !foodView({ ...shownRange, ...preg }).rangeOnFood && foodView(shownRange).rangeOnFood
    })()],
    ['nothing unlocks by time alone: Sometimes stays in words on Today, Yes has no range', sweep.every(() => !foodView(some()).todayNumbers && !foodView(keptOnFood).todayNumbers && !foodView(yes()).rangeOnFood && !foodView(notNow).rangeOnFood)],
    ['each step up is the person’s yes: Today shows the range, Food gets one for Yes (never Today)', foodView(shownToday).todayNumbers && foodView(shownRange).rangeOnFood && !foodView(shownRange).todayNumbers && foodView(shownRange).wideRange],
    ['Sometimes has its range on Food from day one; no weight trend in either mode', foodView(some()).rangeOnFood && !foodView(some()).weightBack && !foodView(yes()).weightBack && foodView(adult()).weightBack],
    ['one tap in Profile undoes each yes (and Today’s ask stays answered)', optInRows(shownToday).length === 1 && !foodView(undoneToday).todayNumbers && !todayAskDue(undoneToday, day(400)) && !optInRows(undoneToday).length
      && !foodView(undoneRange).rangeOnFood && !rangeAskDue(undoneRange, day(40 + RANGE_SNOOZE_DAYS - 1)) && !optInRows(some()).length && !optInRows(yes()).length],
    ['an answer is stamped for the merge, and a repeat changes nothing', !!shownToday.answeredAt?.foodOptIn && !answerFoodOptInIn(structuredClone(shownToday), { ask: 'today', value: 'today' }, day(15), 'x') && (MERGED_FIELDS as readonly string[]).includes('foodOptIn')],
    ['a withdrawal clears the food steps up with the answers', !('foodOptIn' in withoutHealth(shownRange)) && !('outcomes' in withoutHealth(shownRange))],
    ['start explained: 250 less than 1,900, about a quarter of a kilo a week', !!est && est.diff === 250 && est.direction === 'less' && est.paceKg === 0.25 && !est.floored],
    [`start explained: a gap of ${SAME_GAP} kcal or less reads as "around"`, explainStart({ kcal: 1850, estimate: 1900 })?.direction === 'same' && explainStart({ kcal: 1950, estimate: 1900 })?.direction === 'same' && explainStart({ kcal: 1840, estimate: 1900 })?.direction === 'less'],
    ['a floor set the start: no pace, and the safe-minimum line on the card and in How', small.floorsApplied.includes('sex-minimum') && !!smallE?.floored && smallE.paceKg === null
      && SUMMARY.startS(smallE, '3–4 weeks', 15).includes(FLOOR_LINE) && SUMMARY.how.start(smallE).includes(FLOOR_LINE) && !/kg a week|kilo/.test(SUMMARY.how.start(smallE))],
    ['a floor just above the estimate reads as "around", never as gaining', floorNear?.direction === 'same' && floorNear.floored && !/\bmore\b|\bgain|\bup\b/.test(SUMMARY.startS(floorNear, '3–4 weeks', 15) + SUMMARY.how.start(floorNear))],
    ['a gain has no kg-a-week pace: it says "slowly"', gain?.direction === 'more' && gain.paceKg === null && /slowly/.test(SUMMARY.how.start(gain)) && !/kg|kilo/.test(SUMMARY.how.start(gain))],
    ['the range never drops below the calorie floor', (() => { const m = maintenanceRange(1150, { bmr: 1000, sex: 'female' }); return m.lo === 1200 && m.hi >= m.lo && maintenanceRange(1930, { bmr: 1400, sex: 'female' }).lo === 1650 })()
      && (() => { const m = maintenanceRange(1300, { bmr: 1420, sex: 'male' }); return m.lo === Math.ceil(calorieFloor(1420, 'male') / 50) * 50 && m.hi >= m.lo })()],
    ['the "how sure" figure is the real margin: 15%, about 20% for "Prefer not to say"', targetsFor(adult()).marginPct === 15 && targetsFor(adult({ sexAnswer: 'unspecified' })).marginPct === 20
      && SUMMARY.how.sure(1, 2, 20).includes('20%') && SUMMARY.startS(est!, '3–4 weeks', 20).includes('20%')],
    ['start explained: a surplus is "more", the estimate itself "same"', explainStart({ kcal: 2150, estimate: 1900 })?.direction === 'more' && explainStart({ kcal: 1900, estimate: 1900 })?.direction === 'same' && explainStart({ kcal: null, estimate: null }) === null],
    ['totals in words: 3 meals, protein at 2 (15 g or more a meal)', mw.slots.join() === 'breakfast,lunch,snack' && mw.withProtein === 2],
    ['restriction signal: none exists in a check-in today, so the hook never fires', !restrictionSignal({ foods: [], supps: {}, weight: null, checkin: { mood: 1, hunger: 1 } } as never) && !restrictionSignal(undefined)],
    ['restriction hook: moves Sometimes to the Yes rules', moved && foodModeOf(restricted) === 'yes' && !!restricted.gentle],
  ])
}

export function onboardingSuite(): number {
  bad = 0
  units(); routing(); signposts(); profileBits(); targets(); profileMatchesSummary(); foodMode()
  return bad
}
