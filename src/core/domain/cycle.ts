/**
 * Cycle (docs/plans/cycle.md): symptom-aware, opt-in, device-only in v1. Pure logic, no React or
 * DOM: shared and tested here; the UI is native only (apps/native; Benn, 16 Nov 2026). The data lives in the
 * device-only store (src/data/deviceOnly.ts, `cycle`); nothing here reads storage or the network.
 *
 * Ground rules this file keeps (cycle.md §1, §5.4, §6):
 * - No forecasts. The only cycle context shown is "Day N of your period", counted from logged flow.
 *   The usual start (rowShows) is worked out here only to bring the check-in row back early; it is
 *   never returned to a screen as a date, a count or a phase.
 * - No phase names, no fertility, no assessment of the person's cycle: safety prompts are generic
 *   signposts keyed on what the person logged.
 * - Cycle data never feeds lowSignals, hardDay or weekPicture (they sync). Train and Today pass the
 *   pain answer to offerLighter's optional third argument; nothing else does.
 */
import { MIN_AGE } from '@/core/legal'
import { shiftDay } from './date'

/* ---------------- types ---------------- */

/** The one setup question (cycle.md §3, Sara 4 Nov). Changeable any time; never asks why. */
export type CycleSetup = 'regular' | 'irregular' | 'perimenopause' | 'stop-skip' | 'none' | 'unsaid'
export const CYCLE_SETUPS: CycleSetup[] = ['regular', 'irregular', 'perimenopause', 'stop-skip', 'none', 'unsaid']

/** "Menstrual flow" (C2): Stopped marks the end of a period, or a dry day within one. */
export type CycleFlow = 'stopped' | 'spotting' | 'light' | 'medium' | 'heavy'
export const CYCLE_FLOWS: CycleFlow[] = ['stopped', 'spotting', 'light', 'medium', 'heavy']
/** Pain, the soreness scale's words: 1 No pain, 2 A bit, 3 A lot. */
export type CyclePain = 1 | 2 | 3
export type CycleChip = 'cramps' | 'bloating' | 'headache' | 'breast-tenderness' | 'upset-stomach'
export const CYCLE_CHIPS: CycleChip[] = ['cramps', 'bloating', 'headache', 'breast-tenderness', 'upset-stomach']

export interface CycleDay {
  flow?: CycleFlow
  pain?: CyclePain
  chips?: CycleChip[]
}

/** The safety prompts (§5.1). 'help' ("When to get help") is a static page, never a prompt. */
export type CyclePrompt = 'long-bleed' | 'heavy' | 'pain' | 'no-period'
export const CYCLE_PROMPTS: CyclePrompt[] = ['long-bleed', 'heavy', 'pain', 'no-period']

/** "This is usual for me" on one prompt: the person's own baseline at the tap (§5.1). */
export interface UsualMark {
  /** YYYY-MM-DD of the tap */
  at: string
  /** long-bleed: the length of the period marked usual; heavy/pain: their most Heavy or "A lot"
   *  days in one period up to the tap */
  base: number
}

export interface CycleStore {
  setup?: CycleSetup
  /** YYYY-MM-DD → what was logged that day */
  days: Record<string, CycleDay>
  /** per prompt, "This is usual for me" */
  usual?: Partial<Record<CyclePrompt, UsualMark>>
  /** per prompt, the day it last showed (once per episode, at most once per PROMPT_GAP_DAYS) */
  shown?: Partial<Record<CyclePrompt, string>>
  /** the day of the last setup-answer change or pregnancy pause: re-arms every "usual" mark */
  rearmedAt?: string
  /** the day a pregnancy pause ended: the long-gap count starts again from it */
  resumedAt?: string
  /** alpha review only (§5.1, "log answer changes on the device"): setup answers with the day */
  setupLog?: { at: string; setup: CycleSetup }[]
}

/* ---------------- thresholds ---------------- */

/**
 * PROVISIONAL ALPHA DEFAULTS. Not clinically reviewed. cycle.md §0 (4 Nov) and §10.2: alpha runs
 * without a clinician; every value here is a placeholder until a clinician signs it off before
 * beta, and Cycle is on only for Benn and Sara until then (CYCLE_ENABLED, src/data/cycleFlag.ts).
 * Change them only with that sign-off, and record who signed and when.
 */
export const CYCLE_THRESHOLDS = {
  provisional: true,
  /** bleeding for more than this many days fires 'long-bleed' (§5.1, NHS: more than a week) */
  longBleedDays: 7,
  /** a period this much longer than the one marked usual re-arms 'long-bleed' */
  longBleedRearmExtra: 2,
  /** a period this long always re-arms 'long-bleed' */
  longBleedRearmDays: 14,
  /** 'heavy' and 'pain' need Heavy (or "A lot") days in at least this many periods */
  acrossPeriods: 2,
  /** at most one showing of each prompt per this many days (§5.1: once per 3 months) */
  promptGapDays: 91,
  /** no logged period for this long fires 'no-period' (Sara, 20 Nov: fine for the alpha; clinician to confirm) */
  noPeriodDays: 90,
  /** the same for 'irregular' (mental-performance, 16 Nov: gaps run longer; Sara, 20 Nov; clinician to confirm) */
  noPeriodDaysIrregular: 180,
  /** …and only if the person checked in at least this many times in every block of this many days */
  noPeriodCheckinBlockDays: 30,
  noPeriodCheckinsPerBlock: 2,
  /** 'heavy' and 'pain' look at this many most recent periods */
  recentPeriods: 6,
  /** 12 months after a "usual" tap, the mark lapses */
  usualLapseDays: 365,
  /** setups that get 'no-period'. Not 'stop-skip' or 'perimenopause' (no bleeding is often
   *  expected; design, 29 Oct), not 'none'. 'irregular' included (Sara, 20 Nov), since low energy
   *  availability affects them as much; clinician to confirm. */
  noPeriodSetups: ['regular', 'irregular', 'unsaid'] as CycleSetup[],
} as const

/** Row timing (§4, Sara 4 Nov). Product values, not clinical ones. */
export const CYCLE_ROW = {
  /** the row stays this many days after a period's last flow day */
  afterDays: 3,
  /** for 'regular' with enough starts, the row comes back this many days before the usual start */
  earlyDays: 7,
  /** logged starts needed before the row may hide between periods */
  minStarts: 2,
  /** usual gaps outside this range are ignored (a missed log, a typo): the row then always shows */
  gapMin: 15,
  gapMax: 60,
} as const

/** A period ends at the first Stopped, or after this many days with no flow answer (§4). */
const SILENT_END_DAYS = 2
/** Flow again within this many days of a Stopped carries on the same period (§4). */
const STOPPED_CARRY_DAYS = 2

/* ---------------- dates ---------------- */

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/
const ms = (d: string) => Date.parse(d + 'T00:00:00Z')
/** whole days from a to b (b later = positive) */
export const daysFrom = (a: string, b: string): number => Math.round((ms(b) - ms(a)) / 86400_000)

/* ---------------- gate (§3) ---------------- */

export interface GateFacts {
  /** profile.sexAnswer: only the onboarding answer counts, never legacy `sex` or `sexOf` */
  sexAnswer?: string
  /** a current health consent yes (consent.ts hasCurrentConsent(s, 'health')) */
  healthYes: boolean
  /** profile.age; Tilo already requires MIN_AGE, checked again here (a test proves it) */
  age?: number | null
}

/**
 * Whether Cycle may be turned on and run: an adult with a
 * current health yes, whatever the sex answer (Sara, 20 Nov 2026; Equality Act, cycle-checks.md
 * item 2). Turning it on from settings goes through the same explanation, consent and setup as the
 * offer, and the route isn't recorded. Never asks or checks the sex answer.
 */
export function cycleAvailable(f: GateFacts): boolean {
  return f.healthYes && typeof f.age === 'number' && f.age >= MIN_AGE
}

/**
 * Whether the Profile "Your cycle" row (and turning Cycle off) shows: wherever Cycle may be turned
 * on, and always while it is on or a cycle consent exists, so withdrawal stays as easy as giving
 * it even if a health version bump leaves no current health yes (Art. 7(3); compliance, 20 Nov).
 * After "I don't have periods" it leaves Profile (A3, Sara 20 Nov); Cycle settings, turning it off
 * and delete stay under Profile › Privacy.
 */
export function cycleRowShows(f: GateFacts, cycleOn: boolean, cycleConsentExists: boolean, setup?: CycleSetup): boolean {
  if (closesOffer(setup)) return false
  return cycleOn || cycleConsentExists || cycleAvailable(f)
}

/** Whether the unprompted Cycle offer shows in Profile: cycleAvailable and the onboarding answer
 *  is female. Seeing it collects nothing. */
export function cycleOffered(f: GateFacts): boolean {
  return f.sexAnswer === 'female' && cycleAvailable(f)
}

/** "I don't have periods" closes the offer (§3). */
export const closesOffer = (setup: CycleSetup | undefined): boolean => setup === 'none'

/* ---------------- periods ---------------- */

const bleeds = (d: CycleDay | undefined): boolean => !!d?.flow && d.flow !== 'stopped'

export interface Period {
  start: string
  /** last day with flow (not Stopped) */
  last: string
  /** days from start to last, inclusive (spotting at either end included: "Day N" counts from it) */
  length: number
  /** days from the first to the last day with flow heavier than spotting, inclusive: what the
   *  long-bleed prompt measures, so spotting at the end of an ordinary period doesn't fire it */
  bleedLength: number
  heavyDays: number
  /** days with pain "A lot" (any day of the period, flow or not, up to its last flow day) */
  lotDays: number
}

/** Logged days sorted oldest first, invalid keys dropped. */
function sortedDays(days: Record<string, CycleDay>): string[] {
  return Object.keys(days).filter((k) => DAY_RE.test(k)).sort()
}

/**
 * The periods in the log, oldest first (§4). Flow on a day starts or carries on a period; the
 * next flow day carries on the same period when it comes within SILENT_END_DAYS of the last flow
 * day with nothing logged between, or within STOPPED_CARRY_DAYS of a Stopped (a dry day in the
 * middle). Spotting carries on a period but doesn't start one; spotting followed by flow within
 * STOPPED_CARRY_DAYS backdates the start to the first spotting day (mental-performance, 16 Nov;
 * confirmed by Sara, 20 Nov). Spotting counts towards "Day N" but not towards `bleedLength`.
 */
export function periodsOf(days: Record<string, CycleDay>): Period[] {
  const out: Period[] = []
  let cur: Period | null = null
  let stoppedAt: string | null = null
  /** spotting not carrying a period: flow within STOPPED_CARRY_DAYS backdates the start to it */
  let spotFrom: string | null = null
  for (const d of sortedDays(days)) {
    const v = days[d]
    // a Stopped counts only while the period is still running (ship-critic, 16 Nov): one tapped on
    // an ordinary day weeks later must not join the next period onto the last; the first Stopped
    // sets the dry-day allowance, a later one doesn't stretch it
    if (v.flow === 'stopped') { if (cur && stoppedAt === null && daysFrom(cur.last, d) <= SILENT_END_DAYS) stoppedAt = d; continue }
    if (!bleeds(v)) continue
    const carries = !!cur && (
      (stoppedAt === null && daysFrom(cur.last, d) <= SILENT_END_DAYS) ||
      (stoppedAt !== null && daysFrom(stoppedAt, d) <= STOPPED_CARRY_DAYS))
    if (cur && carries) {
      cur.last = d
    } else {
      if (v.flow === 'spotting') {
        if (!spotFrom || daysFrom(spotFrom, d) > STOPPED_CARRY_DAYS) spotFrom = d
        continue
      }
      const start = spotFrom && daysFrom(spotFrom, d) <= STOPPED_CARRY_DAYS ? spotFrom : d
      cur = { start, last: d, length: 1, bleedLength: 1, heavyDays: 0, lotDays: 0 }
      out.push(cur)
    }
    stoppedAt = null
    spotFrom = null
  }
  // counts over each period's span
  for (const p of out) {
    p.length = daysFrom(p.start, p.last) + 1
    let first: string | null = null, end: string | null = null
    for (let i = 0; i < p.length; i++) {
      const d = shiftDay(p.start, i)
      const v = days[d]
      if (bleeds(v) && v?.flow !== 'spotting') { first ??= d; end = d }
      if (v?.flow === 'heavy') p.heavyDays++
      if (v?.pain === 3) p.lotDays++
    }
    p.bleedLength = first && end ? daysFrom(first, end) + 1 : 0
  }
  return out
}

/** The period going on `today`, if any: its last flow day is within SILENT_END_DAYS and no
 *  Stopped came after it. */
export function currentPeriod(days: Record<string, CycleDay>, today: string): Period | null {
  const ps = periodsOf(Object.fromEntries(Object.entries(days).filter(([k]) => k <= today)))
  const p = ps[ps.length - 1]
  if (!p) return null
  const gap = daysFrom(p.last, today)
  if (gap < 0 || gap > SILENT_END_DAYS) return null
  for (let i = 1; i <= gap; i++) if (days[shiftDay(p.last, i)]?.flow === 'stopped') return null
  return p
}

/** "Day N of your period" (§1.2): the only cycle context Tilo shows. Null outside a period. */
export function periodDay(days: Record<string, CycleDay>, today: string): number | null {
  const p = currentPeriod(days, today)
  return p ? daysFrom(p.start, today) + 1 : null
}

/** The median gap between logged starts, or null with too few starts or an out-of-range gap.
 *  Internal: never shown (§4). */
function usualGap(ps: Period[]): number | null {
  if (ps.length < CYCLE_ROW.minStarts) return null
  const gaps = ps.slice(1).map((p, i) => daysFrom(ps[i].start, p.start)).slice(-6).sort((a, b) => a - b)
  const n = gaps.length
  const m = n % 2 ? gaps[(n - 1) / 2] : Math.round((gaps[n / 2 - 1] + gaps[n / 2]) / 2)
  return m >= CYCLE_ROW.gapMin && m <= CYCLE_ROW.gapMax ? m : null
}

/* ---------------- the check-in row (§4) ---------------- */

export interface RowFacts {
  /** profile.pregnancy?.flagged: pregnancy and breastfeeding pause Cycle's prompts (§3) */
  paused?: boolean
}

/**
 * Whether the check-in shows "Period today?" on `today` (Sara, 4 Nov): during a logged period and
 * CYCLE_ROW.afterDays after it; for 'regular' with enough logged starts, hidden between periods
 * and back CYCLE_ROW.earlyDays before the usual start until a period is logged; otherwise every
 * check-in. A pregnancy or breastfeeding pause hides it (Sara, 20 Nov).
 */
export function rowShows(store: CycleStore, today: string, f: RowFacts = {}): boolean {
  if (f.paused || store.setup === 'none') return false
  const ps = periodsOf(Object.fromEntries(Object.entries(store.days).filter(([k]) => k <= today)))
  const last = ps[ps.length - 1]
  if (last && daysFrom(last.last, today) <= CYCLE_ROW.afterDays) return true
  if (store.setup !== 'regular') return true
  const gap = usualGap(ps)
  if (gap === null || !last) return true
  return daysFrom(last.start, today) >= gap - CYCLE_ROW.earlyDays
}

/* ---------------- Train's lighter offer (§5) ---------------- */

/** One absolute signal for offerLighter's third argument: pain "A lot" today. Heavy flow alone
 *  doesn't count. Only Train and Today call this. */
export function cycleSignal(store: CycleStore | undefined, today: string): boolean {
  return store?.days[today]?.pain === 3
}

/* ---------------- weigh-in check (§5 Body) ---------------- */

/** Flow (not Stopped) logged on any day from `from` to `to` inclusive. */
export function bledBetween(store: CycleStore | undefined, from: string, to: string): boolean {
  if (!store) return false
  return Object.entries(store.days).some(([d, v]) => d >= from && d <= to && bleeds(v))
}

/** The note shown under an upward weigh-in change in a week with logged flow (§5 Body). Only
 *  where weight is already shown: never gentle or quiet modes. */
export const CYCLE_WEIGHT_NOTE = "Weight can read a bit higher around a period. It's mostly water and settles within days."

/* ---------------- safety prompts (§5.1) ---------------- */

export interface PromptFacts {
  /** pregnancy or breastfeeding: prompts pause (§3) */
  paused?: boolean
  /** days with a check-in (any answer), for 'no-period': it fires only if they kept checking in */
  checkinDays?: string[]
}

const T = CYCLE_THRESHOLDS

/** Whether a "usual" mark still holds, given the periods logged since it (§5.1 "the pattern changes"). */
function usualHolds(store: CycleStore, prompt: CyclePrompt, ps: Period[], today: string): boolean {
  const u = store.usual?.[prompt]
  if (!u) return false
  if (daysFrom(u.at, today) >= T.usualLapseDays) return false
  if (store.rearmedAt && store.rearmedAt >= u.at) return false
  // only periods that start after the tap count against it; the one running at the tap (a tap
  // mid-period) lifts the baseline to its final count instead (mental-performance, 16 Nov)
  const metric = (p: Period) => prompt === 'long-bleed' ? p.bleedLength : prompt === 'heavy' ? p.heavyDays : p.lotDays
  const running = ps.find((p) => p.start <= u.at && daysFrom(p.last, u.at) <= SILENT_END_DAYS)
  const base = Math.max(u.base, running ? metric(running) : 0)
  const since = ps.filter((p) => p.start > u.at)
  if (prompt === 'long-bleed') return !since.some((p) => p.bleedLength >= base + T.longBleedRearmExtra || p.bleedLength >= T.longBleedRearmDays)
  if (prompt === 'heavy' || prompt === 'pain') return !since.some((p) => metric(p) > base)
  return true
}

/** The baseline a "This is usual for me" tap records for a prompt, from the log up to `today`. */
export function usualBase(store: CycleStore, prompt: CyclePrompt, today: string): number {
  const ps = periodsOf(Object.fromEntries(Object.entries(store.days).filter(([k]) => k <= today)))
  if (prompt === 'long-bleed') return ps.length ? ps[ps.length - 1].bleedLength : 0
  if (prompt === 'heavy') return Math.max(0, ...ps.map((p) => p.heavyDays))
  if (prompt === 'pain') return Math.max(0, ...ps.map((p) => p.lotDays))
  return 0
}

/** Shown too recently: once per episode, at most once per T.promptGapDays. */
function recentlyShown(store: CycleStore, prompt: CyclePrompt, today: string): boolean {
  const s = store.shown?.[prompt]
  return !!s && daysFrom(s, today) < T.promptGapDays
}

/** Checked in at least T.noPeriodCheckinsPerBlock times in every T.noPeriodCheckinBlockDays block from `from` to `today`. */
function keptCheckingIn(checkins: string[], from: string, today: string): boolean {
  const set = new Set(checkins)
  for (let end = today; daysFrom(from, end) > 0; end = shiftDay(end, -T.noPeriodCheckinBlockDays)) {
    let n = 0, len = 0
    for (let i = 0; i < T.noPeriodCheckinBlockDays && daysFrom(from, shiftDay(end, -i)) >= 0; i++) { len++; if (set.has(shiftDay(end, -i))) n++ }
    // a shorter last block (a threshold that isn't a multiple of the block) needs proportionally fewer
    if (n < Math.ceil(T.noPeriodCheckinsPerBlock * len / T.noPeriodCheckinBlockDays)) return false
  }
  return true
}

/**
 * The long gap with no logged period, if it has run its length on `today` while they kept
 * checking in: the day it counts from, else null. Counts from the latest of the last logged
 * period's end (spotting never starts a period, so spotting on its own doesn't reset it:
 * mental-performance and Sara, 20 Nov), the end of a pregnancy pause, and a setup change, so
 * neither a pause nor a new answer fires it at once.
 */
function longGapFrom(store: CycleStore, today: string, f: PromptFacts): string | null {
  if (!store.setup || !(T.noPeriodSetups as readonly CycleSetup[]).includes(store.setup)) return null
  const ps = periodsOf(Object.fromEntries(Object.entries(store.days).filter(([k]) => k <= today)))
  const lastFlow = ps[ps.length - 1]?.last
  if (!lastFlow) return null
  const from = [lastFlow, store.resumedAt, store.rearmedAt].filter((x): x is string => !!x && x <= today).sort().pop()!
  const need = store.setup === 'irregular' ? T.noPeriodDaysIrregular : T.noPeriodDays
  if (daysFrom(from, today) < need) return null
  return keptCheckingIn(f.checkinDays ?? [], shiftDay(today, -need + 1), today) ? lastFlow : null
}

/**
 * The safety prompts due on `today`, in the order they show (only the first card opens with
 * "You know what's usual…"; the copy belongs to boards G1/G2, still being redrawn). Generic
 * signposting, never an assessment. "When to get help" isn't here: it's always reachable.
 */
export function promptsDue(store: CycleStore, today: string, f: PromptFacts = {}): CyclePrompt[] {
  if (f.paused || store.setup === 'none' || !store.setup) return []
  const ps = periodsOf(Object.fromEntries(Object.entries(store.days).filter(([k]) => k <= today)))
  const out: CyclePrompt[] = []
  const ok = (p: CyclePrompt) => !recentlyShown(store, p, today) && !usualHolds(store, p, ps, today)
  // long bleeding: the current (or just ended) period has run more than T.longBleedDays
  const last = ps[ps.length - 1]
  if (last && last.bleedLength > T.longBleedDays && daysFrom(last.last, today) <= SILENT_END_DAYS && ok('long-bleed')) out.push('long-bleed')
  // heavy, pain: in at least T.acrossPeriods of the recent periods (a single heavy cycle doesn't
  // fire it), shown only during the period or just after it, never weeks later out of context
  const recent = ps.slice(-T.recentPeriods)
  const inContext = !!last && daysFrom(last.last, today) <= SILENT_END_DAYS
  if (inContext && last.heavyDays > 0 && recent.filter((p) => p.heavyDays > 0).length >= T.acrossPeriods && ok('heavy')) out.push('heavy')
  if (inContext && last.lotDays > 0 && recent.filter((p) => p.lotDays > 0).length >= T.acrossPeriods && ok('pain')) out.push('pain')
  // no logged period for a long stretch, only while they kept checking in; once per gap (the
  // next logged period clears it), not every T.promptGapDays
  const gap = longGapFrom(store, today, f)
  const shownThisGap = !!gap && !!store.shown?.['no-period'] && store.shown['no-period']! > gap
  if (gap && !shownThisGap) out.push('no-period')
  return out
}

/**
 * Whether the maintenance loop holds off suggesting a deficit (§5.1 no-period, for people in a
 * deficit): true while 'no-period' would be due, whether or not the prompt was dismissed, until a
 * period is logged. PROVISIONAL and pending a regulatory view (§6, §10.3): wired only behind
 * CYCLE_ENABLED.
 */
export function holdsDeficit(store: CycleStore | undefined, today: string, f: PromptFacts = {}): boolean {
  if (!store?.setup || f.paused) return false
  return longGapFrom(store, today, f) !== null
}

/* ---------------- store edits (pure: callers own persistence) ----------------
 * These change a CycleStore in place and save nothing. Every caller (the native Cycle screens)
 * edits a copy from deviceOnly.cycleLog and writes it back with deviceOnly.saveCycle, whose
 * CycleContext needs a current cycle yes; never write `deviceOnly.cycle` directly. */

export const emptyCycle = (): CycleStore => ({ days: {} })

/** Log or change a day's answers. An empty day is removed. Future days are refused. */
export function logDay(store: CycleStore, day: string, v: CycleDay, today: string): boolean {
  if (!DAY_RE.test(day) || day > today) return false
  const clean = cleanDay(v)
  if (clean) store.days[day] = clean; else delete store.days[day]
  return true
}

/** "Period started" (§4): flow on `day` (default Medium, the middle answer) without the check-in. */
export function periodStarted(store: CycleStore, day: string, today: string, flow: CycleFlow = 'medium'): boolean {
  if (flow === 'stopped') return false
  return logDay(store, day, { ...store.days[day], flow }, today)
}

/** Change the setup answer: re-arms every "usual" mark (§5.1) and logs the change for the alpha review. */
export function setSetup(store: CycleStore, setup: CycleSetup, today: string): void {
  if (store.setup === setup) return
  if (store.setup) store.rearmedAt = today
  store.setup = setup
  store.setupLog = [...(store.setupLog ?? []), { at: today, setup }].slice(-50)
}

/** A pregnancy pause starts: re-arms every "usual" mark (§5.1). */
export function pregnancyRearm(store: CycleStore, today: string): void { store.rearmedAt = today }

/** A pregnancy pause ended: the long-gap count starts again from today. */
export function pregnancyEnded(store: CycleStore, today: string): void { store.resumedAt = today }

/** "This is usual for me" on a prompt (never on "When to get help"). */
export function markUsual(store: CycleStore, prompt: Exclude<CyclePrompt, 'no-period'>, today: string): void {
  store.usual = { ...store.usual, [prompt]: { at: today, base: usualBase(store, prompt, today) } }
}

export function markShown(store: CycleStore, prompts: CyclePrompt[], today: string): void {
  if (!prompts.length) return
  store.shown = { ...store.shown }
  for (const p of prompts) store.shown[p] = today
}

/* ---------------- validation (load, backup import) ---------------- */

function cleanDay(x: unknown): CycleDay | null {
  if (!x || typeof x !== 'object') return null
  const v = x as Record<string, unknown>
  const out: CycleDay = {}
  if (CYCLE_FLOWS.includes(v.flow as CycleFlow)) out.flow = v.flow as CycleFlow
  if (v.pain === 1 || v.pain === 2 || v.pain === 3) out.pain = v.pain
  if (Array.isArray(v.chips)) {
    const chips = CYCLE_CHIPS.filter((c) => (v.chips as unknown[]).includes(c))
    if (chips.length) out.chips = chips
  }
  return Object.keys(out).length ? out : null
}

const isDay = (v: unknown): v is string => typeof v === 'string' && DAY_RE.test(v) && !isNaN(ms(v))

/** A stored or imported cycle store made valid; unknown keys and bad values dropped. Undefined when empty. */
export function cleanCycle(x: unknown): CycleStore | undefined {
  if (!x || typeof x !== 'object') return undefined
  const c = x as Record<string, unknown>
  const out: CycleStore = { days: {} }
  if (CYCLE_SETUPS.includes(c.setup as CycleSetup)) out.setup = c.setup as CycleSetup
  if (c.days && typeof c.days === 'object') {
    for (const [k, v] of Object.entries(c.days as Record<string, unknown>)) {
      if (!isDay(k)) continue
      const d = cleanDay(v)
      if (d) out.days[k] = d
    }
  }
  const marks = (src: unknown, keep: (v: unknown) => boolean) => {
    if (!src || typeof src !== 'object') return undefined
    const o: Record<string, unknown> = {}
    for (const p of CYCLE_PROMPTS) { const v = (src as Record<string, unknown>)[p]; if (keep(v)) o[p] = v }
    return Object.keys(o).length ? o : undefined
  }
  const usual = marks(c.usual, (v) => !!v && typeof v === 'object' && isDay((v as UsualMark).at) && Number.isInteger((v as UsualMark).base) && (v as UsualMark).base >= 0 && (v as UsualMark).base < 400)
  if (usual) out.usual = Object.fromEntries(Object.entries(usual).map(([k, v]) => [k, { at: (v as UsualMark).at, base: (v as UsualMark).base }])) as CycleStore['usual']
  const shown = marks(c.shown, isDay)
  if (shown) out.shown = shown as CycleStore['shown']
  if (isDay(c.rearmedAt)) out.rearmedAt = c.rearmedAt
  if (isDay(c.resumedAt)) out.resumedAt = c.resumedAt
  if (Array.isArray(c.setupLog)) {
    const log = c.setupLog.filter((e): e is { at: string; setup: CycleSetup } => !!e && typeof e === 'object' && isDay((e as { at: unknown }).at) && CYCLE_SETUPS.includes((e as { setup: CycleSetup }).setup)).map((e) => ({ at: e.at, setup: e.setup })).slice(-50)
    if (log.length) out.setupLog = log
  }
  return out.setup || Object.keys(out.days).length || out.usual || out.shown || out.setupLog ? out : undefined
}

/** How many days the log holds (the withdrawal and delete confirm steps). No contents. */
export const cycleCount = (store: CycleStore | undefined): number => (store ? Object.keys(store.days).length : 0)
