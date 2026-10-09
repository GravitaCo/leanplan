import type { Profile } from '@/core/types'

/**
 * Per-field merge of `settings.profile` for the onboarding answers (first-run-onboarding §12).
 * Sync otherwise treats the settings row as one record (last write wins), so two devices that
 * answer different questions offline would overwrite each other. Each answer carries its own time
 * in `profile.answeredAt`; the latest time per field wins. Fields without a time keep this
 * device's value, exactly as before. Only the paths listed here are ever merged (never a path
 * taken from the data itself). Pure: no network, no clock.
 */
export const MERGED_FIELDS = [
  'name', 'age', 'height', 'weight', 'sex', 'sexAnswer', 'units', 'goal', 'motivations', 'movement',
  'outcomes.readiness', 'outcomes.medical', 'outcomes.wellbeing', 'outcomes.baseline', 'pregnancy',
  'gentle', 'deficitChosen', 'foodOptIn', 'onboardedAt', 'activityMult', 'activityLevel',
  'training.experience', 'training.movingNow', 'training.daysPerWeek', 'training.weekdays', 'training.minutesPerSession', 'training.sessionRange',
  'training.place', 'training.equipment', 'training.modalities', 'training.cardioPrefs', 'training.limitations',
  // Mind settings (wellbeing Phase 1; security-data M6): `notify` and `halved` merge as whole objects
  'mind.off', 'mind.asks', 'mind.wakeAt', 'mind.windDownAt', 'mind.notify', 'mind.halved', 'mind.tz',
] as const
export type MergedField = (typeof MERGED_FIELDS)[number]

type Obj = Record<string, unknown>
const isObj = (x: unknown): x is Obj => !!x && typeof x === 'object' && !Array.isArray(x)

export function getField(p: Partial<Profile> | null | undefined, path: MergedField): unknown {
  const [a, b] = path.split('.')
  const v = (p as Obj | null | undefined)?.[a]
  return b ? (isObj(v) ? v[b] : undefined) : v
}

/** Set (or, with undefined, remove) a field; creates the parent object for a dotted path. */
export function setField(p: Partial<Profile>, path: MergedField, value: unknown): void {
  const o = p as Obj
  const [a, b] = path.split('.')
  if (!b) { if (value === undefined) delete o[a]; else o[a] = value; return }
  if (value === undefined) { if (isObj(o[a])) delete (o[a] as Obj)[b]; return }
  if (!isObj(o[a])) o[a] = {}
  ;(o[a] as Obj)[b] = value
}

const time = (x: unknown): number => (typeof x === 'string' ? Date.parse(x) : NaN)

/**
 * `local` with every stamped field the server has newer taken from the server, and the stamps
 * combined (latest per field). Returns `local` itself when neither side has stamps.
 */
export function mergeProfiles(local: Profile, server: Partial<Profile> | null | undefined): Profile {
  const ls = isObj(local.answeredAt) ? local.answeredAt : {}
  const ss = server && isObj(server.answeredAt) ? (server.answeredAt as Record<string, string>) : {}
  if (!Object.keys(ls).length && !Object.keys(ss).length) return local
  const out = structuredClone(local) as Profile
  const stamps: Record<string, string> = {}
  for (const f of MERGED_FIELDS) {
    const l = time(ls[f]), s = time(ss[f])
    if (!isNaN(s) && (isNaN(l) || s > l)) {
      setField(out, f, structuredClone(getField(server, f)))
      stamps[f] = ss[f]
    } else if (!isNaN(l)) stamps[f] = ls[f]
  }
  out.answeredAt = stamps
  return out
}

/** Stamp these fields as answered now (the caller has just set them). */
export function stampFields(p: Profile, fields: readonly MergedField[], at: string): void {
  if (!fields.length) return
  const s = { ...(isObj(p.answeredAt) ? p.answeredAt : {}) }
  for (const f of fields) s[f] = at
  p.answeredAt = s
}
