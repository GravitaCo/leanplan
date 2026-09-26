import { useState } from 'react'
import type { Exercise, LogShape, SetEntry, SetFeel } from '@/core/types'
import { fmtTarget, parseRx, type SetTarget } from '@/core/domain/guided'
import { BareSheet, Seg, Toggle } from '@/ui/primitives'
import { PAIN_HELP, RED_FLAG } from './HoldTimer'

export const FEELS: [SetFeel, string][] = [
  ['spare', 'Could have done lots more'],
  ['right', 'About right, two or three left'],
  ['struggle', 'Last rep was a real struggle'],
  ['stopped', 'Stopped early'],
]

const n = (v: string) => { const x = parseFloat(v); return Number.isFinite(x) ? x : 0 }
const tidy = (x: number) => String(Math.round(x * 100) / 100)

function Stepper({ label, unit, value, step, onChange, id }: { label: string; unit?: string; value: string; step: number; onChange: (v: string) => void; id: string }) {
  return (
    <div className="stepcard">
      <label className="k" htmlFor={id}>{label}</label>
      <div className="v"><input id={id} className="num" type="number" inputMode="decimal" value={value} placeholder="0"
        onChange={(e) => onChange(e.target.value)} style={{ width: `${Math.max(1, value.length) + 0.6}ch` }} />{unit && <span className="u">{unit}</span>}</div>
      <div className="pm2">
        <button type="button" aria-label={`Less ${label.toLowerCase()}`} onClick={() => onChange(tidy(Math.max(0, n(value) - step)))}>−</button>
        <button type="button" aria-label={`More ${label.toLowerCase()}`} onClick={() => onChange(tidy(n(value) + step))}>+</button>
      </div>
    </div>
  )
}

/**
 * Log a set that differs from the plan (Flow 2): weight and reps steppers (or seconds, minutes,
 * rounds), an optional "How was that set?" and, when it stopped early, the pain check with a
 * gentler option and the red-flag copy. A warm-up set is logged here too; it never counts.
 */
export function AdjustSheet({ name, x, shape, rx, setNo, target, first, warmup: warm0, allowWarmup, stepUp, onLog, onGentler, onTimer, onClose }: {
  name: string
  x?: Exercise
  shape: LogShape
  rx: string
  /** 0-based working set number */
  setNo: number
  target: SetTarget | null
  /** nothing to aim for yet: the first weighted set of a first session */
  first: boolean
  warmup?: boolean
  allowWarmup: boolean
  /** every set reached the top of the range last time (a passive hint, never applied) */
  stepUp?: boolean
  onLog: (s: SetEntry) => void
  onGentler?: () => void
  onTimer?: () => void
  onClose: () => void
}) {
  const p = parseRx(rx)
  const [w, setW] = useState(target?.w ?? '')
  const [reps, setReps] = useState(target?.reps || (p.unit === 'reps' && p.reps ? String(first ? p.reps.hi : p.reps.lo) : ''))
  const [sec, setSec] = useState(target?.sec ?? (p.unit === 'sec' && p.reps ? String(p.reps.lo) : ''))
  const [mins, setMins] = useState(target?.mins ?? (p.unit === 'min' && p.reps ? String(p.reps.lo) : ''))
  const [load, setLoad] = useState<'none' | 'added' | 'assist'>(target?.assist ? 'assist' : target?.w ? 'added' : 'none')
  const [feel, setFeel] = useState<SetFeel | null>(null)
  const [warmup, setWarmup] = useState(!!warm0)
  const [help, setHelp] = useState(false)
  const kitStep = x?.equipment.some((q) => q === 'dumbbell' || q === 'kettlebell') && !x.equipment.includes('barbell') ? 1 : 2.5
  const barbell = !!x?.equipment.includes('barbell')
  const barOnly = barbell && !x!.equipment.includes('dumbbell')

  const log = () => {
    const out: SetEntry = { w: '', reps: '' }
    if (shape === 'weight-reps') { out.w = w; out.reps = reps }
    else if (shape === 'reps') { out.reps = reps; if (load !== 'none' && w) { out.w = w; if (load === 'assist') out.assist = true } }
    else if (shape === 'hold') { out.sec = sec; out.reps = sec }
    else if (shape === 'duration') { out.mins = mins }
    else if (shape === 'rounds') { out.reps = reps }
    else out.done = true
    if (warmup) out.warmup = true
    else if (feel) out.feel = feel
    onLog(out)
  }
  const empty = shape === 'weight-reps' ? !w && !reps : shape === 'hold' ? !sec : shape === 'duration' ? !mins : shape === 'check' ? false : !reps

  return (
    <BareSheet label={`Adjust set ${setNo + 1}, ${name}`} onClose={onClose} className="adjust">
      <div className="adj-h">
        <h2>{warmup ? 'Warm-up' : `Set ${setNo + 1}`} · {name}</h2>
        {target && !warmup && <span className="tgt num">Target {fmtTarget(target, shape)}</span>}
      </div>
      {first && !warmup && (shape === 'weight-reps' || shape === 'reps') && (
        <div className="foot" style={{ padding: '0 4px 10px' }}>
          {shape === 'weight-reps'
            ? `Start lighter than you think. Pick a weight you could lift ${p.reps?.hi ?? 10} times with two or three reps to spare. You can go up next set.${barbell ? " If you're new to it, the bar on its own is a good start." : ''}`
            : 'Do what feels steady, with two or three reps to spare.'}
        </div>
      )}
      {stepUp && !warmup && !first && (
        <div className="foot" style={{ padding: '0 4px 10px' }}>You reached the top of the range last time. If it felt steady, try a little more weight today.</div>
      )}
      {shape === 'reps' && (
        <div style={{ marginBottom: 10 }}><Seg options={[['none', 'Bodyweight'], ['added', 'Added weight'], ['assist', 'Assisted']]} value={load} onChange={setLoad} /></div>
      )}
      <div className="grid2">
        {(shape === 'weight-reps' || (shape === 'reps' && load !== 'none')) && (
          <Stepper id="adj_w" label={shape === 'reps' && load === 'assist' ? 'Assistance' : shape === 'reps' ? 'Added' : 'Weight'} unit="kg" value={w} step={kitStep} onChange={setW} />
        )}
        {(shape === 'weight-reps' || shape === 'reps' || shape === 'rounds') && (
          <Stepper id="adj_r" label={shape === 'rounds' ? 'Rounds' : 'Reps'} value={reps} step={1} onChange={setReps} />
        )}
        {shape === 'hold' && <Stepper id="adj_s" label="Seconds" unit="sec" value={sec} step={5} onChange={setSec} />}
        {shape === 'duration' && <Stepper id="adj_m" label="Minutes" unit="min" value={mins} step={1} onChange={setMins} />}
      </div>
      {shape === 'hold' && onTimer && <button className="linkbtn" style={{ paddingLeft: 4 }} onClick={onTimer}>Use the timer</button>}
      {allowWarmup && (
        <div className="list" style={{ marginTop: 10 }}>
          <div className="li"><div className="m"><div className="t">Warm-up set</div><div className="s">Doesn't count towards your targets</div></div>
            <Toggle on={warmup} label="Warm-up set" onChange={() => setWarmup(!warmup)} /></div>
        </div>
      )}
      {!warmup && shape !== 'check' && (
        <>
          <div className="lbl">How was that set? <span style={{ color: 'var(--label3)' }}>Optional</span></div>
          <div className="feels" role="radiogroup" aria-label="How was that set?">
            {FEELS.map(([k, label]) => (
              <button key={k} role="radio" aria-checked={feel === k} className={feel === k ? 'on' : ''} onClick={() => setFeel(feel === k ? null : k)}>{label}</button>
            ))}
          </div>
        </>
      )}
      {feel === 'stopped' && !warmup && (
        <div className="card hurt">
          <div>Stopping early is fine. If something hurt, stop this exercise for today: pain isn't something to push through.</div>
          <div className="links">
            {onGentler && <button className="linkbtn inl" onClick={onGentler}>Try a gentler option</button>}
            <button className="linkbtn inl" aria-expanded={help} onClick={() => setHelp(!help)}>When to get help</button>
          </div>
          {help && <div className="foot" style={{ padding: '8px 0 0' }}>{PAIN_HELP} {RED_FLAG}</div>}
        </div>
      )}
      {barbell && shape === 'weight-reps' && <div className="foot" style={{ padding: '10px 4px 0' }}>{barOnly ? 'Barbell weight includes the bar.' : "If you're using a barbell, include the bar."}</div>}
      <div className="stack"><button className="btn" onClick={log} disabled={empty}>Log set</button></div>
    </BareSheet>
  )
}
