import { useState } from 'react'
import { useStore } from '@/store/store'
import type { PlanPhase, TrainingPlan } from '@/core/types'
import { todayStr } from '@/core/domain/date'
import {
  copyWeek, MAX_PHASE_WEEKS, MAX_PLAN_WEEKS, newPhaseId, nextSuggestions, phasesOf, planStart,
  PLAN_TEMPLATES, totalWeeks, weekFromSchedule, weekSource, weekSummary, type PlanTemplate,
} from '@/core/domain/plans'
import { Seg, Sheet, Toggle } from '@/ui/primitives'
import { Icon, Chevron } from '@/ui/icons'

/** What the editor starts from: a plan to change, or a new one. */
export type PlanDraft =
  | { planId: string }
  | {
    name: string; phases: PlanPhase[]; source: TrainingPlan['source']; baseTemplateId?: string; clonedFromId?: string
    /** the plan that just ended, with its look back: finished only when this one starts, so Cancel changes nothing */
    after?: { id: string; reflection: { good?: string; change?: string } }
  }

const weeksLabel = (n: number) => `${n} ${n === 1 ? 'week' : 'weeks'}`

/** A plan's shape in words: "8 weeks build, then 4 weeks lighter". */
export function phasesLine(phases: Pick<PlanPhase, 'weeks' | 'maintain' | 'name'>[]): string {
  return phases.map((ph) => `${weeksLabel(ph.weeks)} ${ph.maintain ? 'lighter' : 'building'}`).join(', then ')
}

/**
 * Start a weekly plan (P5): one of Tali's, the week you already have, or your own from scratch.
 * Choosing one opens the editor, where it can be changed before it starts.
 */
export function PlanStartSheet({ onClose, onDraft }: { onClose: () => void; onDraft: (d: PlanDraft) => void }) {
  const schedule = useStore((s) => s.data.schedule)
  const routines = useStore((s) => s.data.routines)
  const mine = weekFromSchedule(schedule)
  const fromTemplate = (t: PlanTemplate) => onDraft({ name: t.name, phases: phasesOf(t), source: 'recommended', baseTemplateId: t.id })
  return (
    <Sheet title="Start a plan" onClose={onClose} left={<button className="navbtn" onClick={onClose}>Cancel</button>}>
      <div className="foot" style={{ padding: '0 4px 4px' }}>
        A plan runs for a set number of weeks. Build weeks follow the plan's week. Lighter weeks keep the same workouts and open on the shorter version.
      </div>
      <div className="lbl">From Tali</div>
      <div className="list">
        {PLAN_TEMPLATES.map((t) => (
          <button className="li" key={t.id} onClick={() => fromTemplate(t)}>
            <div className="m"><div className="t">{t.name}</div><div className="s">{t.about}</div></div>
            <Chevron />
          </button>
        ))}
      </div>
      <div className="lbl">Your own</div>
      <div className="list">
        <button className="li" onClick={() => onDraft({
          name: 'My plan', source: 'custom',
          phases: [{ id: newPhaseId(), name: 'Build', weeks: 8, week: copyWeek(mine) }, { id: newPhaseId(), name: 'Maintain', weeks: 4, maintain: true }],
        })}>
          <div className="m"><div className="t">Start from your current week</div><div className="s">{weekSummary(mine, routines)}</div></div>
          <Chevron />
        </button>
        <button className="li" onClick={() => onDraft({ name: 'My plan', source: 'custom', phases: [{ id: newPhaseId(), name: 'Build', weeks: 8, week: copyWeek({}) }] })}>
          <div className="m"><div className="t">Build your own</div><div className="s">Start with an empty week and add workouts day by day</div></div>
          <Chevron />
        </button>
      </div>
    </Sheet>
  )
}

/**
 * Name a plan, set its phases (weeks, build or lighter) and each build phase's week. New plans also
 * choose this week or next. Notes about the week are gentle and never stop a save.
 */
export function PlanEditorSheet({ draft, onClose, onEditWeek }: {
  draft: PlanDraft
  onClose: () => void
  /** a running plan: open a build phase's week on the Plan tab (Option A's week, then Flow 3's day) */
  onEditWeek?: (phaseIndex: number) => void
}) {
  const existing = useStore((s) => ('planId' in draft ? s.data.trainingPlans?.find((p) => p.id === draft.planId) : undefined))
  const routines = useStore((s) => s.data.routines)
  const startPlan = useStore((s) => s.startPlan)
  const updatePlan = useStore((s) => s.updatePlan)
  const finishPlan = useStore((s) => s.finishPlan)
  const notePlan = useStore((s) => s.notePlan)
  const showToast = useStore((s) => s.showToast)
  const init = existing ?? ('planId' in draft ? undefined : draft)
  const [name, setName] = useState(init?.name ?? 'My plan')
  const [phases, setPhases] = useState<PlanPhase[]>(() => (init?.phases ?? []).map((ph) => ({ ...ph, ...(ph.maintain ? {} : { week: copyWeek(ph.week) }) })))
  const [when, setWhen] = useState<'today' | 'monday'>('today')
  const [stopping, setStopping] = useState(false)
  // the last plan's "do differently" note comes back when the next one is set up (the follow-up
  // is what makes a look back useful; mental-performance)
  const lastNote = useStore((s) => (s.data.trainingPlans || []).filter((p) => p.reflection?.change).sort((a, b) => (b.reflection!.at > a.reflection!.at ? 1 : -1))[0]?.reflection?.change)
  const [noteShown, setNoteShown] = useState(true)
  // just typed on the end sheet, or from an earlier plan
  const note = (!('planId' in draft) && draft.after?.reflection.change?.trim()) || lastNote

  if (!init) return null
  const total = totalWeeks({ phases })
  const setPhase = (i: number, patch: Partial<PlanPhase>) => setPhases(phases.map((ph, j) => (j === i ? { ...ph, ...patch } : ph)))
  const setWeeks = (i: number, n: number) => {
    const room = MAX_PLAN_WEEKS - (total - phases[i].weeks)
    setPhase(i, { weeks: Math.max(1, Math.min(MAX_PHASE_WEEKS, room, n)) })
  }
  const setMaintain = (i: number, on: boolean) => {
    const ph = phases[i]
    // a lighter phase reuses the build week before it; turning it back into a build phase starts
    // from that same week, so nothing has to be re-entered
    const src = weekSource({ phases }, i)
    setPhase(i, on
      ? { maintain: true, week: undefined, name: ph.name === 'Build' ? 'Maintain' : ph.name }
      : { maintain: undefined, week: copyWeek(src >= 0 ? phases[src].week : {}), name: ph.name === 'Maintain' ? 'Build' : ph.name })
  }
  const addPhase = () => {
    if (total >= MAX_PLAN_WEEKS) { showToast('A plan can run up to a year'); return }
    const last = phases[weekSource({ phases }, phases.length - 1)]
    setPhases([...phases, { id: newPhaseId(), name: 'Build', weeks: Math.min(4, MAX_PLAN_WEEKS - total), week: copyWeek(last?.week) }])
  }
  const removePhase = (i: number) => setPhases(phases.filter((_, j) => j !== i))
  const hasBuild = phases.some((ph) => !ph.maintain)

  const valid = () => {
    if (!phases.length) { showToast('Add at least one phase'); return false }
    if (!hasBuild) { showToast('Add a build phase, so the lighter weeks have workouts to repeat'); return false }
    return true
  }
  const save = () => {
    if (!valid()) return
    if (existing) updatePlan(existing.id, { name, phases })
    else if (!('planId' in draft)) {
      const start = planStart(todayStr(), when)
      // the plan that ended keeps going until this one starts; its look back is kept either way
      if (draft.after) { if (start <= todayStr()) finishPlan(draft.after.id, draft.after.reflection); else notePlan(draft.after.id, draft.after.reflection) }
      startPlan({ name, phases, source: draft.source, baseTemplateId: draft.baseTemplateId, clonedFromId: draft.clonedFromId, startedAt: start })
    }
    onClose()
  }

  // ---------- the plan ----------
  return (
    <Sheet title={existing ? 'Edit plan' : 'New plan'} onClose={onClose} tall animate={!!existing}
      left={null} right={<button className="navbtn" onClick={onClose}>Cancel</button>}>
      <div className="list">
        <div className="frow"><label htmlFor="tp_name">Name</label>
          <input id="tp_name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} style={{ flex: 1, minWidth: 0 }} /></div>
      </div>
      {!existing && note && noteShown && (
        <div className="card plan-note pw-last">
          <span>Last time you said you'd do differently: “{note}”</span>
          <button className="x-btn" aria-label="Hide this note" onClick={() => setNoteShown(false)}><Icon name="x" size={14} stroke={2.6} /></button>
        </div>
      )}
      {!existing && (
        <>
          <div className="lbl">Starts</div>
          <Seg options={[['today', 'Today'], ['monday', 'Next Monday']]} value={when} onChange={setWhen} />
        </>
      )}
      <div className="lbl">Phases · {weeksLabel(total)}</div>
      {phases.map((ph, i) => (
        <div className="card pw-phase" key={ph.id}>
          <div className="pw-h">
            <input className="pw-name" aria-label="Phase name" value={ph.name} maxLength={40} onChange={(e) => setPhase(i, { name: e.target.value })} />
            {phases.length > 1 && <button className="x-btn" aria-label={`Remove ${ph.name}`} onClick={() => removePhase(i)}><Icon name="x" size={14} stroke={2.6} /></button>}
          </div>
          <div className="pw-row">
            <span>Weeks</span>
            <div className="stepper">
              <button aria-label="Fewer weeks" onClick={() => setWeeks(i, ph.weeks - 1)}>−</button>
              <span className="num">{ph.weeks}</span>
              <button aria-label="More weeks" onClick={() => setWeeks(i, ph.weeks + 1)}>+</button>
            </div>
          </div>
          {i > 0 && (
            <div className="pw-row">
              <span>Lighter weeks</span>
              <Toggle on={!!ph.maintain} label="Lighter weeks" onChange={() => setMaintain(i, !ph.maintain)} />
            </div>
          )}
          {ph.maintain ? (
            <div className="s muted pw-s">The same workouts as {phases[weekSource({ phases }, i)]?.name ?? 'your build week'}, opening on the shorter version. You can pick the full one any day.</div>
          ) : (
            existing && onEditWeek ? (
              <button className="li pw-week" onClick={() => { if (!valid()) return; updatePlan(existing.id, { name, phases }); onEditWeek(i) }}>
                <div className="m"><div className="t">Week</div><div className="s">{weekSummary(ph.week ?? {}, routines)}</div></div>
                <Chevron />
              </button>
            ) : (
              <div className="li pw-week"><div className="m"><div className="t">Week</div><div className="s">{weekSummary(ph.week ?? {}, routines)}</div></div></div>
            )
          )}
        </div>
      ))}
      <div className="list">
        <button className="li act" onClick={addPhase}><Icon name="plus" size={17} /><span>Add a phase</span></button>
      </div>
      <div className="foot" style={{ padding: '8px 4px 0' }}>
        Weeks are counted from the day the plan starts. Where you are follows the calendar, so days off never push the plan back.{!existing ? ' Once it starts, tap any day in This week to change it.' : ''}
      </div>
      <div className="stack sheet-cta">
        <button className="btn" onClick={save}>{existing ? 'Save changes' : 'Start plan'}</button>
      </div>
      {existing && (
        <div className="stack">
          {stopping ? (
            <>
              <div className="foot" style={{ padding: '0 4px' }}>Stop this plan? Your weekly schedule keeps one ready-made workout a day from this week (a day with only your own workouts shows as light cardio), and your logged workouts are kept. You can start another plan whenever it suits you.</div>
              <button className="btn" onClick={() => { finishPlan(existing.id, undefined, 'archived'); onClose() }}>Stop plan</button>
              <button className="btn gray" onClick={() => setStopping(false)}>Keep it</button>
            </>
          ) : (
            <button className="btn gray" onClick={() => setStopping(true)}>Stop this plan</button>
          )}
        </div>
      )}
    </Sheet>
  )
}

/**
 * The end of a plan: a short, optional look back, then what's next (another of Tali's plans, the
 * same one again, your own) or carry on with the last week for now.
 */
export function PlanEndSheet({ plan, onClose, onDraft }: { plan: TrainingPlan; onClose: () => void; onDraft: (d: PlanDraft) => void }) {
  const finishPlan = useStore((s) => s.finishPlan)
  const [good, setGood] = useState('')
  const [change, setChange] = useState('')
  const reflection = { good, change }
  const next = (d: PlanDraft) => onDraft('planId' in d ? d : { ...d, after: { id: plan.id, reflection } })
  const again = () => next({ name: plan.name, phases: plan.phases.map((ph) => ({ ...ph, id: newPhaseId(), ...(ph.week ? { week: copyWeek(ph.week) } : {}) })), source: plan.source, baseTemplateId: plan.baseTemplateId, clonedFromId: plan.id })
  return (
    <Sheet title="End of your plan" onClose={onClose} tall left={<button className="navbtn" onClick={onClose}>Not now</button>}>
      <div className="foot" style={{ padding: '0 4px 4px' }}>
        {plan.name} has come to the end of its {weeksLabel(totalWeeks(plan))}. This is a good point to look back, if you'd like, and choose what's next.
      </div>
      <div className="lbl">Looking back (optional)</div>
      <label className="lbl" htmlFor="pe_good" style={{ display: 'block', paddingTop: 4 }}>What worked for you?</label>
      <textarea id="pe_good" className="sheet-input" rows={2} maxLength={500} value={good} placeholder="Training straight after work" onChange={(e) => setGood(e.target.value)} />
      <label className="lbl" htmlFor="pe_change" style={{ display: 'block' }}>Anything you'd do differently?</label>
      <textarea id="pe_change" className="sheet-input" rows={2} maxLength={500} value={change} placeholder="Fewer days, or shorter sessions" onChange={(e) => setChange(e.target.value)} />
      <div className="foot" style={{ padding: '4px 4px 0' }}>Only you see this. It's kept with the plan. Closing without choosing keeps nothing you've typed.</div>

      <div className="lbl">What's next</div>
      <div className="list">
        {nextSuggestions(plan).map((t) => (
          <button className="li" key={t.id} onClick={() => next({ name: t.name, phases: phasesOf(t), source: 'recommended', baseTemplateId: t.id })}>
            <div className="m"><div className="t">{t.name}</div><div className="s">{phasesLine(t.phases)}</div></div><Chevron />
          </button>
        ))}
        <button className="li" onClick={again}>
          <div className="m"><div className="t">Run this plan again</div><div className="s">{phasesLine(plan.phases)}</div></div><Chevron />
        </button>
        <button className="li" onClick={() => next({ name: 'My plan', source: 'custom', phases: [{ id: newPhaseId(), name: 'Build', weeks: 8, week: copyWeek({}) }] })}>
          <div className="m"><div className="t">Build your own</div><div className="s">Start with an empty week</div></div><Chevron />
        </button>
        <button className="li" onClick={() => { finishPlan(plan.id, reflection); onClose() }}>
          <div className="m"><div className="t">Keep going without a plan</div><div className="s">One ready-made workout a day from your last week, at the full version. Days with only your own workouts show as light cardio</div></div>
        </button>
      </div>
      <div className="foot" style={{ padding: '8px 4px 0' }}>Not ready to choose? Close this and your last week carries on as it is until you are.</div>
    </Sheet>
  )
}
