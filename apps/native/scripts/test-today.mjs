/**
 * Unit tests for Today's native-only logic (apps/native/screens/today): the typed wake time.
 *   (apps/native) npm run test:today
 * Node runs the TypeScript directly (type stripping); these modules import nothing.
 */
import { normTime } from '../screens/today/wakeTime.ts'

let failed = 0
let passed = 0
const check = (name, ok, info) => { if (ok) passed++; else { failed++; console.error('FAIL', name, info ?? '') } }

/* ---------- the wake time ---------- */
for (const [typed, want] of [['7', '07:00'], ['07', '07:00'], ['730', '07:30'], ['645', '06:45'], ['123', '01:23'], ['0730', '07:30'], ['1230', '12:30'], ['7:30', '07:30'], ['7:5', '07:05'], [' 6:45 ', '06:45'], ['23:59', '23:59']]) {
  check(`wake time: "${typed}" reads as ${want}`, normTime(typed) === want, normTime(typed))
}
for (const bad of ['', '24', '760', '2400', '7am', '7.30', '12345', '9:60']) {
  check(`wake time: "${bad}" is left as typed (nightPatch drops it)`, normTime(bad) === bad, normTime(bad))
}

console.log(`today: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
