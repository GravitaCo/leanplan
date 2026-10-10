import type { Pillar, SkillId, ThingKey } from '@/core/types'
import type { PacerPattern } from '@/core/domain/pacer'

/**
 * Mind skills and the day's "one thing" (wellbeing plan §5, §6, §10a; copy deck B5, B7, B9). Every
 * string here is user-facing and is linted against BANNED_COPY and the deck §0 word list
 * (`mindCopyIssues`) by scripts/wellbeing/core.ts. Ids and keys are stored (check-in `skills`,
 * `thing.key`), so they are never renamed or removed; screens skip a key they don't know.
 */

export interface Skill {
  id: SkillId
  /** deck B5.8, B5.10, B5.12, B5.14 */
  name: string
  /** the row's one-line sub (deck B5.9, B5.11, B5.13, B5.15); describes the activity, no mechanism line */
  sub: string
  /** icon name in ui/icons (board B5: wind, moon, pen, sun) */
  icon: string
  /** the icon square's colour */
  pillar: Pillar
  /**
   * Has an approved screen. Wind down and Get outside don't yet (Benn, 8 Oct 2026: boards drawn in
   * parallel), so the Mind page lists Reset and Unload only and nothing opens the other two.
   */
  screen: boolean
}

export const SKILLS: readonly Skill[] = [
  { id: 'reset', name: 'Reset', sub: 'A few slow breaths, with long breaths out · 1 to 5 min', icon: 'wind', pillar: 'mind', screen: true },
  { id: 'wind-down', name: 'Wind down', sub: 'Your own routine for the evening', icon: 'moon', pillar: 'mind', screen: false },
  { id: 'unload', name: 'Unload', sub: "Write what's on your mind, and one next step for each", icon: 'pen', pillar: 'mind', screen: true },
  { id: 'outside', name: 'Get outside', sub: 'Daylight, and a walk if you like', icon: 'sun', pillar: 'move', screen: false },
]

export const skillById = (id: string): Skill | undefined => SKILLS.find((s) => s.id === id)
/** The skills with a screen, in list order (the Mind page's Skills list). */
export const skillsWithScreen = (): Skill[] => SKILLS.filter((s) => s.screen)

export interface Thing {
  key: ThingKey
  /** the chip and "Today: {thing}" (deck B2.6, B9.2, B9.3); `{time}` is the wind-down time */
  label: string
  /** after Done (deck B9.7a to c) */
  done: string
  pillar: Pillar
  /** a skill whose screen the chip opens; only set where that screen exists (sub-flag MIND_REVIEWED) */
  skill?: SkillId
  /**
   * "Make it a plan" prefill (deck B9.11, B9.13; the rest approved by Benn, 10 Oct 2026, from
   * mental-performance's close-out change 5). `{time}` is the wind-down time, filled in when the
   * sheet opens (thingPlan). Every thing has one; a thing without one offers no "Make it a plan".
   */
  plan?: { when: string; then: string }
  /** copy not on an approved board yet: needs mental-performance and Benn before it ships (none pending since 9 Oct 2026) */
  pending?: string
}

export const THINGS: readonly Thing[] = [
  // hard day, Mind-led (deck B2.6a, B2.6b; plan §7.3 "a 2-minute Reset or Get outside")
  // done lines approved by Benn on 9 Oct 2026 (wellbeing plan §10b)
  { key: 'reset-2', label: '2-minute Reset', done: '2-minute Reset', pillar: 'mind', skill: 'reset', plan: { when: 'I need a breather', then: 'do a 2-minute Reset' } },
  { key: 'outside-10', label: 'Get outside for 10 minutes', done: 'Got outside', pillar: 'move', plan: { when: 'after lunch', then: 'get outside for 10 minutes' } },
  // ordinary day, one per pillar (deck B9.3a to c; B9.2c for Mind without a session)
  { key: 'reset-before-session', label: 'Reset before your session', done: 'Reset before your session', pillar: 'mind', skill: 'reset', plan: { when: "I'm getting ready to train", then: 'do a 2-minute Reset' } },
  // "Wound down" (the done line with no time) approved by Benn, 10 Oct 2026
  { key: 'wind-down-from', label: 'Wind down from {time}', done: 'Wound down from {time}', pillar: 'mind', plan: { when: 'it gets to {time}', then: 'start winding down' } },
  // the lunch plan is context only: no amount, timing or rule (mental-performance)
  { key: 'lunch-somewhere', label: 'Lunch somewhere you like', done: 'Lunch somewhere you like', pillar: 'food', plan: { when: "it's lunchtime", then: 'have lunch somewhere I like' } },
  { key: 'outside-lunch', label: 'Get outside at lunch', done: 'Got outside at lunch', pillar: 'move', plan: { when: 'after lunch', then: 'get outside for 10 minutes' } },
]

export const thingByKey = (key: string | undefined): Thing | undefined => (key ? THINGS.find((t) => t.key === key) : undefined)

/**
 * Whether a finished Reset run ticks today's thing done (Benn, 10 Oct 2026; mental-performance
 * close-out, change 6): only when today's thing is a Reset thing (`skill: 'reset'`) not yet done.
 * A stopped run changes nothing (ResetScreen never asks).
 */
export const resetTicksThing = (thing: { key: string; done?: string } | undefined): boolean =>
  !!thing && !thing.done && thingByKey(thing.key)?.skill === 'reset'

/**
 * A thing's chip label or done line with its time filled in ("Wind down from 22:30"). With no time
 * (cleared after the pick) the " from {time}" goes: "Wind down" (the B5.10 skill name) and
 * "Wound down" (mental-performance close-out, change 7; approved by Benn, 10 Oct 2026).
 */
export const thingText = (text: string, ctx: { windDownAt?: string } = {}): string =>
  ctx.windDownAt ? text.replace('{time}', ctx.windDownAt) : text.replace(' from {time}', '')

/**
 * A thing's "Make it a plan" prefill with the wind-down time filled in ("it gets to 22:30"), read
 * when the sheet opens. None when the thing has no prefill, or its prefill needs a time and none is
 * set (the time was cleared after the pick): then "Make it a plan" isn't offered.
 */
export function thingPlan(t: Thing | undefined, ctx: { windDownAt?: string } = {}): { when: string; then: string } | undefined {
  if (!t?.plan) return undefined
  const fill = (x: string) => (x.includes('{time}') ? (ctx.windDownAt ? x.replace('{time}', ctx.windDownAt) : undefined) : x)
  const when = fill(t.plan.when), then = fill(t.plan.then)
  return when && then ? { when, then } : undefined
}

/**
 * Reset's breath (deck B7.4, B7.8a to c: a breath in, a small second breath on top, a long breath
 * out). The seconds are a Tali pacing choice, not sourced values: Balban et al. 2023's cyclic
 * sighing was self-paced with no fixed counts (mental-performance, WP3 review). The constraint is a
 * slow inhale, a shorter second inhale, and a breath out longer than both inhales together.
 * 3 s in, 1 s in again, 6 s out (mental-performance's suggestion), approved by Benn on 9 Oct 2026
 * (wellbeing plan §10b), so `placeholder` is false.
 */
export const RESET_PATTERN: PacerPattern = {
  phases: [
    { motion: 'in', word: 'Breathe in', s: 3 },
    { motion: 'in-again', word: 'And in again', s: 1 },
    { motion: 'out', word: 'Breathe out', s: 6 },
  ],
  source: 'Tali pacing choice, approved by Benn 9 Oct 2026. Balban et al. 2023 (Cell Rep Med 4:100895) cyclic sighing was self-paced: slow inhale, short second inhale, long slow exhale; no fixed counts.',
  placeholder: false,
}

/** Reset's lengths in minutes (deck B7.5 "1 min" · "2 min" · "5 min"; 2 is the default). */
export const RESET_LENGTHS = [1, 2, 5] as const
export const RESET_DEFAULT_LENGTH = 2

/** Every user-facing string in this file, for the copy lint. */
export function skillsCopy(): string[] {
  return [
    ...SKILLS.flatMap((s) => [s.name, s.sub]),
    ...THINGS.flatMap((t) => [t.label, t.done, ...(t.plan ? [t.plan.when, t.plan.then] : [])]),
    // the prefills as filled in ("it gets to 22:30")
    ...THINGS.map((t) => thingPlan(t, { windDownAt: '22:30' })).flatMap((p) => (p ? [p.when, p.then] : [])),
    // the no-time forms (thingText): "Wind down", "Wound down"
    ...THINGS.flatMap((t) => [t.label, t.done]).filter((x) => x.includes('{time}')).map((x) => thingText(x)),
    ...RESET_PATTERN.phases.map((p) => p.word),
  ]
}
