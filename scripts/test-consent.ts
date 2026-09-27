/* Consent, account deletion and the connection indicator (onboarding plan §7, §8). Run from
   scripts/test-core.ts (npm test); returns the number of failures. */
import { readFileSync, readdirSync } from 'node:fs'
import { CONSENT_VERSIONS, LEGACY_LABEL_VERSION, applyHealthWithdrawal, canSaveHealthAnswers, hasConsent, healthDataSummary, healthLoggingAllowed, latestConsent, migrateLabelConsent, recordConsent, removeLegacyLabelFlag, unsyncedConsents, withdraw } from '@/data/consent'
import { deleteAccount, wipeStorage, DELETE_CONFIRM as CLIENT_CONFIRM } from '@/data/account'
import { USER_TABLES, DELETE_CONFIRM } from '../supabase/functions/_shared/account'
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

  // latest wins, even against a clock that went backwards
  const w = withdraw(s, m, 'health')
  checks.push(['withdrawal is a new record and wins', s.consents!.records.length === 2 && !w.granted && !hasConsent(s, 'health') && Date.parse(w.at) > Date.parse(g.at)])
  const a1 = recordConsent(s, 'ai', true, undefined, '2026-09-27T10:00:00.000Z')
  const a2 = recordConsent(s, 'ai', false, undefined, '2026-09-27T09:00:00.000Z')
  checks.push(['a later act never loses to an earlier one on a skewed clock', !hasConsent(s, 'ai') && Date.parse(a2.at) > Date.parse(a1.at)])

  // withdrawal clears the health fields, marks them to sync, leaves the rest
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
  checks.push(['"keep" uploads the device\'s acts under new ids', kept.consents!.records.length === s.consents!.records.length && kept.consents!.records.every((r, i) => r._dirty && r.id !== s.consents!.records[i].id)])
  checks.push(['"start fresh" has no consent', freshForAccount('77777777-7777-4777-8777-777777777777').consents!.records.length === 0])
  const now = new Date().toISOString()
  const junk = loadStateFrom({ days: {}, consents: { records: [{ id: 'x', type: 'health', version: 'v', granted: true, at: now }, { id: uuid(), type: 'mood', version: 'v1', granted: true, at: now }, { id: uuid(), type: 'ai', version: 'v1', granted: 'yes', at: now }] } } as never)
  checks.push(['malformed consent records are dropped', junk.consents!.records.length === 0])
  report('consent', checks)
}

async function deletion(): Promise<void> {
  const checks: [string, boolean][] = []
  const run = async (o: { online?: boolean; session?: boolean; call?: () => Promise<{ status: number; body: unknown }> }) => {
    const log: string[] = []
    const res = await deleteAccount({
      online: () => o.online ?? true,
      hasSession: () => o.session ?? true,
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

export async function consentSuite(fakeServer: FakeServer): Promise<number> {
  bad = 0
  await consent(fakeServer)
  await deletion()
  connection()
  return bad
}
