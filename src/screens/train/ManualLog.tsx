import { useCallback, useState } from 'react'
import { useStore } from '@/store/store'
import type { LoggedExercise, LogShape, SetEntry, Workout, WorkoutType } from '@/core/types'
import { exById, fmtSet, setHasData } from '@/core/domain/library'
import { sessionsOf } from '@/core/domain/sessions'
import { howToLink } from '@/core/domain/workout'
import { shortTitle } from '@/core/domain/week'
import { todayStr } from '@/core/domain/date'
import { buildLogged, lastTime, splitLogged, swapInto, working, type Slot } from '@/core/domain/guided'
import { careList } from '@/core/data/libraryLabels'
import { BackButton, Seg, Toggle } from '@/ui/primitives'
import { Icon } from '@/ui/icons'
import { CARE_DISCLAIMER, SwapSheet } from './SwapSheet'
import { HoldTimer, RED_FLAG } from './HoldTimer'
import { DemoPlayer } from './DemoPlayer'

const blankRows = (): SetEntry[] => [{ w: '', reps: '' }, { w: '', reps: '' }]

/**
 * Saved sets back into the form. Holds edit `sec` only: older logs kept their seconds in `reps`,
 * and new saves copy `sec` into `reps` for older installs, so the form clears `reps` (a save puts
 * it back) and clearing the box really clears the set. Flags (warm-up, how it felt) ride along.
 */
function toRows(sets: SetEntry[], shape: LogShape): SetEntry[] {
  return sets.map((s) => (shape === 'hold' ? { ...s, sec: s.sec || s.reps, reps: '' } : { ...s }))
}

/**
 * "Log sets by hand": the full set form (every log shape, bodyweight load choice, hold timer,
 * add set), for logging after the fact and for editing a session already logged. It is the
 * earlier Train card form, unchanged in what it saves.
 */
export function ManualLog({ type, slots, option, swaps, onSwap, onBack }: {
  type: WorkoutType
  slots: Slot[]
  option?: Workout['option']
  swaps: Record<number, string>
  onSwap: (i: number, id: string) => void
  onBack: () => void
}) {
  const cur = useStore((s) => s.cur)
  const days = useStore((s) => s.data.days)
  const saveWorkout = useStore((s) => s.saveWorkout)
  const isToday = cur === todayStr()
  const session = sessionsOf(days[cur], cur).find((x) => x.routineId === 'builtin-' + type)
  const shorter = option === 'shorter'

  // matched by id or name, then by position for older logs; anything else is kept, never dropped
  const [init] = useState(() => splitLogged(session?.ex, slots))
  const [extras, setExtras] = useState<LoggedExercise[]>(init.extras)
  const [sets, setSets] = useState<Record<number, SetEntry[]>>(() => {
    const out: Record<number, SetEntry[]> = {}
    slots.forEach((s) => {
      const L = init.bySlot[s.i]
      out[s.i] = L.length ? toRows(L, init.logs[s.i] ?? s.shape) : blankRows()
    })
    return out
  })
  const [swapFor, setSwapFor] = useState<number | null>(null)
  const [timer, setTimer] = useState<{ exi: number; si: number } | null>(null)
  const [demo, setDemo] = useState<number | null>(null)
  const closeDemo = useCallback(() => setDemo(null), [])
  const [loadMode, setLoadMode] = useState<Record<number, 'none' | 'added' | 'assist'>>({})

  function updateSet(exi: number, si: number, patch: Partial<SetEntry>) {
    setSets((prev) => ({ ...prev, [exi]: prev[exi].map((s, i) => (i === si ? { ...s, ...patch } : s)) }))
  }
  const addSet = (exi: number) => setSets((prev) => ({ ...prev, [exi]: [...prev[exi], { w: '', reps: '' }] }))
  function setLoad(exi: number, v: 'none' | 'added' | 'assist') {
    setLoadMode((p) => ({ ...p, [exi]: v }))
    setSets((prev) => ({ ...prev, [exi]: prev[exi].map((s) => (v === 'none' ? { ...s, w: '', assist: undefined } : { ...s, assist: v === 'assist' ? true : undefined })) }))
  }
  /** a different exercise in this slot today: its sets start fresh (weights never carry across moves) */
  function swapSlot(exi: number, id: string) {
    // the sets typed for the move going out stay in the log as their own entry; the move coming
    // in takes back its own sets if it was here earlier today (swap X → Y → X keeps X's, once)
    const sl = slots.find((s) => s.i === exi)
    if (!sl) return
    const had = (sets[exi] || []).filter((r) => setHasData(r, sl.shape))
    const r = swapInto(sl, id, had, extras, shorter, exById)
    setExtras(r.extras)
    onSwap(exi, id)
    setSets((prev) => ({ ...prev, [exi]: r.sets.length ? toRows(r.sets, r.log ?? r.slot.shape) : blankRows() }))
    setLoadMode((p) => { const n = { ...p }; delete n[exi]; return n })
  }
  function commit() {
    const kept: Record<number, SetEntry[]> = {}
    slots.forEach((s) => { kept[s.i] = (sets[s.i] || []).filter((r) => setHasData(r, s.shape)) })
    const ex = buildLogged(slots, kept, extras)
    saveWorkout(type, ex, option, { toast: `${shortTitle(type)} saved` })
    onBack()
  }

  return (
    <div className="screen">
      <div className="pv-back"><BackButton label={shortTitle(type)} onClick={onBack} /></div>
      <h1 className="ltitle">Log sets by hand</h1>
      <div className="sub" style={{ margin: '2px 0 16px' }}>Type in what you did. Blank sets aren't saved.</div>
      {slots.map((sl) => {
        const exi = sl.i
        const { shown, x, shape, rx, swapped, planned: e } = sl
        const lastEx = lastTime(days, cur, x?.id, shown.n, sl.fullRx)
        const lastTxt = lastEx ? lastEx.sets.map((r) => fmtSet(r, lastEx.log ?? shape)).filter(Boolean).join(', ') : ''
        const rows = sets[exi] || []
        const load = loadMode[exi] ?? (rows.some((r) => r.assist) ? 'assist' : rows.some((r) => r.w) ? 'added' : 'none')
        const loadOn = load !== 'none'
        let n = 0
        return (
          <div className="card ex" key={exi}>
            <div className="h"><div className="n">{shown.n}</div><span className="tg">{rx}</span></div>
            {swapped && (
              <div className="swapped">In place of {e.n}, {isToday ? 'today' : 'this day'} only. <button onClick={() => swapSlot(exi, e.id!)} aria-label={`Undo, back to ${e.n}`}>Undo</button>
                {x!.care?.length ? <> Asks quite a lot of {careList(x!.care)}. {CARE_DISCLAIMER}</> : null}</div>
            )}
            <div className="cue">{shown.cue}</div>
            <div className="acts">
              {shown.video
                ? <button className="howto" onClick={() => setDemo(exi)}><Icon name="play" size={15} /> Watch example</button>
                : <a className="howto" href={howToLink(shown.n)} target="_blank" rel="noopener noreferrer">Watch how to do it ›</a>}
              {x && <button className="howto" onClick={() => setSwapFor(exi)} aria-label={`Swap ${shown.n}`}>Swap</button>}
            </div>
            {lastTxt && <div className="last num">Last time: {lastTxt}</div>}
            {shape === 'reps' && loadOn && (
              <div className="load"><Seg options={[['none', 'Bodyweight'], ['added', 'Added weight'], ['assist', 'Assisted']]} value={load} onChange={(v) => setLoad(exi, v)} /></div>
            )}
            {rows.map((r, si) => {
              const label = r.warmup ? 'Warm-up' : `Set ${++n}`
              return (
                <div className="setrow" key={si}>
                  <span className="n">{label}</span>
                  {shape === 'weight-reps' && (
                    <>
                      <input className="num" type="number" inputMode="decimal" placeholder="kg" value={r.w} aria-label={`${label} weight`} onChange={(ev) => updateSet(exi, si, { w: ev.target.value })} />
                      <span className="u">kg</span>
                    </>
                  )}
                  {shape === 'reps' && loadOn && (
                    <>
                      <input className="num" type="number" inputMode="decimal" placeholder="kg" value={r.w} aria-label={`${label} ${load === 'assist' ? 'assistance' : 'added weight'}`}
                        onChange={(ev) => updateSet(exi, si, { w: ev.target.value, ...(load === 'assist' ? { assist: true } : {}) })} />
                      <span className="u">kg</span>
                    </>
                  )}
                  {(shape === 'weight-reps' || shape === 'reps' || shape === 'rounds') && (
                    <>
                      <input className="num" type="number" inputMode="numeric" placeholder={shape === 'rounds' ? 'rounds' : 'reps'} value={r.reps}
                        aria-label={`${label} ${shape === 'rounds' ? 'rounds' : 'reps'}`} onChange={(ev) => updateSet(exi, si, { reps: ev.target.value })} />
                      <span className="u">{shape === 'rounds' ? 'rounds' : 'reps'}</span>
                    </>
                  )}
                  {shape === 'hold' && (
                    <>
                      <input className="num" type="number" inputMode="numeric" placeholder="sec" value={r.sec ?? ''} aria-label={`${label} seconds`} onChange={(ev) => updateSet(exi, si, { sec: ev.target.value })} />
                      <span className="u">sec</span>
                      <button className="tm" onClick={() => setTimer({ exi, si })} aria-label={`Time ${label}`}>Timer</button>
                    </>
                  )}
                  {shape === 'duration' && (
                    <>
                      <input className="num" type="number" inputMode="numeric" placeholder="min" value={r.mins ?? ''} aria-label={`${label} minutes`} onChange={(ev) => updateSet(exi, si, { mins: ev.target.value })} />
                      <span className="u">min</span>
                      <input className="num" type="number" inputMode="decimal" placeholder="km" value={r.km ?? ''} aria-label={`${label} distance`} onChange={(ev) => updateSet(exi, si, { km: ev.target.value })} />
                      <span className="u">km</span>
                    </>
                  )}
                  {shape === 'check' && (
                    <label className="tick"><Toggle on={!!r.done} label={`${label} done`} onChange={() => updateSet(exi, si, { done: !r.done })} /> Done</label>
                  )}
                </div>
              )
            })}
            <div className="acts">
              <button className="addset" onClick={() => addSet(exi)}>Add set</button>
              {shape === 'reps' && !loadOn && <button className="addset" onClick={() => setLoad(exi, 'added')}>Add weight or assistance</button>}
            </div>
          </div>
        )
      })}
      <div className="stack"><button className="btn" onClick={commit}>Save {shorter ? 'shorter ' : ''}{shortTitle(type)}</button></div>
      <div className="foot" style={{ padding: '12px 4px 0' }}>
        {/* no progression prompt on a shorter day (plan §4.0.5) */}
        Stop each set with two or three reps to spare.{shorter ? '' : ' When every set hits the top of the range with good form, add a little weight next time.'} {RED_FLAG}
      </div>

      {demo != null && (() => { const sh = slots.find((s) => s.i === demo)?.shown; return sh?.video ? <DemoPlayer ex={sh} onClose={closeDemo} /> : null })()}
      {swapFor != null && (() => {
        const sl = slots.find((s) => s.i === swapFor)
        return sl?.x ? <SwapSheet current={sl.x} planned={swaps[swapFor] ? exById(sl.planned.id) : undefined} shorter={shorter}
          loggedSets={working((sets[swapFor] || []).filter((r) => setHasData(r, sl.shape))).length} onPick={(id) => swapSlot(swapFor, id)} onClose={() => setSwapFor(null)} /> : null
      })()}
      {timer && (() => {
        const sl = slots.find((s) => s.i === timer.exi)!
        return <HoldTimer name={sl.shown.n} rx={sl.rx} perSide={sl.x?.perSide}
          onDone={(sec) => updateSet(timer.exi, timer.si, { sec: String(sec) })} onClose={() => setTimer(null)} />
      })()}
    </div>
  )
}
