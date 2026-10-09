import { useState } from 'react'
import { useStore } from '@/store/store'
import { nowIso } from '@/data/supabase'
import { sleepMoreOpen } from '@/data/deviceOnly'
import { WELLBEING_ENABLED } from '@/data/wellbeingFlag'
import type { SleepBand } from '@/core/types'
import { ENERGY, HUNGER, MOODS, SLEEP, SORE, STRESS } from '@/core/domain/insights'
import { isHardKey, plannedKeys } from '@/core/domain/plans'
import { isBuiltinLift, workoutsOf } from '@/core/domain/sessions'
import { Sheet } from '@/ui/primitives'
import { SupportSheet } from '../mind/SupportSheet'
import { CheckinFeet, nightPatch, nightShown, SleepMore, wakePrefill } from './CheckinSleep'

/**
 * Optional check-in: mood, sleep, stress, energy (and soreness on lifting days), hunger and a
 * note. No right answer; it's for spotting patterns, and sleep/stress/energy let Train offer a
 * lighter option on a tough day (plan §0.2). Every question can be skipped.
 * With WELLBEING_ENABLED on (board B10): "More about sleep" under the Sleep scale (a rough band and
 * a wake time, saved as `night`; its open state is this device's only), the note's "support is
 * here" line opening the Support sheet, and the B10.13 foot. With the flag off, unchanged.
 */
export function CheckinSheet({ onClose }: { onClose: () => void }) {
  const existing = useStore((s) => s.data.days[s.cur]?.checkin)
  const liftDay = useStore((s) => {
    // a lift logged today (any session) or planned today
    const logged = workoutsOf(s.data.days[s.cur], s.cur).some(isBuiltinLift)
    return logged || plannedKeys(s.data, s.cur).some((k) => isHardKey(k, s.data.routines))
  })
  const setCheckin = useStore((s) => s.setCheckin)
  const [mood, setMood] = useState(existing?.mood ?? 0)
  const [hunger, setHunger] = useState(existing?.hunger ?? 0)
  const [sleep, setSleep] = useState(existing?.sleep ?? 0)
  const [stress, setStress] = useState(existing?.stress ?? 0)
  const [energy, setEnergy] = useState(existing?.energy ?? 0)
  const [sore, setSore] = useState(existing?.sore ?? 0)
  const [note, setNote] = useState(existing?.note ?? '')
  // WP10, flag on only: last night's band and wake time; `touched` once the person answers there
  const setSleepMore = useStore((s) => s.setSleepMore)
  const prefill = useStore((s) => (WELLBEING_ENABLED ? wakePrefill(s.data.days, s.cur) : ''))
  const shown = nightShown(existing)
  const [more, setMore] = useState(() => WELLBEING_ENABLED && sleepMoreOpen(useStore.getState().data))
  const [band, setBand] = useState<SleepBand | ''>(shown.band)
  // B10.8: yesterday's wake time shows only once the disclosure is open (already open, or opened now)
  const [wakeAt, setWakeAt] = useState(() => shown.wakeAt || (more ? prefill : ''))
  const [filled, setFilled] = useState(more)
  const [touched, setTouched] = useState(false)
  const [support, setSupport] = useState(false)
  const toggleMore = () => {
    const open = !more
    setMore(open)
    setSleepMore(open)
    if (open && !filled) { setFilled(true); if (!wakeAt && !touched) setWakeAt(prefill) }
  }
  // the answers go in as a patch (a 0 or empty answer removes it); the store merges them, so a
  // skill or night logged elsewhere today stays, and an empty check-in becomes null
  const save = () => {
    const t = nowIso()
    const night = WELLBEING_ENABLED ? nightPatch(existing, { band, wakeAt, touched }, t) : {}
    setCheckin({ mood, hunger, sleep, stress, energy, sore: liftDay ? sore : existing?.sore ?? 0, note: note.trim(), t, ...night })
    onClose()
  }
  const scale = (labels: string[], value: number, set: (v: number) => void) => (
    <div className="scale">
      {labels.map((l, i) => (
        <button key={l} className={value === i + 1 ? 'on' : ''} aria-pressed={value === i + 1} onClick={() => set(value === i + 1 ? 0 : i + 1)}>{l}</button>
      ))}
    </div>
  )
  return (
    <>
    {/* while Support is open over it, Escape closes Support only, never the check-in's answers */}
    <Sheet title="Check-in" onClose={support ? noop : onClose} right={<button className="navbtn b" onClick={save}>Done</button>}>
      <div className="lbl">How are you feeling?</div>
      {scale(MOODS, mood, setMood)}
      <div className="lbl">Sleep last night</div>
      {scale(SLEEP, sleep, setSleep)}
      {WELLBEING_ENABLED && <SleepMore open={more} onToggle={toggleMore}
        band={band} onBand={(b) => { setBand(b); setTouched(true) }}
        wakeAt={wakeAt} onWake={(v) => { setWakeAt(v); setTouched(true) }} />}
      <div className="lbl">Stress</div>
      {scale(STRESS, stress, setStress)}
      <div className="lbl">Energy</div>
      {scale(ENERGY, energy, setEnergy)}
      {liftDay && <><div className="lbl">Soreness</div>{scale(SORE, sore, setSore)}</>}
      <div className="lbl">Hunger right now</div>
      {scale(HUNGER, hunger, setHunger)}
      <div className="lbl">Note</div>
      <textarea rows={3} value={note} placeholder="Anything worth remembering? Optional." onChange={(e) => setNote(e.target.value)} />
      {WELLBEING_ENABLED
        ? <CheckinFeet onSupport={() => setSupport(true)} />
        : <div className="foot">Skip anything you like. There's no right answer. Sleep and stress often show up in hunger and energy, so these
        help you spot patterns. On a tough day, Tali can offer a lighter option for training.</div>}
    </Sheet>
    {support && <SupportSheet onClose={() => setSupport(false)} />}
    </>
  )
}

const noop = () => {}
