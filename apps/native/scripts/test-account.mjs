/**
 * Unit tests for N2's pure account logic (apps/native/lib/account): the gate's order, the backup
 * check, the delete confirm word, the tilo://auth-callback code, the sign-in photo's size and crop. The flows
 * themselves are checked against the web in scripts/e2e-account-parity.cjs.
 *   (apps/native) npm run test:account
 */
import { readBackup } from '../../../src/data/backup.native.ts'
import { appleAlways, codeFrom, coverFrame, photoHeight, reauthMatches, reauthWays, typedOk } from '../lib/account/rules.ts'
import { gateStep, pendingFor } from '../lib/account/gateModel.ts'

let failed = 0
let passed = 0
const check = (name, ok) => { if (ok) passed++; else { failed++; console.error('FAIL', name) } }
const file = (text) => ({ text: async () => text })
const rejects = async (p, msg) => { try { await p; return false } catch (e) { return e.message === msg } }

/* ---------- backups: the web's readBackup check ---------- */
check('backup: a state with days', (await readBackup(file('{"days":{"2026-11-01":{}},"profile":{}}'))).days['2026-11-01'] !== undefined)
check('backup: empty days is still a backup', !!(await readBackup(file('{"days":{}}'))))
check('backup: no days is not', await rejects(readBackup(file('{"hello":1}')), 'invalid'))
check('backup: days that are not an object', await rejects(readBackup(file('{"days":3}')), 'invalid'))
check('backup: null', await rejects(readBackup(file('null')), 'invalid'))
check('backup: not JSON', await rejects(readBackup(file('not json')), 'unreadable'))
check('backup: a file that can’t be read', await rejects(readBackup({ text: async () => { throw new Error('x') } }), 'unreadable'))

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

/* ---------- the gate, in App.tsx's order ---------- */
const base = { ready: true, ownerAsk: false, signedIn: true, pendingDeletion: false, underAge: false, consentOpen: false, consentDue: false }
const all = { ready: false, ownerAsk: true, signedIn: false, pendingDeletion: true, underAge: true, consentOpen: true, consentDue: true }
check('gate: the app when nothing is due', gateStep(base) === null)
check('gate: loading before anything', gateStep(all) === 'loading')
check('gate: the owner question before sign-in', gateStep({ ...all, ready: true }) === 'owner')
check('gate: sign-in next', gateStep({ ...all, ready: true, ownerAsk: false }) === 'sign-in')
check('gate: a pending under-18 deletion before the stop', gateStep({ ...base, pendingDeletion: true, underAge: true, consentDue: true }) === 'deleting')
check('gate: the 18+ stop before consent', gateStep({ ...base, underAge: true, consentDue: true, consentOpen: true }) === 'under-age')
check('gate: consent from Profile', gateStep({ ...base, consentOpen: true, consentDue: true }) === 'consent-profile')
check('gate: consent until answered', gateStep({ ...base, consentDue: true }) === 'consent')
check('gate: signed out never reaches consent or the app', gateStep({ ...base, signedIn: false }) === 'sign-in')
check('pending: none', !pendingFor(null, { authed: true, sessionUid: 'a', owner: 'a' }))
check('pending: the live session’s account', pendingFor('a', { authed: true, sessionUid: 'a', owner: 'b' }))
check('pending: not another session’s', !pendingFor('a', { authed: true, sessionUid: 'b', owner: 'a' }))
check('pending: offline, this phone’s owner', pendingFor('a', { authed: false, sessionUid: null, owner: 'a' }))
check('pending: offline, not another owner’s', !pendingFor('a', { authed: false, sessionUid: null, owner: 'b' }))

/* ---------- re-sign-in before deleting: the same account ---------- */
check('reauth: the same account', reauthMatches('a', 'a'))
check('reauth: another account is refused', !reauthMatches('a', 'b'))
check('reauth: no recorded owner (the deletion checks it again)', reauthMatches(undefined, 'b'))
check('reauth: compared with the owner, not the signed-out fallback', reauthMatches('a', 'a') && !reauthMatches('00000000-0000-0000-0000-000000000001', 'a'))

/* ---------- how to re-confirm before deleting ---------- */
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b)
check('ways: email', eq(reauthWays(['email'], true), ['password']))
check('ways: Google', eq(reauthWays(['google'], true), ['google']))
check('ways: Apple on iOS', eq(reauthWays(['apple'], true), ['apple']))
check('ways: Google that linked Apple offers both', eq(reauthWays(['google', 'apple'], true), ['apple', 'google']))
check('ways: Apple where Apple isn’t offered falls back to the password', eq(reauthWays(['apple'], false), ['password']))
check('ways: no provider known: the password', eq(reauthWays([], true), ['password']))
check('apple always: an Apple account on iOS', appleAlways(['email', 'apple'], true) && !appleAlways(['email'], true) && !appleAlways(['apple'], false))

console.log(failed ? `${failed} failed, ${passed} passed` : `all ${passed} passed`)
process.exit(failed ? 1 : 0)
