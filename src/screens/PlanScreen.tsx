import { useState } from 'react'
import { useStore } from '@/store/store'
import type { WorkoutType } from '@/core/types'
import { SESSIONS } from '@/core/data/workouts'
import { PageHeader, Sheet } from '@/ui/primitives'
import { Icon, Chevron, type IconName } from '@/ui/icons'
import { PlanEditSheet, PLAN_OUTCOME } from './plan/PlanSheets'

const DAYS: [string, number][] = [
  ['Monday', 1], ['Tuesday', 2], ['Wednesday', 3], ['Thursday', 4], ['Friday', 5], ['Saturday', 6], ['Sunday', 0],
]

type Guide = 'split' | 'basics'
const GUIDES: { id: Guide; title: string; icon: IconName; color: string }[] = [
  { id: 'split', title: 'How the split works', icon: 'dumbbell', color: 'var(--activity)' },
  { id: 'basics', title: 'The honest basics', icon: 'info', color: 'var(--mind)' },
]

export function PlanScreen() {
  const schedule = useStore((s) => s.data.schedule)
  const plans = useStore((s) => s.data.profile.plans) ?? []
  const setScheduleDay = useStore((s) => s.setScheduleDay)
  const [editing, setEditing] = useState<{ id?: string } | null>(null)
  const [guide, setGuide] = useState<Guide | null>(null)

  return (
    <div className="screen">
      <PageHeader title="Plan" />

      <div className="grp-h" style={{ paddingTop: 4 }}><span>If–then plans</span></div>
      <div className="list">
        {plans.map((pl) => {
          const lr = pl.reviews.length ? pl.reviews[pl.reviews.length - 1] : null
          return (
            <button className="li" key={pl.id} onClick={() => setEditing({ id: pl.id })}>
              <div className="m"><div className="t">When {pl.when}</div>
                <div className="s">I'll {pl.then}{lr ? ` · ${PLAN_OUTCOME[lr.r]}` : ''}</div></div>
              <Chevron />
            </button>
          )
        })}
        <button className="li act" onClick={() => setEditing({})}><Icon name="plus" size={17} /><span>New plan</span></button>
      </div>
      <div className="foot">
        Pick a moment that trips you up and decide ahead of time what you'll do. For example: when I get home hungry, I'll have
        yoghurt before I cook. We'll check in weekly, because the follow-up is what makes plans stick.
      </div>

      <div className="grp-h"><span>Weekly schedule</span></div>
      <div className="list">
        {DAYS.map(([name, idx]) => (
          <div className="li" key={idx}>
            <div className="m"><div className="t">{name}</div></div>
            <select aria-label={`${name} session`} value={schedule[idx] || 'Rest'}
              onChange={(e) => setScheduleDay(idx, e.target.value as WorkoutType | 'Rest')}>
              {SESSIONS.map((s) => <option key={s} value={s}>{s === 'Legs' ? 'Legs & Core' : s}</option>)}
            </select>
          </div>
        ))}
      </div>
      <div className="foot">
        Aim for three lifts a week with a rest day between where you can. Legs, then Push, then Pull means back-to-back sessions
        train different muscles. Daily steps burn more across a week than the gym sessions do.
      </div>

      <div className="grp-h"><span>Guides</span></div>
      <div className="list icons">
        {GUIDES.map((g) => (
          <button className="li" key={g.id} onClick={() => setGuide(g.id)}>
            <span className="ico" style={{ background: g.color }}><Icon name={g.icon} size={18} /></span>
            <div className="m"><div className="t">{g.title}</div></div><Chevron />
          </button>
        ))}
      </div>

      {editing && <PlanEditSheet id={editing.id} onClose={() => setEditing(null)} />}
      {guide && (
        <Sheet title={GUIDES.find((g) => g.id === guide)!.title} tall left={null} onClose={() => setGuide(null)}
          right={<button className="navbtn b" onClick={() => setGuide(null)}>Done</button>}>
          <GuideBody id={guide} />
        </Sheet>
      )}
    </div>
  )
}

function GuideBody({ id }: { id: Guide }) {
  if (id === 'split') return (
    <div className="prose">
      <p>Lifts rotate best as <b>Legs → Push → Pull</b> so back-to-back sessions hit different muscles.</p>
      <p><b>Legs &amp; Core:</b> leg press, RDL, extensions, calves, core.</p>
      <p><b>Push:</b> chest, shoulders, triceps.</p>
      <p><b>Pull:</b> back, rear delts, biceps.</p>
    </div>
  )
  return (
    <div className="prose">
      <p><b>You can't spot-reduce.</b> Fat comes off the whole body when you eat a little less than you burn. The belly is often one of the last places to change.</p>
      <p><b>Food does most of the work.</b> Training helps and protects muscle, but a steady, modest deficit is what moves body fat.</p>
      <p><b>Averages beat single days.</b> One high day doesn't undo a good week. Look at the weekly view, not the daily number.</p>
      <p><b>Estimates are fine.</b> People logging carefully still miss 20% or more. Being consistently roughly right beats being occasionally precise.</p>
      <p><b>Feeling sick with exercise?</b> Keep effort moderate, stop two or three reps short of failure, and eat a small snack 30–45 minutes before. If nausea is severe or comes with chest pain or dizziness, stop and see a GP.</p>
      <p className="muted">General information, not medical advice.</p>
    </div>
  )
}
