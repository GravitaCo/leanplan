/**
 * WP12: Reset's strings (wellbeing copy deck v2, board B7 with the P6 Glow pacer, canvas 8c). The
 * phase words ("Breathe in", "And in again", "Breathe out") live with the timings in
 * core/data/skills.ts (RESET_PATTERN). Every string here is linted with mindCopyIssues
 * (scripts/wellbeing/reset.ts). Kept in its own file so parallel packages don't collide in copy.ts.
 */
export const RESET = {
  /** B7.2 */
  title: 'Reset',
  /** B7.3 */
  sub: 'A few slow breaths. Eyes open is fine.',
  /** B7.4: describes the activity, no mechanism line */
  how: 'Breathe in through your nose, then take a small second breath in on top. Let it all go in a long, slow breath out.',
  /** B7.6, B7.7 */
  start: 'Start',
  stop: 'Stop',
  /** B7.10: above the pacer card while running with reduced motion on */
  reduced: 'Motion is reduced on this device, so follow the words.',
  /** B7.12, B7.13: the safety lines at the foot */
  stopAnyTime: 'Stop any time. If this makes you feel worse, try a walk instead.',
  dizzy: 'If you feel dizzy or uncomfortable, breathe normally.',
  /** B7.15: the only line after an early stop (never a partial time) */
  comeBack: 'Come back to this whenever you like.',
  /** B7.16 */
  done: 'Done',
}

/** B7.5 "1 min" · "2 min" · "5 min" */
export const lengthLabel = (min: number): string => `${min} min`

/** B7.9 "{m}:{ss} left"; `left` is fmtLeft's "1:20" */
export const leftLine = (left: string): string => `${left} left`

/** B7.14 "That’s {length}." for a finished run only ("That’s 2 minutes.") */
export const finishedLine = (min: number): string => `That’s ${min} ${min === 1 ? 'minute' : 'minutes'}.`

/** Every string Reset can show (with the lengths it offers), for the copy lint. */
export function resetCopy(lengths: readonly number[]): string[] {
  return [
    ...Object.values(RESET),
    ...lengths.flatMap((m) => [lengthLabel(m), finishedLine(m)]),
    leftLine('1:20'),
  ]
}
