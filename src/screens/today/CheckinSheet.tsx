import { useState } from 'react'
import { useStore } from '@/store/store'
import { nowIso } from '@/data/supabase'
import { HUNGER, MOODS } from '@/core/domain/insights'
import { Sheet } from '@/ui/primitives'

/** Optional mood + hunger check-in. No right answer; it's for spotting patterns. */
export function CheckinSheet({ onClose }: { onClose: () => void }) {
  const existing = useStore((s) => s.data.days[s.cur]?.checkin)
  const setCheckin = useStore((s) => s.setCheckin)
  const [mood, setMood] = useState(existing?.mood ?? 0)
  const [hunger, setHunger] = useState(existing?.hunger ?? 0)
  const [note, setNote] = useState(existing?.note ?? '')
  const save = () => {
    setCheckin(mood || hunger || note.trim() ? { mood, hunger, note: note.trim(), t: nowIso() } : null)
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
      <div className="lbl">Hunger right now</div>
      {scale(HUNGER, hunger, setHunger)}
      <div className="lbl">Note</div>
      <textarea rows={3} value={note} placeholder="Anything worth remembering? Optional." onChange={(e) => setNote(e.target.value)} />
      <div className="foot">Hunger and mood help you spot patterns, like skipped lunches leading to big evenings. There's no right answer.</div>
    </Sheet>
  )
}
