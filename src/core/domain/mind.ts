import type { CheckIn, DayLog, IfThenPlan, Pillar, SkillId, SleepBand } from '@/core/types'
import type { UkNation } from '@/core/data/signposts'
import { SKILLS, THINGS, type Thing } from '@/core/data/skills'
import { lowSignals } from './dayOptions'
import { shiftDay } from './date'
import { SKILL_IDS, SLEEP_BANDS } from './checkin'
import { bandWords, isLongBand, nightFor } from './sleep'

/**
 * Mind rules for Phase 1 (wellbeing plan §7.3, §8.2.2, §10, §10a; copy deck B2, B4, B6, B9;
 * mental-performance's review rules 1 to 3). Pure: days, dates and settings come in as arguments.
 * Every threshold is a judgement call, unvalidated, kept here with its reason (as dayOptions.ts).
 */

type Days = Record<string, DayLog | undefined>
const checkinOn = (days: Days, d: string): CheckIn | null => days[d]?.checkin || null
/** `n` days ending on `end` (inclusive), newest first */
const lastDays = (end: string, n: number): string[] => Array.from({ length: n }, (_, i) => shiftDay(end, -i))

/* ---------- hard day ---------- */

/** Mood 1 or 2 ("Rough" or "Low"). */
export const isLowMood = (c: CheckIn | null | undefined): boolean => !!c && (c.mood === 1 || c.mood === 2)

/**
 * A hard day (plan §7.3): two or more low signals against the person's own recent answers (the
 * same threshold as Train's lighter choices), or mood Rough or Low on its own. Mood counts here
 * only, never in Train's lowSignals. `recent` is earlier check-ins, most recent first.
 */
export function hardDay(today: CheckIn | null | undefined, recent: (CheckIn | null | undefined)[]): boolean {
  if (!today) return false
  return isLowMood(today) || lowSignals(today, recent).length >= 2
}

/** Earlier check-ins, most recent first, for hardDay and lowSignals (the 14 days before `today`). */
export function recentCheckins(days: Days, today: string, n = 14): (CheckIn | null)[] {
  return lastDays(shiftDay(today, -1), n).map((d) => checkinOn(days, d))
}

/* ---------- sleep observation (deck B4.16 to B4.18) ---------- */

/** Judgement calls (mental-performance rule 1): 14 days, at least 8 pairs, at least 3 on each side. */
export const OBS_DAYS = 14
export const OBS_MIN_PAIRS = 8
export const OBS_MIN_SIDE = 3

export const OBS_HEADING = 'Something in your answers'
export const OBS_ENERGY = 'Over the last two weeks, on nights over 7 hours you more often rated energy OK or Good.'
export const OBS_SUB = 'Just a pattern in your own answers, not a rule.'

export interface Observation {
  /** the pair it comes from; Phase 1 shows sleep with energy only (the stress line isn't written yet) */
  pair: 'sleep-energy'
  heading: string
  text: string
  sub: string
}

/**
 * The one observation (mental-performance rule 2): sleep band paired with the energy answer over
 * the 14 days ending `today`. It shows only when nights over 7 hours more often came with energy
 * OK or Good (2 or 3) than shorter nights did: the positive side only. Never food, weight or
 * skills. Sleep with stress is allowed by the rules but has no approved line, so it isn't offered.
 */
export function observation(days: Days, today: string): Observation | null {
  let longN = 0, longOk = 0, shortN = 0, shortOk = 0
  for (const d of lastDays(today, OBS_DAYS)) {
    const c = checkinOn(days, d)
    const n = nightFor(c)
    if (!n || !c?.energy) continue
    const ok = c.energy >= 2
    if (isLongBand(n.band)) { longN++; if (ok) longOk++ } else { shortN++; if (ok) shortOk++ }
  }
  if (longN + shortN < OBS_MIN_PAIRS || longN < OBS_MIN_SIDE || shortN < OBS_MIN_SIDE) return null
  // strictly more often (rates, so unequal side sizes compare fairly)
  if (longOk / longN <= shortOk / shortN) return null
  return { pair: 'sleep-energy', heading: OBS_HEADING, text: OBS_ENERGY, sub: OBS_SUB }
}

/* ---------- weekly reflection (deck B4) ---------- */

/** Judgement call (plan §10, deck B4): a "mostly" sleep band needs at least 3 answered nights. */
export const SLEEP_MIN_NIGHTS = 3

export const REFLECTION_NOT_ENOUGH = 'Not enough answers yet'
export const REFLECTION_LATER = 'Patterns from your own answers can show up here over time.'

export interface WeekReflection {
  /** Monday to Sunday */
  days: string[]
  /** a plain count of days with a check-in, never "of 7" */
  checkins: number
  /** the most common band, or 'not-enough' under SLEEP_MIN_NIGHTS answered nights */
  sleep: SleepBand | 'not-enough'
  skills: Partial<Record<SkillId, number>>
  plansReviewed: number
  observation: Observation | null
}

/**
 * The week's reflection, from `weekStart` (a Monday) to Sunday, counting only days up to `today`.
 * Null with Mind switched off (C1: a switched-off pillar disappears). `plans` is profile.plans.
 */
export function weekReflection(days: Days, weekStart: string, opts: { today: string; off?: Pillar[]; plans?: IfThenPlan[] }): WeekReflection | null {
  if (opts.off?.includes('mind')) return null
  const week = Array.from({ length: 7 }, (_, i) => shiftDay(weekStart, i))
  const upTo = week.filter((d) => d <= opts.today)
  const cs = upTo.map((d) => checkinOn(days, d))
  const checkins = cs.filter((c) => !!c).length
  // most common band; a tie goes to the band of the most recent of the tied nights (judgement call)
  const tally = new Map<SleepBand, { n: number; last: number }>()
  cs.forEach((c, i) => {
    const n = nightFor(c)
    if (!n) return
    const t = tally.get(n.band) || { n: 0, last: -1 }
    tally.set(n.band, { n: t.n + 1, last: i })
  })
  const nights = [...tally.values()].reduce((a, t) => a + t.n, 0)
  let sleep: WeekReflection['sleep'] = 'not-enough'
  if (nights >= SLEEP_MIN_NIGHTS) {
    sleep = [...tally.entries()].sort((a, b) => b[1].n - a[1].n || b[1].last - a[1].last)[0][0]
  }
  const skills: WeekReflection['skills'] = {}
  // a later version's skill (kept by shape on load) isn't one this version can name: not counted
  for (const c of cs) for (const s of c?.skills || []) if (SKILL_IDS.includes(s.id)) skills[s.id] = (skills[s.id] || 0) + 1
  const inWeek = new Set(upTo)
  const plansReviewed = (opts.plans || []).reduce((a, p) => a + (p.reviews || []).filter((r) => inWeek.has(r.d)).length, 0)
  const end = upTo[upTo.length - 1]
  return { days: week, checkins, sleep, skills, plansReviewed, observation: end ? observation(days, end) : null }
}

const times = (n: number): string => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`)

export interface ReflectionLine { label?: string; value: string }

/**
 * The card's lines (deck B4.3, B4.4, B4.9 to B4.12). Lines with nothing to show are left out
 * (mental-performance), except Sleep, which reads "Not enough answers yet" rather than "0 nights".
 * Plain counts only, never "of 7". No food or weight lines (Benn). The observation block (or the
 * B4.7 line) is separate: `r.observation` or REFLECTION_LATER.
 */
export function reflectionLines(r: WeekReflection): ReflectionLine[] {
  const out: ReflectionLine[] = []
  if (r.checkins) out.push({ value: `${r.checkins} check-in${r.checkins === 1 ? '' : 's'} this week` })
  const words = r.sleep === 'not-enough' ? REFLECTION_NOT_ENOUGH : `Mostly ${bandWords(r.sleep)}`
  out.push({ label: 'Sleep', value: words })
  const used = SKILLS.filter((s) => r.skills[s.id]).map((s) => `${s.name} ${times(r.skills[s.id]!)}`)
  if (used.length) out.push({ label: 'Skills', value: used.join(', ') })
  if (r.plansReviewed) out.push({ label: 'Plans', value: `${r.plansReviewed} plan${r.plansReviewed === 1 ? '' : 's'} reviewed` })
  return out
}

/** Whether a sleep band is a stored, known one (screens skip anything else). */
export const knownBand = (b: unknown): b is SleepBand => SLEEP_BANDS.includes(b as SleepBand)

/* ---------- one thing (deck B2.5, B9) ---------- */

export interface ThingCtx {
  hard: boolean
  /** profile.mind.off */
  off?: Pillar[]
  /** Gentle display (quiet numbers / food words) */
  gentle?: boolean
  /** wellbeing routing from onboarding (a wellbeing Yes or Sometimes) */
  wellbeingRouting?: boolean
  /** a workout is planned or logged today */
  sessionToday?: boolean
  /** profile.mind.windDownAt, "HH:MM" */
  windDownAt?: string
  /** MIND_REVIEWED: skill screens (Reset) exist; without it, chips that open a skill are left out */
  skillsAvailable: boolean
}

const thing = (key: string): Thing => THINGS.find((t) => t.key === key)!

/**
 * The day's one-thing chips (Benn, 8 Oct 2026):
 * - Hard day: Mind-led (D2), "2-minute Reset" and "Get outside for 10 minutes". No food chip.
 * - Ordinary day: one per pillar that's on (D1). Mind: "Reset before your session" on a session
 *   day, else "Wind down from {time}" when a wind-down time is set. Food: "Lunch somewhere you
 *   like", never in gentle mode or wellbeing routing (a food thing is never about amount, timing
 *   or rules). Move: "Get outside at lunch".
 * - A switched-off pillar's chip disappears. With Mind off there's no Mind card to hold the
 *   chips, so there are none.
 * - Without `skillsAvailable` (sub-flag off) the Reset chips are left out. Wind down and Get
 *   outside chips open no screen (none is approved yet).
 */
export function thingOptions(ctx: ThingCtx): Thing[] {
  const on = (p: Pillar) => !ctx.off?.includes(p)
  if (!on('mind')) return []
  const out: Thing[] = []
  if (ctx.hard) {
    if (ctx.skillsAvailable) out.push(thing('reset-2'))
    if (on('move')) out.push(thing('outside-10'))
    return out
  }
  if (ctx.sessionToday && ctx.skillsAvailable) out.push(thing('reset-before-session'))
  else if (ctx.windDownAt) out.push(thing('wind-down-from'))
  if (on('food') && !ctx.gentle && !ctx.wellbeingRouting) out.push(thing('lunch-somewhere'))
  if (on('move')) out.push(thing('outside-lunch'))
  return out
}

/* ---------- low-mood signpost (deck B6.9 to B6.11) ---------- */

/**
 * Judgement calls (plan §8.2.2, mental-performance rule 3; clinician review pending, §12.5): over
 * the last 14 days, at least 5 answered moods, and mood Rough or Low on most of them (more than
 * half); not shown in the last 30 days.
 */
export const LOW_MOOD_DAYS = 14
export const LOW_MOOD_MIN_ANSWERS = 5
export const LOW_MOOD_GAP_DAYS = 30

/** `lastShown` is deviceOnly.lowMoodShown ("YYYY-MM-DD" or an ISO time). */
export function lowMoodDue(days: Days, today: string, lastShown?: string): boolean {
  if (lastShown && lastShown.slice(0, 10) > shiftDay(today, -LOW_MOOD_GAP_DAYS)) return false
  const moods = lastDays(today, LOW_MOOD_DAYS).map((d) => checkinOn(days, d)?.mood || 0).filter((m) => m > 0)
  if (moods.length < LOW_MOOD_MIN_ANSWERS) return false
  return moods.filter((m) => m <= 2).length * 2 > moods.length
}

/**
 * The signpost's line by nation (deck B6.9; B6.10 Northern Ireland, where there's no NHS 111;
 * B6.11 Scotland, NHS 24). Exact NHS wording is still to be checked (plan §13).
 */
export function lowMoodLine(nation: UkNation): string {
  if (nation === 'northern-ireland') return 'Things seem to have been hard for a while. Talking to your GP can help, and Samaritans are there any time on 116 123.'
  if (nation === 'scotland') return 'Things seem to have been hard for a while. Talking to your GP or calling NHS 24 on 111 can help, and Samaritans are there any time on 116 123.'
  return 'Things seem to have been hard for a while. Talking to your GP or calling NHS 111 can help, and Samaritans are there any time on 116 123.'
}

/** Every user-facing string in this file, for the copy lint. */
export function mindCopy(): string[] {
  return [OBS_HEADING, OBS_ENERGY, OBS_SUB, REFLECTION_NOT_ENOUGH, REFLECTION_LATER, ...(['england', 'scotland', 'wales', 'northern-ireland'] as UkNation[]).map(lowMoodLine)]
}
