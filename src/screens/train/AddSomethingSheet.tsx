import type { WorkoutType } from '@/core/types'
import { SESSIONS, WORKOUTS } from '@/core/data/workouts'
import { setCount } from '@/core/domain/guided'
import { shortTitle } from '@/core/domain/week'
import { Sheet } from '@/ui/primitives'
import { Icon } from '@/ui/icons'

/**
 * "Add something" on Train: a quick log of any movement, a different workout for today only,
 * or the exercise library. Nothing here changes the weekly plan.
 */
export function AddSomethingSheet({ planned, onLog, onWorkout, onLibrary, onClose }: {
  planned?: WorkoutType | 'Rest'
  onLog: () => void
  onWorkout: (w: WorkoutType) => void
  onLibrary: () => void
  onClose: () => void
}) {
  const others = SESSIONS.filter((s): s is WorkoutType => s !== 'Rest' && s !== planned)
  return (
    <Sheet title="Add something" onClose={onClose}>
      <div className="list icons">
        <button className="li" onClick={onLog}>
          <span className="ico" style={{ background: 'var(--activity)' }}><Icon name="plus" size={18} /></span>
          <div className="m"><div className="t">Log a session</div><div className="s">A walk, yoga, pilates, anything</div></div>
        </button>
      </div>
      <div className="lbl">Do a different workout today</div>
      <div className="list">
        {others.map((w) => (
          <button className="li" key={w} onClick={() => onWorkout(w)}>
            <div className="m"><div className="t">{shortTitle(w)}</div>
              <div className="s">{w === 'Cardio' ? WORKOUTS.Cardio.ex[0].t : `${WORKOUTS[w].ex.length} exercises · ${setCount(WORKOUTS[w].ex)}`}</div></div>
          </button>
        ))}
      </div>
      <div className="foot" style={{ padding: '0 4px 12px' }}>This only changes today. To change your week, use Plan.</div>
      <div className="list icons">
        <button className="li" onClick={onLibrary}>
          <span className="ico" style={{ background: 'var(--tint)' }}><Icon name="book" size={18} /></span>
          <div className="m"><div className="t">Exercise library</div><div className="s">How to do each move, easier and harder options</div></div>
        </button>
      </div>
    </Sheet>
  )
}
