import type { PlanWeek, Routine, TrainingPlan } from '@/core/types'
import { keyVideo } from '@/core/domain/routines'
import { Thumb } from '../train/Thumb'
import { timeline, type PlanTemplate, type WeekCell } from '@/core/domain/plans'
import { allPlanArt } from './planArt'
import { planWeekRows } from './planModel'

/**
 * Shared pieces of the plan screens (design canvas, Plans 1 to 4): each Tilo plan's photograph,
 * the week timeline strip and the plan tiles.
 */

export { planArt } from './planArt'
export { GOAL_CHIP } from '@/copy/plan'
export { goalLabel } from './planModel'

/**
 * Fetch the plan photographs once while online, so the service worker keeps them (hashed assets
 * are cached for good) and the library looks right offline. Never waits on anything; failures
 * just leave the tile colour showing.
 */
export function warmPlanArt(): void {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return
  for (const u of allPlanArt()) fetch(u).catch(() => {})
}

/** The weeks strip: full weeks, easier weeks striped, maintenance after outlined (fading). */
export function Timeline({ cells, labels = true, endLabel }: { cells: WeekCell[]; labels?: boolean; endLabel?: string }) {
  const weeks = cells.filter((c) => c.kind !== 'after').length
  let after = 0
  return (
    <div className="tl">
      <div className="tl-cells" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}>
        {cells.map((c, i) => <span key={i} className={`tl-c ${c.kind} ${c.state}`} style={c.kind === 'after' ? { opacity: [1, 0.7, 0.4][after++] ?? 0.4 } : undefined} />)}
      </div>
      {labels && (
        <div className="tl-l"><span className="num">Week 1</span><span className="num">{endLabel ?? `Week ${weeks}`}</span><span>Then maintain</span></div>
      )}
    </div>
  )
}

export const planCells = (p: Pick<TrainingPlan, 'phases' | 'startedAt'>, date?: string) => timeline(p, date)

/** The key under a timeline. */
export function TimelineKey() {
  return (
    <div className="tl-key">
      <span><i className="tl-c full" />Full weeks</span>
      <span><i className="tl-c easier" />Easier weeks</span>
      <span><i className="tl-c after" />Maintenance, after</span>
    </div>
  )
}

/** A plan tile: its photograph with the name on it, or (an own plan) a plain card with a dot. */
export function PlanTile({ name, line, art, artAt, fits, big, onClick }: {
  name: string; line: string; art?: string; artAt?: string; fits?: boolean; big?: boolean; onClick: () => void
}) {
  if (!art) {
    return (
      <button className={'ptile own' + (big ? ' big' : '')} onClick={onClick}>
        <span className="dot" aria-hidden="true" />
        <span><span className="n">{name}</span><span className="s num">{line}</span></span>
      </button>
    )
  }
  return (
    <button className={'ptile' + (big ? ' big' : '')} onClick={onClick}>
      {/* offline before the photo was ever seen: the tile's own colour stands in */}
      <img src={art} alt="" style={artAt ? { objectPosition: artAt } : undefined} onError={(e) => { e.currentTarget.style.display = 'none' }} />
      <span className="shade" aria-hidden="true" />
      {fits && <span className="fits">Fits your goal</span>}
      <span className="cap"><span className="n">{name}</span><span className="s num">{line}</span></span>
    </button>
  )
}

/** A Tilo plan's tile line, or an own plan's ("8 weeks · 3 workouts · yours"). */
export const tileLine = (t: PlanTemplate) => t.tagline

/**
 * A week as the Plan tab lists it (Option A): day, workouts ("Legs & Core + Pull"), the exercise
 * count for one workout, a thumbnail or the cardio dot; rest days say recovery counts too.
 */
export function WeekRows({ week, routines, todayIdx, todayNote, onDay, emptyAdd }: {
  week: PlanWeek; routines: Routine[] | undefined; todayIdx?: number; todayNote?: string; onDay?: (d: number) => void
  /** a week being built: empty days read "+ Add" rather than rest */
  emptyAdd?: boolean
}) {
  return (
    <div className="list wk">
      {planWeekRows(week, routines, todayIdx, todayNote).map(({ d, keys, names, sub, today, label, day }) => {
        const body = (
          <>
            <span className="dd">{day}</span>
            {keys.length === 0
              ? emptyAdd ? <div className="m"><div className="t tint">+ Add</div></div> : <div className="m"><div className="t muted">Rest · recovery counts too</div></div>
              : <div className="m"><div className="t">{names.join(' + ')}</div>{sub && <div className="s">{sub}</div>}</div>}
            {keys.length > 0 && (keys[0] === 'Cardio' ? <span className="cdot" aria-hidden="true" /> : <Thumb video={keyVideo(keys[0], routines)} />)}
          </>
        )
        return onDay
          ? <button className={'li wk-row' + (today ? ' today' : '')} key={d} onClick={() => onDay(d)} aria-label={label}>{body}</button>
          : <div className={'li wk-row' + (today ? ' today' : '')} key={d} aria-label={label}>{body}</div>
      })}
    </div>
  )
}
