/* WP1: the synced Mind data model (check-in night, skills, thing; profile.mind; plan kind), its
   validation, merge and withdrawal clearing. Run from scripts/test-wellbeing.ts; returns the
   number of failures. */
import type { CheckIn, IfThenPlan, Profile } from '@/core/types'
import { checkinOrNull, hasCheckinContent, mergeCheckin, validCheckin, validMindPrefs, withSkill, isKindPlan, MAX_SKILLS_PER_DAY } from '@/core/domain/checkin'
import { mergeProfiles, stampFields, MERGED_FIELDS } from '@/core/domain/profileMerge'
import { clearHealthData, HEALTH_FIELDS, healthDataSummary, recordConsent, withoutHealth, withdraw } from '@/data/consent'
import { ensureMeta, loadStateFrom, stateFromBackup, type PersistedState } from '@/data/persistence'
import { pushDirty, toServerDay } from '@/data/sync'
import { LOCAL_USER } from '@/data/supabase'

type FakeServer = (rows: Record<string, any[]>, broken?: string[]) => { fetchFn: typeof fetch; calls: string[] }

const T = '2026-10-08T07:40:00.000Z'
const NIGHT = { source: 'self' as const, band: '5-6' as const, wakeAt: '06:45', t: T }
const SKILLS = [{ id: 'reset' as const, at: '2026-10-08T12:10:00.000Z' }]
const THING = { key: 'get-outside', done: '2026-10-08T13:00:00.000Z' }
const full = (): CheckIn => ({ mood: 2, hunger: 2, sleep: 1, stress: 2, energy: 1, note: 'tired', t: T, night: { ...NIGHT }, skills: SKILLS.map((x) => ({ ...x })), thing: { ...THING } })
const plan = (id: string, kind?: 'mind'): IfThenPlan => ({ id, when: 'If I wake at 3', then: 'I get up for ten minutes', created: '2026-10-01', reviews: [], ...(kind ? { kind } : {}) })

async function withFetch<T>(f: typeof fetch, run: () => Promise<T>): Promise<T> {
  const real = globalThis.fetch
  globalThis.fetch = f
  try { return await run() } finally { globalThis.fetch = real }
}

export async function dataSyncedSuite(fakeServer: FakeServer): Promise<number> {
  let bad = 0
  const report = (checks: [string, boolean][]) => {
    for (const [n, ok] of checks) { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', 'wellbeing data:', n) }
  }
  const checks: [string, boolean][] = []

  /* ---------- mergeCheckin ---------- */
  const mood = { mood: 2, hunger: 3, sleep: 1, note: 'tired', t: T } as CheckIn
  const withReset = checkinOrNull(mergeCheckin(mood, withSkill(mood, 'reset', SKILLS[0].at)))
  checks.push(['logging a skill keeps mood, sleep and the note', !!withReset && withReset.mood === 2 && withReset.sleep === 1 && withReset.note === 'tired' && withReset.skills?.length === 1 && withReset.skills[0].id === 'reset'])
  checks.push(['merge never changes its inputs', mood.skills === undefined && Object.keys(mood).length === 5])
  const second = mergeCheckin(withReset, withSkill(withReset, 'unload', T))
  checks.push(['a second skill adds to the list', second.skills?.map((x) => x.id).join() === 'reset,unload'])
  const capped = Array.from({ length: MAX_SKILLS_PER_DAY + 5 }, (_, i) => ({ id: 'reset' as const, at: new Date(Date.parse(T) + i * 60000).toISOString() }))
  checks.push(['the skill list is capped per day', (withSkill({ mood: 0, hunger: 0, skills: capped }, 'reset', T).skills || []).length === MAX_SKILLS_PER_DAY])
  const cleared = mergeCheckin(full(), { mood: 0, sleep: 0, note: '', stress: undefined })
  checks.push(['a 0, empty or undefined answer removes that field (mood back to 0)', cleared.mood === 0 && !('sleep' in cleared) && !('note' in cleared) && !('stress' in cleared) && cleared.energy === 1])
  checks.push(['the sheet patch leaves night, skills and thing alone', JSON.stringify(cleared.night) === JSON.stringify(NIGHT) && cleared.skills?.length === 1 && cleared.thing?.key === 'get-outside'])
  const sheetClear = mergeCheckin({ mood: 3, hunger: 2, sleep: 2, t: T }, { mood: 0, hunger: 0, sleep: 0, stress: 0, energy: 0, sore: 0, note: '', t: T })
  checks.push(['clearing every answer on the sheet with nothing else gives null', checkinOrNull(sheetClear) === null])
  const sheetClearSkill = mergeCheckin({ mood: 3, hunger: 2, skills: SKILLS }, { mood: 0, hunger: 0, sleep: 0, stress: 0, energy: 0, sore: 0, note: '', t: T })
  checks.push(['clearing the answers keeps a check-in that holds a skill', checkinOrNull(sheetClearSkill)?.skills?.length === 1])
  const noNight = mergeCheckin(full(), { night: undefined, skills: [], thing: undefined })
  checks.push(['a patch can remove night, skills and thing', !noNight.night && !noNight.skills && !noNight.thing && noNight.mood === 2])

  /* ---------- checkinOrNull: the "empty check-in" rule counts the new fields ---------- */
  const empty: CheckIn = { mood: 0, hunger: 0, t: T }
  checks.push(['no answers and nothing else: null', checkinOrNull(empty) === null && checkinOrNull(null) === null && checkinOrNull(undefined) === null && !hasCheckinContent({ mood: 0, hunger: 0, note: '  ' })])
  checks.push(['a night alone counts', checkinOrNull({ ...empty, night: { ...NIGHT } }) !== null])
  checks.push(['a skill alone counts', checkinOrNull({ ...empty, skills: SKILLS }) !== null])
  checks.push(['a thing alone counts', checkinOrNull({ ...empty, thing: { key: 'lunch-away' } }) !== null])
  checks.push(['an empty skills list does not count', checkinOrNull({ ...empty, skills: [] }) === null])
  checks.push(['each answer and the note still count', (['mood', 'hunger', 'sleep', 'stress', 'energy', 'sore'] as const).every((k) => checkinOrNull({ ...empty, [k]: 1 }) !== null) && checkinOrNull({ ...empty, note: 'x' }) !== null])

  /* ---------- validCheckin ---------- */
  const okC = validCheckin(full())
  checks.push(['a good check-in is kept as is', JSON.stringify(okC) === JSON.stringify(full())])
  const badBand = validCheckin({ ...full(), night: { ...NIGHT, band: '9+' } })
  checks.push(['a bad band is dropped (the night keeps its wake time)', !!badBand && badBand.night?.band === undefined && badBand.night?.wakeAt === '06:45'])
  const badWake = validCheckin({ ...full(), night: { ...NIGHT, wakeAt: '6:45am' } })
  checks.push(['a wake time that is not HH:MM is dropped', !!badWake && badWake.night?.wakeAt === undefined && badWake.night?.band === '5-6'])
  const badBoth = validCheckin({ ...full(), night: { source: 'self', band: 'lots', wakeAt: '25:00', t: T } })
  checks.push(['a night left empty goes', !!badBoth && !('night' in badBoth) && badBoth.mood === 2])
  const badSource = validCheckin({ ...full(), night: { ...NIGHT, source: 'fitbit' } })
  checks.push(['an unknown sleep source drops the night', !!badSource && !('night' in badSource)])
  const badSkills = validCheckin({ ...full(), skills: [{ id: 'reset', at: T }, { id: 'meditate', at: T }, { id: 'unload', at: 'soon' }, 'x'] })
  checks.push(['unknown skill ids and bad times are dropped', badSkills?.skills?.length === 1 && badSkills.skills[0].id === 'reset'])
  const badThing = validCheckin({ ...full(), thing: { key: 'Go for a walk with Sam', done: T } })
  checks.push(['a thing whose key is text is dropped', !!badThing && !('thing' in badThing)])
  const badDone = validCheckin({ ...full(), thing: { key: 'get-outside', done: 'yes', text: 'x' } })
  checks.push(['a bad done time and stray keys on a thing are dropped', JSON.stringify(badDone?.thing) === '{"key":"get-outside"}'])
  checks.push(['a check-in that is not an object becomes null', validCheckin('mood') === null && validCheckin([1]) === null])
  checks.push(['older check-ins read exactly as before', JSON.stringify(validCheckin({ mood: 3, hunger: 2, sleep: 0, sore: 0, note: '', t: T })) === JSON.stringify({ mood: 3, hunger: 2, sleep: 0, sore: 0, note: '', t: T })])

  /* ---------- validMindPrefs and loadStateFrom ---------- */
  const prefs = { off: ['food'], asks: 'fewer', wakeAt: '06:45', windDownAt: '22:30', notify: { checkin: true, plan: false, other: true }, halved: { checkin: T, plan: 'x' }, tz: 'Europe/London', lockNames: false, lowMoodShown: true, extra: 1 }
  checks.push(['Mind prefs: unknown keys and bad values dropped', JSON.stringify(validMindPrefs(prefs)) === JSON.stringify({ off: ['food'], asks: 'fewer', wakeAt: '06:45', windDownAt: '22:30', notify: { checkin: true, plan: false }, halved: { checkin: T }, tz: 'Europe/London', lockNames: false })])
  checks.push(['Mind prefs: all three pillars off means all on', validMindPrefs({ off: ['mind', 'food', 'move'] }) === undefined && validMindPrefs({ off: ['mind', 'sleep'] })?.off?.join() === 'mind'])
  checks.push(['Mind prefs: bad times, asks and time zone dropped', validMindPrefs({ wakeAt: '7', windDownAt: '24:00', asks: 'never', tz: 'Europe/London; drop', lockNames: 'yes' }) === undefined])
  const loaded = loadStateFrom(JSON.parse(JSON.stringify({
    days: {
      '2026-10-07': { foods: [], supps: {}, weight: null, workout: null, checkin: { ...full(), night: { ...NIGHT, band: 'x' }, skills: [{ id: 'nap', at: T }] } },
      '2026-10-08': { foods: [], supps: {}, weight: null, workout: null, checkin: 'odd' },
      '2026-10-09': { foods: [], supps: {}, weight: null, workout: null, checkin: null },
    },
    profile: { name: 'Sam', sex: 'F', age: 34, height: 170, activityLevel: 'light', supplements: [], notificationsEnabled: false, mind: prefs, plans: [plan('a'), { ...plan('b'), kind: 'mind' }, { ...plan('c'), kind: 42 }, { ...plan('d'), kind: null }] },
  })) as PersistedState)
  const d7 = loaded.days['2026-10-07'].checkin!
  checks.push(['loadStateFrom validates every check-in', d7.night?.band === undefined && d7.night?.wakeAt === '06:45' && !('skills' in d7) && d7.mood === 2 && loaded.days['2026-10-08'].checkin === null && loaded.days['2026-10-09'].checkin === null])
  checks.push(['loadStateFrom validates profile.mind', JSON.stringify(loaded.profile.mind) === JSON.stringify(validMindPrefs(prefs))])
  const kinds = (loaded.profile.plans || []).map((p) => p.kind ?? '-').join()
  checks.push(['loadStateFrom keeps a plan kind usable (a bad one reads as a Mind plan, null as none)', kinds === '-,mind,mind,-'])
  const noMind = loadStateFrom({ days: {}, profile: { name: '', sex: 'F', age: null, height: null, activityLevel: 'light', supplements: [], notificationsEnabled: false, mind: { extra: 1 } } } as unknown as PersistedState)
  checks.push(['an empty or unknown profile.mind is removed', !('mind' in noMind.profile)])

  /* ---------- merge: newer mind.* wins from either side ---------- */
  checks.push(['MERGED_FIELDS lists every Mind setting', ['mind.off', 'mind.asks', 'mind.wakeAt', 'mind.windDownAt', 'mind.notify', 'mind.halved', 'mind.tz', 'mind.lockNames'].every((f) => (MERGED_FIELDS as readonly string[]).includes(f))])
  const base = (): Profile => ({ name: 'Sam', sex: 'F', age: 34, height: 170, activityLevel: 'light', supplements: [], notificationsEnabled: false })
  const local = base(); local.mind = { asks: 'fewer', wakeAt: '07:00', notify: { checkin: true, plan: true }, tz: 'Europe/London' }
  stampFields(local, ['mind.asks', 'mind.wakeAt', 'mind.notify', 'mind.tz'], '2026-10-08T10:00:00.000Z')
  const server = base(); server.mind = { asks: 'usual', wakeAt: '06:30', notify: { checkin: false }, off: ['food'], tz: 'Europe/Paris' }
  stampFields(server, ['mind.asks', 'mind.wakeAt', 'mind.notify', 'mind.off'], '2026-10-08T09:00:00.000Z')
  stampFields(server, ['mind.asks', 'mind.notify'], '2026-10-08T11:00:00.000Z')
  const merged = mergeProfiles(local, server)
  checks.push(['the server side wins where it is newer (asks, notify as a whole object)', merged.mind?.asks === 'usual' && JSON.stringify(merged.mind?.notify) === '{"checkin":false}'])
  checks.push(['this side wins where it is newer (wake time)', merged.mind?.wakeAt === '07:00'])
  checks.push(['a field stamped only on the server comes over; an unstamped one stays local', merged.mind?.off?.join() === 'food' && merged.mind?.tz === 'Europe/London'])
  checks.push(['the stamps combine, latest per field', merged.answeredAt?.['mind.asks'] === '2026-10-08T11:00:00.000Z' && merged.answeredAt?.['mind.wakeAt'] === '2026-10-08T10:00:00.000Z'])

  /* ---------- withdrawal: clearHealthData, withoutHealth, healthDataSummary ---------- */
  checks.push(['HEALTH_FIELDS names the Mind health fields', ['profile.mind.wakeAt', 'profile.mind.windDownAt', 'profile.plans(kind)'].every((f) => (HEALTH_FIELDS as readonly string[]).includes(f))])
  const s = stateFromBackup({ days: { '2026-10-08': { foods: [], supps: {}, weight: null, workout: null, checkin: full() } } } as never)
  s.profile.mind = { off: ['food'], asks: 'fewer', wakeAt: '06:45', windDownAt: '22:30', notify: { checkin: true }, halved: { checkin: T }, tz: 'Europe/London', lockNames: true }
  s.profile.plans = [plan('p1'), plan('p2', 'mind'), plan('p3', 'mind')]
  const sum = healthDataSummary(s)
  checks.push(['healthDataSummary counts Mind plans, the Mind times and the check-in', sum.mindPlans === 2 && sum.mindTimes === 2 && sum.checkins === 1])
  const meta = ensureMeta(s, false)
  Object.values(meta.days).forEach((x) => (x.dirty = false)); meta.settings.dirty = false
  const changed = clearHealthData(s, meta)
  const mind = s.profile.mind!
  checks.push(['clearHealthData clears the wake and wind-down times and Mind plans', changed && mind.wakeAt === undefined && mind.windDownAt === undefined && (s.profile.plans || []).map((p) => p.id).join() === 'p1'])
  checks.push(['and keeps pillars, asks, notify, halved, time zone and lock-screen names', mind.off?.join() === 'food' && mind.asks === 'fewer' && mind.notify?.checkin === true && mind.halved?.checkin === T && mind.tz === 'Europe/London' && mind.lockNames === true])
  checks.push(['the check-in goes whole (night, skills, thing with it), marked to sync', s.days['2026-10-08'].checkin === null && meta.days['2026-10-08'].dirty && meta.settings.dirty])
  const st = s.profile.answeredAt || {}
  checks.push(['the cleared Mind times are stamped so an older copy cannot bring them back; kept prefs are not', !!st['mind.wakeAt'] && !!st['mind.windDownAt'] && !st['mind.off'] && !st['mind.asks'] && !st['mind.notify'] && !st['mind.halved'] && !st['mind.tz'] && !st['mind.lockNames']])
  const after = healthDataSummary(s)
  checks.push(['nothing left to count after', after.mindPlans === 0 && after.mindTimes === 0 && after.checkins === 0])
  const patch = withoutHealth({ mind: { asks: 'fewer', wakeAt: '06:45', windDownAt: '22:30', tz: 'Europe/London' }, plans: [plan('x'), plan('y', 'mind')], name: 'Sam' } as Partial<Profile>)
  checks.push(['withoutHealth strips the Mind times and Mind plans, keeps the rest', JSON.stringify(patch.mind) === '{"asks":"fewer","tz":"Europe/London"}' && patch.plans?.map((p) => p.id).join() === 'x' && patch.name === 'Sam'])
  checks.push(['isKindPlan: only plans with a kind', isKindPlan(plan('a', 'mind')) && !isKindPlan(plan('b')) && !isKindPlan(null)])

  /* ---------- sync: the nested fields ride supps._checkin ---------- */
  const s2 = stateFromBackup({ days: { '2026-10-08': { foods: [], supps: { vitd: true }, weight: 81.8, workout: null, checkin: full() } } } as never)
  const row = toServerDay(s2, '2026-10-08', LOCAL_USER) as { supps: Record<string, any> }
  const sent = row.supps._checkin
  checks.push(['toServerDay carries night, skills and thing inside supps._checkin', JSON.stringify(sent?.night) === JSON.stringify(NIGHT) && sent?.skills?.[0]?.id === 'reset' && sent?.thing?.key === 'get-outside' && row.supps.vitd === true])
  const held = toServerDay(s2, '2026-10-08', LOCAL_USER, { serverCheckin: null }) as { supps: Record<string, any> }
  checks.push(['paused: this device\'s check-in (and its Mind fields) stays home', !('_checkin' in held.supps) && !('weight' in held)])
  // withdrawn on another phone, not cleared here yet: a dirty day goes up without its check-in
  const rows: Record<string, any[]> = { settings: [], day_logs: [], custom_foods: [], recipes: [], consents: [] }
  recordConsent(s2, 'health', false)
  const m2 = ensureMeta(s2, false)
  Object.values(m2.days).forEach((x) => (x.dirty = true)); m2.settings.dirty = false
  await withFetch(fakeServer(rows).fetchFn, () => pushDirty(s2, m2))
  const up = rows.day_logs.find((r) => r.log_date === '2026-10-08')
  checks.push(['withdrawn: the uploaded day has no check-in, so no night, skills or thing', !!up && !('_checkin' in (up.supps || {})) && up.weight === null && !JSON.stringify(up).includes('get-outside')])
  // and withdraw() itself clears them on this phone
  const s3 = stateFromBackup({ days: { '2026-10-08': { foods: [], supps: {}, weight: null, workout: null, checkin: full() } } } as never)
  s3.profile.mind = { wakeAt: '06:45', asks: 'fewer' }
  s3.profile.plans = [plan('m', 'mind')]
  const m3 = ensureMeta(s3, false)
  recordConsent(s3, 'health', true)
  withdraw(s3, m3, 'health')
  checks.push(['withdraw() clears the Mind health data on this phone', s3.days['2026-10-08'].checkin === null && s3.profile.mind?.wakeAt === undefined && s3.profile.mind?.asks === 'fewer' && !(s3.profile.plans || []).length])

  report(checks)
  return bad
}
