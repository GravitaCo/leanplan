/**
 * Consent, offline-first (onboarding plan §7, §8). Every grant or withdrawal is recorded on the
 * device first, as its own record with a type, version and timestamp, and uploads to the
 * append-only `consents` table (docs/migrations/2026-09-consents.sql) when a sync runs. Nothing
 * here waits on the network. The current state of a type is its latest record (by recorded
 * time); a withdrawal made offline before the grant synced uploads too, and still wins.
 *
 * The records live in the device state (`leanplan.v1`, field `consents`), so they follow the
 * same owner rules as the log: "start fresh" drops them, sign out and remove drops them.
 * No React, no DOM beyond an injected Storage for the one-off label-consent migration.
 */
import type { DayLog, Profile } from '@/core/types'
import { sbFetch, sbGet, getUid, nowIso, uuid, HttpError, UUID_RE } from './supabase'
import type { PersistedState, SyncMeta } from './persistence'

export const CONSENT_TYPES = ['health', 'ai', 'label-photo'] as const
export type ConsentType = (typeof CONSENT_TYPES)[number]

/**
 * The wording version each consent screen asks for. Bump a type's version whenever what the
 * person agrees to changes (the privacy notice or the screen's copy), so the record says which
 * text they saw, and everyone is asked again (healthConsentAnswered).
 *
 * health: first granted on the consent screen (src/screens/legal/ConsentScreen.tsx), which can't
 * be submitted without also accepting the terms and confirming the minimum age, so the account's
 * first health grant at this version is also the record of those two. After a withdrawal,
 * Profile → Privacy can grant it again (see docs/compliance/README.md).
 */
export const CONSENT_VERSIONS: Record<ConsentType, string> = {
  health: '2026-09-v1',
  ai: '2026-09-v1',
  'label-photo': '2026-09-v1',
}
/** The version given to a label-photo consent carried over from the old device-only flag. */
export const LEGACY_LABEL_VERSION = 'device-v0'
/** The old device-only flag (src/data/labelReader.ts before consents). */
export const LEGACY_LABEL_KEY = 'tali.labelConsent'

export interface ConsentRecord {
  /** a random v4 UUID for this act: re-sending it is a no-op on the server */
  id: string
  type: ConsentType
  version: string
  granted: boolean
  /** when the person acted (ISO time, this device's clock) */
  at: string
  /** not yet on the server */
  _dirty?: boolean
}

export interface ConsentLog {
  records: ConsentRecord[]
  /** id of the health withdrawal whose data clear has been applied on this device (once each) */
  healthCleared?: string
}

const VERSION_RE = /^[a-z0-9.-]{1,32}$/

/** The device's consent log, created when missing. */
export function consentLog(s: PersistedState): ConsentLog {
  if (!s.consents || typeof s.consents !== 'object' || !Array.isArray(s.consents.records)) s.consents = { records: [] }
  return s.consents
}

/** Drop anything malformed (a hand-edited backup, an older build) rather than guess at it. */
export function cleanConsents(x: unknown): ConsentLog {
  const log = x && typeof x === 'object' ? (x as Partial<ConsentLog>) : {}
  const records = (Array.isArray(log.records) ? log.records : []).filter((r): r is ConsentRecord =>
    !!r && typeof r === 'object' && typeof r.id === 'string' && UUID_RE.test(r.id) &&
    (CONSENT_TYPES as readonly string[]).includes(r.type) && typeof r.version === 'string' && VERSION_RE.test(r.version) &&
    typeof r.granted === 'boolean' && typeof r.at === 'string' && !isNaN(Date.parse(r.at)))
  return { records: records.map((r) => ({ id: r.id, type: r.type, version: r.version, granted: r.granted, at: r.at, ...(r._dirty ? { _dirty: true } : {}) })), ...(typeof log.healthCleared === 'string' ? { healthCleared: log.healthCleared } : {}) }
}

/** The latest record of a type (latest `at` wins; ties go to the later one in the list). */
export function latestConsent(s: PersistedState, type: ConsentType): ConsentRecord | null {
  let best: ConsentRecord | null = null
  for (const r of s.consents?.records || []) {
    if (r.type !== type) continue
    if (!best || Date.parse(r.at) >= Date.parse(best.at)) best = r
  }
  return best
}

/** Whether the person's latest answer for this type is yes. No record = no. */
export function hasConsent(s: PersistedState, type: ConsentType): boolean {
  return latestConsent(s, type)?.granted === true
}

/**
 * The guard the onboarding questionnaire calls before it saves any health answer (weight,
 * readiness, sleep, stress, mood, the wellbeing outcome, limitations; plan §8): true only once a
 * local health consent record says yes. Local only, so it works offline.
 */
export function canSaveHealthAnswers(s: PersistedState): boolean {
  return hasConsent(s, 'health')
}

/**
 * Whether the app's existing logging paths (weigh-ins, check-ins) may save health data. Those
 * predate consent, so people who haven't been asked yet (no record: plan §12's one-time prompt is
 * still to come) keep logging as before. Only an explicit withdrawal stops them.
 */
export function healthLoggingAllowed(s: PersistedState): boolean {
  const r = latestConsent(s, 'health')
  return !r || r.granted
}

/**
 * Whether the person has answered the current health consent screen: a grant at the current
 * version, or a withdrawal (they chose to use Tali without health data; withdrawing isn't asked
 * again). Until then the app shows the consent screen and syncs nothing but consent records.
 */
export function healthConsentAnswered(s: PersistedState): boolean {
  const r = latestConsent(s, 'health')
  return !!r && (!r.granted || r.version === CONSENT_VERSIONS.health)
}

/** Record a grant or withdrawal on the device. Returns the new record (dirty until synced). */
export function recordConsent(s: PersistedState, type: ConsentType, granted: boolean, version = CONSENT_VERSIONS[type], at = nowIso()): ConsentRecord {
  if (!VERSION_RE.test(version)) throw new Error('bad consent version')
  const log = consentLog(s)
  // never later than now: a record can't claim a time that hasn't happened (the server refuses
  // one more than a day ahead, which would leave it unsynced for good)
  const nowMs = Date.now()
  if (!(Date.parse(at) <= nowMs)) at = new Date(nowMs).toISOString()
  // never earlier than the latest record already here, so a clock that went backwards can't
  // make this act lose to the one before it
  const prev = latestConsent(s, type)
  const when = prev && Date.parse(prev.at) >= Date.parse(at) ? new Date(Date.parse(prev.at) + 1).toISOString() : at
  const rec: ConsentRecord = { id: uuid(), type, version, granted, at: when, _dirty: true }
  log.records.push(rec)
  return rec
}

/** Consent records not yet on the server, for the connection indicator and sign-out choice. */
export function unsyncedConsents(s: PersistedState): number {
  return (s.consents?.records || []).filter((r) => r._dirty).length
}

/* ---------------- health data: what withdrawal clears ---------------- */

/**
 * What withdrawing health consent clears, today (plan §8 names weight, readiness, sleep, stress,
 * mood, the wellbeing outcome and limitations as health data). Fields that exist now:
 * - every day's weigh-in (`day.weight`) and check-in (`day.checkin`: mood, hunger, sleep, stress,
 *   energy, soreness, note)
 * - `profile.weight` (Profile's fallback weight) and `profile.bodyFat`
 * - `profile.training.limitations` and `profile.training.limitationsNote`
 * Still to add when the questionnaire lands (they don't exist yet): readiness answers, the
 * wellbeing routing outcome, the medical-conditions routing outcome, the pregnancy flag. Age,
 * sex and height are plan inputs, not in §8's list, and are kept (PENDING Benn / legal review).
 */
export const HEALTH_FIELDS = ['day.weight', 'day.checkin', 'profile.weight', 'profile.bodyFat', 'profile.training.limitations', 'profile.training.limitationsNote'] as const

export interface HealthDataSummary {
  weighIns: number
  checkins: number
  profileFields: number
}

const PROFILE_HEALTH: (keyof Profile)[] = ['weight', 'bodyFat']

/** How much a withdrawal would clear, for the confirm step. */
export function healthDataSummary(s: PersistedState): HealthDataSummary {
  const days = Object.values(s.days || {}) as DayLog[]
  const t = s.profile?.training
  return {
    weighIns: days.filter((d) => d && d.weight != null).length,
    checkins: days.filter((d) => d && d.checkin).length,
    profileFields: PROFILE_HEALTH.filter((k) => s.profile?.[k] != null).length + (t?.limitations?.length ? 1 : 0) + (t?.limitationsNote ? 1 : 0),
  }
}

/**
 * Remove every health field listed in HEALTH_FIELDS and mark what changed to sync, so the server
 * copy is cleared as well (last write wins). Returns whether anything changed.
 */
export function clearHealthData(s: PersistedState, meta: SyncMeta): boolean {
  const u = nowIso()
  let changed = false
  for (const [d, day] of Object.entries(s.days || {})) {
    if (!day) continue
    if (day.weight == null && !day.checkin) continue
    day.weight = null
    day.checkin = null
    meta.days[d] = { u, dirty: true }
    changed = true
  }
  const p = s.profile
  let settings = false
  if (p) {
    for (const k of PROFILE_HEALTH) if (p[k] != null) { delete p[k]; settings = true }
    if (p.training && (p.training.limitations !== undefined || p.training.limitationsNote !== undefined)) {
      delete p.training.limitations
      delete p.training.limitationsNote
      settings = true
    }
  }
  if (settings) { meta.settings = { u, dirty: true }; changed = true }
  return changed
}

/**
 * After a pull: a health withdrawal made on another device clears this device's health data too,
 * once per withdrawal (so a weigh-in made after it, with consent given again, isn't cleared
 * again). Returns whether anything changed.
 */
export function applyHealthWithdrawal(s: PersistedState, meta: SyncMeta): boolean {
  const r = latestConsent(s, 'health')
  const log = consentLog(s)
  if (!r || r.granted || log.healthCleared === r.id) return false
  clearHealthData(s, meta)
  log.healthCleared = r.id
  return true
}

/**
 * Withdraw consent for a type. Health also clears the health data on this device (and, through
 * sync, the server), and applies once, as above.
 */
export function withdraw(s: PersistedState, meta: SyncMeta, type: ConsentType): ConsentRecord {
  const rec = recordConsent(s, type, false)
  if (type === 'health') {
    clearHealthData(s, meta)
    consentLog(s).healthCleared = rec.id
  }
  return rec
}

/* ---------------- the old device-only label consent ---------------- */

/**
 * Carry the old `tali.labelConsent` flag into the log as a label-photo grant (once). Returns
 * true when a record was added: the caller saves the state, and only then removes the old key
 * (removeLegacyLabelFlag), so a failed save never loses the answer.
 */
export function migrateLabelConsent(s: PersistedState, storage: Pick<Storage, 'getItem'> | null): boolean {
  let flag: string | null = null
  try { flag = storage?.getItem(LEGACY_LABEL_KEY) ?? null } catch { return false }
  if (flag !== '1' || latestConsent(s, 'label-photo')) return false
  recordConsent(s, 'label-photo', true, LEGACY_LABEL_VERSION)
  return true
}

export function removeLegacyLabelFlag(storage: Pick<Storage, 'removeItem'> | null): void {
  try { storage?.removeItem(LEGACY_LABEL_KEY) } catch { /* blocked */ }
}

/* ---------------- sync ---------------- */

/**
 * Upload dirty records. Append-only: an insert that ignores a row already there (same id), so a
 * retry after a lost reply never duplicates or rewrites one. A table that doesn't exist yet (the
 * migration still to apply) leaves everything dirty, quietly. Throws HttpError on a refusal and
 * lets a lost connection throw as is.
 */
export async function pushConsents(s: PersistedState): Promise<void> {
  const dirty = (s.consents?.records || []).filter((r) => r._dirty)
  if (!dirty.length) return
  const uid = getUid()
  const send = (list: ConsentRecord[]) => sbFetch('/consents?on_conflict=id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify(list.map((x) => ({ id: x.id, user_id: uid, type: x.type, version: x.version, granted: x.granted, recorded_at: x.at }))),
  })
  const r = await send(dirty)
  if (r.status === 404) return
  if (r.ok) { dirty.forEach((x) => { delete x._dirty }); return }
  if (!(await isRowRejection(r))) throw new HttpError('INSERT consents -> ' + r.status, r.status)
  // one row broke a check (a bad time or version from an older build): send them one by one,
  // so only that row stays unsynced and the rest reach the server
  let last: HttpError | null = null
  for (const x of dirty) {
    const one = await send([x])
    if (one.ok) delete x._dirty
    else if (await isRowRejection(one)) last = new HttpError('INSERT consents -> ' + one.status, one.status)
    else throw new HttpError('INSERT consents -> ' + one.status, one.status)
  }
  if (last) throw last
}

/** A refusal of a row's content (400, or Postgres 23514 check_violation / 22xxx data errors) as
 *  opposed to the whole request (auth, rate limit, server trouble). */
async function isRowRejection(r: Response): Promise<boolean> {
  if (r.status !== 400) return false
  const body = await r.clone().json().catch(() => null)
  const code = body && typeof body === 'object' ? String((body as { code?: unknown }).code ?? '') : ''
  return !code || code === '23514' || code.startsWith('22') || code === '23502' || code === '54000'
}

/** Merge the account's records from the server (records are immutable, so a union by id). */
export async function pullConsents(s: PersistedState): Promise<void> {
  let rows: { id: string; type: string; version: string; granted: boolean; recorded_at: string }[]
  try {
    rows = await sbGet('/consents?user_id=eq.' + getUid() + '&select=id,type,version,granted,recorded_at')
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) return // no table yet
    throw e
  }
  const log = consentLog(s)
  const have = new Map(log.records.map((r) => [r.id, r]))
  const incoming = cleanConsents({ records: rows.map((x) => ({ id: x.id, type: x.type, version: x.version, granted: x.granted, at: x.recorded_at })) }).records
  for (const r of incoming) {
    const mine = have.get(r.id)
    if (mine) delete mine._dirty // it's on the server
    else log.records.push(r)
  }
}


/* ---------------- export before withdrawing health consent ---------------- */

/** Draft copy for the withdrawal confirm step (PENDING design approval; nothing renders it yet). */
export const HEALTH_WITHDRAW_PROMPT = 'This removes your weigh-ins, check-ins and body details from all your devices. Download a copy first?'

/**
 * The backup to offer before a health withdrawal: the whole device state as the JSON backup
 * (the same format exportBackup writes and Profile imports), taken before anything is cleared.
 * Food logs, workouts, age, sex and height stay after the withdrawal either way.
 */
export function healthWithdrawalBackup(s: PersistedState): { json: string; summary: HealthDataSummary } {
  return { json: JSON.stringify(s), summary: healthDataSummary(s) }
}
