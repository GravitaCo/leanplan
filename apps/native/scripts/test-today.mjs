/**
 * Unit tests for Today's native-only logic (apps/native/screens/today): the typed wake time and
 * what the Support stand-in's alert holds on each platform.
 *   (apps/native) npm run test:today
 * Node runs the TypeScript directly (type stripping); these modules import nothing.
 */
import { normTime } from '../screens/today/wakeTime.ts'
import { supportAlert } from '../screens/today/supportAlert.ts'

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

/* ---------- the Support stand-in ---------- */
// the shape supportList(null, { context: 'mind' }) returns: Samaritans, Shout, the GP (no number), Beat, 999
const ROWS = [
  { name: 'Samaritans', desc: 'Talk about anything · 24 hours, every day', num: '116 123', tel: '116 123' },
  { name: 'Shout', desc: 'Text SHOUT to 85258 · 24 hours, every day', num: '85258', sms: 'sms:85258?&body=SHOUT' },
  { name: 'Your GP', desc: 'Urgent advice · Opening hours' },
  { name: 'Beat', desc: 'Eating disorder support', num: '0808 801 0677', tel: '0808 801 0677' },
  { name: 'Emergency services', desc: 'If you or someone else is in danger now.', num: '999', tel: '999' },
]
const W = { lead: 'LEAD', notCrisis: 'NOT-CRISIS', foot: 'FOOT' }
for (const os of ['ios', 'android']) {
  const a = supportAlert(ROWS, os, W)
  check(`${os}: every service and number is in the message`, ROWS.every((r) => a.message.includes(r.name) && (!r.num || a.message.includes(r.num))), a.message)
  check(`${os}: the lead, not-a-crisis line and foot are in the message`, ['LEAD', 'NOT-CRISIS', 'FOOT'].every((x) => a.message.includes(x)))
  check(`${os}: 999 is a button`, a.buttons.some((b) => b.href === 'tel:999'), JSON.stringify(a.buttons))
  check(`${os}: Samaritans is a button`, a.buttons.some((b) => b.href === 'tel:116123'))
  check(`${os}: Close is the last button`, a.buttons[a.buttons.length - 1].cancel === true)
}
check('android: at most 3 buttons, so none is dropped', supportAlert(ROWS, 'android', W).buttons.length <= 3)
check('ios: a button for every service with a number, plus Close', supportAlert(ROWS, 'ios', W).buttons.length === 5)
check('ios: Shout texts', supportAlert(ROWS, 'ios', W).buttons.some((b) => b.href === 'sms:85258?&body=SHOUT' && b.text.includes('text')))

console.log(`today: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
