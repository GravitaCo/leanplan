import { useState } from 'react'
import { useStore } from '@/store/store'
import type { TrainingPlan } from '@/core/types'
import { dayMonthOf, shiftDay, shortDateOf, todayStr } from '@/core/domain/date'
import {
  afterPhase as afterPhaseOf, endDate, fitOf, fits, liftingDays, maintenanceLine, maintenanceWeekOf, nextSuggestions, phaseRows, phaseWeek, positionOn, templateById,
  timeline, totalWeeks, weeksSpan, withEasierStart, withLighterWeek, workoutsDone,
} from '@/core/domain/plans'
import { Sheet } from '@/ui/primitives'
import { Icon, Chevron } from '@/ui/icons'
import { planArt, PlanTile, Timeline } from './PlanParts'

const day = shortDateOf
const short = dayMonthOf

/** A plan's photograph header (or a plain one for an own plan). */
function Hero({ plan, sub, onBack }: { plan: TrainingPlan; sub: string; onBack: () => void }) {
  const art = planArt(plan.baseTemplateId)
  return (
    <div className={'pp-hero pd' + (art ? '' : ' plain')}>
      {art && <img src={art} alt="" />}
      {art && <span className="shade" aria-hidden="true" />}
      <button className="pp-back" aria-label="Back" onClick={onBack}><Icon name="chevL" size={18} stroke={2.6} /></button>
      <div className="pp-cap"><h1 className="pd-t">{plan.name}</h1><div className="num">{sub}</div></div>
    </div>
  )
}

/**
 * Plan details (Plans 3): the timeline and where you are, the phases (a build phase opens its
 * week), maintenance after, rename, add an easier or lighter week, save a copy, stop.
 */
export function PlanDetails({ plan, onBack, onEditWeek, onMaintenance, onChoose }: {
  plan: TrainingPlan
  onBack: () => void
  /** in maintenance: choose a new plan (the end of a plan's What's next) */
  onChoose: () => void
  onEditWeek: (phaseIndex: number) => void
  onMaintenance: () => void
}) {
  const data = useStore((s) => s.data)
  const updatePlan = useStore((s) => s.updatePlan)
  const savePlanCopy = useStore((s) => s.savePlanCopy)
  const finishPlan = useStore((s) => s.finishPlan)
  const [sheet, setSheet] = useState<null | 'rename' | 'add' | 'stop'>(null)
  const [name, setName] = useState(plan.name)
  const today = todayStr()
  const pos = positionOn(plan, today)
  const n = totalWeeks(plan)
  const end = endDate(plan)
  const rows = phaseRows(plan, today)
  const done = workoutsDone(data, plan, today)
  const started = !!pos
  const cur = pos && pos.maintenanceWeek == null ? pos : null
  const inMaint = pos?.maintenanceWeek != null
  const carrying = inMaint && !!pos?.phase.full
  const sub = plan.startedAt ? (started ? `Started ${day(plan.startedAt)}` : `Starts ${day(plan.startedAt)}`) + (end ? ` · ends ${day(shiftDay(end, -1))}` : '') : ''
  const where = !pos ? `${n} weeks · starts ${day(plan.startedAt!)}`
    : inMaint ? `${carrying ? 'Carrying on' : 'Maintenance'} · week ${pos.maintenanceWeek}`
    : pos.ended ? `${n} weeks, done${done ? ` · ${done} ${done === 1 ? 'workout' : 'workouts'}` : ''}`
    : `Week ${pos.week} of ${n}${done ? ` · ${done} ${done === 1 ? 'workout' : 'workouts'} so far` : ''}`
  // a lighter week goes after this week, and no earlier than halfway
  const lighterAt = Math.min(Math.max((cur?.week ?? 0) + 1, Math.ceil(n / 2) + 1), n + 1)
  const editRow = cur ? rows.find((r) => r.state === 'now') : rows.find((r) => r.kind !== 'lighter')

  return (
    <div className="screen pp">
      <Hero plan={plan} sub={sub} onBack={onBack} />
      <section className="card pp-weeks">
        <Timeline cells={timeline(plan, today)} endLabel={`Week ${n}`} />
        <div className="num" style={{ fontSize: 14 }}>{where}</div>
      </section>
      <h2 className="grp-h sm">The weeks</h2>
      <div className="list">
        {rows.map((r) => {
          const ph = plan.phases[r.index]
          const w = phaseWeek(plan, r.index)
          const lift = liftingDays(w, data.routines)
          const detail = r.kind === 'lighter' ? `${weeksSpan(r)} · shorter version` : `${weeksSpan(r)} · ${lift} lifting ${lift === 1 ? 'day' : 'days'}`
          const body = (
            <>
              <span className={`tl-c pd-sq ${r.kind === 'lighter' || r.kind === 'easier' ? 'easier' : 'full'} ${r.state === 'done' ? 'done' : r.state === 'now' ? 'now' : 'next'}`} aria-hidden="true" />
              <div className="m"><div className="t">{ph.name}</div><div className="s num">{detail}</div></div>
              <span className={'pd-state' + (r.state === 'now' ? ' now' : '')}>{r.state === 'done' ? 'Done' : r.state === 'now' ? 'Now' : ''}</span>
            </>
          )
          return r.kind === 'lighter'
            ? <div className="li" key={r.index}>{body}</div>
            : <button className="li" key={r.index} onClick={() => onEditWeek(r.index)} aria-label={`${ph.name}, ${detail}. Edit its week`}>{body}</button>
        })}
        <button className="li" onClick={onMaintenance}>
          <span className="tl-c pd-sq after" aria-hidden="true" />
          <div className="m"><div className="t">{carrying ? 'Carrying on' : 'Then maintenance'}</div><div className="s num">{carrying ? 'Your last week at the full version, for as long as you like' : inMaint ? 'Now, for as long as you like' : end ? `From ${day(end)}, if you choose it` : 'If you choose it'}</div></div>
          <span className="linkbtn">Read</span>
        </button>
      </div>
      <div className="list" style={{ marginTop: 16 }}>
        {editRow && (
          <button className="li" onClick={() => onEditWeek(editRow.index)}><div className="m"><div className="t">{cur ? "Edit this week's workouts" : 'Edit the workouts'}</div></div><Chevron /></button>
        )}
        {inMaint && <button className="li" onClick={onChoose}><div className="m"><div className="t">Choose a new plan</div></div><Chevron /></button>}
        {!inMaint && !pos?.ended && <button className="li" onClick={() => setSheet('add')}><div className="m"><div className="t">Add an easier or lighter week</div></div><Chevron /></button>}
        <button className="li" onClick={() => { setName(plan.name); setSheet('rename') }}><div className="m"><div className="t">Rename</div></div><Chevron /></button>
        <button className="li" onClick={() => savePlanCopy(plan.id)}><div className="m"><div className="t">Save a copy as my own plan</div></div></button>
        <button className="li" onClick={() => setSheet('stop')}><div className="m"><div className="t">Stop plan</div></div></button>
      </div>
      <div className="foot" style={{ padding: '8px 4px 0' }}>Stopping keeps everything you logged. Your week keeps repeating without a plan.</div>

      {sheet === 'rename' && (
        <Sheet title="Rename" onClose={() => setSheet(null)} right={<button className="navbtn b" onClick={() => { updatePlan(plan.id, { name }); setSheet(null) }}>Save</button>}>
          <input className="sheet-input" aria-label="Plan name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
        </Sheet>
      )}
      {sheet === 'add' && (
        <Sheet title="Add a week" onClose={() => setSheet(null)}>
          <div className="list">
            {!started && !plan.phases[0]?.easier && (
              <button className="li" onClick={() => { updatePlan(plan.id, { phases: withEasierStart(plan.phases) }); setSheet(null) }}>
                <div className="m"><div className="t">An easier first week</div><div className="s">To find your weights before the plan builds</div></div>
              </button>
            )}
            <button className="li" onClick={() => { updatePlan(plan.id, { phases: withLighterWeek(plan.phases, lighterAt) }); setSheet(null) }}>
              <div className="m"><div className="t">A lighter week</div><div className="s">The same workouts on the shorter version, to recover before the next stretch</div></div>
            </button>
          </div>
          <div className="foot" style={{ padding: '10px 4px 0' }}>A lighter week goes in at week {lighterAt}. Either way the plan ends a week later{end ? `, on ${day(end)}` : ''}. Weeks you've done don't move.</div>
        </Sheet>
      )}
      {sheet === 'stop' && (
        <Sheet title="Stop plan" onClose={() => setSheet(null)}>
          <div className="foot" style={{ padding: '0 4px 12px' }}>Everything you've logged stays. {data.profile.weekBeforePlan ? 'Your week goes back to the one you had before this plan.' : 'Without a plan, your week repeats with the ready-made workouts on their days, and days with only other workouts become light cardio.'} You can change any day, and start another plan whenever it suits you.</div>
          <div className="stack">
            <button className="btn" onClick={() => { finishPlan(plan.id, undefined, 'archived'); setSheet(null); onBack() }}>Stop plan</button>
            <button className="btn gray" onClick={() => setSheet(null)}>Keep the plan</button>
          </div>
        </Sheet>
      )}
    </div>
  )
}

/**
 * The end of a plan (Plans 4): a calm finish with the plan's image, dates and workouts, an optional
 * look back, then what's next: maintenance first (recommended), a plan that fits the goal, run
 * again, build your own, or no plan. Until the person chooses, the last week carries on.
 */
export function PlanEnd({ plan, step0, onClose, onMaintenance, onPreview, onAgain, onBuild }: {
  plan: TrainingPlan
  /** straight to What's next (chosen from maintenance) */
  step0?: 1 | 2
  onClose: () => void
  onMaintenance: () => void
  /** a suggested Tali plan's preview, with the look back to keep */
  onPreview: (templateId: string, reflection: { good?: string; change?: string }) => void
  onAgain: (reflection: { good?: string; change?: string }) => void
  onBuild: (reflection: { good?: string; change?: string }) => void
}) {
  const data = useStore((s) => s.data)
  const startMaintenance = useStore((s) => s.startMaintenance)
  const carryOn = useStore((s) => s.carryOn)
  const notePlan = useStore((s) => s.notePlan)
  const [step, setStep] = useState<number>(step0 ?? 1)
  const [good, setGood] = useState('')
  const [change, setChange] = useState('')
  const today = todayStr()
  const end = endDate(plan) ?? today
  const n = totalWeeks(plan)
  const last = shiftDay(end, -1)
  const done = workoutsDone(data, plan, last)
  const reflection = { good, change }
  const art = planArt(plan.baseTemplateId)
  const mweek = maintenanceWeekOf(plan)
  const suggest = nextSuggestions(plan, fitOf(data.profile))[0]
  const again = end > today ? end : today

  if (step === 1) {
    return (
      <div className="screen pe">
        <div className={'pe-hero' + (art ? '' : ' plain')}>{art && <img src={art} alt="" />}<span className="fade" aria-hidden="true" /></div>
        <div className="pe-head">
          <span className="pe-k">{plan.name}</span>
          <h1>{n} {n === 1 ? 'week' : 'weeks'}, done.</h1>
          <div className="num">{plan.startedAt ? `${short(plan.startedAt)} to ${short(last)}` : ''}{done ? ` · ${done} ${done === 1 ? 'workout' : 'workouts'}` : ''}</div>
        </div>
        <section className="card" style={{ marginBottom: 16 }}><Timeline cells={timeline(plan).filter((c) => c.kind !== 'after').map((c) => ({ ...c, state: 'done' as const }))} labels={false} /></section>
        <h2 className="grp-h sm">Looking back · optional, just for you</h2>
        <label className="card pb-name"><span className="pb-k">What worked for you?</span>
          <textarea rows={2} maxLength={500} value={good} placeholder="A few words" onChange={(e) => setGood(e.target.value)} /></label>
        <label className="card pb-name"><span className="pb-k">Anything you'd do differently?</span>
          <textarea rows={2} maxLength={500} value={change} placeholder="A few words" onChange={(e) => setChange(e.target.value)} /></label>
        <div className="foot" style={{ padding: '0 4px' }}>We'll show this when you start your next plan.</div>
        <div className="pl-cta">
          <button className="linkbtn" style={{ alignSelf: 'center' }} onClick={() => { setGood(''); setChange(''); setStep(2) }}>Skip</button>
          <button className="btn" onClick={() => setStep(2)}>Continue</button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen pe2">
      <div className="pv-back"><button className="navbtn" onClick={() => (step0 === 2 ? onClose() : setStep(1))}><Icon name="chevL" size={20} stroke={2.6} />Back</button></div>
      <h1 className="pe2-h">What's next?</h1>
      <div className="sub" style={{ margin: '-4px 0 16px' }}>No rush. Until you choose, your last week carries on as it was.</div>
      {!afterPhaseOf(plan) && <section className="card pe-rec">
        <div className="pe-rk"><span>Recommended</span><button className="linkbtn inl" onClick={onMaintenance}>How it works</button></div>
        <div><div className="pe-rt">Switch to maintenance</div><div className="s">{maintenanceLine(mweek, data.routines)}</div></div>
        <button className="btn" onClick={() => { notePlan(plan.id, reflection); startMaintenance(plan.id, mweek); onClose() }}>Start maintenance</button>
      </section>}
      <h2 className="grp-h sm">Or start a new plan</h2>
      {suggest && (
        <div style={{ marginBottom: 12 }}>
          <PlanTile name={suggest.name} line={suggest.tagline} art={planArt(suggest.id)} fits={fits(suggest, fitOf(data.profile))} big onClick={() => onPreview(suggest.id, reflection)} />
        </div>
      )}
      <div className="list">
        <button className="li" onClick={() => onAgain(reflection)}>
          <div className="m"><div className="t">Run {plan.name} again</div><div className="s">From {day(again)}, the same {n} weeks</div></div><Chevron />
        </button>
        <button className="li" onClick={() => onBuild(reflection)}>
          <div className="m"><div className="t">Build your own</div><div className="s">Pick the length, then fill the week</div></div><Chevron />
        </button>
        <button className="li" onClick={() => { carryOn(plan.id, reflection); onClose() }}>
          <div className="m"><div className="t">Keep going without a plan</div><div className="s">Your last week repeats at the full version, for as long as you like</div></div><Chevron />
        </button>
      </div>
    </div>
  )
}

export { templateById }
