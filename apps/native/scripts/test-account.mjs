/**
 * Unit tests for N2's pure account logic (apps/native/lib/account): the backup check, the delete
 * confirm word, the tilo://auth-callback code, the sign-in photo's size and crop. The flows
 * themselves are checked against the web in scripts/e2e-account-parity.cjs.
 *   (apps/native) npm run test:account
 */
import { parseBackup } from '../lib/account/backupParse.ts'
import { codeFrom, coverFrame, photoHeight, typedOk } from '../lib/account/rules.ts'

let failed = 0
let passed = 0
const check = (name, ok) => { if (ok) passed++; else { failed++; console.error('FAIL', name) } }
const throws = (fn, msg) => { try { fn(); return false } catch (e) { return e.message === msg } }

/* ---------- backups: the web's readBackup check ---------- */
check('backup: a state with days', parseBackup('{"days":{"2026-11-01":{}},"profile":{}}').days['2026-11-01'] !== undefined)
check('backup: empty days is still a backup', !!parseBackup('{"days":{}}'))
check('backup: no days is not', throws(() => parseBackup('{"hello":1}'), 'invalid'))
check('backup: days that are not an object', throws(() => parseBackup('{"days":3}'), 'invalid'))
check('backup: null', throws(() => parseBackup('null'), 'invalid'))
check('backup: not JSON', throws(() => parseBackup('not json'), 'unreadable'))

/* ---------- delete confirm (board ob6-6) ---------- */
for (const ok of ['DELETE', 'delete', ' Delete ']) check(`typed: ${JSON.stringify(ok)} confirms`, typedOk(ok))
for (const no of ['', 'DELET', 'delete it', 'REMOVE', 'DELETE!']) check(`typed: ${JSON.stringify(no)} doesn't`, !typedOk(no))

/* ---------- tilo://auth-callback ---------- */
check('callback: the code', codeFrom('tilo://auth-callback?code=abc').code === 'abc')
check('callback: an error in the query', codeFrom('tilo://auth-callback?error=access_denied&error_description=Denied').why === 'Denied')
check('callback: an error after #', codeFrom('tilo://auth-callback#error_description=Link%20expired').why === 'Link expired')
check('callback: neither', (() => { const r = codeFrom('tilo://auth-callback'); return r.code === null && r.why === null })())

/* ---------- the sign-in photo (.auth2-photo) ---------- */
check('photo: sign-in is 48% of the screen', photoHeight('signin', 844) === 844 * 0.48)
check('photo: create account 36%, at least 200', photoHeight('signup', 844) === 844 * 0.36 && photoHeight('signup', 400) === 200)
check('photo: email steps 52%, at least 260', photoHeight('forgot', 844) === 844 * 0.52 && photoHeight('check-email', 300) === 260)
const f = coverFrame(928, 1152, 390, 405)
check('crop: fills the width', Math.abs(f.width - 390) < 1e-9 && f.left === 0)
check('crop: 30% of the overflow cut from the top', Math.abs(f.top + (f.height - 405) * 0.3) < 1e-9 && f.height > 405)
const g = coverFrame(928, 1152, 390, 600)
check('crop: a tall box fills the height, centred', Math.abs(g.height - 600) < 1e-9 && g.left < 0 && Math.abs(g.top) < 1e-9)

console.log(failed ? `${failed} failed, ${passed} passed` : `all ${passed} passed`)
process.exit(failed ? 1 : 0)
