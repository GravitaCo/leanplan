/* Consent, account deletion and the connection indicator (onboarding plan §7, §8). Run from
   scripts/test-core.ts (npm test); returns the number of failures. */
import { readFileSync, readdirSync } from 'node:fs'
import { healthConsentAnswered, HEALTH_WITHDRAW_PROMPT, healthWithdrawalBackup, CONSENT_VERSIONS, LEGACY_LABEL_VERSION, applyHealthWithdrawal, canSaveHealthAnswers, hasConsent, healthDataSummary, healthLoggingAllowed, latestConsent, migrateLabelConsent, recordConsent, removeLegacyLabelFlag, unsyncedConsents, withdraw,
  consentLetsSync, REASK_AFTER_MS, existingConsentDue, grantHealth, healthDeclined, healthSyncPaused, holdHealth, pauseHealthSync, quietNumbers, settleHealthPause } from '@/data/consent'
import { deleteAccount, markReauth, sessionSignedInRecently, takeReauthReturn, tokenMatchesOwner, wipeStorage, DELETE_CONFIRM as CLIENT_CONFIRM } from '@/data/account'
import { USER_TABLES, DELETE_CONFIRM, authTime, jwtPayload, signedInRecently } from '../supabase/functions/_shared/account'
import { connectionLabel, connectionState } from '@/core/domain/connection'
import { ensureMeta, freshForAccount, keepForAccount, loadStateFrom, stateFromBackup, unsyncedCount, type PersistedState } from '@/data/persistence'
import { pushDirty, pullAll } from '@/data/sync'
import { uuid, UUID_RE, LOCAL_USER } from '@/data/supabase'

type FakeServer = (rows: Record<string, any[]>, broken?: string[]) => { fetchFn: typeof fetch; calls: string[] }

let bad = 0
const report = (area: string, checks: [string, boolean][]) => {
  for (const [n, ok] of checks) { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', area + ':', n) }
}

function fakeStorage(init: Record<string, string>) {
  const m = new Map(Object.entries(init))
  return {
    get length() { return m.size },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v) },
    removeItem: (k: string) => { m.delete(k) },
    keys: () => [...m.keys()].sort(),
  }
}

const day = (w: number | null, mood?: number) => ({ foods: [{ n: 'Toast', k: 100, p: 1, c: 1, f: 1, grams: 40 }], supps: {}, weight: w, workout: null, ...(mood ? { checkin: { mood, hunger: 2, sleep: 2 } } : {}) })
const emptyRows = (): Record<string, any[]> => ({ settings: [], day_logs: [], custom_foods: [], recipes: [], consents: [] })

async function withFetch<T>(f: typeof fetch, run: () => Promise<T>): Promise<T> {
  const real = globalThis.fetch
  globalThis.fetch = f
  try { return await run() } finally { globalThis.fetch = real }
}

async function consent(fakeServer: FakeServer): Promise<void> {
  const checks: [string, boolean][] = []

  // offline: recorded on the device, dirty, counted; the guard follows it
  const s = stateFromBackup({ days: { '2026-09-20': day(71, 3), '2026-09-21': day(null) } } as never)
  s.profile.weight = 72; s.profile.bodyFat = 20
  s.profile.training = { limitations: ['knees'] as any, limitationsNote: 'x', equipment: ['dumbbells'] as any }
  const m = ensureMeta(s, false)
  Object.values(m.days).forEach((x) => (x.dirty = false)); m.settings.dirty = false
  checks.push(['no record: questionnaire guard refuses, old logging paths allowed', !canSaveHealthAnswers(s) && healthLoggingAllowed(s) && !hasConsent(s, 'health')])
  const g = recordConsent(s, 'health', true)
  checks.push(['grant recorded offline with type, version and time, dirty', g._dirty === true && g.version === CONSENT_VERSIONS.health && !isNaN(Date.parse(g.at)) && UUID_RE.test(g.id) && canSaveHealthAnswers(s)])
  checks.push(['an unsynced consent counts as an unsynced change', unsyncedCount(s) === 1 && unsyncedConsents(s) === 1])

  // later sync: uploads with the device's time, first, and comes back clean
  const rows = emptyRows()
  const f = fakeServer(rows)
  m.settings.dirty = true // something of the log to upload alongside

  await withFetch(f.fetchFn, async () => { await pushDirty(s, m); await pullAll(s, m) })
  const firstLog = f.calls.findIndex((c) => c === 'POST day_logs' || c === 'POST settings')
  checks.push(['sync uploads the consent (device time, own user id) before the log', rows.consents.length === 1 && rows.consents[0].recorded_at === g.at && rows.consents[0].granted === true && rows.consents[0].user_id === LOCAL_USER && !g._dirty && f.calls.indexOf('POST consents') >= 0 && firstLog > f.calls.indexOf('POST consents')])
  checks.push(['the pull merges by id (still one record)', s.consents!.records.length === 1])

  // the export step comes first: its copy is taken before anything is cleared
  const before = healthWithdrawalBackup(s)
  const beforeState = JSON.parse(before.json) as PersistedState
  // latest wins, even against a clock that went backwards
  const w = withdraw(s, m, 'health')
  checks.push(['the backup offered before withdrawal keeps the health data and everything else', beforeState.days['2026-09-20'].weight === 71 && !!beforeState.days['2026-09-20'].checkin && beforeState.profile.weight === 72 &&
    before.summary.weighIns === 1 && before.summary.checkins === 1 && before.summary.profileFields === 4 && s.days['2026-09-20'].weight === null && HEALTH_WITHDRAW_PROMPT.startsWith('This removes your weigh-ins, check-ins and body details')])
  checks.push(['withdrawal is a new record and wins', s.consents!.records.length === 2 && !w.granted && !hasConsent(s, 'health') && Date.parse(w.at) > Date.parse(g.at)])
  const a1 = recordConsent(s, 'ai', true, undefined, '2026-09-27T10:00:00.000Z')
  const a2 = recordConsent(s, 'ai', false, undefined, '2026-09-27T09:00:00.000Z')
  checks.push(['a later act never loses to an earlier one on a skewed clock', !hasConsent(s, 'ai') && Date.parse(a2.at) > Date.parse(a1.at)])

  // withdrawal clears the health fields, marks them to sync, leaves the rest
  s.profile.age = 40; s.profile.height = 175
  checks.push(['age, sex and height are kept', s.profile.age === 40 && s.profile.height === 175 && !!s.profile.sex])
  checks.push(['withdrawal clears weigh-ins and check-ins, keeps food', s.days['2026-09-20'].weight === null && !s.days['2026-09-20'].checkin && s.days['2026-09-20'].foods.length === 1])
  checks.push(['withdrawal clears profile weight, body fat and limitations (keeps equipment)', s.profile.weight === undefined && s.profile.bodyFat === undefined && s.profile.training?.limitations === undefined && s.profile.training?.limitationsNote === undefined && (s.profile.training?.equipment || []).length === 1])
  checks.push(['cleared days and settings are marked to sync; untouched days are not', m.days['2026-09-20'].dirty && !m.days['2026-09-21']?.dirty && m.settings.dirty])
  checks.push(['after withdrawal: the guard refuses and the old logging paths stop', !canSaveHealthAnswers(s) && !healthLoggingAllowed(s)])
  checks.push(['nothing left to clear', JSON.stringify(healthDataSummary(s)) === '{"weighIns":0,"checkins":0,"profileFields":0}'])

  // withdrawal before the grant synced: both upload, the server's latest is the withdrawal
  const s2 = stateFromBackup({ days: {} } as never)
  const m2 = ensureMeta(s2, false)
  recordConsent(s2, 'health', true); withdraw(s2, m2, 'health')
  const rows2 = emptyRows()
  await withFetch(fakeServer(rows2).fetchFn, () => pushDirty(s2, m2))
  const latest = [...rows2.consents].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at)).pop()
  checks.push(['an offline grant then withdrawal both sync; the withdrawal is latest', rows2.consents.length === 2 && latest?.granted === false])

  // a withdrawal made on another device (pulled) clears this device, once
  const s3 = stateFromBackup({ days: { '2026-09-22': day(70, 2) } } as never)
  const m3 = ensureMeta(s3, false)
  recordConsent(s3, 'health', true, undefined, '2026-09-20T08:00:00.000Z')
  delete s3.consents!.records[0]._dirty
  const rows3 = emptyRows()
  rows3.consents = [{ id: uuid(), user_id: LOCAL_USER, type: 'health', version: '2026-09-v1', granted: false, recorded_at: '2026-09-26T08:00:00.000Z' }]
  await withFetch(fakeServer(rows3).fetchFn, () => pullAll(s3, m3))
  const applied = applyHealthWithdrawal(s3, m3)
  checks.push(["another device's withdrawal is pulled and clears this device", applied && !hasConsent(s3, 'health') && s3.days['2026-09-22'].weight === null && m3.days['2026-09-22'].dirty])
  recordConsent(s3, 'health', true)
  s3.days['2026-09-24'] = day(68) as never
  checks.push(['the clear applies once per withdrawal (a weigh-in after consent again stays)', !applyHealthWithdrawal(s3, m3) && s3.days['2026-09-24'].weight === 68 && hasConsent(s3, 'health')])

  // no table yet: records stay on the device, the sync carries on
  const s4 = stateFromBackup({ days: {} } as never)
  const m4 = ensureMeta(s4, false)
  recordConsent(s4, 'ai', true)
  const f4 = fakeServer({ settings: [], day_logs: [], custom_foods: [], recipes: [] })
  const missing = (async (url: string, o: RequestInit = {}) => (String(url).includes('/consents') ? new Response(null, { status: 404 }) : f4.fetchFn(url, o))) as typeof fetch
  const failed4 = await withFetch(missing, async () => { const x = await pushDirty(s4, m4); await pullAll(s4, m4); return x })
  checks.push(['a missing consents table leaves records dirty and fails nothing', failed4.length === 0 && s4.consents!.records[0]._dirty === true && m4.lastPull !== null])

  // label-photo: the old device-only flag becomes a record, once
  const st = fakeStorage({ 'tali.labelConsent': '1' })
  const s5 = stateFromBackup({ days: {} } as never)
  const moved = migrateLabelConsent(s5, st)
  const lr = latestConsent(s5, 'label-photo')
  removeLegacyLabelFlag(st)
  checks.push(['old label consent migrates as label-photo (legacy version); flag removed', moved && lr?.granted === true && lr.version === LEGACY_LABEL_VERSION && lr._dirty === true && st.getItem('tali.labelConsent') === null])
  checks.push(['the migration runs once', !migrateLabelConsent(s5, fakeStorage({ 'tali.labelConsent': '1' })) && s5.consents!.records.length === 1])
  checks.push(['no old flag, no record', !migrateLabelConsent(stateFromBackup({ days: {} } as never), fakeStorage({}))])

  // device rules: never from a backup file; "keep" re-keys for the account; "fresh" has none
  const file = JSON.parse(JSON.stringify(s5)) as PersistedState
  const restored = stateFromBackup(file, stateFromBackup({ days: {} } as never))
  checks.push(["a backup file's consent records are not restored", restored.consents?.records.length === 0])
  const kept = keepForAccount(JSON.parse(JSON.stringify(s)) as PersistedState, '77777777-7777-4777-8777-777777777777')
  checks.push(['"keep" never carries another account\'s consent: the new account answers for itself', s.consents!.records.length > 0 && kept.consents!.records.length === 0 && !healthConsentAnswered(kept)])
  checks.push(['"start fresh" has no consent', freshForAccount('77777777-7777-4777-8777-777777777777').consents!.records.length === 0])
  const now = new Date().toISOString()
  const junk = loadStateFrom({ days: {}, consents: { records: [{ id: 'x', type: 'health', version: 'v', granted: true, at: now }, { id: uuid(), type: 'mood', version: 'v1', granted: true, at: now }, { id: uuid(), type: 'ai', version: 'v1', granted: 'yes', at: now }] } } as never)
  checks.push(['malformed consent records are dropped', junk.consents!.records.length === 0])
  // a time in the future is clamped to now when recorded
  const s6 = stateFromBackup({ days: {} } as never)
  const fut = recordConsent(s6, 'ai', true, undefined, new Date(Date.now() + 3 * 86400_000).toISOString())
  checks.push(['a future time is clamped to now', Date.parse(fut.at) <= Date.now()])
  // one row the server refuses (a check violation) stays unsynced; the rest go through
  const s7 = stateFromBackup({ days: {} } as never)
  const m7 = ensureMeta(s7, false)
  const good1 = recordConsent(s7, 'health', true), bad1 = recordConsent(s7, 'ai', true), good2 = recordConsent(s7, 'label-photo', true)
  bad1.version = 'BAD VERSION' // as an older build might have stored
  const got7: any[] = []
  const posts: number[] = []
  const f7 = fakeServer({ settings: [], day_logs: [], custom_foods: [], recipes: [] })
  const checkFetch = (async (url: string, o: RequestInit = {}) => {
    if (!String(url).includes('/consents') || o.method !== 'POST') return String(url).includes('/consents') ? new Response('[]', { status: 200 }) : f7.fetchFn(url, o)
    const list = JSON.parse(String(o.body))
    posts.push(list.length)
    if (list.some((x: any) => !/^[a-z0-9.-]{1,32}$/.test(x.version))) return new Response(JSON.stringify({ code: '23514', message: 'check' }), { status: 400 })
    got7.push(...list)
    return new Response(null, { status: 201 })
  }) as typeof fetch
  const failed7 = await withFetch(checkFetch, () => pushDirty(s7, m7))
  checks.push(['a rejected consent row is retried alone and stays unsynced; the others sync', posts.join() === '3,1,1,1' && got7.length === 2 && !good1._dirty && !good2._dirty && bad1._dirty === true && failed7.length === 1 && failed7[0].startsWith('consents')])
  report('consent', checks)
}

async function deletion(): Promise<void> {
  const checks: [string, boolean][] = []
  const run = async (o: { online?: boolean; session?: boolean; fresh?: boolean; owner?: boolean; call?: () => Promise<{ status: number; body: unknown }> }) => {
    const log: string[] = []
    const res = await deleteAccount({
      online: () => o.online ?? true,
      hasSession: () => o.session ?? true,
      fresh: () => o.fresh ?? true,
      accountMatches: () => o.owner ?? true,
      call: async () => { log.push('call'); return o.call ? o.call() : { status: 200, body: { ok: true } } },
      wipe: () => { log.push('wipe') },
      signOut: async () => { log.push('signOut') },
    })
    return { res: res.status, log: log.join(',') }
  }
  const off = await run({ online: false })
  checks.push(['offline: refused, nothing sent, nothing wiped', off.res === 'offline' && off.log === ''])
  const nos = await run({ session: false })
  checks.push(['no live session: refused, nothing sent', nos.res === 'no-session' && nos.log === ''])
  const notOwner = await run({ owner: false })
  checks.push(["session isn't the device data's owner (or an owner question is pending): refused, nothing sent", notOwner.res === 'wrong-account' && notOwner.log === ''])
  const stale = await run({ fresh: false })
  checks.push(['sign-in over 5 minutes old: asks to re-confirm, nothing sent', stale.res === 'reauth' && stale.log === ''])
  const refused = await run({ call: async () => ({ status: 403, body: { ok: false, error: 'reauth' } }) })
  checks.push(['the server refusing a stale sign-in: re-confirm, nothing wiped', refused.res === 'reauth' && refused.log === 'call'])
  const ok = await run({})
  checks.push(['success: wiped and signed out only after the server confirms', ok.res === 'ok' && ok.log === 'call,wipe,signOut,wipe'])
  const already = await run({ call: async () => ({ status: 200, body: { ok: true, already: true } }) })
  checks.push(['already deleted (a retry after a lost reply) finishes the wipe', already.res === 'ok' && already.log.includes('wipe')])
  const fails = await Promise.all([
    run({ call: async () => ({ status: 500, body: { ok: false, error: 'failed' } }) }),
    run({ call: async () => ({ status: 401, body: { ok: false } }) }),
    run({ call: async () => ({ status: 404, body: null }) }),
    run({ call: async () => { throw new TypeError('Failed to fetch') } }),
    run({ call: async () => ({ status: 200, body: { ok: 'yes' } }) }),
  ])
  checks.push(['failure: nothing wiped (500, 401, 404, lost reply, odd body)', fails.every((x) => x.log === 'call') && fails.map((x) => x.res).join() === 'error,no-session,unavailable,unavailable,error'])

  const st = fakeStorage({ 'leanplan.v1': '{}', 'tali.mode': 'account', 'tali.kitchen': '[]', 'tali.labelConsent': '1', 'tali.sound': '1', 'sb-exvblofwiwbvycomxvmj-auth-token': 'x', 'other-site': 'keep' })
  wipeStorage(st)
  checks.push(['device wipe: leanplan.v1, every tali.* key and the saved session go', st.keys().join() === 'other-site'])

  // the function covers every table that holds user rows
  const sql = [readFileSync('docs/security-rls.sql', 'utf8'), ...readdirSync('docs/migrations').map((x) => readFileSync('docs/migrations/' + x, 'utf8'))].join('\n')
  const created = [...sql.matchAll(/create table if not exists public\.(\w+)/g)].map((x) => x[1])
  const locked = (sql.match(/array\['([^\]]+)'\]/) || [])[1]?.split("','") || []
  const need = [...new Set([...created, ...locked])]
  const gap = need.filter((t) => !(USER_TABLES as readonly string[]).includes(t))
  checks.push(['delete-account deletes from every user table in the schema docs' + (gap.length ? ' (missing ' + gap.join() + ')' : ''), need.length >= 9 && gap.length === 0])
  checks.push(['client and function agree on the confirm phrase', CLIENT_CONFIRM === DELETE_CONFIRM])
  // re-confirmed identity: the verified token's sign-in time (amr), never iat
  const now = 1_790_000_000
  const tok = (p: object) => 'h.' + Buffer.from(JSON.stringify(p)).toString('base64url') + '.s'
  const pw = { iat: now, amr: [{ method: 'password', timestamp: now - 60 }] }
  checks.push(['a password sign-in a minute ago is fresh', signedInRecently(pw, now) && sessionSignedInRecently(tok(pw), now) && authTime(jwtPayload(tok(pw))) === now - 60])
  checks.push(['a fresh Google sign-in counts', signedInRecently({ amr: [{ method: 'password', timestamp: now - 86400 }, { method: 'oauth', timestamp: now - 10 }] }, now)])
  checks.push(['a sign-in 6 minutes ago is not, even with a just-refreshed token (new iat)', !signedInRecently({ iat: now, amr: [{ method: 'password', timestamp: now - 360 }] }, now)])
  checks.push(['no sign-in time, a malformed one or one far in the future: not fresh', !signedInRecently({ iat: now }, now) && !signedInRecently({ amr: [{ timestamp: 'x' }] }, now) && !signedInRecently({ amr: [{ timestamp: now + 3600 }] }, now) && !signedInRecently(null, now) && !sessionSignedInRecently('not-a-jwt', now)])
  // the token's subject must be the recorded owner, with no owner question pending
  const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222'
  checks.push(['owner check: same sub passes; other sub, no owner, or a pending ask fails', tokenMatchesOwner(tok({ sub: A }), A, false) && !tokenMatchesOwner(tok({ sub: B }), A, false) &&
    !tokenMatchesOwner(tok({ sub: A }), undefined, false) && !tokenMatchesOwner(tok({ sub: A }), A, true) && !tokenMatchesOwner('garbage', A, false)])
  // back from Google: only the same account, only within 10 minutes, only once
  const fs = fakeStorage({})
  const t0 = 1_790_000_000_000
  markReauth(A, fs, t0)
  const same = takeReauthReturn(A, fs, t0 + 60_000)
  const once = takeReauthReturn(A, fs, t0 + 61_000)
  markReauth(A, fs, t0)
  const other = takeReauthReturn(B, fs, t0 + 60_000)
  markReauth(A, fs, t0)
  const late = takeReauthReturn(A, fs, t0 + 11 * 60_000)
  fs.setItem('tali.reauthForDelete', String(t0))
  const oldFormat = takeReauthReturn(A, fs, t0 + 1000)
  checks.push(['Google return: same account within 10 min, once; another account, late or an old flag: no', same && !once && !other && !late && !oldFormat && fs.getItem('tali.reauthForDelete') === null])
  report('delete account', checks)
}

function connection(): void {
  const base = { signedIn: true, authed: true, syncPaused: false, ownerAsk: false, online: true, sync: 'synced' as 'idle' | 'syncing' | 'synced' | 'offline' | 'error', pending: 0 }
  const cases: [string, Partial<typeof base>, string][] = [
    ['synced, nothing pending', {}, 'Up to date'],
    ['changes waiting', { pending: 3 }, 'Saved on this phone, will sync (3)'],
    ['syncing', { sync: 'syncing' }, 'Saved on this phone, will sync'],
    ['device offline, changes waiting', { online: false, pending: 2 }, 'Offline'],
    ['last sync found no connection', { sync: 'offline' }, 'Offline'],
    ['opened offline, now online, session not back yet', { authed: false, syncPaused: true, pending: 1 }, 'Saved on this phone, will sync (1)'],
    ['opened offline and still offline', { authed: false, syncPaused: true, online: false }, 'Offline'],
    ['signed out', { signedIn: false, authed: false }, 'Sign in to sync'],
    ['signed out and offline', { signedIn: false, authed: false, online: false }, 'Sign in to sync'],
    ['asking whose data this is', { ownerAsk: true, authed: false }, 'Sign in to sync'],
    ['last sync failed', { sync: 'error', pending: 1 }, 'Sync problem'],
    ['failed earlier, offline now', { sync: 'error', online: false }, 'Offline'],
  ]
  const checks: [string, boolean][] = cases.map(([n, patch, want]) => {
    const got = connectionLabel(connectionState({ ...base, ...patch }))
    return [n + (got === want ? '' : ` (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`), got === want]
  })
  const s = stateFromBackup({ days: {} } as never)
  ensureMeta(s, false).settings.dirty = false
  recordConsent(s, 'ai', true)
  const c = connectionState({ ...base, pending: unsyncedCount(s) })
  checks.push(['the count includes consent acts not yet uploaded', c.kind === 'pending' && c.pending === 1])
  report('connection', checks)
}

/** The consent screen's gate: answered = a grant at the current version, or any withdrawal. */
function gate(): void {
  const s = stateFromBackup({ days: {} } as never)
  const checks: [string, boolean][] = [['no record: not answered (consent screen shows, sync waits)', !healthConsentAnswered(s)]]
  recordConsent(s, 'label-photo', true)
  checks.push(['another type doesn\'t count', !healthConsentAnswered(s)])
  recordConsent(s, 'health', true, '2000-old')
  checks.push(['a grant at an older version asks again', !healthConsentAnswered(s)])
  recordConsent(s, 'health', true)
  checks.push(['a grant at the current version is answered', healthConsentAnswered(s) && CONSENT_VERSIONS.health.length > 0])
  withdraw(s, ensureMeta(s, false), 'health')
  checks.push(['a withdrawal is an answer too (not asked again)', healthConsentAnswered(s) && !hasConsent(s, 'health')])
  report('consent gate', checks)
}

/** No health data goes up while the health consent record hasn't reached the server. */
async function consentFirst(fakeServer: FakeServer): Promise<void> {
  const s = stateFromBackup({ days: { '2026-09-01': day(70) } } as never)
  const m = ensureMeta(s, true)
  recordConsent(s, 'health', true)
  const down = fakeServer(emptyRows(), ['consents'])
  const failed = await withFetch(down.fetchFn, () => pushDirty(s, m))
  const checks: [string, boolean][] = [
    ['a failed consent upload stops the data upload', failed.length > 0 && !down.calls.some((c) => c.startsWith('POST day_logs') || c.startsWith('POST settings'))],
    ['the day stays dirty for the next run', m.days['2026-09-01']?.dirty === true],
  ]
  const up = fakeServer(emptyRows())
  const ok = await withFetch(up.fetchFn, () => pushDirty(s, m))
  checks.push(['once the consent is up, the data follows', ok.length === 0 && up.calls.some((c) => c.startsWith('POST day_logs'))])
  // a health answer made under a clock the server refuses gets the upload's real time
  const s2 = stateFromBackup({ days: {} } as never)
  const m2 = ensureMeta(s2, false)
  const r2 = recordConsent(s2, 'health', true)
  r2.at = '1970-01-01T00:00:00.000Z'
  await withFetch(fakeServer(emptyRows()).fetchFn, () => pushDirty(s2, m2))
  checks.push(['a 1970 clock is repaired before upload, so sync isn\'t blocked for good', Date.parse(r2.at) >= Date.parse('2026-01-01') && !r2._dirty])
  report('consent first', checks)
}

/**
 * A PostgREST stand-in that merges an upsert into the row like the real one (only the columns
 * sent are set), and answers `select=` reads with the rows as stored.
 */
function mergingServer(rows: Record<string, any[]>) {
  const keyOf = (t: string) => (t === 'day_logs' ? ['user_id', 'log_date'] : t === 'settings' ? ['user_id'] : ['id'])
  const res = (status: number, body?: unknown) => new Response(body === undefined ? null : JSON.stringify(body), { status })
  const gets: string[] = []
  const fetchFn = (async (url: string, o: RequestInit = {}) => {
    const [path, q = ''] = String(url).split('/rest/v1/')[1].split('?')
    const t = path.replace(/^\//, '')
    if (!o.method) {
      gets.push(t + '?' + decodeURIComponent(q))
      const within = new URLSearchParams(q).get('log_date')?.match(/^in\.\((.*)\)$/)?.[1].split(',')
      return res(200, (rows[t] || []).filter((r) => r.user_id === LOCAL_USER && (!within || within.includes(r.log_date))))
    }
    const next = [...(rows[t] || [])]
    for (const row of JSON.parse(String(o.body))) {
      const i = next.findIndex((r) => keyOf(t).every((k) => r[k] === row[k]))
      if (i >= 0) next[i] = { ...next[i], ...row, updated_at: 'y' }; else next.push({ weight: null, ...row, updated_at: 'y' })
    }
    rows[t] = next
    return res(201)
  }) as typeof fetch
  return { fetchFn, gets }
}

/** Nothing health-related in what went up: no weight column, the check-in and profile health fields as the server had them. */
const HEALTHY = (rows: Record<string, any[]>) => JSON.stringify([rows.day_logs.map((r) => [r.log_date, r.weight ?? null, r.supps?._checkin ?? null]), (({ weight, bodyFat, training }) => [weight, bodyFat, training?.limitations, training?.limitationsNote])(rows.settings[0]?.profile || {})])

/** Existing users' "Not now" (plan §14): health data stays on the phone, its sync pauses. */
async function healthPause(): Promise<void> {
  const checks: [string, boolean][] = []
  const D1 = '2026-09-20', D2 = '2026-09-21'
  const rows: Record<string, any[]> = {
    settings: [{ user_id: LOCAL_USER, target: { kcal: 2000, p: 150, c: 200, f: 70 }, schedule: {}, profile: { name: 'Sam', weight: 72, bodyFat: 20, training: { limitations: ['knees'], equipment: ['dumbbells'] } } }],
    day_logs: [{ user_id: LOCAL_USER, log_date: D1, foods: [], supps: { vitD: true, _checkin: { mood: 3, hunger: 2, sleep: 2 } }, weight: 71, workout: null }],
    custom_foods: [], recipes: [], consents: [],
  }
  const srv = mergingServer(rows)
  const s = stateFromBackup({ days: {} } as never)
  const m = ensureMeta(s, false)
  m.settings.dirty = false
  await withFetch(srv.fetchFn, () => pullAll(s, m))
  checks.push(['the one-time sheet is due for someone with data and no answer', existingConsentDue(s) && s.days[D1].weight === 71])
  const t0 = Date.now()
  pauseHealthSync(s, new Date(t0).toISOString())
  checks.push(['"Not now" pauses sync, records nothing, clears nothing', healthSyncPaused(s) && !latestConsent(s, 'health') && s.consents!.records.length === 0 && s.days[D1].weight === 71 && healthLoggingAllowed(s)])
  checks.push(['not due again before 2 weeks; due once after', !existingConsentDue(s, t0 + 13 * 86400_000) && existingConsentDue(s, t0 + REASK_AFTER_MS + 1)])

  // while paused: new health data on the phone, and other changes that do sync
  s.days[D1].weight = 70.5
  s.days[D1].foods.push({ n: 'Toast', k: 100, p: 1, c: 1, f: 1, grams: 40 } as never)
  s.days[D2] = { foods: [], supps: {}, weight: 70.2, workout: null, checkin: { mood: 4, hunger: 2, sleep: 3 } } as never
  m.days[D1] = { u: 'x', dirty: true }; m.days[D2] = { u: 'x', dirty: true }
  s.profile.weight = 70; s.profile.bodyFat = 18; s.profile.name = 'Sam B'
  s.profile.training = { ...(s.profile.training || {}), limitations: ['knees', 'back'] as any, limitationsNote: 'sore back' }
  m.settings.dirty = true
  const before = HEALTHY(rows)
  srv.gets.length = 0
  const failed = await withFetch(srv.fetchFn, () => pushDirty(s, m))
  const r1 = rows.day_logs.find((r) => r.log_date === D1), r2 = rows.day_logs.find((r) => r.log_date === D2)
  checks.push(['paused push: the rest of the day syncs', failed.length === 0 && r1.foods.length === 1 && r1.supps.vitD === true && !m.days[D1].dirty && !m.days[D2].dirty && rows.settings[0].profile.name === 'Sam B'])
  checks.push(['paused push: nothing health-related leaves the phone (weight, check-ins, body fat, limitations)', HEALTHY(rows) === before.replace(']]', `],["${D2}",null,null]]`) && r2.weight === null && !('_checkin' in r2.supps) && rows.settings[0].profile.training.equipment[0] === 'dumbbells'])
  const dayGets = srv.gets.filter((g) => g.startsWith('day_logs'))
  checks.push(['paused push: reads only the days being written', dayGets.length === 1 && dayGets[0].includes(`log_date=in.(${D1},${D2})`)])
  const held = s.consents!.healthPause!
  checks.push(['what was held back is remembered with the server’s values at the time', held.days?.[D1]?.weight === 71 && (held.days?.[D1]?.checkin as any)?.mood === 3 && held.days?.[D2]?.weight === null && held.profile?.weight === 72 && held.profile?.bodyFat === 20])
  await withFetch(srv.fetchFn, () => pullAll(s, m))
  checks.push(['paused pull: the phone keeps its newer health data', s.days[D1].weight === 70.5 && s.days[D2].weight === 70.2 && s.days[D2].checkin?.mood === 4 && s.days[D1].foods.length === 1 && s.profile.weight === 70 && s.profile.bodyFat === 18 && s.profile.name === 'Sam B'])
  // held again on a later push: the first snapshot stays
  m.days[D1] = { u: 'x', dirty: true }
  await withFetch(srv.fetchFn, () => pushDirty(s, m))
  checks.push(['a later push while paused still leaks nothing and keeps the first snapshot', HEALTHY(rows) === before.replace(']]', `],["${D2}",null,null]]`) && s.consents!.healthPause!.days![D1].weight === 71])
  const again = loadStateFrom(JSON.parse(JSON.stringify(s)))
  checks.push(['the pause survives a reload', healthSyncPaused(again) && Object.keys(again.consents!.healthPause!.days!).length === 2 && again.consents!.healthPause!.profile?.weight === 72])

  // the one re-ask, then never again
  pauseHealthSync(s)
  checks.push(['a second "Not now" answers the re-ask: never asked again, still paused', !existingConsentDue(s, t0 + 60 * 86400_000) && healthSyncPaused(s) && s.consents!.healthPause!.at === new Date(t0).toISOString()])

  // yes: what was held uploads, where the server hasn't moved on. Meanwhile another device
  // (with consent) logged a newer weight on D1: the server's wins there
  rows.day_logs.find((r) => r.log_date === D1).weight = 71.8
  grantHealth(s, m)
  checks.push(['a yes ends the pause and marks what was held to upload, with its snapshots', !healthSyncPaused(s) && !s.consents!.healthPause && m.days[D1].dirty && m.days[D2].dirty && m.settings.dirty && !!s.consents!.healthResume?.days?.[D1]])
  await withFetch(srv.fetchFn, () => pushDirty(s, m))
  const u1 = rows.day_logs.find((r) => r.log_date === D1), u2 = rows.day_logs.find((r) => r.log_date === D2)
  checks.push(['resume: a newer server value from another device is kept (server wins, taken onto the phone)', u1.weight === 71.8 && s.days[D1].weight === 71.8 && u1.supps._checkin?.mood === 3])
  checks.push(['resume: where the server is unchanged, the phone’s held values upload', u2.weight === 70.2 && u2.supps._checkin?.mood === 4 && rows.settings[0].profile.weight === 70 && rows.settings[0].profile.bodyFat === 18 && rows.settings[0].profile.training.limitationsNote === 'sore back'])
  checks.push(['resume: done once everything held is up', !s.consents!.healthResume])

  // consent given on another device: the pull brings the yes, and the same check applies
  const rows2: Record<string, any[]> = {
    settings: [{ user_id: LOCAL_USER, target: { kcal: 2000, p: 150, c: 200, f: 70 }, schedule: {}, profile: { name: 'Sam', weight: 72 } }],
    day_logs: [{ user_id: LOCAL_USER, log_date: D1, foods: [], supps: {}, weight: 71, workout: null }, { user_id: LOCAL_USER, log_date: D2, foods: [], supps: {}, weight: 70, workout: null }],
    custom_foods: [], recipes: [], consents: [],
  }
  const srv2 = mergingServer(rows2)
  const s2 = stateFromBackup({ days: {} } as never)
  const m2 = ensureMeta(s2, false)
  m2.settings.dirty = false
  await withFetch(srv2.fetchFn, () => pullAll(s2, m2))
  pauseHealthSync(s2)
  s2.days[D1].weight = 69; s2.days[D2].weight = 68.5
  m2.days[D1] = { u: 'x', dirty: true }; m2.days[D2] = { u: 'x', dirty: true }
  await withFetch(srv2.fetchFn, () => pushDirty(s2, m2))
  // the other device agrees, and logs a new weight on D2
  rows2.consents.push({ id: uuid(), user_id: LOCAL_USER, type: 'health', version: '2026-09-v1', granted: true, recorded_at: new Date().toISOString() })
  rows2.day_logs.find((r) => r.log_date === D2).weight = 70.4
  await withFetch(srv2.fetchFn, () => pullAll(s2, m2))
  checks.push(['paused pull keeps the phone’s held values until the yes is settled', s2.days[D1].weight === 69 && s2.days[D2].weight === 68.5])
  const settled = settleHealthPause(s2, m2)
  checks.push(["another device's yes ends the pause here and marks what was held", settled && !s2.consents!.healthPause && m2.days[D1].dirty && m2.days[D2].dirty])
  await withFetch(srv2.fetchFn, () => pushDirty(s2, m2))
  checks.push(['consent on another device: unchanged day uploads the phone’s value, the changed one keeps the server’s', rows2.day_logs.find((r) => r.log_date === D1).weight === 69 && rows2.day_logs.find((r) => r.log_date === D2).weight === 70.4 && s2.days[D2].weight === 70.4])
  const s2b = stateFromBackup({ days: { [D1]: day(69) } } as never)
  pauseHealthSync(s2b); holdHealth(s2b, { day: D1, server: { weight: 70, checkin: null } })
  checks.push(['a held snapshot survives a reload', loadStateFrom(JSON.parse(JSON.stringify(s2b))).consents!.healthPause!.days![D1].weight === 70])
  const s3 = stateFromBackup({ days: { [D1]: day(69) } } as never)
  const m3 = ensureMeta(s3, false)
  pauseHealthSync(s3)
  withdraw(s3, m3, 'health')
  checks.push(['withdrawing ends the pause (the clear uploads everywhere)', !s3.consents!.healthPause && !healthSyncPaused(s3) && s3.days[D1].weight === null])

  // declined: no calorie numbers until they agree
  const s4 = stateFromBackup({ days: {} } as never)
  checks.push(['numbers show by default; Gentle hides them', !quietNumbers(s4) && (s4.profile.gentle = true, quietNumbers(s4))])
  s4.profile.gentle = false
  withdraw(s4, ensureMeta(s4, false), 'health')
  checks.push(['saying no to health data hides calorie numbers and stops weigh-ins', healthDeclined(s4) && quietNumbers(s4) && !healthLoggingAllowed(s4)])
  checks.push(['someone new with nothing logged is not an existing user', !existingConsentDue(stateFromBackup({ days: {} } as never))])
  report('health pause', checks)
}

/**
 * Where the live consent gate (sync waits for the health answer; only the latest health record
 * holds data back; pre-2026 clock floor) meets the "Not now" pause (held health fields, server wins).
 */
async function gateAndPause(): Promise<void> {
  const checks: [string, boolean][] = []
  const D1 = '2026-09-20'
  const fresh = stateFromBackup({ days: { [D1]: day(70) } } as never)
  checks.push(['no answer and no pause: sync sends consent records only', !consentLetsSync(fresh)])
  pauseHealthSync(fresh)
  checks.push(['a "Not now" pause isn’t an answer: still consent records only', !consentLetsSync(fresh) && !healthConsentAnswered(fresh)])
  const answered = stateFromBackup({ days: {} } as never)
  recordConsent(answered, 'health', true)
  checks.push(['an answer lets everything sync', consentLetsSync(answered)])

  // a yes after a pause: nothing (held or not) goes up until that yes is on the server
  const rows: Record<string, any[]> = {
    settings: [{ user_id: LOCAL_USER, target: { kcal: 2000, p: 150, c: 200, f: 70 }, schedule: {}, profile: { name: 'Sam', weight: 72 } }],
    day_logs: [{ user_id: LOCAL_USER, log_date: D1, foods: [], supps: { _checkin: { mood: 3, hunger: 2, sleep: 2 } }, weight: 71, workout: null }],
    custom_foods: [], recipes: [], consents: [],
  }
  const srv = mergingServer(rows)
  let consentsDown = true
  const posts: string[] = []
  const fetchFn = (async (url: string, o: RequestInit = {}) => {
    const t = String(url).split('/rest/v1/')[1].split('?')[0].replace(/^\//, '')
    if (o.method) posts.push(t)
    if (o.method && t === 'consents' && consentsDown) return new Response('{}', { status: 500 })
    return srv.fetchFn(url, o)
  }) as typeof fetch
  const s = stateFromBackup({ days: {} } as never)
  const m = ensureMeta(s, false)
  m.settings.dirty = false
  await withFetch(fetchFn, () => pullAll(s, m))
  pauseHealthSync(s)
  s.days[D1].weight = 70.4
  m.days[D1] = { u: 'x', dirty: true }
  // (the store doesn't run this while paused: consentLetsSync. The data layer's held path, direct:)
  await withFetch(fetchFn, () => pushDirty(s, m))
  checks.push(['paused push (data layer): the day goes up without its weight', rows.day_logs[0].weight === 71 && !m.days[D1].dirty && !!s.consents!.healthPause!.days?.[D1]])
  const rec = grantHealth(s, m)
  rec.at = '1970-01-01T00:00:00.000Z' // a phone clock reset while it was answered
  posts.length = 0
  const failed = await withFetch(fetchFn, () => pushDirty(s, m))
  checks.push(['the yes isn’t on the server yet: nothing else goes up, the held day stays dirty and held', failed.length > 0 && !posts.includes('day_logs') && m.days[D1].dirty && !!s.consents!.healthResume?.days?.[D1] && rows.day_logs[0].weight === 71])
  checks.push(['the 1970 clock is floored before upload', Date.parse(rec.at) >= Date.parse('2026-01-01')])
  consentsDown = false
  const ok = await withFetch(fetchFn, () => pushDirty(s, m))
  checks.push(['once the yes is up, the held weight follows (the server hadn’t changed)', ok.length === 0 && rows.day_logs[0].weight === 70.4 && !s.consents!.healthResume && rows.consents.length === 1])

  // "keep this device's log" in another account: that account answers for itself
  const s2 = stateFromBackup({ days: { [D1]: day(70) } } as never)
  pauseHealthSync(s2)
  const kept = keepForAccount(s2, uuid())
  checks.push(['keeping this device’s log in another account drops the pause with the consent log', !healthSyncPaused(kept) && !consentLetsSync(kept)])
  report('consent gate and pause', checks)
}

export async function consentSuite(fakeServer: FakeServer): Promise<number> {
  bad = 0
  gate()
  await consentFirst(fakeServer)
  await consent(fakeServer)
  await healthPause()
  await gateAndPause()
  await deletion()
  connection()
  return bad
}
