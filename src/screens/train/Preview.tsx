import { useCallback, useMemo, useState } from 'react'
import { useStore } from '@/store/store'
import type { Session, WorkoutType } from '@/core/types'
import { WORKOUTS, SWAPS } from '@/core/data/workouts'
import { CARDIO_OPTIONS } from '@/core/data/constants'
import { shorterPrescription } from '@/core/domain/dayOptions'
import { exById, fmtSet } from '@/core/domain/library'
import { fmtTarget, lastTime, readyToStepUp, setCount, setsLine, splitLogged, targetFor, warmupSlot, working, type Slot } from '@/core/domain/guided'
import { shortTitle } from '@/core/domain/week'
import { careList } from '@/core/data/libraryLabels'
import { BackButton } from '@/ui/primitives'
import { CARE_DISCLAIMER, SwapSheet } from './SwapSheet'
import { RED_FLAG } from './HoldTimer'
import { DemoPlayer } from './DemoPlayer'
import { Thumb } from './Thumb'
import { bareName, warmupCopy } from './GuidedPlayer'

/** Day-of choices (plan §0.2): equal options, the planned session always one tap away. */
export type Choice = 'planned' | 'shorter' | 'mobility' | 'walk'
export const CHOICES: [Choice, string][] = [['planned', 'As planned'], ['shorter', 'Shorter'], ['mobility', '10-min mobility'], ['walk', 'Easy walk']]

/**
 * Session preview (Flow 1 step 2): the version for today, the exercise list with what to aim
 * for, swaps for today only, then Start. Cardio days and the gentle swaps save from here.
 */
export function Preview({ type, choice, onChoice, slots, swaps, onSwap, session, note, dayName, isToday, onStart, onManual, onBack, onEditPlan }: {
  type: WorkoutType
  choice: Choice
  onChoice: (c: Choice) => void
  slots: Slot[]
  swaps: Record<number, string>
  onSwap: (i: number, id: string) => void
  session?: Session
  /** easier-week / lighter-day note under the chips */
  note?: string | null
  dayName: string
  isToday: boolean
  onStart: () => void
  onManual: () => void
  onBack: () => void
  onEditPlan: () => void
}) {
  const cur = useStore((s) => s.cur)
  const days = useStore((s) => s.data.days)
  const saveCardio = useStore((s) => s.saveCardio)
  const [swapFor, setSwapFor] = useState<number | null>(null)
  const [demo, setDemo] = useState<number | null>(null)
  const closeDemo = useCallback(() => setDemo(null), [])
  const shorter = choice === 'shorter'
  const swap = choice === 'mobility' || choice === 'walk' ? SWAPS[choice] : null
  const title = swap ? swap.title.split(' · ')[0] : shortTitle(type)
  const logged = session?.ex?.some((e) => working(e.sets).length > 0)
  const wSlot = warmupSlot(slots.map((s) => s.shape))

  // cardio card state (a retired type from an older log still shows as saved)
  const cardioS = type === 'Cardio' ? session : undefined
  const [cardioType, setCardioType] = useState(cardioS?.cardio?.key || 'Brisk walk')
  const [mins, setMins] = useState(cardioS?.mins != null ? String(cardioS.mins) : '')
  const [walkMins, setWalkMins] = useState('')

  const rows = useMemo(() => {
    const { bySlot } = splitLogged(session?.ex, slots)
    return slots.map((s) => {
      const last = lastTime(days, cur, s.x?.id, s.shown.n, s.fullRx)
      const mine = working(bySlot[s.i])
      const t = targetFor(s.shape, s.rx, last, 0, [])
      // a passive hint only, never on a shorter day, and nothing changes by itself
      const up = !shorter && !mine.length && readyToStepUp(last, s.fullRx) ? ' · Top of the range last time: try a little more weight if it felt steady' : ''
      const detail = mine.length ? `Logged: ${setsLine(mine, s.shape)}`
        : t && (s.shape === 'weight-reps' || s.shape === 'reps') ? `Aim for ${fmtTarget(t, s.shape)}${up}`
        : last ? `Last time: ${last.sets.map((r) => fmtSet(r, last.log ?? s.shape)).filter(Boolean).join(', ')}` : ''
      return { s, detail, done: mine.length }
    })
  }, [slots, days, cur, session, shorter])

  const sub = swap
    ? `${dayName} · ${swap.ex.length} ${swap.ex.length === 1 ? 'move' : 'moves'}`
    : type === 'Cardio' ? `${dayName} · ${shorter ? shorterPrescription(WORKOUTS.Cardio.ex[0].t) : WORKOUTS.Cardio.ex[0].t}`
    : `${dayName} · ${slots.length} exercises · ${setCount(slots.map((s) => s.shown), shorter)}`

  return (
    <div className="screen pv">
      <div className="pv-back"><BackButton label={isToday ? 'Today' : dayName} onClick={onBack} /></div>
      <h1 className="ltitle">{title}</h1>
      <div className="sub" style={{ marginTop: 2 }}>{sub}</div>

      <div className="vchips" role="radiogroup" aria-label="Today's version">
        {CHOICES.filter(([k]) => !(logged && (k === 'mobility' || k === 'walk'))).map(([k, label]) => (
          <button key={k} role="radio" aria-checked={choice === k} className={'vchip' + (choice === k ? ' on' : '')} onClick={() => onChoice(k)}>{label}</button>
        ))}
      </div>
      {note && <div className="foot" style={{ padding: '0 4px 10px' }}>{note}</div>}
      {swap && <div className="foot" style={{ padding: '0 4px 10px' }}>This counts as today's session. Your plan carries on as usual.</div>}

      {swap ? (
        <>
          {swap.note && <div className="foot" style={{ padding: '0 4px 10px' }}>{swap.note}</div>}
          {swap.ex.map((e) => (
            <div className="card ex" key={e.n}>
              <div className="h"><div className="n">{e.n}</div><span className="tg">{e.t}</span></div>
              <div className="cue">{e.cue}</div>
            </div>
          ))}
          {choice === 'walk' && (
            <div className="list">
              <div className="frow"><label htmlFor="w_min">Minutes</label>
                <input id="w_min" type="number" inputMode="numeric" value={walkMins} placeholder={swap.mins} onChange={(e) => setWalkMins(e.target.value)} /></div>
            </div>
          )}
          <div className="foot" style={{ padding: '4px 4px 0' }}>{RED_FLAG}</div>
          <div className="stack"><button className="btn" onClick={() => { saveCardio(swap.cardioType, choice === 'walk' ? walkMins || swap.mins : swap.mins, 'swap'); onBack() }}>
            Save {choice === 'walk' ? 'walk' : 'mobility'}</button></div>
        </>
      ) : type === 'Cardio' ? (
        <>
          <div className="card ex">
            <div className="h"><div className="n">{WORKOUTS.Cardio.ex[0].n}</div><span className="tg">{shorter ? shorterPrescription(WORKOUTS.Cardio.ex[0].t) : WORKOUTS.Cardio.ex[0].t}</span></div>
            <div className="cue">{WORKOUTS.Cardio.ex[0].cue}</div>
          </div>
          <div className="list">
            <div className="frow"><label htmlFor="c_type">Type</label>
              <select id="c_type" value={cardioType} onChange={(e) => setCardioType(e.target.value)}>
                {(CARDIO_OPTIONS.includes(cardioType) ? CARDIO_OPTIONS : [...CARDIO_OPTIONS, cardioType]).map((o) => <option key={o}>{o}</option>)}
              </select></div>
            <div className="frow"><label htmlFor="c_min">Minutes</label>
              <input id="c_min" type="number" inputMode="numeric" value={mins} placeholder="25" onChange={(e) => setMins(e.target.value)} /></div>
          </div>
          <div className="stack"><button className="btn" onClick={() => { saveCardio(cardioType, mins, cardioS?.option === 'swap' ? 'swap' : shorter ? 'shorter' : undefined); onBack() }}>Save cardio</button></div>
          <div className="foot" style={{ padding: '12px 4px 0' }}>{RED_FLAG}</div>
        </>
      ) : (
        <>
          {wSlot >= 0 && (
            <div className="warm">
              <span className="wi" aria-hidden="true">↻</span>
              <div><div className="t">Warm up first</div>
                <div className="s">{warmupCopy(bareName(slots[wSlot].shown.n))}</div></div>
            </div>
          )}
          <div className="list">
            {rows.map(({ s, detail }) => {
              const gentler = !s.swapped && s.x?.gentler && s.x.equipment[0] === 'barbell' && s.x.difficulty !== 'beginner' ? exById(s.x.gentler) : undefined
              return (
                <div className="li pv-row" key={s.i}>
                  {s.shown.video
                    ? <button className="thumb-btn" onClick={() => setDemo(s.i)} aria-label={`Watch example: ${s.shown.n}`}><Thumb video={s.shown.video} shape={s.shape} play /></button>
                    : <Thumb shape={s.shape} />}
                  <div className="m">
                    <div className="t">{bareName(s.shown.n)}</div>
                    <div className="s num">{s.rx}{detail ? ' · ' + detail : ''}</div>
                    {s.swapped && <div className="s2">In place of {bareName(s.planned.n)}, today only. <button className="linkbtn inl" onClick={() => onSwap(s.i, s.planned.id!)}>Undo</button>
                      {s.x?.care?.length ? <> Asks quite a lot of {careList(s.x.care)}.</> : null}</div>}
                    {gentler && <div className="s2">New to this? The {gentler.n.toLowerCase()} is a good place to start. Tap Swap.</div>}
                  </div>
                  {s.x && <button className="linkbtn" onClick={() => setSwapFor(s.i)} aria-label={`Swap ${s.shown.n}`}>Swap</button>}
                </div>
              )
            })}
          </div>
          <div className="foot" style={{ padding: '4px 4px 0' }}>
            Swaps here only change today. Stop each set with two or three reps to spare.{slots.some((s) => s.swapped && s.x?.care?.length) ? ' ' + CARE_DISCLAIMER : ''} {RED_FLAG}
          </div>
          <div className="stack pv-cta">
            <button className="btn" onClick={onStart}>{logged ? 'Continue' : 'Start'}</button>
            <button className="linkbtn" onClick={onManual}>{logged ? 'Edit sets by hand' : 'Log sets by hand'}</button>
            <button className="linkbtn" onClick={onEditPlan}>Edit {shortTitle(type)} in Plan</button>
          </div>
        </>
      )}

      {demo != null && (() => { const sh = slots.find((s) => s.i === demo)?.shown; return sh?.video ? <DemoPlayer ex={sh} onClose={closeDemo} /> : null })()}
      {swapFor != null && (() => {
        const sl = slots.find((s) => s.i === swapFor)
        return sl?.x ? <SwapSheet current={sl.x} planned={swaps[swapFor] ? exById(sl.planned.id) : undefined} shorter={shorter}
          loggedSets={rows.find((r) => r.s.i === swapFor)?.done ?? 0} onPick={(id) => onSwap(swapFor, id)} onClose={() => setSwapFor(null)} /> : null
      })()}
    </div>
  )
}
