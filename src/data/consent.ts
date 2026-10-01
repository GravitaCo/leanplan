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
import type { DayLog, Food, Profile, Recipe, Routine, TrainingPlan, Why, WhyCode } from '@/core/types'
import { UNCONSENTED_DELETION } from '@/core/legal'
import { MERGED_FIELDS } from '@/core/domain/profileMerge'
import { sbFetch, sbGet, getUid, nowIso, uuid, HttpError, UUID_RE } from './supabase'
import type { PersistedState, SyncMeta } from './persistence'
import { clearDraft } from './onboardingDraft'

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
  /** when the server received it (its created_at), once synced: a record counts from the earlier
   *  of the two, as on the server, so a fast phone clock can't put a yes after a later no */
  arrived?: string
  /** not yet on the server */
  _dirty?: boolean
}

export interface ConsentLog {
  records: ConsentRecord[]
  /** id of the health withdrawal whose data clear has been applied on this device (once each) */
  healthCleared?: string
  /** an existing user said "Not now" to the one-time health consent sheet (plan §14): device only */
  healthPause?: HealthPause
  /** after a yes: what was held back, with the server's values when it was held, still to upload */
  healthResume?: HealthHeld
  /** id of the health withdrawal whose account clear (clear_log_after_withdrawal) this device has
   *  seen done: a newer withdrawal, from any device, queues another */
  cloudClearedFor?: string
  /** id of the yes-after-a-withdrawal for which this device has marked its whole log to upload */
  reuploadedFor?: string
  /** after a yes that ends a pause or a withdrawal: rows the server changed since this time are
   *  another device's newer edits and win; this device's versions go to `resumeCopy` */
  resumeFrom?: string
  /** resumeFrom is this phone's own last pull, not another device's time: no clock margin */
  resumeExact?: boolean
  /** this device's versions of days and settings replaced by newer ones from another device when
   *  sync resumed, kept for the person to download (Profile, Back up and restore) */
  resumeCopy?: ResumeCopy
}

export interface ResumeCopy {
  at: string
  days?: Record<string, DayLog>
  settings?: { target: unknown; schedule: unknown; profile: unknown }
  /** saved foods, recipes, workouts and plans another device changed, by id */
  customFoods?: Record<string, Food>
  recipes?: Record<string, Recipe>
  routines?: Record<string, Routine>
  trainingPlans?: Record<string, TrainingPlan>
}

/** The server's health values for a day, as they were when this device first held it back. */
export interface DaySnap { weight: number | null; checkin: unknown }
/** The server's profile health fields (weight, body fat, limitations), likewise. */
export type ProfileSnap = { weight?: unknown; bodyFat?: unknown; limitations?: unknown; limitationsNote?: unknown }

export interface HealthHeld {
  /** days uploaded without their health fields: date → the server's values at the time */
  days?: Record<string, DaySnap>
  /** settings uploaded without their health fields: the server's values at the time */
  profile?: ProfileSnap
}

/**
 * "Not now" from someone who already had health data in Tali before consent was asked (plan §14;
 * security-data review SAFE WITH FIXES, applied). New health data stays on this phone and its
 * upload is paused: a sync sends day logs without `weight` (the server keeps what it has) and with
 * the server's own check-in in `supps._checkin`, and settings with the server's own health fields
 * in `profile`. What was held back is remembered with the server's values at the time; on a yes
 * each held value uploads only if the server still has those values, otherwise the server's
 * (newer, from another device) wins and this device takes it.
 */
export interface HealthPause extends HealthHeld {
  /** when they said "Not now" the first time */
  at: string
  /** the one re-ask, 2 weeks later, has been answered */
  reasked?: boolean
}

/** The one re-ask after "Not now" comes this long after it (plan §14: 2 weeks). */
export const REASK_AFTER_MS = 14 * 86400_000

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
  const pause = cleanPause(log.healthPause)
  const resume = cleanHeld(log.healthResume)
  return {
    records: records.map((r) => ({ id: r.id, type: r.type, version: r.version, granted: r.granted, at: r.at, ...(isTime(r.arrived) ? { arrived: r.arrived } : {}), ...(r._dirty ? { _dirty: true } : {}) })),
    ...(typeof log.healthCleared === 'string' ? { healthCleared: log.healthCleared } : {}),
    ...(pause ? { healthPause: pause } : {}),
    ...(resume.days || resume.profile ? { healthResume: resume } : {}),
    ...(typeof log.cloudClearedFor === 'string' ? { cloudClearedFor: log.cloudClearedFor } : {}),
    ...(typeof log.reuploadedFor === 'string' ? { reuploadedFor: log.reuploadedFor } : {}),
    ...(isTime(log.resumeFrom) ? { resumeFrom: log.resumeFrom } : {}),
    ...(isTime(log.resumeFrom) && log.resumeExact === true ? { resumeExact: true } : {}),
    ...(log.resumeCopy && typeof log.resumeCopy === 'object' && isTime(log.resumeCopy.at) ? { resumeCopy: log.resumeCopy } : {}),
  }
}

const isTime = (x: unknown): x is string => typeof x === 'string' && !isNaN(Date.parse(x))

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/
function cleanHeld(x: unknown): HealthHeld {
  const h = x && typeof x === 'object' ? (x as HealthHeld) : {}
  const days: Record<string, DaySnap> = {}
  if (h.days && typeof h.days === 'object') {
    for (const [d, v] of Object.entries(h.days)) {
      if (!DAY_RE.test(d) || !v || typeof v !== 'object') continue
      days[d] = { weight: typeof v.weight === 'number' ? v.weight : null, checkin: v.checkin ?? null }
    }
  }
  const profile = h.profile && typeof h.profile === 'object' ? { ...h.profile } : undefined
  return { ...(Object.keys(days).length ? { days } : {}), ...(profile ? { profile } : {}) }
}
function cleanPause(x: unknown): HealthPause | null {
  if (!x || typeof x !== 'object') return null
  const p = x as Partial<HealthPause>
  if (typeof p.at !== 'string' || isNaN(Date.parse(p.at))) return null
  return { at: p.at, ...(p.reasked === true ? { reasked: true } : {}), ...cleanHeld(p) }
}

/** When a record counts from: the earlier of the phone's time and the server's arrival time. */
export function effectiveAt(r: ConsentRecord): number {
  const at = Date.parse(r.at)
  const arrived = r.arrived ? Date.parse(r.arrived) : NaN
  return isNaN(arrived) ? at : Math.min(at, arrived)
}

/** The latest record of a type (by effectiveAt; ties go to the later one in the list). */
export function latestConsent(s: PersistedState, type: ConsentType): ConsentRecord | null {
  let best: ConsentRecord | null = null
  for (const r of s.consents?.records || []) {
    if (r.type !== type) continue
    if (!best || effectiveAt(r) >= effectiveAt(best)) best = r
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

/**
 * The person said no to keeping health data (declined, or withdrew). Tali still works (food,
 * workouts) but shows no weight, check-ins or calorie numbers until they agree (plan §14).
 */
export function healthDeclined(s: PersistedState): boolean {
  return latestConsent(s, 'health')?.granted === false
}

/**
 * Calorie numbers are hidden: the person chose Gentle display, or said no to health data. Behind
 * onboarding (only it sets these), also while pregnant or breastfeeding (maintenance with no
 * number, §3) and, once onboarded, until there's a height and a weight to give an honest
 * estimate from (§2.1).
 */
export function quietNumbers(s: PersistedState): boolean {
  const p = s.profile
  if (!!p?.gentle || healthDeclined(s) || !!p?.pregnancy?.flagged) return true
  const weighed = p?.weight != null || Object.values(s.days || {}).some((d) => d?.weight != null)
  return !!p?.onboardedAt && (!p.height || !weighed)
}

/**
 * Whether sync may send more than consent records: only once the health consent screen is
 * answered (CLAUDE.md: nothing syncs to the cloud without it). An existing user's "Not now" pause
 * (behind ONBOARDING_ENABLED: screens/onboarding/Consent) doesn't count: until they answer,
 * everything stays on this device. pushDirty's held-fields path (HealthPause) is kept, and
 * tested, for if Benn and compliance decide a pause may sync the rest (it doesn't run today).
 * pushDirty also waits for the latest health record to reach the server.
 */
export function consentLetsSync(s: PersistedState): boolean {
  // a yes at the current version. A "Not now" or a withdrawal keeps the whole log on this device:
  // food and workout logs are treated as health data too (docs/compliance/README.md)
  const r = latestConsent(s, 'health')
  return !!r && r.granted && r.version === CONSENT_VERSIONS.health
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
 * What withdrawing health consent clears (plan §8 names weight, readiness, sleep, stress, mood,
 * the wellbeing outcome and limitations as health data; Benn and compliance, Sept 2026, add the
 * rest of the onboarding answers):
 * - every day's weigh-in (`day.weight`) and check-in (`day.checkin`: mood, hunger, sleep, stress,
 *   energy, soreness, note)
 * - `profile.weight` (Profile's fallback weight) and `profile.bodyFat`
 * - the onboarding answers: the screener outcomes (`profile.outcomes`: readiness, medical,
 *   wellbeing, the sleep/stress baseline), the pregnancy flag and when it was asked, "your why"
 *   (`profile.motivations`), body details (`profile.height`, `profile.sexAnswer`), daily movement
 *   and the multiplier it set (`profile.movement`, `profile.activityMult`, with `activityLevel` back
 *   to the default), the deficit choice, and the food steps up a wellbeing answer led to
 *   (`profile.foodOptIn`, Onboarding 9: they'd say which answer was given)
 * - the health-derived reasons in generated workouts and plans (healthWhy: body areas, the lately
 *   baseline, set feel, recovery, readiness, wellbeing …), in `routines` and `training_plans`
 * - every training preference (`profile.training.*`: body areas, limitations note, experience,
 *   days, weekdays, minutes, place, kit, what they enjoy, likes and dislikes)
 * Age is a plan input and the one answer onboarding requires; it's kept (PENDING Benn / legal
 * review), as is the legacy `sex` field the older screens read ('M' | 'F').
 */
export const HEALTH_FIELDS = [
  'day.weight', 'day.checkin', 'profile.weight', 'profile.bodyFat', 'profile.height', 'profile.sexAnswer', 'profile.movement',
  'profile.activityMult', 'profile.activityLevel', 'profile.outcomes', 'profile.pregnancy', 'profile.motivations', 'profile.deficitChosen', 'profile.foodOptIn', 'profile.training',
] as const

export interface HealthDataSummary {
  weighIns: number
  checkins: number
  /** body details and onboarding answers on the profile */
  profileFields: number
  /** training preferences answered (body areas, days, kit, likes …) */
  trainingPrefs: number
}

/** The profile's health fields (HEALTH_FIELDS), cleared on withdrawal. `height` is set to null (it's required). */
const PROFILE_HEALTH: (keyof Profile)[] = ['weight', 'bodyFat', 'height', 'sexAnswer', 'movement', 'activityMult', 'outcomes', 'pregnancy', 'motivations', 'deficitChosen', 'foodOptIn']
/** the per-field merge stamps of what a withdrawal clears, so the clear wins over older copies elsewhere */
const KEPT_ON_WITHDRAWAL = ['name', 'age', 'sex', 'units', 'goal', 'gentle', 'onboardedAt']
const CLEARED_STAMPS = MERGED_FIELDS.filter((f) => !KEPT_ON_WITHDRAWAL.includes(f))

/** A profile patch without its health fields (saved while health consent is withdrawn). */
export function withoutHealth<P extends Partial<Profile>>(patch: P): P {
  const out = { ...patch }
  for (const k of PROFILE_HEALTH) delete out[k]
  delete out.training
  return out
}

/** How much a withdrawal would clear, for the confirm step. */
export function healthDataSummary(s: PersistedState): HealthDataSummary {
  const days = Object.values(s.days || {}) as DayLog[]
  const t = s.profile?.training
  return {
    weighIns: days.filter((d) => d && d.weight != null).length,
    checkins: days.filter((d) => d && d.checkin).length,
    profileFields: PROFILE_HEALTH.filter((k) => s.profile?.[k] != null).length,
    trainingPrefs: Object.values(t ?? {}).filter((v) => v != null && !(Array.isArray(v) && !v.length) && v !== '').length,
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
    for (const k of PROFILE_HEALTH) {
      if (p[k] == null) continue
      if (k === 'height') p.height = null; else delete p[k]
      // the multiplier came from daily movement: the activity level derived from it goes with it
      if (k === 'activityMult') p.activityLevel = 'light'
      settings = true
    }
    if (p.training && Object.keys(p.training).length) { p.training = {}; settings = true }
    // the per-field merge (sync) must not bring an older answer back from another copy
    if (settings) {
      const st = { ...p.answeredAt }
      for (const f of CLEARED_STAMPS) st[f] = u
      p.answeredAt = st
    }
  }
  if (settings) { meta.settings = { u, dirty: true }; changed = true }
  // generated plans' reasons that came from health answers (areas, the lately baseline, how sets
  // felt, recovery, readiness, wellbeing …) go too, from every workout and plan, marked to sync
  // so the server copy is cleaned
  const strip = (list: Why[] | undefined): Why[] | undefined => list?.filter((w) => !healthWhy(w))
  for (const r of s.routines || []) {
    let touched = false
    const why = strip(r.why)
    if (r.why && why!.length !== r.why.length) { r.why = why; touched = true }
    for (const b of r.blocks || []) for (const sl of b.slots || []) {
      const w = strip(sl.why)
      if (sl.why && w!.length !== sl.why.length) { sl.why = w; touched = true }
    }
    if (touched) { r._dirty = true; r._u = u; changed = true }
  }
  for (const pl of s.trainingPlans || []) {
    const w = strip(pl.why)
    if (pl.why && w!.length !== pl.why.length) { pl.why = w; pl._dirty = true; pl._u = u; changed = true }
  }
  return changed
}

/** Why codes and input fields that carry health answers (engine §3.6 traces). */
const HEALTH_WHY_CODES: WhyCode[] = ['body-area', 'baseline', 'feel', 'recovery']
const HEALTH_WHY_FIELDS = ['bodyAreas', 'readiness', 'lately', 'wellbeing', 'gentle', 'gentleStart', 'deficit']
/** A reason derived from health data: stripped on withdrawal. */
export const healthWhy = (w: Why): boolean => HEALTH_WHY_CODES.includes(w.code) || (!!w.field && HEALTH_WHY_FIELDS.includes(w.field))

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
  // an unfinished onboarding draft on this phone holds health answers too (register item 35)
  clearDraft()
  stripResumeCopy(log)
  log.healthCleared = r.id
  return true
}

/** The kept copy from a resume holds full days and a profile: after a withdrawal, not their health fields. */
function stripResumeCopy(log: ConsentLog): void {
  const c = log.resumeCopy
  if (!c) return
  for (const d of Object.values(c.days || {})) { if (d) { d.weight = null; d.checkin = null } }
  if (c.settings?.profile && typeof c.settings.profile === 'object') c.settings.profile = withProfileHealth(c.settings.profile as Partial<Profile>, profileHealth(null))
}

/**
 * The account clear this device still owes: the latest health answer is a no that has reached the
 * server, and this device hasn't seen its clear done. Keyed on the withdrawal record, so a
 * withdrawal made on any device (or on an older app version) is cleared once it's seen here.
 */
export function pendingCloudClear(s: PersistedState): ConsentRecord | null {
  const r = latestConsent(s, 'health')
  return r && !r.granted && !r._dirty && s.consents?.cloudClearedFor !== r.id ? r : null
}

/**
 * The latest health answer is a yes that follows a withdrawal, and this device hasn't yet marked
 * its log to upload for it: the account's copy was (or is being) deleted, so all of it goes up.
 */
export function needsReupload(s: PersistedState): ConsentRecord | null {
  const recs = (s.consents?.records || []).filter((r) => r.type === 'health').sort((a, b) => effectiveAt(a) - effectiveAt(b))
  const last = recs[recs.length - 1]
  if (!last?.granted || s.consents?.reuploadedFor === last.id) return null
  const decline = [...recs].reverse().find((r) => !r.granted)
  // a first yes, given here or on another phone: the account's copy may have been deleted after
  // the pre-consent hold (deletion day, UNCONSENTED_DELETION), so a phone with a log here uploads all of it
  if (!decline) {
    // a first yes: only on a phone that hasn't synced since it (one that has, has nothing deleted)
    if (recs.length !== 1 || !hasExistingData(s)) return null
    const pulled = s._meta?.lastPull ? Date.parse(s._meta.lastPull) : NaN
    if (pulled > effectiveAt(last)) return null
  }
  return last
}

/** Whether the pre-consent deletion day (UNCONSENTED_DELETION) has come: the copy then says it's done. */
export function unconsentedDeleted(now = Date.now()): boolean {
  return now >= Date.parse(UNCONSENTED_DELETION.iso + 'T00:00:00Z')
}

/** The line about an account's pre-consent copy, for someone with no answer yet. */
export function unconsentedCopyLine(now = Date.now()): string {
  return unconsentedDeleted(now)
    ? 'What was in your account from before has been deleted; your phone keeps its copy.'
    : `What’s in your account from before is deleted on ${UNCONSENTED_DELETION.short} unless you agree; your phone keeps its copy.`
}

/**
 * Everything on this device uploads on the next sync. What was already in sync here is marked
 * `reup`: it only uploads where the server doesn't have it (settleResume), so it can't replace a
 * newer version from another device.
 */
function markAllDirty(s: PersistedState, meta: SyncMeta): void {
  const u = nowIso()
  for (const d of Object.keys(s.days || {})) {
    const m = meta.days[d]
    if (!m?.dirty) meta.days[d] = { u: m?.u ?? u, dirty: true, reup: true }
  }
  if (!meta.settings.dirty) meta.settings = { ...meta.settings, dirty: true, reup: true }
  // a record's tag is its edit time then: an edit before the upload changes `_u`, and it then
  // uploads as this phone's (settleResume)
  for (const x of [...(s.customFoods || []), ...(s.recipes || []), ...(s.routines || []), ...(s.trainingPlans || [])] as { _dirty?: boolean; _u?: string; _reup?: string }[]) {
    if (!x._dirty) { x._u ??= u; x._dirty = true; x._reup = x._u }
  }
}

/** Mark the whole log to upload after a yes that follows a withdrawal, or a first yes (needsReupload). */
export function markReupload(s: PersistedState, meta: SyncMeta, yes: ConsentRecord): void {
  const log = consentLog(s)
  markAllDirty(s, meta)
  // rows another device uploaded since the withdrawal win over this device's (settleResume)
  const decline = (log.records || []).filter((r) => r.type === 'health' && !r.granted).sort((a, b) => effectiveAt(b) - effectiveAt(a))[0]
  setResumeFrom(s, decline?.at ?? nowIso())
  log.reuploadedFor = yes.id
}

/**
 * Withdraw consent for a type. Health also clears the health data on this device (and, through
 * sync, the server) and the unfinished onboarding draft, and applies once, as above.
 */
export function withdraw(s: PersistedState, meta: SyncMeta, type: ConsentType): ConsentRecord {
  const rec = recordConsent(s, type, false)
  if (type === 'health') {
    clearHealthData(s, meta)
    // an unfinished onboarding draft on this phone holds health answers too (register item 35)
    clearDraft()
    const log = consentLog(s)
    log.healthCleared = rec.id
    // nothing is held back any more: the whole log is now this device's only
    delete log.healthPause
    delete log.healthResume
    delete log.resumeFrom
    delete log.resumeExact
    stripResumeCopy(log)
    // the account's copy of the log is deleted by the next sync (pendingCloudClear), once this
    // withdrawal has reached the server
  }
  return rec
}

/**
 * Where a resume counts other devices' changes from (settleResume). This phone's own last pull
 * whenever it has one (the newest server time it saw): everything it uploaded before that is in
 * that pull, so only a row changed after it can be another device's. `updated_at` can't tell this phone's own uploads apart, so the
 * time of a pause or a withdrawal would take this phone's own recent syncs for another device's.
 * Without a pull, that time is all there is (with the clock margin).
 */
function setResumeFrom(s: PersistedState, fallback: string | undefined): void {
  const log = consentLog(s)
  if (log.resumeFrom) return
  const server = s._meta?.lastPullServer, pulled = s._meta?.lastPull
  if (server) { log.resumeFrom = server; log.resumeExact = true }
  // a pull from before the server's time was kept (an older version): this phone's clock, with
  // room for it running slow, so its own uploads never look like another device's. Accepted
  // limits (ship-critic, 28 Sept), fading once everyone has pulled on this version: a clock over
  // 5 minutes slow can still count its own uploads as another device's (this phone's version is
  // kept to download), and another device's edit in the 5 minutes after this pull loses to this
  // phone's
  else if (pulled && !isNaN(Date.parse(pulled))) { log.resumeFrom = new Date(Date.parse(pulled) + OWN_CLOCK_MS).toISOString(); log.resumeExact = true }
  else if (fallback) { log.resumeFrom = fallback; delete log.resumeExact }
}
const OWN_CLOCK_MS = 5 * 60_000

/** A yes that ends a pause: rows another device changed since this phone last synced win. */
export function resumeAfterYes(s: PersistedState): void {
  const log = consentLog(s)
  if (log.healthPause?.at) setResumeFrom(s, log.healthPause.at)
}

/**
 * Agree to keeping health data. A pause ends: what was held back on this device is marked to
 * upload (the days and settings pushed without their health fields while paused). A first yes
 * from someone with a log here uploads all of it on the next sync (needsReupload).
 */
export function grantHealth(s: PersistedState, meta: SyncMeta): ConsentRecord {
  resumeAfterYes(s)
  const rec = recordConsent(s, 'health', true)
  resumeHealthSync(s, meta)
  return rec
}

/* ---------------- existing users: the one-time sheet and "Not now" ---------------- */

/**
 * The live consent screen (screens/legal/ConsentScreen.tsx) is due: no answer yet, and either no
 * "Not now" here, or the one re-ask 2 weeks after it has come round. A "Not now" keeps the whole
 * log on this phone (consentLetsSync stays false), so it's only offered to someone with data here.
 */
export function liveConsentDue(s: PersistedState, now = Date.now()): boolean {
  if (healthConsentAnswered(s)) return false
  return !healthSyncPaused(s) || existingConsentDue(s, now)
}

/** Whether this device's health data is held back from sync: "Not now", and no answer since. */
export function healthSyncPaused(s: PersistedState): boolean {
  return !!s.consents?.healthPause && !latestConsent(s, 'health')
}

/** Someone who used Tali before consent was asked (anything logged or saved on this device). */
export function hasExistingData(s: PersistedState): boolean {
  return Object.values(s.days || {}).some((d) => d && ((d.foods || []).length > 0 || d.weight != null || !!d.checkin || !!d.workout || (d.sessions || []).length > 0)) ||
    (s.customFoods || []).length > 0 || (s.recipes || []).length > 0 || (s.routines || []).length > 0
}

/**
 * The existing-user health consent sheet is due: no answer on record, they have data here, and
 * either they haven't seen it, or said "Not now" 2 weeks ago and haven't been asked again.
 */
export function existingConsentDue(s: PersistedState, now = Date.now()): boolean {
  if (latestConsent(s, 'health') || !hasExistingData(s)) return false
  const p = s.consents?.healthPause
  if (!p) return true
  return !p.reasked && now - Date.parse(p.at) >= REASK_AFTER_MS
}

/**
 * "Not now" on the existing-user sheet: pause the health data's sync (the first time), or mark
 * the one re-ask as answered. Nothing is recorded as a withdrawal and nothing is cleared.
 */
export function pauseHealthSync(s: PersistedState, at = nowIso()): void {
  const log = consentLog(s)
  if (log.healthPause) log.healthPause.reasked = true
  else log.healthPause = { at }
}

/** Mark what was held back while paused to upload, and end the pause. Returns whether it did. */
export function resumeHealthSync(s: PersistedState, meta: SyncMeta): boolean {
  const log = consentLog(s)
  const p = log.healthPause
  if (!p) return false
  const u = nowIso()
  // the server's values from when each was held go with them, so sync can check the server
  // hasn't moved on (another device) before uploading this device's
  const r: HealthHeld = log.healthResume || {}
  for (const [d, snap] of Object.entries(p.days || {})) {
    if (!s.days?.[d]) continue
    meta.days[d] = { u, dirty: true }
    ;(r.days ||= {})[d] ??= snap
  }
  if (p.profile) { meta.settings = { u, dirty: true }; r.profile ??= p.profile }
  if (r.days || r.profile) log.healthResume = r
  delete log.healthPause
  return true
}

/** Same health values? Key order doesn't matter (Postgres jsonb reorders keys); undefined is null. */
export function sameHealth(a: unknown, b: unknown): boolean {
  const norm = (x: unknown): unknown => x === undefined || x === null ? null
    : Array.isArray(x) ? x.map(norm)
    : typeof x === 'object' ? Object.fromEntries(Object.keys(x as object).sort().map((k) => [k, norm((x as Record<string, unknown>)[k])] as const).filter(([, v]) => v !== null))
    : x
  return JSON.stringify(norm(a)) === JSON.stringify(norm(b))
}

/**
 * After a pull: an answer given on another device ends this device's pause. A yes uploads what
 * was held here; a no (its clear runs through applyHealthWithdrawal) drops the pause.
 */
export function settleHealthPause(s: PersistedState, meta: SyncMeta): boolean {
  const r = latestConsent(s, 'health')
  if (!r || !s.consents?.healthPause) return false
  if (r.granted) return resumeHealthSync(s, meta)
  delete s.consents.healthPause
  return true
}

/**
 * Sync notes a day or the settings as uploaded without their health fields, with the server's
 * values at that moment. The first snapshot is kept: nothing on this device changes the server's
 * health values while paused, so a later difference means another device changed them.
 */
export function holdHealth(s: PersistedState, what: { day?: string; server?: DaySnap; profile?: ProfileSnap }): void {
  const p = s.consents?.healthPause
  if (!p) return
  if (what.day) (p.days ||= {})[what.day] ??= what.server ?? { weight: null, checkin: null }
  if (what.profile) p.profile ??= what.profile
}

/** The health fields of a profile, for keeping the server's (or this device's) side as it is. */
export function profileHealth(p: Partial<Profile> | null | undefined): ProfileSnap {
  const t = p?.training
  return { weight: p?.weight, bodyFat: p?.bodyFat, limitations: t?.limitations, limitationsNote: t?.limitationsNote }
}

/** A copy of `p` with its health fields replaced by `h` (undefined ones removed). */
export function withProfileHealth<P extends Partial<Profile>>(p: P, h: ReturnType<typeof profileHealth>): P {
  const out = { ...p } as P & Record<string, unknown>
  const set = (o: Record<string, unknown>, k: string, v: unknown) => { if (v === undefined || v === null) delete o[k]; else o[k] = v }
  set(out, 'weight', h.weight)
  set(out, 'bodyFat', h.bodyFat)
  if (out.training || h.limitations !== undefined || h.limitationsNote !== undefined) {
    const t = { ...(out.training || {}) } as Record<string, unknown>
    set(t, 'limitations', h.limitations)
    set(t, 'limitationsNote', h.limitationsNote)
    out.training = t as P['training']
  }
  return out
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
  let rows: { id: string; type: string; version: string; granted: boolean; recorded_at: string; created_at?: string }[]
  try {
    rows = await sbGet('/consents?user_id=eq.' + getUid() + '&select=id,type,version,granted,recorded_at,created_at')
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) return // no table yet
    throw e
  }
  const log = consentLog(s)
  const have = new Map(log.records.map((r) => [r.id, r]))
  const incoming = cleanConsents({ records: rows.map((x) => ({ id: x.id, type: x.type, version: x.version, granted: x.granted, at: x.recorded_at, arrived: x.created_at })) }).records
  for (const r of incoming) {
    const mine = have.get(r.id)
    if (mine) {
      delete mine._dirty // it's on the server
      if (r.arrived) mine.arrived = r.arrived
    } else log.records.push(r)
  }
}


/* ---------------- export before withdrawing health consent ---------------- */

/** Copy for the withdrawal step in Profile's Health data sheet (Benn approved both halves, Sept 2026). */
export const HEALTH_WITHDRAW_PROMPT = 'Tali will stop syncing your log and delete it from your account, so it stays only on your phones. Your weigh-ins, check-ins, body details and training preferences are removed from them too. Download a copy first?'

/**
 * The backup to offer before a health withdrawal: the whole device state as the JSON backup
 * (the same format exportBackup writes and Profile imports), taken before anything is cleared.
 * Food logs, workouts, age, sex and height stay after the withdrawal either way.
 */
export function healthWithdrawalBackup(s: PersistedState): { json: string; summary: HealthDataSummary } {
  return { json: JSON.stringify(s), summary: healthDataSummary(s) }
}
