import { fmt, r1 } from './date'
import type { LoopOption, ProteinWords, RangeChange, WeeklyReview, WeightRow } from './maintenanceLoop'
import type { MindContext, PatternCode, StrengthProgress, WeekPicture } from './weekPicture'
import { weekdayOf } from './weekPicture'

/**
 * The maintenance loop in words: the approved boards' copy (ml-a1 to ml-d2, Benn 8 Oct 2026) and
 * mental-performance's rules for which line shows when (8 Oct). Pure, so tests can hold every
 * line to the rules: no "x of y", nothing from LOOP_BANNED, no exclamation marks, no em dashes.
 */

/** Words the loop never says (maintenance-psychology "Never say", plus "x of y" checked separately). */
export const LOOP_BANNED = [
  'missed', 'failed', 'slip', 'cheat', 'back on track', 'undo', 'damage', 'earn', 'burn it off', 'streak',
  'should', 'need to', 'willpower', "don't lose", "haven't checked in", 'because', 'caused', 'made you', 'trigger', 'binge',
]

/** "every day" for all 7 finished days, else "{k} days" (never "x of y") */
const days = (k: number, all: number) => (k === all && all === 7 ? 'every day' : k === 1 ? '1 day' : `${k} days`)
const most = (k: number, n: number) => n > 0 && k * 2 > n
const times = (n: number) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`)

export const ENCOURAGE = {
  steady: 'A steady week. This is what a habit looks like.',
  gentle: 'Small, steady things. That’s the whole idea.',
  hard: 'A full-on week, and you still showed up.',
  welcome: 'Good to have you back.',
  lighter: 'A quieter week. What you did still counts.',
} as const

/* ---------------- mind ---------------- */

export function sleepWords(m: MindContext, minAnswers = 3): string | null {
  if (m.sleepAnswers < minAnswers) return null
  if (m.poorSleepDays >= 3) return `Short nights on ${m.poorSleepDays} days`
  if (most(m.goodSleepDays, m.sleepAnswers)) return 'Good on most nights'
  return 'A mix of nights'
}

export function stressWords(m: MindContext, minAnswers = 3): string | null {
  if (m.stressAnswers < minAnswers) return null
  if (m.highStressDays >= 3) return `High on ${m.highStressDays} days`
  if (most(m.lowStressDays, m.stressAnswers)) return 'Mostly low'
  return 'Some, on a few days'
}

const PART = { early: 'early in the week', mid: 'mid-week', weekend: 'at the weekend' } as const
export function moodWords(m: MindContext, minAnswers = 3): string | null {
  if (m.moodAnswers < minAnswers || m.careMood) return null
  if (m.lowerMood) return `Lower than usual ${PART[m.lowerMood]}`
  if (most(m.goodMoodDays, m.moodAnswers)) return 'Good most days'
  return 'About as usual'
}

/** `sleepHunger`: the sleep to hunger pattern passed its test this week */
export function hungerWords(m: MindContext, sleepHunger: boolean, minAnswers = 3): string | null {
  if (m.hungerAnswers < minAnswers || m.starvingDays >= 3) return null
  if (sleepHunger) return 'Higher on the short-sleep days'
  if (m.eveningHunger) return 'Hungrier in the evenings'
  if (most(m.satisfiedDays, m.hungerAnswers)) return 'Mostly satisfied'
  return null
}

/** The check-in row's sub: sleep, then stress (ml-a1, ml-a3). */
export function checkinSub(m: MindContext, minAnswers = 3): string | null {
  const sleep = m.sleepAnswers < minAnswers ? null
    : m.poorSleepDays >= 3 ? { t: 'Short nights', good: false }
    : most(m.goodSleepDays, m.sleepAnswers) ? { t: 'Good nights most of the week', good: true }
    : { t: 'A mix of nights', good: false }
  const stress = m.stressAnswers < minAnswers ? null
    : m.highStressDays >= 3 ? { t: 'a busy few days', good: false }
    : most(m.lowStressDays, m.stressAnswers) ? { t: 'stress stayed low', good: true }
    : { t: 'some stress on a few days', good: false }
  // both good or both not: one sentence; mixed: two, sleep first (mental-performance 8 Oct)
  const cap = (x: string) => x[0].toUpperCase() + x.slice(1)
  let out = sleep && stress
    ? sleep.good === stress.good ? `${sleep.t}${sleep.good ? ', and ' : ' and '}${stress.t}.` : `${sleep.t}. ${cap(stress.t)}.`
    : sleep ? `${sleep.t}.` : stress ? `${cap(stress.t)}.` : null
  // only after a stress part that wasn't good: "Stress stayed low. The weekend was calmer." contradicts itself
  if (out && m.calmerWeekend && stress && !stress.good) out += ' The weekend was calmer.'
  return out
}

export function checkinTitle(m: MindContext, gentle: boolean): string | null {
  if (!m.checkins) return null
  if (gentle) return m.checkins >= 4 ? 'You checked in most days' : 'You checked in this week'
  const d = days(m.checkins, m.days)
  return d === 'every day' ? 'Checked in every day' : d === '1 day' ? 'Checked in once' : `Checked in ${d}`
}

/* ---------------- move ---------------- */

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
export function moveTitle(mv: WeekPicture['move'], gentle: boolean, activeDays: number): string | null {
  if (!mv.sessions) return null
  if (gentle) return activeDays >= 4 ? 'You moved on most days' : 'You moved this week'
  const parts: string[] = []
  if (mv.strength) parts.push(plural(mv.strength, 'strength session', 'strength sessions'))
  if (mv.other) parts.push(plural(mv.other, mv.strength ? 'other session' : 'session', mv.strength ? 'other sessions' : 'sessions'))
  if (mv.walks) parts.push(plural(mv.walks, 'walk', 'walks'))
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0]
}

/** "Two sessions and a few walks." (gentle, ml-a2) */
export function moveGentleSub(mv: WeekPicture['move']): string | null {
  const s = mv.strength + mv.other
  const a = s === 0 ? null : s === 1 ? 'A session' : s === 2 ? 'Two sessions' : 'A few sessions'
  const b = mv.walks === 0 ? null : mv.walks === 1 ? 'a walk' : mv.walks === 2 ? 'two walks' : 'a few walks'
  if (a && b) return `${a} and ${b}.`
  if (a) return `${a}.`
  return b ? `${b[0].toUpperCase()}${b.slice(1)}.` : null
}

/** "Sit to stand went up to 12 reps on Thursday." / "Goblet squat went up to 16 kg on Thursday." */
export function progressLine(x: StrengthProgress): string {
  const v = x.kind === 'load' ? `${r1(x.value)} kg` : x.kind === 'hold' ? `${Math.round(x.value)} seconds` : `${Math.round(x.value)} reps`
  return `${x.name} went up to ${v} on ${weekdayOf(x.d)}.`
}

export function moveSub(mv: WeekPicture['move'], hard: boolean, gentle: boolean): string | null {
  if (gentle) return moveGentleSub(mv)
  if (mv.progress) return progressLine(mv.progress)
  return hard ? 'On a week like this one, that counts.' : null
}

/* ---------------- food ---------------- */

export function foodTitle(loggedDays: number, all: number, gentle: boolean): string | null {
  if (!loggedDays) return null
  if (gentle) return loggedDays >= 4 ? 'You logged most days' : 'You logged this week'
  const d = days(loggedDays, all)
  return d === 'every day' ? 'Logged food every day' : `Logged food on ${d}`
}

export function foodSub(inRangeDays: number | null, protein: ProteinWords | null, gentle: boolean): string | null {
  if (gentle) return protein?.kind === 'meals' ? 'Protein at most meals.' : null
  const range = inRangeDays ? `${inRangeDays === 1 ? '1 day' : `${inRangeDays} days`} in your range` : null
  const pro = !protein ? null : protein.kind === 'meals' ? 'protein at the heart of most meals' : `protein held up at about ${protein.g} g a day`
  if (range && pro) return `${range}, and ${pro}.`
  if (range) return `${range}.`
  return pro ? `${pro[0].toUpperCase()}${pro.slice(1)}.` : null
}

/* ---------------- weight ---------------- */

export function weightTitle(w: WeightRow): string {
  return w.weighIns ? `Weighed in ${times(w.weighIns)}` : 'No weigh-ins this week'
}

/** `hard`: a harder week adds "One week doesn't move that." to a level trend. */
export function weightSub(w: WeightRow, hard: boolean): string {
  const x = w.words
  const over = `${w.weeks} weeks`
  const level = hard ? `About level over the last ${over}. One week doesn’t move that.` : `About level over the last ${over}.`
  switch (x.kind) {
    case 'too-soon': return 'Your trend shows after 4 weeks of weigh-ins.'
    case 'steady': return hard ? level : `Steady over the last ${over}.`
    case 'above': return 'A little above your steady range.'
    case 'below': return 'A little below your steady range.'
    case 'pace': return x.pace === 'in-line' ? `Over ${over}, in line with the pace you chose.` : x.pace === 'slower' ? `Over ${over}, a little slower than the pace you chose.` : `Over ${over}, faster than the pace you chose.`
    case 'level': return x.word === 'level' ? level : `${x.word === 'down' ? 'Going down' : 'Going up'}${x.aLittle ? ' a little' : ''} over the last ${over}.`
  }
}

/* ---------------- pattern lines ---------------- */

export const PATTERN_FOOT = 'Just a pattern in your own data, not a rule.'
export function patternText(code: PatternCode, gentle: boolean): string {
  switch (code) {
    case 'hunger-poor-sleep': return 'On your short-sleep days, hunger tended to be higher.'
    case 'hunger-high-stress': return 'On your more stressful days, hunger tended to be higher.'
    case 'energy-good-sleep': return gentle ? 'Sessions felt easier after a good night, going by your energy.' : 'Your energy tended to be better after a good night.'
    case 'sessions-good-energy': return 'You trained more often on days your energy was good.'
    case 'sessions-calm': return 'You trained more often on calmer days lately.'
  }
}

/* ---------------- options ---------------- */

export interface OptionText { tag: 'Mind' | 'Mind and food' | 'Move' | 'Food' | 'Your range'; title: string; sub?: string }

const kcalRange = (r: { lo: number; hi: number }) => `${fmt(r.lo)}–${fmt(r.hi)}`
export function rangeSub(r: RangeChange): string {
  return `From ${kcalRange(r.from)} to ${kcalRange(r.to)} kcal`
}

/** `long`: the "Change one thing" sheet's descriptions (ml-a5); the check sheets show titles only. */
export function optionText(o: LoopOption, r: RangeChange | null, ctx: { drift?: boolean; long?: boolean } = {}): OptionText {
  const L = ctx.long
  switch (o) {
    case 'earlier-night': return { tag: 'Mind', title: 'Aim for an earlier night', ...(L ? { sub: 'Wind down a little earlier on the nights that suit you.' } : {}) }
    case 'hungry-days-plan': return { tag: 'Mind and food', title: 'Plan for hungry days', ...(L ? { sub: 'An if-then plan for the days you get home hungry.' } : {}) }
    case 'hungry-evenings-plan': return { tag: 'Mind and food', title: 'Plan for hungry evenings', ...(L ? { sub: 'An if-then plan for the evenings you get hungry.' } : {}) }
    case 'strength-session': return { tag: 'Move', title: 'Add a strength session', ...(L ? { sub: 'A short one, about 25 minutes, on a day that suits you.' } : {}) }
    case 'protein-meals': return { tag: 'Food', title: 'Build meals around protein', ...(L ? { sub: 'Protein at each meal helps with fullness. Your usuals that fit are one tap away.' } : {}) }
    case 'range-less':
    case 'range-more': return { tag: 'Food', title: ctx.drift ? 'Adjust my range a little' : 'Adjust my range', ...(r ? { sub: L ? `${rangeSub(r)}. You can change it back any time.` : rangeSub(r) } : {}) }
    case 'rest-day': return { tag: 'Move', title: 'Plan a rest day' }
    case 'walk': return { tag: 'Move', title: 'Add a walk' }
    case 'new-start': return { tag: 'Your range', title: 'Make this my new starting point', sub: 'Centre the steady range on where you are now.' }
  }
}

/** The weigh-in check's title (ml-b1 to ml-b3, renamed by Benn on 8 Oct: the check reads 4 weeks of data). */
export const CHECK_TITLE = 'Your 4-week check'
export const CHECK_LEAD = 'Your 4-week average is in. Some options, if you want them.'
export const CHECK_ROWS = 'The last 4 weeks'

/** The lead line of "Change one thing" (ml-a5). */
export function changeOneLead(ctx: 'calm' | 'hard' | 'gentle' | 'drift', m: MindContext): string {
  if (ctx !== 'hard') return 'Pick one small thing to try.'
  const short = m.poorSleepDays >= 3, busy = m.highStressDays >= 3
  const what = short && busy ? 'short nights and higher stress' : short ? 'short nights' : busy ? 'higher stress' : 'a harder few days'
  return `After a week of ${what}, these come first. Pick one.`
}

/* ---------------- the review, all together ---------------- */

export interface ReviewRow { pillar: 'mind' | 'move' | 'food' | 'weight'; title: string; sub: string | null }

/** The "What you did" rows (ml-a1 to ml-a4), mind, then move, then food, then weight (opt-in). */
export function reviewRows(rv: WeeklyReview): ReviewRow[] {
  const g = rv.gentle
  const m = rv.mind
  const rows: ReviewRow[] = []
  const all = rv.week.days.filter((x) => x.finished).length
  const ct = checkinTitle(m, g)
  if (ct) rows.push({ pillar: 'mind', title: ct, sub: g ? (most(m.goodSleepDays, m.sleepAnswers) ? 'Mostly good nights.' : null) : checkinSub(m) })
  const activeDays = rv.week.days.filter((x) => x.finished && x.move.sessions.length > 0).length
  const mt = moveTitle(rv.move, g, activeDays)
  if (mt) rows.push({ pillar: 'move', title: mt, sub: moveSub(rv.move, m.hard, g) })
  const ft = foodTitle(rv.food.loggedDays, all, g)
  if (ft) rows.push({ pillar: 'food', title: ft, sub: foodSub(rv.food.inRangeDays, rv.food.protein, g) })
  if (rv.weight) rows.push({ pillar: 'weight', title: weightTitle(rv.weight), sub: weightSub(rv.weight, m.hard) })
  return rows
}

export const GENTLE_FOOT = 'Gentle mode: no numbers here, and weight isn’t part of your review.'

/** Choices for next week (ml-a1, ml-a4). */
export const CHOICE_TEXT = {
  keep: { title: 'Keep it as it is', sub: 'What you’re doing is working for you.' },
  'keep-lighter': { title: 'Keep it as it is', sub: 'Same plan for next week.' },
  // Benn, 8 Oct: Ease off pre-selects shorter sessions and leaves food as it is, so the copy says so
  'ease-off': { title: 'Ease off', sub: 'A lighter week: shorter sessions, more room.' },
  'ease-off-gentle': { title: 'Ease off', sub: 'A lighter week, with more room.' },
  'change-one': { title: 'Change one thing', sub: 'Pick one small thing to try.' },
  'change-one-hard': { title: 'Change one thing', sub: 'Pick one small thing to try. Mind options first, after a week like this one.' },
  'pick-up': { title: 'Pick up from here', sub: 'Same plan, starting this week.' },
  'ease-back': { title: 'Ease back in', sub: 'A lighter first week back.' },
} as const

/** The Summary Weight tile's short line (board ml-e2): the same words as the review, shortened for a tile. */
export function weightTileWords(w: WeightRow): string {
  const x = w.words
  // nutrition-accuracy, 8 Oct: the range check isn't a 4-week claim, and the window can be 6 or 8 weeks
  const over = `${w.weeks} weeks`
  switch (x.kind) {
    case 'too-soon': return 'Your trend shows after 4 weeks of weigh-ins'
    case 'steady': return 'Within your steady range'
    case 'above': return 'A little above your steady range'
    case 'below': return 'A little below your steady range'
    case 'pace': return x.pace === 'in-line' ? `Over ${over}, in line with your pace` : x.pace === 'slower' ? `Over ${over}, a little slower than your pace` : `Over ${over}, faster than your pace`
    case 'level': return x.word === 'level' ? `About level over ${over}` : `${x.word === 'down' ? 'Going down' : 'Going up'}${x.aLittle ? ' a little' : ''} over ${over}`
  }
}
