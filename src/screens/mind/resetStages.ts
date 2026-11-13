/**
 * Reset's stages (board B7), without React or DOM, shared by the web screen (ResetScreen.tsx) and
 * the native one, so both start, stop and finish a run the same way and log the same.
 */
import { useStore, type StoreState } from '@/store/store'
import { RESET_DEFAULT_LENGTH, RESET_LENGTHS, resetTicksThing } from '@/core/data/skills'
import { todayStr } from '@/core/domain/date'

export type ResetStage = 'ready' | 'running' | 'finished' | 'stopped'
export type ResetLength = (typeof RESET_LENGTHS)[number]

export interface ResetState { stage: ResetStage; len: ResetLength; run: number }
export type ResetAction = { type: 'start' } | { type: 'stop' } | { type: 'finish' } | { type: 'length'; len: ResetLength }

export const resetInitial: ResetState = { stage: 'ready', len: RESET_DEFAULT_LENGTH as ResetLength, run: 0 }

/**
 * Start only from ready (each start is a new run); Stop and finish only while running; a length
 * can't change mid-run, and picking one after a run ends goes back to ready.
 */
export function resetReducer(s: ResetState, a: ResetAction): ResetState {
  switch (a.type) {
    case 'start': return s.stage === 'ready' ? { ...s, stage: 'running', run: s.run + 1 } : s
    case 'stop': return s.stage === 'running' ? { ...s, stage: 'stopped' } : s
    case 'finish': return s.stage === 'running' ? { ...s, stage: 'finished' } : s
    case 'length': return s.stage === 'running' ? s : { ...s, len: a.len, stage: 'ready' }
  }
}

/**
 * The pacer reached the end of its last breath out. Only a run that is still running when this
 * lands finishes: it is logged once (logSkill, plan C21) and ticks today's thing done when that's a
 * Reset thing (doneThing; Benn, 10 Oct 2026). A run already stopped (Stop in its last second, with
 * the timer's done arriving before a re-render) changes nothing and logs nothing. `cur` must be the
 * stage as of now (screens keep it in a ref), and the store is read at this moment, never a render's copy.
 */
export function onPacerDone(cur: ResetState, st: Pick<StoreState, 'data' | 'logSkill' | 'doneThing'> = useStore.getState(), today = todayStr()): ResetState {
  if (cur.stage !== 'running') return cur
  st.logSkill('reset')
  if (resetTicksThing(st.data.days[today]?.checkin?.thing)) st.doneThing()
  return resetReducer(cur, { type: 'finish' })
}
