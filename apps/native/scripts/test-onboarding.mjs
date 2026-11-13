/**
 * Unit tests for N11's onboarding logic that needs no phone (apps/native/screens/onboarding):
 * what the wizard's draft may keep on the device. Node runs the TypeScript directly (type stripping).
 *   (apps/native) npm run test:onboarding
 */
import { hasHealth, keptDraft, mayKeep, stopReset } from '../screens/onboarding/draftRules.ts'

let failed = 0, passed = 0
const check = (name, ok) => { if (ok) passed++; else { failed++; console.error('FAIL', name) } }
/** core newDraft('first', seed), as the hook passes it */
const fresh = (seed) => ({ v: 1, mode: 'first', step: 'intro', seed, outcomes: {} })
const base = { v: 1, mode: 'first', step: 'name', seed: 's', outcomes: {} }

check('hasHealth: a fresh draft has none', !hasHealth(base))
check('hasHealth: a name and goal are not health', !hasHealth({ ...base, name: 'Sam', goal: 'lose-fat', age: 30 }))
for (const [k, v] of [['outcomes', { readiness: 'clear' }], ['pregnant', false], ['height', 170], ['weight', 70], ['sexAnswer', 'female'], ['movement', { kind: 'steps', band: '5k-7.5k' }], ['areas', []]])
  check(`hasHealth: ${k} is health`, hasHealth({ ...base, [k]: v }))
check('mayKeep: health answers only with consent', !mayKeep({ ...base, weight: 70 }, false) && mayKeep({ ...base, weight: 70 }, true))
check('mayKeep: no health answers is fine without consent', mayKeep({ ...base, name: 'Sam' }, false))
const redoStop = { ...base, step: 'under16', age: 16, redo: { training: {} } }
check('keptDraft: Redo setup never keeps an under-18 age', keptDraft(redoStop).age === undefined && keptDraft(redoStop).step === 'age')
check('keptDraft: the first run keeps its draft as is', keptDraft({ ...base, step: 'under16', age: 16 }).age === 16)
const firstStop = { ...base, step: 'under16', age: 16, name: 'Sam', motivations: ['energy'], outcomes: { readiness: 'clear' }, skipped: true }
const r = stopReset(firstStop, fresh)
check('stopReset: the first-run stop keeps only the age (and skipped)', r && r.age === 16 && r.step === 'under16' && r.skipped === true && r.name === undefined && !r.motivations && !Object.keys(r.outcomes).length && r.seed === 's')
check('stopReset: nothing to reset when nothing else was answered', stopReset({ ...base, step: 'under16', age: 16 }, fresh) === null)
check('stopReset: never for Redo setup', stopReset({ ...redoStop, name: 'Sam' }, fresh) === null)
check('stopReset: only on the stop', stopReset({ ...firstStop, step: 'age' }, fresh) === null)

console.log(`${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
