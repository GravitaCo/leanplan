import type { DayLog, Exercise, ExerciseTemplate, LoggedExercise, LogShape, SetEntry } from '@/core/types'
import { sessionsOf } from './sessions'
import { shorterPrescription, shorterSets } from './dayOptions'
import { fmtSet, sameExercise } from './library'

/**
 * The guided session (Train redesign, stage 4): prescriptions, rest defaults, "last time" and
 * the target that "Done as planned" logs. Rules agreed with fitness-workouts:
 * - target reps = min(last time's reps for that set + 1, top of the range), at last time's
 *   weight; no +1 when that set was marked "a real struggle" or "stopped early";
 * - "last time" = the most recent session of this exercise with the same rep range, warm-ups
 *   excluded; with none, the first set opens Adjust instead;
 * - the weight is never raised or lowered on its own; reaching the top of the range on every
 *   set only shows a passive hint (readyToStepUp), never on a shorter day.
 */

export interface Range { lo: number; hi: number }
export interface Rx {
  /** planned sets ("2–3" → 2 to 3); null when the prescription names no sets ("20–30 min") */
  sets: Range | null
  /** reps (or seconds / minutes, see unit) per set */
  reps: Range | null
  unit: 'reps' | 'sec' | 'min'
}

const num = (a: string, b?: string): Range => ({ lo: parseInt(a), hi: parseInt(b ?? a) })

/** "3 × 10–12" · "2–3 × 12" · "3 × 20–40 sec" · "20–30 min" · "45 sec each side" · "10 each way" */
export function parseRx(t: string | undefined): Rx {
  const s = (t || '').trim()
  const a = s.match(/^(\d+)(?:\s*[–-]\s*(\d+))?\s*×\s*(\d+)(?:\s*[–-]\s*(\d+))?\s*(sec|min)?/)
  if (a) return { sets: num(a[1], a[2]), reps: num(a[3], a[4]), unit: a[5] === 'sec' ? 'sec' : a[5] === 'min' ? 'min' : 'reps' }
  const b = s.match(/^(\d+)(?:\s*[–-]\s*(\d+))?\s*(sec|min)\b/)
  if (b) return { sets: null, reps: num(b[1], b[2]), unit: b[3] as 'sec' | 'min' }
  const c = s.match(/^(\d+)(?:\s*[–-]\s*(\d+))?/)
  return { sets: null, reps: c ? num(c[1], c[2]) : null, unit: 'reps' }
}

/** Same rep range, whatever the set count: a shorter day ("2 × 10–12") still matches "3 × 10–12". */
export function sameRange(a: string | undefined, b: string | undefined): boolean {
  const x = parseRx(a), y = parseRx(b)
  return !!x.reps && !!y.reps && x.unit === y.unit && x.reps.lo === y.reps.lo && x.reps.hi === y.reps.hi
}

/** Working sets the player plans for a slot: the top of the range (the person can move on sooner). */
export function plannedSets(t: string, shorter = false): number {
  if (shorter) return shorterSets(t) ?? 1
  return parseRx(t).sets?.hi ?? 1
}

/** "14–15 sets" for a workout (or "10 sets" on a shorter day). */
export function setCount(ex: { t: string }[], shorter = false): string {
  let lo = 0, hi = 0
  for (const e of ex) {
    if (shorter) { const n = plannedSets(e.t, true); lo += n; hi += n; continue }
    const r = parseRx(e.t).sets ?? { lo: 1, hi: 1 }
    lo += r.lo; hi += r.hi
  }
  return lo === hi ? `${lo} ${lo === 1 ? 'set' : 'sets'}` : `${lo}–${hi} sets`
}

const COMPOUND = new Set(['squat', 'hinge', 'lunge', 'horizontal-push', 'vertical-push', 'horizontal-pull', 'vertical-pull', 'carry'])

/**
 * Rest after a set, in seconds: a routine's own restSec wins; otherwise by the library pattern.
 * Big compound lifts 2 min, isolation 90 s, core and holds 60 s. Mobility, yoga and pilates moves
 * (no pattern) 60 s; anything unknown 90 s, the shipped "about 90 seconds".
 */
export function restFor(x: Exercise | undefined, tpl?: Pick<ExerciseTemplate, 'restSec'>): number {
  if (tpl?.restSec != null && tpl.restSec >= 0) return tpl.restSec
  if (!x) return 90
  if (x.log === 'hold' || x.pattern === 'core') return 60
  if (x.pattern && COMPOUND.has(x.pattern)) return 120
  if (x.pattern === 'isolation') return 90
  return x.modality === 'strength' || x.modality === 'calisthenics' ? 90 : 60
}

/** The line under "Rest" in the player. */
export function restHint(sec: number): string {
  if (sec >= 120) return `Rest about ${sec % 60 ? fmtClock(sec) : sec / 60 + ' minutes'}`
  if (sec === 60) return 'About a minute is plenty here'
  return `Rest about ${sec} seconds`
}

/** 72 → "1:12" */
export function fmtClock(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export const working = (sets: SetEntry[] | undefined): SetEntry[] => (sets || []).filter((s) => !s.warmup)

/**
 * The most recent earlier session of this exercise (by library id, or by name for older logs)
 * with the same rep range and at least one working set. Warm-ups are dropped from what it
 * returns. Logs from before `rx` was recorded count as the same range (they were logged against
 * the built-in prescription, which hasn't changed).
 */
export function lastTime(days: Record<string, DayLog>, before: string, exId: string | undefined, name: string, rx: string): LoggedExercise | null {
  const ds = Object.keys(days).filter((d) => d < before).sort().reverse()
  for (const d of ds) {
    for (const s of [...sessionsOf(days[d], d)].reverse()) {
      for (const x of s.ex || []) {
        if (!sameExercise(x, exId, name)) continue
        const sets = working(x.sets)
        if (!sets.length) continue
        if (x.rx && !sameRange(x.rx, rx)) continue
        return { ...x, sets }
      }
    }
  }
  return null
}

export interface SetTarget { w: string; reps: string; sec?: string; mins?: string; assist?: boolean }

const int = (v: string | undefined) => { const n = parseInt(v || ''); return Number.isFinite(n) ? n : null }

/**
 * What "Done as planned" logs for working set `i` (0-based). `done` is this session's working sets
 * so far for the slot. Null means there's nothing to aim for yet (a first weighted set): the
 * player opens Adjust instead.
 */
export function targetFor(shape: LogShape, rx: string, last: LoggedExercise | null, i: number, done: SetEntry[] = []): SetTarget | null {
  const p = parseRx(rx)
  const top = p.reps?.hi ?? null
  const prev = i > 0 ? done[i - 1] : undefined

  if (shape === 'weight-reps' || shape === 'reps') {
    const L = last?.sets.length ? last.sets[Math.min(i, last.sets.length - 1)] : undefined
    const lr = int(L?.reps)
    let base: SetTarget | null = null
    if (L && lr != null) {
      const reps = L.feel === 'struggle' || L.feel === 'stopped' || top == null ? lr : Math.min(lr + 1, top)
      base = { w: L.w || '', reps: String(reps), ...(L.assist ? { assist: true } : {}) }
    }
    if (prev && int(prev.reps) != null) {
      // this session's own numbers: a first-ever session repeats the set just logged. Once the
      // weight has been changed from last time's on any earlier set, later sets use the weight
      // just lifted: after a raise, aim for the reps just managed at the new weight (capped at
      // the target); after lowering, keep the target reps
      if (!base) return { w: prev.w || '', reps: prev.reps, ...(prev.assist ? { assist: true } : {}) }
      const baseW = (k: number) => last?.sets[Math.min(k, last.sets.length - 1)]?.w || ''
      const changed = done.slice(0, i).some((d, k) => (d.w || '') !== baseW(k))
      if (changed) {
        const up = parseFloat(prev.w || '0') > parseFloat(base.w || '0')
        const reps = up ? String(Math.min(int(prev.reps)!, int(base.reps) ?? int(prev.reps)!)) : base.reps
        return { ...base, w: prev.w || '', reps, ...(prev.assist ? { assist: true } : {}) }
      }
    }
    return base
  }
  if (shape === 'hold') {
    const L = last?.sets[Math.min(i, (last?.sets.length ?? 1) - 1)]
    const s = int(L?.sec || L?.reps) ?? (p.unit === 'sec' ? p.reps?.lo : p.unit === 'min' && p.reps ? p.reps.lo * 60 : null)
    return s != null ? { w: '', reps: '', sec: String(s) } : null
  }
  if (shape === 'duration') {
    const m = p.unit === 'min' && p.reps ? p.reps.lo : int(last?.sets[0]?.mins)
    return m != null ? { w: '', reps: '', mins: String(m) } : null
  }
  if (shape === 'rounds') {
    const r = int(last?.sets[Math.min(i, (last?.sets.length ?? 1) - 1)]?.reps) ?? p.reps?.hi ?? null
    return r != null ? { w: '', reps: String(r) } : null
  }
  return { w: '', reps: '' } // check: done / not done
}

/**
 * Every working set last time reached the top of the range, and none was a real struggle or
 * stopped early. A passive hint only ("try a little more weight if it felt steady"): nothing
 * changes by itself, and callers don't show it on a shorter day.
 */
export function readyToStepUp(last: LoggedExercise | null, rx: string): boolean {
  const top = parseRx(rx).reps?.hi
  const sets = working(last?.sets)
  if (top == null || !sets.length || parseRx(rx).unit !== 'reps') return false
  return sets.every((s) => (int(s.reps) ?? 0) >= top && s.feel !== 'struggle' && s.feel !== 'stopped')
}

/** A target (or a logged set) in words for the player: "40 kg × 11", "12 reps", "30 sec". */
export function fmtTarget(t: SetTarget | SetEntry | null, shape: LogShape): string {
  if (!t) return ''
  if (shape === 'check') return 'Done'
  return fmtSet({ w: t.w, reps: t.reps, sec: t.sec, mins: t.mins, assist: t.assist }, shape)
}

/** One line per exercise on the finish sheet: "40 kg · 11, 11, 9", "30, 30, 25 sec", or "Not today". */
export function setsLine(sets: SetEntry[] | undefined, shape: LogShape): string {
  const w = working(sets)
  if (!w.length) return 'Not today'
  if (shape === 'weight-reps' && w.every((s) => s.w && s.w === w[0].w && s.reps)) return `${w[0].w} kg · ${w.map((s) => s.reps).join(', ')}`
  if (shape === 'hold' && w.every((s) => s.sec || s.reps)) return `${w.map((s) => s.sec || s.reps).join(', ')} sec`
  if (shape === 'check') return `${w.filter((s) => s.done).length} done`
  return w.map((s) => fmtSet(s, shape)).filter(Boolean).join(', ')
}

/** The slot that gets the warm-up card: the first weighted (kg × reps) exercise. */
export function warmupSlot(shapes: LogShape[]): number {
  return shapes.indexOf('weight-reps')
}

/** "Do this later": move slot `at` in the play order to the end (today only). */
export function later<T>(order: T[], at: number): T[] {
  if (at < 0 || at >= order.length - 1) return order
  return [...order.slice(0, at), ...order.slice(at + 1), order[at]]
}

/** How a slot is logged: the library entry's shape (a plank from before ids: a hold). */
export function shapeFor(t: ExerciseTemplate, x?: Exercise): LogShape {
  return x?.log ?? (t.n.toLowerCase().includes('plank') ? 'hold' : 'weight-reps')
}

export interface Slot {
  /** index in the workout as written (sessions save in this order, whatever the play order) */
  i: number
  /** the workout's own exercise for this slot */
  planned: ExerciseTemplate
  /** what's in the slot today: the planned move, or the library entry swapped in */
  shown: ExerciseTemplate
  x?: Exercise
  swapped: boolean
  shape: LogShape
  /** today's prescription (shorter-adjusted) */
  rx: string
  /** the full prescription, recorded on the log for "last time" */
  fullRx: string
  sets: number
  /** sets that are planned rather than optional ("2–3" → 2); equals `sets` on a shorter day */
  setsLo: number
}

/** A workout's slots for today, with today-only swaps (slot index → library id). */
export function slotsOf(tpls: ExerciseTemplate[], swaps: Record<number, string>, shorter: boolean, byId: (id: string | undefined) => Exercise | undefined): Slot[] {
  return tpls.map((e, i) => {
    const sw = swaps[i] ? byId(swaps[i]) : undefined
    const x = sw ?? byId(e.id)
    const shown: ExerciseTemplate = sw ? { id: sw.id, n: sw.n, t: sw.defaultRx ?? e.t, cue: sw.cue, video: sw.video } : e
    const rx = shorter ? shorterPrescription(shown.t) : shown.t
    return { i, planned: e, shown, x, swapped: !!sw, shape: shapeFor(e, x), rx, fullRx: shown.t, sets: plannedSets(shown.t, shorter),
      setsLo: shorter ? plannedSets(shown.t, true) : Math.min(parseRx(shown.t).sets?.lo ?? plannedSets(shown.t), plannedSets(shown.t)) }
  })
}

const slotName = (s: Slot) => (s.swapped && s.x ? s.x.n : s.planned.n)

/**
 * Whether a logged exercise is this slot's: by library id when it has one, by name otherwise,
 * and for older logs with neither a matching id nor name (a name changed since, such as
 * "Dumbbell biceps curl") by position, as the earlier Train form read them.
 */
export function matchLogged(L: LoggedExercise | undefined, s: Slot, byPosition = true): boolean {
  if (!L) return false
  if (L.exId) return L.exId === s.x?.id
  if (L.name === slotName(s) || L.name === s.shown.n) return true
  return byPosition && !s.swapped
}

/**
 * A saved session's exercises split into the slots on screen and everything else. Nothing is
 * ever dropped: an entry that doesn't belong to the slot at its position (a move swapped out
 * after sets were logged) is kept as an extra, and goes back into a slot that matches it.
 */
export function splitLogged(ex: LoggedExercise[] | undefined, slots: Slot[]): { bySlot: Record<number, SetEntry[]>; extras: LoggedExercise[]; logs: Record<number, LogShape | undefined> } {
  const list = ex || []
  const bySlot: Record<number, SetEntry[]> = {}
  /** the shape each matched entry was logged with (older logs render in their own layout) */
  const logs: Record<number, LogShape | undefined> = {}
  const used = new Set<number>()
  for (const s of slots) {
    if (matchLogged(list[s.i], s)) { bySlot[s.i] = list[s.i].sets.map((y) => ({ ...y })); logs[s.i] = list[s.i].log; used.add(s.i) }
  }
  for (const s of slots) {
    if (bySlot[s.i]) continue
    const j = list.findIndex((L, k) => !used.has(k) && L.sets?.length && matchLogged(L, s, false))
    if (j >= 0) { bySlot[s.i] = list[j].sets.map((y) => ({ ...y })); logs[s.i] = list[j].log; used.add(j) }
    else bySlot[s.i] = []
  }
  const extras = list.filter((L, k) => !used.has(k) && L && L.sets?.length)
  return { bySlot, extras, logs }
}

/** The slot as it will be with library entry `id` in it (the planned id puts the planned move back). */
export function reslot(slot: Slot, id: string, shorter: boolean, byId: (id: string | undefined) => Exercise | undefined): Slot {
  const [s] = slotsOf([slot.planned], id === slot.planned.id ? {} : { 0: id }, shorter, byId)
  return { ...s, i: slot.i }
}

/**
 * A swap in one slot: what was logged for the move going out is kept as an extra, and the move
 * coming in takes back anything already logged for it today (swap X → Y → X keeps X's sets in
 * the slot, once). Returns the slot as it now is, its sets, and the extras.
 */
export function swapInto(slot: Slot, id: string, sets: SetEntry[], extras: LoggedExercise[], shorter: boolean, byId: (id: string | undefined) => Exercise | undefined): { slot: Slot; sets: SetEntry[]; extras: LoggedExercise[]; log?: LogShape } {
  const out = sets.length
    ? [...extras, { name: slotName(slot), ...(slot.x ? { exId: slot.x.id } : {}), log: slot.shape, rx: slot.fullRx, sets: sets.map((y) => (slot.shape === 'hold' ? { ...y, reps: y.sec || y.reps } : y)) }]
    : [...extras]
  const next = reslot(slot, id, shorter, byId)
  const j = out.findIndex((e) => e.sets?.length && matchLogged(e, next, false))
  if (j < 0) return { slot: next, sets: [], extras: out }
  const back = out[j]
  return { slot: next, sets: back.sets.map((y) => ({ ...y })), extras: out.filter((_, k) => k !== j), log: back.log }
}

/** What a save writes: every slot in the workout's order, then the extras, untouched. */
export function buildLogged(slots: Slot[], bySlot: Record<number, SetEntry[]>, extras: LoggedExercise[]): LoggedExercise[] {
  return [
    ...slots.map((s) => ({
      name: slotName(s), ...(s.x ? { exId: s.x.id } : {}), log: s.shape, rx: s.fullRx,
      // holds also keep their seconds in `reps`, which is where older installs read them
      sets: (bySlot[s.i] || []).map((y) => (s.shape === 'hold' ? { ...y, reps: y.sec || y.reps } : y)),
    })),
    ...extras,
  ]
}

/**
 * Minutes to save at the end of a guided session: the earlier value plus this stint, and only
 * on today (a stint timed while logging another day says nothing about that day). Undefined
 * leaves the session's minutes as they were, so a strength session with none still falls back
 * to the default for estimates.
 */
export function stintMins(prev: number | undefined, stintMs: number, isToday: boolean): number | undefined {
  if (!isToday) return prev
  return Math.max(1, Math.round((prev ?? 0) + stintMs / 60000))
}
