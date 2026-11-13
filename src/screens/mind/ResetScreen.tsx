import { useEffect, useReducer, useRef, useState } from 'react'
import { RESET_LENGTHS, RESET_PATTERN } from '@/core/data/skills'
import { fmtLeft, runMs } from '@/core/domain/pacer'
import { BackButton, Seg, TitleRow } from '@/ui/primitives'
import { Chevron } from '@/ui/icons'
import { MIND, SHARED } from './copy'
import { RESET, finishedLine, leftLine, lengthLabel } from './resetCopy'
import { Pacer } from './Pacer'
import { onPacerDone, resetInitial, resetReducer, type ResetLength } from './resetStages'
import { SupportSheet } from './SupportSheet'
import './reset.css'

const REDUCE = '(prefers-reduced-motion: reduce)'

/** The device's reduced-motion setting, following changes. */
function useReducedMotion(): boolean {
  const [on, setOn] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(REDUCE).matches)
  useEffect(() => {
    const mq = window.matchMedia?.(REDUCE)
    if (!mq) return
    const f = () => setOn(mq.matches)
    f()
    mq.addEventListener?.('change', f)
    return () => mq.removeEventListener?.('change', f)
  }, [])
  return on
}

/**
 * Reset (board B7 with the P6 Glow pacer, canvas 8c; deck B7): a pushed view inside the Mind tab,
 * Back "Mind" and the title with the Profile avatar. Ready: the sub-line, the length, the how-to,
 * the pacer at rest and Start. Running (as the Glow boards): the pacer, the time left and Stop.
 * Finished: "That's {length}." and B7.15. Stopped early: B7.15 only, never the time done.
 * Only a finished run is logged (logSkill, plan C21), and a finished run ticks today's thing done
 * when it's a Reset thing (doneThing; Benn, 10 Oct 2026); a stopped one changes nothing. The safety lines, the support row and the
 * wellness line sit at the foot throughout. Reached only when MIND_REVIEWED is on (MindPage); from
 * Wind down's routine (B12) its Back reads "Wind down" and goes back there.
 */
export function ResetScreen({ onBack, backLabel = MIND.title }: { onBack: () => void; backLabel?: string }) {
  const reduced = useReducedMotion()
  // the stages are shared with native (resetStages.ts); `cur` is the stage as of now, for the pacer's done
  const [rs, dispatch] = useReducer(resetReducer, resetInitial)
  const cur = useRef(rs)
  cur.current = rs
  const { stage, len, run } = rs
  const [left, setLeft] = useState('')
  const [support, setSupport] = useState(false)

  const running = stage === 'running'
  const ended = stage === 'finished' || stage === 'stopped'

  const start = () => {
    setLeft(fmtLeft(runMs(RESET_PATTERN, len)))
    dispatch({ type: 'start' })
    window.scrollTo?.(0, 0)
  }
  // only a run still running finishes and is logged (onPacerDone reads the store now)
  const finish = () => { const next = onPacerDone(cur.current); if (next !== cur.current) { cur.current = next; dispatch({ type: 'finish' }) } }
  const stop = () => { cur.current = resetReducer(cur.current, { type: 'stop' }); dispatch({ type: 'stop' }) }
  const pickLength = (v: string) => dispatch({ type: 'length', len: Number(v) as ResetLength })

  return (
    <div className="screen mind-pushed reset">
      <div className="pv-back"><BackButton label={backLabel} onClick={onBack} /></div>
      <TitleRow title={RESET.title} />
      <div className="reset-main">
        {!running && (
          <>
            <div className="reset-sub">{RESET.sub}</div>
            <Seg options={RESET_LENGTHS.map((m) => [String(m), lengthLabel(m)] as [string, string])} value={String(len)} onChange={pickLength} />
            <div className="reset-how">{RESET.how}</div>
          </>
        )}
        {running && reduced && <div className="foot reset-reduced">{RESET.reduced}</div>}

        {!ended && (
          <Pacer pattern={RESET_PATTERN} minutes={len} run={running ? run : null} reduced={reduced}
            onLeft={setLeft} onDone={finish} />
        )}
        {running && <div className="foot num reset-left">{leftLine(left)}</div>}

        {stage === 'finished' && (
          <div className="card reset-end" role="status">
            <div className="reset-end-t">{finishedLine(len)}</div>
            <div className="reset-end-s">{RESET.comeBack}</div>
          </div>
        )}
        {stage === 'stopped' && (
          <div className="card reset-end" role="status">
            <div className="reset-end-only">{RESET.comeBack}</div>
          </div>
        )}

        {stage === 'ready' && <button className="btn" onClick={start}>{RESET.start}</button>}
        {running && <button className="btn gray" onClick={stop}>{RESET.stop}</button>}
        {ended && <button className="btn" onClick={onBack}>{RESET.done}</button>}

        <div className="foot">{RESET.stopAnyTime}</div>
        <div className="foot">{RESET.dizzy}</div>
        <div className="list">
          <button className="li" onClick={() => setSupport(true)}>
            <span className="m"><span className="t">{SHARED.support}</span></span>
            <Chevron />
          </button>
        </div>
        <div className="foot reset-wellness">{SHARED.wellness}</div>
      </div>
      {support && <SupportSheet onClose={() => setSupport(false)} />}
    </div>
  )
}
