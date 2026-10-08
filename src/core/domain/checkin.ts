import type { CheckIn, IfThenPlan, MindPrefs, NotifyKind, Pillar, Profile, SkillId, SleepBand, SleepNight, SleepSource } from '@/core/types'

/**
 * The day's check-in as one record (wellbeing plan §4.3, §9; security-data M5): the answers
 * (mood, hunger, sleep, stress, energy, soreness, note) plus the nested Mind fields, `night`,
 * `skills` and `thing`, which ride the same `supps._checkin` on `day_logs` (no migration).
 * Keys only, never text, in `skills` and `thing`. Pure: no clock, no storage.
 *
 * Validation checks shape, never the known lists below (security-data R1): a newer app version's
 * source, band, skill or reminder type survives a load on an older install unchanged, so syncing it
 * back never deletes it. Whatever displays these fields filters them against the lists.
 */

export const SLEEP_SOURCES: readonly SleepSource[] = ['self', 'healthkit', 'health-connect']
export const SLEEP_BANDS: readonly SleepBand[] = ['lt5', '5-6', '6-7', '7-8', '8+']
export const SKILL_IDS: readonly SkillId[] = ['reset', 'wind-down', 'unload', 'outside']
export const PILLARS: readonly Pillar[] = ['mind', 'food', 'move']
export const NOTIFY_KINDS: readonly NotifyKind[] = ['checkin', 'wind-down', 'plan']

/** the scored answers: 0, absent or undefined means not answered */
const SCORES = ['mood', 'hunger', 'sleep', 'stress', 'energy', 'sore'] as const
/** required by the type (older app versions read them as numbers): kept as 0 when cleared */
const REQUIRED = ['mood', 'hunger'] as const
/** a day never holds more skill uses than this (a malformed backup can't grow the row) */
export const MAX_SKILLS_PER_DAY = 50

type Obj = Record<string, unknown>
const isObj = (x: unknown): x is Obj => !!x && typeof x === 'object' && !Array.isArray(x)
const isTime = (x: unknown): x is string => typeof x === 'string' && x.length <= 40 && !isNaN(Date.parse(x))
/** local "HH:MM", 00:00 to 23:59 */
export const isHHMM = (x: unknown): x is string => typeof x === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(x)
/** a key from core/data/skills.ts THINGS: lower-case words and dashes, never free text */
export const isThingKey = (x: unknown): x is string => typeof x === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(x) && x.length <= 40

/** Whether this check-in holds anything: an answer, a note, a night, a skill used or a thing. */
export function hasCheckinContent(c: Partial<CheckIn> | null | undefined): boolean {
  if (!c) return false
  if (SCORES.some((k) => !!c[k])) return true
  if (typeof c.note === 'string' && c.note.trim()) return true
  return !!c.night || (Array.isArray(c.skills) && c.skills.length > 0) || !!c.thing
}

/** The check-in, or null when it holds nothing (the "empty check-in becomes null" rule). */
export function checkinOrNull(c: CheckIn | null | undefined): CheckIn | null {
  return c && hasCheckinContent(c) ? c : null
}

/**
 * `existing` with `patch` merged in (a new object; neither input changes). A key the patch leaves
 * out stays as it was; a key it sets to 0, undefined, null, '' (or an empty `skills` list)
 * removes that field (mood and hunger go back to 0, which the type requires). So logging a skill
 * never wipes mood (plan §9). `skills` in a patch is the whole list; `withSkill` adds one.
 * Run the result through `checkinOrNull` before saving.
 */
export function mergeCheckin(existing: CheckIn | null | undefined, patch: Partial<CheckIn>): CheckIn {
  const out = { ...(existing || {}) } as CheckIn & Obj
  for (const [k, v] of Object.entries(patch) as [string, unknown][]) {
    const empty = v === undefined || v === null || v === 0 || v === '' || (Array.isArray(v) && !v.length)
    if (empty) { delete out[k]; continue }
    out[k] = structuredClone(v)
  }
  for (const k of REQUIRED) if (typeof out[k] !== 'number') out[k] = 0
  return out
}

/** A patch that adds one skill use (id and time) to the day's list, keeping what's there. */
export function withSkill(existing: CheckIn | null | undefined, id: SkillId, at: string): Partial<CheckIn> {
  const list = Array.isArray(existing?.skills) ? existing!.skills : []
  return { skills: [...list, { id, at }].slice(-MAX_SKILLS_PER_DAY) }
}

function validNight(x: unknown): SleepNight | undefined {
  if (!isObj(x) || !isThingKey(x.source) || !isTime(x.t)) return undefined
  const n = { source: x.source as SleepSource } as SleepNight
  if (SLEEP_BANDS.includes(x.band as SleepBand) || isThingKey(x.band)) n.band = x.band as SleepBand
  if (typeof x.asleepMin === 'number' && Number.isFinite(x.asleepMin) && x.asleepMin >= 0 && x.asleepMin <= 1440) n.asleepMin = Math.round(x.asleepMin)
  if (isHHMM(x.bedAt)) n.bedAt = x.bedAt
  if (isHHMM(x.wakeAt)) n.wakeAt = x.wakeAt
  if (typeof x.ext === 'string' && x.ext && x.ext.length <= 128) n.ext = x.ext
  n.t = x.t
  // a night with nothing in it is no night
  return n.band || n.asleepMin != null || n.bedAt || n.wakeAt ? n : undefined
}

/**
 * A stored or pulled check-in made safe to read (loadStateFrom every day, sync on pull): anything
 * that isn't an object becomes null; a malformed night (a source or band that isn't key-shaped or known, a
 * bed or wake time that isn't "HH:MM"), skill uses without a key-shaped id and a time, and a
 * malformed `thing` are dropped, never guessed. Key-shaped values a later version added are kept. The answers themselves are
 * left as they were, so older logs read exactly as before. Mutates and returns `x`.
 */
export function validCheckin(x: unknown): CheckIn | null {
  if (!isObj(x)) return null
  const c = x as CheckIn & Obj
  if (c.night !== undefined) {
    const n = validNight(c.night)
    if (n) c.night = n; else delete c.night
  }
  if (c.skills !== undefined) {
    const list = (Array.isArray(c.skills) ? c.skills : [])
      .filter((s): s is { id: SkillId; at: string } => isObj(s) && isThingKey(s.id) && isTime(s.at))
      .map((s) => ({ id: s.id, at: s.at }))
      .slice(-MAX_SKILLS_PER_DAY)
    if (list.length) c.skills = list; else delete c.skills
  }
  if (c.thing !== undefined) {
    const t = c.thing as unknown
    if (isObj(t) && isThingKey(t.key)) c.thing = { key: t.key, ...(isTime(t.done) ? { done: t.done } : {}) }
    else delete c.thing
  }
  return c
}

/** the `profile.mind` settings this version knows; any other key is a later version's and is kept */
const MIND_KEYS = ['off', 'asks', 'wakeAt', 'windDownAt', 'notify', 'halved', 'tz', 'lockNames']

/**
 * `profile.mind` made safe to read (loadStateFrom, sync on pull): bad values of the known settings
 * are dropped; `notify` and `halved` keep any key-shaped reminder type; a key this version doesn't
 * know is copied through unchanged (a later version's setting survives). `off` never holds all
 * three pillars (all off means all on: it's dropped). Returns undefined when nothing is left.
 */
export function validMindPrefs(x: unknown): MindPrefs | undefined {
  if (!isObj(x)) return undefined
  const m = {} as MindPrefs & Obj
  if (Array.isArray(x.off)) {
    const off = PILLARS.filter((p) => (x.off as unknown[]).includes(p))
    if (off.length && off.length < PILLARS.length) m.off = off
  }
  if (x.asks === 'usual' || x.asks === 'fewer') m.asks = x.asks
  if (isHHMM(x.wakeAt)) m.wakeAt = x.wakeAt
  if (isHHMM(x.windDownAt)) m.windDownAt = x.windDownAt
  if (isObj(x.notify)) {
    const n: Partial<Record<NotifyKind, boolean>> = {}
    for (const [k, v] of Object.entries(x.notify)) if (isThingKey(k) && typeof v === 'boolean') n[k as NotifyKind] = v
    if (Object.keys(n).length) m.notify = n
  }
  if (isObj(x.halved)) {
    const h: Partial<Record<NotifyKind, string>> = {}
    for (const [k, v] of Object.entries(x.halved)) if (isThingKey(k) && isTime(v)) h[k as NotifyKind] = v
    if (Object.keys(h).length) m.halved = h
  }
  if (typeof x.tz === 'string' && x.tz.length <= 64 && /^[A-Za-z][A-Za-z0-9_+\-]*(\/[A-Za-z0-9_+\-]+)*$/.test(x.tz)) m.tz = x.tz
  if (typeof x.lockNames === 'boolean') m.lockNames = x.lockNames
  for (const [k, v] of Object.entries(x)) if (!MIND_KEYS.includes(k) && v !== undefined) m[k] = v
  return Object.keys(m).length ? m : undefined
}

/** A plan whose `kind` marks it as a Mind plan (health data by inference: security-data M5). */
export const isKindPlan = (p: Pick<IfThenPlan, 'kind'> | null | undefined): boolean => !!p && p.kind != null

/**
 * A plan's `kind` made safe to read (loadStateFrom). Absent or null: no kind. A key-shaped string
 * stays (a later version's kind still reads as a Mind-type plan, so withdrawal still clears it);
 * anything else present becomes 'mind', so it is never mistaken for an ordinary plan. Mutates.
 */
export function validPlanKind(p: IfThenPlan): void {
  const k = (p as { kind?: unknown }).kind
  if (k == null) { delete p.kind; return }
  if (!isThingKey(k)) p.kind = 'mind'
}

/**
 * A profile's Mind fields made safe to read (loadStateFrom, and every profile sync pulls from the
 * server): `mind` through validMindPrefs, each plan's `kind` through validPlanKind. Mutates and
 * returns `p`.
 */
export function cleanProfileMind<P extends Partial<Profile>>(p: P): P {
  if (!p || typeof p !== 'object') return p
  if (p.mind !== undefined) {
    const mind = validMindPrefs(p.mind)
    if (mind) p.mind = mind; else delete p.mind
  }
  if (Array.isArray(p.plans)) for (const pl of p.plans) if (pl && typeof pl === 'object') validPlanKind(pl)
  return p
}

/** The Mind prefs that are health data (cleared on withdrawal): the usual wake and wind-down times. */
export const MIND_HEALTH_KEYS = ['wakeAt', 'windDownAt'] as const satisfies readonly (keyof MindPrefs)[]
