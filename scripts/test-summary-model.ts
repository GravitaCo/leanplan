/* The onboarding summary's view logic (src/screens/onboarding/summaryModel.ts), shared by the web
   and native summaries. Run from scripts/test-core.ts (npm test); returns the failures. */
import { DEFAULT_PROFILE } from '@/core/data/constants'
import { newDraft, summaryFor, whyRows, type WizardDraft } from '@/core/domain/wizard'
import { afterName, chosenPlan, dayNote, exerciseName, foodCardKind, heroPlan, mineLine, reasonChips, shapeLine, slotLine, startPayload, weekStrip, whyLines } from '../src/screens/onboarding/summaryModel'

export function summaryModelSuite(): number {
  let bad = 0
  const today = '2026-11-13'
  const full: WizardDraft = { ...newDraft('first', 'seed-1'), step: 'summary', name: 'Sam', age: 34, goal: 'lose-fat', height: 172, sexAnswer: 'female', weight: 87,
    movement: { kind: 'steps', band: '5k-7.5k' }, outcomes: { readiness: 'clear', medical: 'clear', wellbeing: 'clear', baseline: 'ok' },
    moving: 'now-and-then', experience: 'beginner', weekdays: [1, 3, 5], sessionRange: '20-30', minutes: 30, where: 'home', kit: ['dumbbell', 'mat'], enjoy: ['weights', 'walking'], areas: ['knees'] }
  const sum = (d: WizardDraft, health = true) => summaryFor(DEFAULT_PROFILE, d, { healthConsent: health, today })
  const m = sum(full)
  const rows = whyRows(m, full)
  const chips = reasonChips(rows)
  const strip = weekStrip(m, undefined, [])
  const pay = startPayload(m, full, { at: today + 'T09:00:00.000Z', today, base: DEFAULT_PROFILE, rebuild: true })
  const redo: WizardDraft = { ...full, redo: { weight: 87, training: {} } }
  const later: WizardDraft = { ...full, later: true, moving: undefined, experience: undefined, weekdays: undefined, sessionRange: undefined, minutes: undefined, where: undefined, kit: undefined, enjoy: undefined, areas: undefined }
  const ml = sum(later)
  const chosen: WizardDraft = { ...full, planChoice: 'full-body-system' }
  const s0 = m.result.plan.sessions[0]
  const checks: [string, boolean, unknown?][] = [
    ['afterName drops a leading exercise name', afterName('Goblet squat: a gentler choice for the knees.') === 'A gentler choice for the knees.' && afterName('no colon here') === 'No colon here'],
    ['reasonChips: at most four, no warm-up, days first', chips.length <= 4 && !chips.some((x) => x.key === 'warmup') && chips[0]?.key === 'days', chips.map((x) => x.key)],
    ['weekStrip: seven days Monday first, the picked days on, with names', strip.length === 7 && strip[0].wd === 1 && strip[6].wd === 0 && strip.filter((x) => x.on).map((x) => x.wd).join() === '1,3,5' && strip.filter((x) => x.on).every((x) => x.name && x.sessions.length)],
    ['weekStrip: a chosen plan shows its own week, nothing tappable', weekStrip(m, chosenPlan(chosen), []).every((x) => !x.sessions.length) && weekStrip(m, chosenPlan(chosen), []).some((x) => x.on)],
    ['shapeLine: days, minutes to the nearest 5, place', /^3 days · about \d+ min · at home$/.test(shapeLine(full, m)), shapeLine(full, m)],
    ['shapeLine: the starter week with no place is "no equipment"', shapeLine(later, ml).endsWith('· no equipment') && ml.result.starter],
    ['mineLine: days and the line', mineLine(full, m).days === 3 && /^3 days · about \d+ min · home$/.test(mineLine(full, m).line), mineLine(full, m)],
    ['heroPlan: full body for a built week, pure muscle for the starter week, a chosen plan its own', heroPlan(m, undefined)?.id === 'full-body-system' && heroPlan(ml, undefined)?.id === 'pure-muscle-growth' && heroPlan(m, chosenPlan({ ...full, planChoice: 'stronger-with-age' }))?.id === 'stronger-with-age'],
    ['day sheet: a name without its variant, a reason, at most three note lines', !exerciseName(s0.slots[0].exId).endsWith(')') && slotLine(s0.slots[0]).length > 0 && dayNote(s0, m.result.why).length <= 3],
    ['whyLines: no repeats', rows.every((r) => new Set(whyLines(r)).size === whyLines(r).length)],
    ['foodCardKind: the standard start', foodCardKind(m) === 'start' && m.targets.kcal != null],
    ['foodCardKind: no weight, no height, no age', foodCardKind(sum({ ...full, weight: undefined })) === 'no-weight' && foodCardKind(sum({ ...full, height: undefined })) === 'no-height' && foodCardKind(sum({ ...full, age: undefined })) === 'no-age'],
    ['foodCardKind: pregnancy, wellbeing Yes and Sometimes', foodCardKind(sum({ ...full, pregnant: true, outcomes: { ...full.outcomes, readiness: 'flagged' } })) === 'pregnancy' && foodCardKind(sum({ ...full, outcomes: { ...full.outcomes, wellbeing: 'flagged' } })) === 'yes' && foodCardKind(sum({ ...full, outcomes: { ...full.outcomes, wellbeing: 'sometimes' } })) === 'sometimes'],
    ['foodCardKind: no health consent asks for the OK', foodCardKind(sum({ ...full, outcomes: {}, height: undefined, weight: undefined, sexAnswer: undefined, movement: undefined, areas: undefined }, false)) === 'no-consent'],
    ['startPayload: a first run saves the plan, targets and today’s weigh-in', !!pay.plan && pay.target?.kcal != null && pay.weightKg === 87 && !!pay.profile.onboardedAt],
    ['startPayload: a redo kept as it was: no new week, and its unchanged weight is no weigh-in', (() => { const p = startPayload(sum(redo), redo, { at: today, today, base: DEFAULT_PROFILE, rebuild: false }); return p.plan === null && p.weightKg === null })()],
    ['startPayload: a redo with a new weight logs it; Rebuild saves the week', (() => { const d = { ...redo, weight: 85 }; const p = startPayload(sum(d), d, { at: today, today, base: DEFAULT_PROFILE, rebuild: true }); return p.weightKg === 85 && !!p.plan })()],
    ['startPayload: a chosen Tilo plan replaces the generated week', startPayload(sum(chosen), chosen, { at: today, today, base: DEFAULT_PROFILE, rebuild: true }).plan === null],
    ['startPayload: the setup card alone never sets targets', startPayload(sum({ ...full, mode: 'setup' }), { ...full, mode: 'setup' }, { at: today, today, base: DEFAULT_PROFILE, rebuild: true }).target === null],
  ]
  for (const [n, ok, detail] of checks) { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', 'summary model:', n, !ok && detail !== undefined ? JSON.stringify(detail) : '') }
  return bad
}
