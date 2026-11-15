/* The wizard's per-screen answers and draft rules (core/domain/wizardAnswers.ts), which the web
   and native wizards both use. Run from scripts/test-core.ts (npm test); returns the failures. */
import { newDraft, type WizardDraft } from '@/core/domain/wizard'
import {
  areasAnswer, areasInit, daysAnswer, daysInit, daysPickN, daysSkip, daysToggle, hasHealth, keptDraft, latelyAnswer, latelyInit, mayKeep, medicalAnswer, medicalInit, medicalPick,
  minutesAnswer, minutesContinue, readinessAnswer, readinessInit, readinessSkip, stopReset, toggleExclusive, whyAnswer, whyInit, withoutOutcome,
} from '@/core/domain/wizardAnswers'

export function wizardAnswersSuite(): number {
  let bad = 0
  const base: WizardDraft = { ...newDraft('first', 's'), step: 'name' }
  const checks: [string, boolean][] = [
    // the draft on this device (plan §8)
    ['hasHealth: a fresh draft, a name, a goal and an age are not health', !hasHealth(base) && !hasHealth({ ...base, name: 'Sam', goal: 'lose-fat', age: 30 })],
    ['hasHealth: each health field is', [{ outcomes: { readiness: 'clear' as const } }, { pregnant: false }, { height: 170 }, { weight: 70 }, { sexAnswer: 'female' as const }, { movement: { kind: 'steps' as const, band: '5k-7.5k' as const } }, { areas: [] }].every((x) => hasHealth({ ...base, ...x }))],
    ['mayKeep: health answers only with the local consent', !mayKeep({ ...base, weight: 70 }, false) && mayKeep({ ...base, weight: 70 }, true) && mayKeep({ ...base, name: 'Sam' }, false)],
    ['keptDraft: Redo setup never keeps an under-18 age', (() => { const k = keptDraft({ ...base, step: 'under16', age: 16, redo: { training: {} } }); return k.age === undefined && k.step === 'age' })()],
    ['keptDraft: the first run as is', keptDraft({ ...base, step: 'under16', age: 16 }).age === 16],
    ['stopReset: the first-run stop keeps only the age (and skipped)', (() => { const r = stopReset({ ...base, step: 'under16', age: 16, name: 'Sam', motivations: ['energy'], outcomes: { readiness: 'clear' }, skipped: true }, 'first'); return !!r && r.age === 16 && r.step === 'under16' && r.skipped === true && r.name === undefined && !r.motivations && !Object.keys(r.outcomes).length && r.seed === 's' })()],
    ['stopReset: nothing to reset, Redo setup, or not on the stop: null', stopReset({ ...base, step: 'under16', age: 16 }, 'first') === null && stopReset({ ...base, step: 'under16', age: 16, name: 'S', redo: { training: {} } }, 'first') === null && stopReset({ ...base, step: 'age', name: 'S' }, 'first') === null],
    ['withoutOutcome drops only that outcome', JSON.stringify(withoutOutcome({ ...base, outcomes: { readiness: 'clear', baseline: 'ok' } }, 'baseline').outcomes) === '{"readiness":"clear"}'],
    // readiness
    ['readiness: a kept clear shows three No; a kept pregnancy shows its yes', readinessInit({ ...base, outcomes: { readiness: 'clear' } }).items.join() === 'false,false,false' && readinessInit({ ...base, pregnant: true }).which === 'pregnant'],
    ['readiness: all No is clear, not pregnant', (() => { const a = readinessAnswer(base, { items: [false, false, false], which: undefined }); return a.outcomes?.readiness === 'clear' && a.pregnant === false })()],
    ['readiness: pregnant flags it; surgery flags it but not pregnancy', readinessAnswer(base, { items: [false, false, true], which: 'pregnant' }).pregnant === true && readinessAnswer(base, { items: [false, false, true], which: 'surgery' }).pregnant === false && readinessAnswer(base, { items: [false, false, true], which: 'surgery' }).outcomes?.readiness === 'flagged'],
    ['readiness: nothing picked keeps a stored yes; skip drops it and pregnancy', readinessAnswer({ ...base, outcomes: { readiness: 'flagged' } }, { items: [undefined, undefined, undefined], which: undefined }).outcomes?.readiness === 'flagged' && readinessSkip({ ...base, outcomes: { readiness: 'flagged' }, pregnant: true }).pregnant === undefined && !('readiness' in (readinessSkip({ ...base, outcomes: { readiness: 'flagged' } }).outcomes ?? {}))],
    // why
    ['why: known chips and the free text come back apart', (() => { const w = whyInit({ ...base, motivations: ['energy', 'my own'] }, ['energy', 'strength']); return w.picked.join() === 'energy' && w.other === 'my own' })()],
    ['why: free text trimmed to 60; nothing is undefined', whyAnswer(['energy'], ' ' + 'x'.repeat(80)).motivations?.[1]?.length === 60 && whyAnswer([], '  ').motivations === undefined],
    // lately
    ['lately: a kept ok shows the good answers; nothing picked keeps a low', latelyInit({ ...base, outcomes: { baseline: 'ok' } }).sleep === 'good' && latelyAnswer({ ...base, outcomes: { baseline: 'low' } }, {}).outcomes?.baseline === 'low' && !('baseline' in (latelyAnswer(base, {}).outcomes ?? {}))],
    ['lately: poor sleep is low', latelyAnswer(base, { sleep: 'poor', stress: 'low', room: 'plenty' }).outcomes?.baseline === 'low'],
    // medical
    ['medical: none clears ticks; a tick clears none', (() => { const a = medicalPick({ ticked: [1], none: false }, 'none'); const b = medicalPick(a, 0); return a.none && !a.ticked.length && !b.none && b.ticked.join() === '0' })()],
    ['medical: none is clear; kidney flagged; nothing keeps a stored yes', medicalAnswer(base, { ticked: [], none: true }).outcomes?.medical === 'clear' && medicalAnswer(base, { ticked: [1], none: false }).outcomes?.medical === 'flagged' && medicalAnswer({ ...base, outcomes: { medical: 'no-deficit' } }, medicalInit({ ...base, outcomes: { medical: 'no-deficit' } })).outcomes?.medical === 'no-deficit'],
    // lists
    ['toggleExclusive: none is exclusive both ways', toggleExclusive(['a', 'b'], 'none', 'none').join() === 'none' && toggleExclusive(['none'], 'a', 'none').join() === 'a' && toggleExclusive(['a'], 'a', 'none').length === 0],
    ['areas: None of these is an empty list, nothing is a skip', JSON.stringify(areasAnswer(['none']).areas) === '[]' && areasAnswer([]).areas === undefined && areasInit({ ...base, areas: [] }).join() === 'none' && areasAnswer(['knees', 'none']).areas?.join() === 'knees'],
    // days
    ['days: weekdays win and set the count; at most 6', (() => { let p = daysPickN(daysInit(base), 3); for (const k of [1, 3, 5]) p = daysToggle(p, k); const a = daysAnswer(p); let q = p; for (const k of [0, 2, 4, 6]) q = daysToggle(q, k); return p.n === 3 && a.weekdays?.join() === '1,3,5' && a.daysPerWeek === undefined && q.weekdays.length === 6 })()],
    ['days: a new count clears weekdays that don’t match; a count alone is saved', (() => { const p = daysPickN({ n: 2, weekdays: [1, 4] }, 3); return !p.weekdays.length && daysAnswer(p).daysPerWeek === 3 && daysSkip.daysPerWeek === undefined })()],
    // minutes
    ['minutes: a range carries the engine length; Continue with none keeps the earlier answer', minutesAnswer('20-30').minutes === 30 && minutesContinue({ ...base, sessionRange: '45-60', minutes: 60 }, undefined).minutes === 60 && minutesAnswer(undefined).sessionRange === undefined],
  ]
  for (const [n, ok] of checks) { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', 'wizard answers:', n) }
  return bad
}
