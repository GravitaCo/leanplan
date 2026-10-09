import { useEffect, useState } from 'react'
import { useStore } from '@/store/store'
import { RESET_DEFAULT_LENGTH, RESET_LENGTHS, RESET_PATTERN } from '@/core/data/skills'
import { fmtLeft, runMs } from '@/core/domain/pacer'
import { BackButton, Seg, TitleRow } from '@/ui/primitives'
import { Chevron } from '@/ui/icons'
import { MIND, SHARED } from './copy'
import { RESET, finishedLine, leftLine, lengthLabel } from './resetCopy'
import { Pacer } from './Pacer'
import { SupportSheet } from './SupportSheet'
import './reset.css'

type Stage = 'ready' | 'running' | 'finished' | 'stopped'
type Length = (typeof RESET_LENGTHS)[number]

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
 * Only a finished run is logged (logSkill, plan C21). The safety lines, the support row and the
 * wellness line sit at the foot throughout. Reached only when MIND_REVIEWED is on (MindPage).
 */
export function ResetScreen({ onBack }: { onBack: () => void }) {
  const logSkill = useStore((s) => s.logSkill)
  const reduced = useReducedMotion()
  const [len, setLen] = useState<Length>(RESET_DEFAULT_LENGTH as Length)
  const [stage, setStage] = useState<Stage>('ready')
  const [run, setRun] = useState(0)
  const [left, setLeft] = useState('')
  const [support, setSupport] = useState(false)

  const running = stage === 'running'
  const ended = stage === 'finished' || stage === 'stopped'

  const start = () => {
    setLeft(fmtLeft(runMs(RESET_PATTERN, len)))
    setRun((r) => r + 1)
    setStage('running')
    window.scrollTo?.(0, 0)
  }
  const finish = () => { setStage('finished'); logSkill('reset') }
  const pickLength = (v: string) => { setLen(Number(v) as Length); if (ended) setStage('ready') }

  return (
    <div className="screen mind-pushed reset">
      <div className="pv-back"><BackButton label={MIND.title} onClick={onBack} /></div>
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
        {running && <button className="btn gray" onClick={() => setStage('stopped')}>{RESET.stop}</button>}
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
