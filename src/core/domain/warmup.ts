/**
 * Session length as a range (board ob2-4, note s-ob8 points 3 and 4) and the warm-up that goes
 * with it. Every session starts with a warm-up, never zero and never trimmed; its length follows
 * the session: 15–20 min → 4, 20–30 → 5, 30–45 → 6, 45–60 → 8, 60+ → 10 (fitness-workouts).
 * Ready-made plans use 6. `buildWarmup` writes the block itself. Pure: no React, no DOM.
 */
import type { Equipment, SessionRange } from '../types'
import { EXERCISE_BY_ID } from '../data/exercises'
import { CARDIO_EASY, WARMUP_CUES, WARMUP_KIT_SWAPS, WARMUP_LISTS } from '../data/warmups'
export type { SessionRange } from '../types'

/** The ranges offered, shortest first. */
export const SESSION_RANGES: SessionRange[] = ['15-20', '20-30', '30-45', '45-60', '60+']

/** How a range reads on its chip ("15–20", "60+"). */
export const rangeLabel = (r: SessionRange): string => r.replace('-', '–')

const WARMUP: Record<SessionRange, number> = { '15-20': 4, '20-30': 5, '30-45': 6, '45-60': 8, '60+': 10 }

/** Minutes of warm-up at the start of a session of this length. */
export const warmupMinutes = (r: SessionRange): number => WARMUP[r]

/** The warm-up of a Tali ready-made plan's sessions. */
export const PLAN_WARMUP_MINUTES = 6

/**
 * The engine's session length for a range: the nearest of its current options (10, 20, 30, 45,
 * 60), taking the top of the range on a tie, since the engine fits a session to at most its
 * minutes (board ob3-1: 20–30 is "about 30 min").
 */
const ENGINE: Record<SessionRange, 20 | 30 | 45 | 60> = { '15-20': 20, '20-30': 30, '30-45': 45, '45-60': 60, '60+': 60 }
export const rangeEngineMinutes = (r: SessionRange): 20 | 30 | 45 | 60 => ENGINE[r]

/** A stored engine length read back as a range (older answers, before ranges). */
export function rangeFromMinutes(m: number): SessionRange {
  if (m <= 20) return '15-20'
  if (m <= 30) return '20-30'
  if (m <= 45) return '30-45'
  return '60+'
}

/** The warm-up for an engine length or a stored range: the range when there is one, else the nearest. */
export const warmupMinutesFor = (range?: SessionRange, minutes?: number): number => warmupMinutes(range ?? rangeFromMinutes(minutes ?? 30))

/**
 * About 90 seconds of lighter sets on the first weighted lift (fitness-workouts). They stay inside
 * that lift (the player's "Log a warm-up set"), so they're time, not part of the block.
 */
export const RAMP_MINUTES = 1.5

// ─── The block ───────────────────────────────────────────────────────────────────────────────

/** Which joints the warm-up prepares: the session's kind (from its exercises; see warmupKindOf). */
export type WarmupKind = 'legs' | 'push' | 'pull' | 'full' | 'cardio' | 'mind-body'

export interface WarmupMove {
  /** a library id (for its still and its name) */
  id: string
  n: string
  /** the warm-up version of the cue: always within a comfortable range */
  cue: string
  /** seconds for the move; a one-sided move switches sides halfway */
  sec: number
  perSide: boolean
}

export interface WarmupBlock {
  kind: WarmupKind
  /** always the minutes promised: the moves and the gaps add up to exactly this */
  mins: number
  /** the pause between moves, for getting into place */
  gapSec: number
  moves: WarmupMove[]
}

export const WARMUP_GAP_SEC = 5
/** Moves in the block (the pulse raiser included) by its minutes: 4 → 3 … 10 → 7. */
const MOVES: [number, number][] = [[10, 7], [8, 6], [6, 5], [5, 4], [4, 3]]
const movesFor = (mins: number) => (MOVES.find(([m]) => mins >= m) ?? MOVES[MOVES.length - 1])[1]

/** Floor moves come before standing ones, so the block ends on the person's feet, ready to lift. */
const FLOOR = new Set(['worlds-greatest-stretch', 'glute-bridge', 'hip-90-90', 'open-book', 'cat-cow', 'thread-the-needle'])

const name = (id: string) => EXERCISE_BY_ID[id]?.n ?? id
const sided = (id: string) => !!EXERCISE_BY_ID[id]?.perSide
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

/**
 * The warm-up for a session: pure and deterministic (the same inputs give the same block).
 * - `mins` wins; else the session `range`; else the ready-made plans' 6. Never zero, never trimmed.
 * - `kit`: kit the person has. A move needing kit they don't have (a band) becomes a no-kit one.
 * - `avoid`: library ids already in the session's main work (a yoga flow's own sun salutations).
 * - `activity`: a cardio session's library id; its easy start is the pulse raiser.
 * Seconds: the pulse raiser gets 1–2 minutes, the moving stretches share the rest (one-sided moves
 * count twice, so each side gets as long as a two-sided move), in 5 s steps, with a 5 s gap between
 * moves. The total is exactly `mins`.
 */
export function buildWarmup(o: { kind: WarmupKind; mins?: number; range?: SessionRange; kit?: readonly Equipment[]; avoid?: readonly string[]; activity?: string }): WarmupBlock {
  const mins = Math.max(4, Math.round(o.mins ?? (o.range ? warmupMinutes(o.range) : PLAN_WARMUP_MINUTES)))
  const T = mins * 60
  const kit = new Set(o.kit ?? [])
  const avoid = new Set(o.avoid ?? [])
  const act = o.activity ? EXERCISE_BY_ID[o.activity] : undefined
  const running = o.kind === 'cardio' && act?.cardioVariation === 'running'

  // the pulse raiser
  let pulse: Omit<WarmupMove, 'sec'>
  if (o.kind === 'cardio' && act) {
    const e = CARDIO_EASY[running ? 'running' : act.cardioVariation === 'walking' ? 'walking' : 'other']
    pulse = { id: act.id, n: e.n(act.n.replace(/\s*\(.*\)\s*$/, '')), cue: e.cue, perSide: false }
  } else {
    const id = o.kind === 'mind-body' && !avoid.has('half-sun-salutation') ? 'half-sun-salutation'
      : mins >= 8 && o.kind !== 'mind-body' && o.kind !== 'cardio' ? 'step-jacks' : 'march-on-the-spot'
    pulse = { id, n: id === 'march-on-the-spot' ? 'March on the spot' : name(id), cue: WARMUP_CUES[id], perSide: false }
  }
  avoid.add(pulse.id)

  // the moving stretches: a cardio session other than running is its easy start alone
  const list = o.kind === 'cardio' ? (running ? WARMUP_LISTS.running : null) : WARMUP_LISTS[o.kind]
  const want = list ? Math.min(movesFor(mins) - 1, list.moves.length) : 0
  const picked: string[] = []
  const usable = (id: string) => {
    const sw = WARMUP_KIT_SWAPS[id]
    const real = sw && !kit.has(sw.needs) ? sw.swap : id
    return avoid.has(real) || picked.includes(real) ? null : real
  }
  for (const id of [...(list?.moves ?? []), ...(list?.reserve ?? [])]) {
    if (picked.length >= want) break
    const real = usable(id)
    if (real) picked.push(real)
  }
  const order = [...picked.filter((id) => FLOOR.has(id)), ...picked.filter((id) => !FLOOR.has(id))]

  // seconds: 40 s a unit to start, the pulse raiser takes what's left within 1–2 minutes (a cardio
  // easy start isn't capped), then the stretches share the rest in 5 s steps
  const units = order.map((id) => (sided(id) ? 2 : 1))
  const U = units.reduce((a, b) => a + b, 0)
  const gaps = WARMUP_GAP_SEC * order.length
  const room = T - gaps
  let p = U ? (o.kind === 'cardio' ? room - 35 * U : Math.min(120, Math.max(60, room - 40 * U))) : room
  const per = U ? (room - p) / U : 0
  const secs = units.map((u) => (u === 2 ? Math.round((per * 2) / 10) * 10 : Math.round(per / 5) * 5))
  p = room - secs.reduce((a, b) => a + b, 0)
  // rounding goes back into the stretches, so the pulse raiser stays within its 1–2 minutes
  for (let k = 0; U && o.kind !== 'cardio' && (p > 120 || p < 60) && k < 100; k++) {
    const j = k % secs.length, step = (units[j] === 2 ? 10 : 5) * (p > 120 ? 1 : -1)
    if (p > 120 ? p - step < 60 : p - step > 120) break
    secs[j] += step; p -= step
  }
  const moves: WarmupMove[] = [{ ...pulse, sec: p }, ...order.map((id, k) => ({ id, n: name(id), cue: WARMUP_CUES[id], sec: secs[k], perSide: sided(id) }))]
  return { kind: o.kind, mins, gapSec: WARMUP_GAP_SEC, moves }
}

/** "March on the spot, leg swings, arm circles and bodyweight squats" for a row under "Warm-up". */
export function warmupLine(b: WarmupBlock): string {
  const ns = b.moves.map((m, i) => (i ? lower(m.n) : m.n))
  return ns.length > 1 ? `${ns.slice(0, -1).join(', ')} and ${ns[ns.length - 1]}` : ns[0] ?? ''
}

const LOWER = new Set(['quads', 'hamstrings', 'glutes', 'calves'])
const PUSH = new Set(['chest', 'shoulders', 'triceps'])
const PULL = new Set(['back', 'biceps', 'forearms'])

/**
 * The session kind from its exercises: cardio when its time is mostly cardio, mind-body for yoga,
 * pilates and mobility, else by the muscles worked (mostly legs → legs; little or no leg work →
 * push or pull, an upper-body mix warming up as push; anything else → full body).
 */
export function warmupKindOf(exIds: readonly string[]): { kind: WarmupKind; activity?: string } {
  const xs = exIds.map((id) => EXERCISE_BY_ID[id]).filter((x): x is NonNullable<typeof x> => !!x)
  const cardio = xs.find((x) => x.modality === 'cardio' && x.log === 'duration')
  const resist = xs.filter((x) => (x.modality === 'strength' || x.modality === 'calisthenics') && x.primary && x.primary !== 'core')
  if (!resist.length) {
    if (cardio) return { kind: 'cardio', activity: cardio.id }
    if (xs.some((x) => x.modality === 'yoga' || x.modality === 'pilates' || x.modality === 'mobility')) return { kind: 'mind-body' }
    return { kind: 'full' }
  }
  let lo = 0, pu = 0, pl = 0
  for (const x of resist) { if (LOWER.has(x.primary!)) lo++; else if (PUSH.has(x.primary!)) pu++; else if (PULL.has(x.primary!)) pl++ }
  const n = resist.length
  if (lo / n >= 0.6) return { kind: 'legs' }
  if (lo / n <= 0.2) return { kind: pl > pu ? 'pull' : 'push' }
  return { kind: 'full' }
}
