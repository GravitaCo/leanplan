import { useState } from 'react'
import { useStore } from '@/store/store'
import type { Routine, RoutineSlot } from '@/core/types'
import { EXERCISE_BY_ID } from '@/core/data/exercises'
import { builderNotes, estMins, slotsOf } from '@/core/domain/routines'
import { Sheet } from '@/ui/primitives'
import { Icon } from '@/ui/icons'
import { LibrarySheet } from './LibrarySheet'

export interface BuilderStart {
  /** editing a saved workout */
  routine?: Routine
  /** or starting from a built-in ("Customise") */
  name?: string
  slots?: RoutineSlot[]
  baseId?: string
}

/**
 * Build or edit one of your own workouts (plan §4.3): a name, exercises from the library with
 * their sets and reps, in any order. Notes about order or length are suggestions and never stop
 * a save. Saving changes the workout for next time; anything already logged keeps what was done.
 */
export function RoutineBuilderSheet({ start, onSaved, onClose }: { start: BuilderStart; onSaved: (id: string) => void; onClose: () => void }) {
  const saveRoutine = useStore((s) => s.saveRoutine)
  const archiveRoutine = useStore((s) => s.archiveRoutine)
  const r = start.routine
  const [name, setName] = useState(r?.name ?? start.name ?? '')
  const [slots, setSlots] = useState<RoutineSlot[]>(() => (r ? slotsOf(r) : start.slots ?? []).map((x) => ({ ...x })))
  // hard or light is worked out from the exercises at save (plan §3.3); a way to change it comes
  // with weekly plans (P5), where it is first used
  const [picking, setPicking] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  const move = (i: number, d: -1 | 1) => setSlots((p) => { const n = [...p]; const j = i + d; if (j < 0 || j >= n.length) return p; [n[i], n[j]] = [n[j], n[i]]; return n })
  const notes = builderNotes(slots)

  const save = () => {
    const id = saveRoutine({ id: r?.id, name, slots, ...(start.baseId ? { baseId: start.baseId } : {}) })
    if (id) onSaved(id)
  }

  if (picking) {
    return <LibrarySheet onPick={(id) => { setSlots((p) => [...p, { exId: id }]); setPicking(false) }} onClose={() => setPicking(false)} />
  }
  return (
    <Sheet title={r ? 'Edit workout' : 'New workout'} onClose={onClose} tall animate={false}
      right={<button className="navbtn b" onClick={save} disabled={!slots.length}>Save</button>}>
      <div className="list">
        <div className="frow"><label htmlFor="rb_name">Name</label>
          <input id="rb_name" value={name} placeholder="My workout" maxLength={120} onChange={(e) => setName(e.target.value)} /></div>
      </div>

      <div className="grp-h">Exercises{slots.length ? ` · about ${estMins(slots)} min` : ''}</div>
      {slots.length > 0 && (
        <div className="list">
          {slots.map((s, i) => {
            const x = EXERCISE_BY_ID[s.exId]
            return (
              <div className="li rb-slot" key={i}>
                <div className="m">
                  <div className="t">{x?.n ?? 'Exercise not in this version of Tali'}</div>
                  <input className="rb-rx" value={s.rx ?? ''} placeholder={x?.defaultRx ?? 'Sets and reps'} aria-label={`Sets and reps for ${x?.n ?? 'this exercise'}`}
                    onChange={(e) => setSlots((p) => p.map((y, j) => (j === i ? { ...y, rx: e.target.value || undefined } : y)))} />
                </div>
                <div className="rb-acts">
                  <button className="x-btn up" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${x?.n ?? 'exercise'} up`}><Icon name="chevL" size={14} stroke={2.6} /></button>
                  <button className="x-btn down" onClick={() => move(i, 1)} disabled={i === slots.length - 1} aria-label={`Move ${x?.n ?? 'exercise'} down`}><Icon name="chevR" size={14} stroke={2.6} /></button>
                  <button className="x-btn" onClick={() => setSlots((p) => p.filter((_, j) => j !== i))} aria-label={`Remove ${x?.n ?? 'exercise'}`}><Icon name="x" size={14} stroke={2.6} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <div className="list" style={{ marginTop: slots.length ? 8 : 0 }}>
        <button className="li" onClick={() => setPicking(true)}>
          <span className="ico" style={{ background: 'var(--tint)' }}><Icon name="plus" size={18} /></span>
          <div className="m"><div className="t">Add an exercise</div></div>
        </button>
      </div>
      {notes.map((n) => <div className="foot" key={n} style={{ padding: '8px 4px 0' }}>{n}</div>)}

      {r && (
        <div className="stack" style={{ marginTop: 18 }}>
          {confirmRemove
            ? <button className="btn danger" onClick={() => { archiveRoutine(r.id); onClose() }}>Remove this workout</button>
            : <button className="btn gray" onClick={() => setConfirmRemove(true)}>Remove workout</button>}
          {confirmRemove && <div className="foot" style={{ padding: '6px 4px 0' }}>Anything you've already logged stays in your history.</div>}
        </div>
      )}
    </Sheet>
  )
}
