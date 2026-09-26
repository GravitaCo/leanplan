import { useState } from 'react'
import { useStore } from '@/store/store'
import { nowIso } from '@/data/supabase'
import { ENERGY, HUNGER, MOODS, SLEEP, SORE, STRESS } from '@/core/domain/insights'
import { fmtDate } from '@/core/domain/date'
import { LIFTS } from '@/core/data/workouts'
import { isBuiltinLift, sessionsOf } from '@/core/domain/sessions'
import type { WorkoutType } from '@/core/types'
import { Sheet } from '@/ui/primitives'

/**
 * Optional check-in: mood, sleep, stress, energy (and soreness on lifting days), hunger and a
 * note. No right answer; it's for spotting patterns, and sleep/stress/energy let Train offer a
 * lighter option on a tough day (plan §0.2). Every question can be skipped.
 */
export function CheckinSheet({ onClose }: { onClose: () => void }) {
  const existing = useStore((s) => s.data.days[s.cur]?.checkin)
  const liftDay = useStore((s) => {
    // a lift logged today (any session) or planned today
    const logged = sessionsOf(s.data.days[s.cur], s.cur).some(isBuiltinLift)
    return logged || LIFTS.includes(s.data.schedule[fmtDate(s.cur).idx] as WorkoutType)
  })
  const setCheckin = useStore((s) => s.setCheckin)
  const [mood, setMood] = useState(existing?.mood ?? 0)
  const [hunger, setHunger] = useState(existing?.hunger ?? 0)
  const [sleep, setSleep] = useState(existing?.sleep ?? 0)
  const [stress, setStress] = useState(existing?.stress ?? 0)
  const [energy, setEnergy] = useState(existing?.energy ?? 0)
  const [sore, setSore] = useState(existing?.sore ?? 0)
  const [note, setNote] = useState(existing?.note ?? '')
  const save = () => {
    const any = mood || hunger || sleep || stress || energy || sore || note.trim()
    setCheckin(any ? { mood, hunger, sleep, stress, energy, sore: liftDay ? sore : existing?.sore ?? 0, note: note.trim(), t: nowIso() } : null)
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
    <Sheet title="Check-in" onClose={onClose} right={<button className="navbtn b" onClick={save}>Done</button>}>
      <div className="lbl">How are you feeling?</div>
      {scale(MOODS, mood, setMood)}
      <div className="lbl">Sleep last night</div>
      {scale(SLEEP, sleep, setSleep)}
      <div className="lbl">Stress</div>
      {scale(STRESS, stress, setStress)}
      <div className="lbl">Energy</div>
      {scale(ENERGY, energy, setEnergy)}
      {liftDay && <><div className="lbl">Soreness</div>{scale(SORE, sore, setSore)}</>}
      <div className="lbl">Hunger right now</div>
      {scale(HUNGER, hunger, setHunger)}
      <div className="lbl">Note</div>
      <textarea rows={3} value={note} placeholder="Anything worth remembering? Optional." onChange={(e) => setNote(e.target.value)} />
      <div className="foot">Skip anything you like. There's no right answer. Sleep and stress often show up in hunger and energy, so these
        help you spot patterns. On a tough day, Tali can offer a lighter option for training.</div>
    </Sheet>
  )
}
