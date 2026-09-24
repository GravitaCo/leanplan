import { useStore } from '@/store/store'
import type { WorkoutType } from '@/core/types'
import { WORKOUTS, LIFTS } from '@/core/data/workouts'
import { MODALITY_LABEL } from '@/core/data/modalities'
import { aboutMins, builtinSlots, canBuild, slotsOf } from '@/core/domain/routines'
import { Sheet } from '@/ui/primitives'
import { Icon, Chevron } from '@/ui/icons'
import type { BuilderStart } from './RoutineBuilderSheet'

/**
 * Your own workouts (plan P4): open one to do it on this day, edit it, build a new one, or start
 * from one of Tali's. Doing a workout never changes your weekly schedule.
 */
export function MyWorkoutsSheet({ onStart, onBuild, onClose }: {
  onStart: (id: string) => void
  onBuild: (start: BuilderStart) => void
  onClose: () => void
}) {
  const all = useStore((s) => s.data.routines)
  const routines = (all || []).filter((r) => !r.archived)
  const profile = useStore((s) => s.data.profile)
  const build = canBuild(profile)
  return (
    <Sheet title="My workouts" onClose={onClose} tall left={<button className="navbtn" onClick={onClose}>Done</button>}>
      {routines.length > 0 ? (
        <div className="list">
          {routines.map((r) => (
            <div className="li" key={r.id}>
              <button className="m linkrow" onClick={() => onStart(r.id)} aria-label={`Open ${r.name}`}>
                <div className="t">{r.name}</div>
                <div className="s">{[MODALITY_LABEL[r.modality], `${slotsOf(r).length} ${slotsOf(r).length === 1 ? 'exercise' : 'exercises'}`, r.estMins ? `about ${aboutMins(r.estMins)} min` : ''].filter(Boolean).join(' · ')}</div>
              </button>
              {build && <button className="linkbtn" onClick={() => onBuild({ routine: r })} aria-label={`Edit ${r.name}`}>Edit</button>}
            </div>
          ))}
        </div>
      ) : (
        <div className="foot" style={{ padding: '0 4px 12px' }}>Workouts you build show up here. Open one on any day to log it.</div>
      )}
      {build && (
        <>
          <div className="list" style={{ marginTop: 12 }}>
            <button className="li" onClick={() => onBuild({})}>
              <span className="ico" style={{ background: 'var(--tint)' }}><Icon name="plus" size={18} /></span>
              <div className="m"><div className="t">Build a workout</div><div className="s">Pick exercises from the library</div></div>
              <Chevron />
            </button>
          </div>
          <div className="grp-h">Start from one of Tali's</div>
          <div className="list">
            {LIFTS.map((t: WorkoutType) => (
              <button className="li" key={t} onClick={() => onBuild({ name: 'My ' + t, slots: builtinSlots(t), baseId: 'builtin-' + t })}>
                <div className="m"><div className="t">{WORKOUTS[t].title}</div><div className="s">Make your own copy to change</div></div>
                <Chevron />
              </button>
            ))}
          </div>
        </>
      )}
    </Sheet>
  )
}
