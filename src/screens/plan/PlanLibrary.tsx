import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '@/store/store'
import { quietNumbers } from '@/data/consent'
import type { Goal, PlanPhase, PlanWeek } from '@/core/types'
import { shiftDay, shortDateOf, todayStr } from '@/core/domain/date'
import {
  bestFit, catalogue, eatingLine, filterCatalogue, fitOf, fits, PLAN_TEMPLATES, phaseWeek, planStart, startOn, timeline, totalWeeks,
  type CatalogueEntry, type PlanExperience, type PlanFilters, type PlanWhere,
} from '@/core/domain/plans'
import { BackButton, Sheet } from '@/ui/primitives'
import { Icon, Chevron } from '@/ui/icons'
import { GOAL_CHIP, goalLabel, planArt, PlanTile, Timeline, TimelineKey, WeekRows } from './PlanParts'

const DAYS: [NonNullable<PlanFilters['days']>[number], string][] = [['2-3', 'Up to 3'], ['4-5', '4–5'], ['6', '6 or more']]
const EXPERIENCE: [PlanExperience, string][] = [['new', 'Just starting'], ['comfortable', 'Getting comfortable'], ['confident', 'Confident']]
const WHERE: [PlanWhere, string][] = [['gym', 'Gym'], ['home', 'Home, some kit'], ['none', 'No equipment']]
const LENGTH: [NonNullable<PlanFilters['length']>[number], string][] = [['6', 'Up to 6 weeks'], ['8', '7 to 9 weeks'], ['12', '10 weeks or more']]
const MADE: [NonNullable<PlanFilters['madeBy']>[number], string][] = [['tali', 'Tali'], ['me', 'Me']]

const toggle = <T,>(list: T[] | undefined, v: T): T[] => (list?.includes(v) ? list.filter((x) => x !== v) : [...(list ?? []), v])

function FilterGroup<T extends string>({ label, options, value, onChange }: { label: string; options: [T, string][]; value?: T[]; onChange: (v: T[]) => void }) {
  return (
    <div className="pf-g">
      <div className="pf-l">{label}</div>
      <div className="chips">
        {options.map(([k, l]) => (
          <button key={k} className={'chip sm' + (value?.includes(k) ? ' on' : '')} aria-pressed={!!value?.includes(k)} onClick={() => onChange(toggle(value, k))}>{l}</button>
        ))}
      </div>
    </div>
  )
}

/** The filter sheet: goal, days, experience, where, length and who made it. */
function FilterSheet({ value, onChange, onClose, count }: { value: PlanFilters; onChange: (f: PlanFilters) => void; onClose: () => void; count: number }) {
  return (
    <Sheet title="Filters" onClose={onClose} left={<button className="navbtn" onClick={() => onChange({ q: value.q })}>Clear</button>}
      right={<button className="navbtn b" onClick={onClose}>Done</button>}>
      <FilterGroup label="Goal" options={GOAL_CHIP} value={value.goal} onChange={(goal) => onChange({ ...value, goal })} />
      <FilterGroup label="Days a week" options={DAYS} value={value.days} onChange={(days) => onChange({ ...value, days })} />
      <FilterGroup label="Experience" options={EXPERIENCE} value={value.experience} onChange={(experience) => onChange({ ...value, experience })} />
      <FilterGroup label="Where" options={WHERE} value={value.where} onChange={(where) => onChange({ ...value, where })} />
      <FilterGroup label="Length" options={LENGTH} value={value.length} onChange={(length) => onChange({ ...value, length })} />
      <FilterGroup label="Made by" options={MADE} value={value.madeBy} onChange={(madeBy) => onChange({ ...value, madeBy })} />
      <div className="stack sheet-cta"><button className="btn" disabled={count === 0} onClick={onClose}>{count === 0 ? 'No plans match' : `Show ${count} ${count === 1 ? 'plan' : 'plans'}`}</button></div>
    </Sheet>
  )
}

/**
 * Every plan in one list (Plans 1, step 2): Tali's and the person's own, no categories to manage.
 * The plan that fits their goal leads; search, goal chips and filters narrow it.
 */
export function PlanLibrary({ onBack, onOpen, onNew }: { onBack: () => void; onOpen: (e: CatalogueEntry) => void; onNew: () => void }) {
  const trainingPlans = useStore((s) => s.data.trainingPlans)
  const profile = useStore((s) => s.data.profile)
  const fit = fitOf(profile)
  const [f, setF] = useState<PlanFilters>({})
  const [sheet, setSheet] = useState(false)
  // a goal chosen in the filter sheet shows as a removable chip like the other filters
  const [viaSheet, setViaSheet] = useState(false)
  // built to grow: tiles come in pages as you scroll, with a quiet placeholder tile (Plans 1)
  const PAGE = 12
  const [shown, setShown] = useState(PAGE)
  const more = useRef<HTMLSpanElement | null>(null)
  useEffect(() => {
    const el = more.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) setShown((n) => n + PAGE) })
    io.observe(el)
    return () => io.disconnect()
  })
  const all = useMemo(() => catalogue({ trainingPlans }, fit), [trainingPlans, fit.goal, fit.age, fit.experience])
  const list = filterCatalogue(all, f)
  const filtered = !!(f.days?.length || f.experience?.length || f.where?.length || f.length?.length || f.madeBy?.length || (f.goal?.length ?? 0) > 1 || (viaSheet && f.goal?.length))
  const narrowed = filtered || !!f.q || !!f.goal?.length
  const best = bestFit(PLAN_TEMPLATES, fit)
  const lead = !narrowed ? list.find((e) => e.template === best && !!best) : undefined
  const rest = list.filter((e) => e !== lead)
  const chipsOn: { label: string; clear: () => void }[] = filtered ? [
    ...(f.goal ?? []).map((g) => ({ label: goalLabel(g) ?? g, clear: () => setF({ ...f, goal: f.goal!.filter((x) => x !== g) }) })),
    ...(f.days ?? []).map((d) => ({ label: `${DAYS.find(([k]) => k === d)?.[1]} days a week`, clear: () => setF({ ...f, days: f.days!.filter((x) => x !== d) }) })),
    ...(f.experience ?? []).map((x) => ({ label: EXPERIENCE.find(([k]) => k === x)![1], clear: () => setF({ ...f, experience: f.experience!.filter((y) => y !== x) }) })),
    ...(f.where ?? []).map((x) => ({ label: WHERE.find(([k]) => k === x)![1], clear: () => setF({ ...f, where: f.where!.filter((y) => y !== x) }) })),
    ...(f.length ?? []).map((x) => ({ label: LENGTH.find(([k]) => k === x)![1], clear: () => setF({ ...f, length: f.length!.filter((y) => y !== x) }) })),
    ...(f.madeBy ?? []).map((x) => ({ label: MADE.find(([k]) => k === x)![1], clear: () => setF({ ...f, madeBy: f.madeBy!.filter((y) => y !== x) }) })),
  ] : []
  const tile = (e: CatalogueEntry, big = false) => (
    <PlanTile key={e.key} name={e.name} line={e.line} art={planArt(e.template?.id ?? e.plan?.baseTemplateId)} artAt={e.template?.artAt} fits={!!best && e.template === best} big={big} onClick={() => onOpen(e)} />
  )
  const goalChip = (g: Goal | null, label: string) => {
    const on = g ? f.goal?.length === 1 && f.goal[0] === g : !f.goal?.length
    return <button key={label} role="tab" aria-selected={on} className={'chip' + (on ? ' ink' : ' plain')} onClick={() => setF({ ...f, goal: g ? [g] : undefined })}>{label}</button>
  }
  return (
    <div className="screen">
      <div className="pv-back"><BackButton label="Plan" onClick={onBack} /></div>
      <h1 className="ltitle">Plans</h1>
      <div className="pl-search">
        <div className="searchbar card-bg"><Icon name="search" size={17} />
          <input value={f.q ?? ''} placeholder="Search plans" aria-label="Search plans" onChange={(e) => setF({ ...f, q: e.target.value })} /></div>
        <button className={'pl-filter' + (filtered ? ' on' : '')} aria-label="Filters" onClick={() => setSheet(true)}><Icon name="sliders" size={18} /></button>
      </div>
      {filtered ? (
        <div className="chips pl-on">
          {chipsOn.map((c) => <button key={c.label} className="chip sm on" onClick={c.clear} aria-label={`Remove ${c.label}`}>{c.label} ×</button>)}
          <button className="linkbtn" onClick={() => { setViaSheet(false); setF({ q: f.q }) }}>Clear all</button>
        </div>
      ) : (
        <div className="chips pl-goals" role="tablist" aria-label="Goal">
          {goalChip(null, 'All')}
          {GOAL_CHIP.map(([g, l]) => goalChip(g, l))}
        </div>
      )}
      {narrowed && <div className="foot num" style={{ padding: '0 4px' }}>{list.length} {list.length === 1 ? 'plan' : 'plans'}</div>}
      {lead && tile(lead, true)}
      {rest.length > 0 && (
        <div className="pgrid">
          {rest.slice(0, shown).map((e) => tile(e))}
          {rest.length > shown && <span ref={more} className="ptile skel" aria-hidden="true" />}
        </div>
      )}
      {list.length === 0 && <div className="dash-empty">{f.q && !filtered && !f.goal?.length ? `No plans called “${f.q}”.` : 'No plans match yet. Try removing a filter, or build your own.'}</div>}
      <button className="dash-add" onClick={onNew}><Icon name="plus" size={18} stroke={2.4} />New plan</button>
      {sheet && <FilterSheet value={f} onChange={(v) => { setViaSheet(true); setF(v) }} onClose={() => setSheet(false)} count={filterCatalogue(all, f).length} />}
    </div>
  )
}

/** When a plan starts: today, next Monday, or a date the person picks. */
export function StartChoice({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  const today = todayStr()
  const monday = planStart(today, 'monday')
  const picked = value !== today && value !== monday
  return (
    <div className="pl-starts" role="radiogroup" aria-label="Starts">
      <span className="pl-sl">Starts</span>
      <button role="radio" aria-checked={value === today} className={'chip' + (value === today ? ' ink' : ' plain')} onClick={() => onChange(today)}>Today</button>
      <button role="radio" aria-checked={value === monday} className={'chip' + (value === monday ? ' ink' : ' plain')} onClick={() => onChange(monday)}>{shortDateOf(monday)}</button>
      <label className={'chip pl-date' + (picked ? ' ink' : ' plain')}>
        {picked ? shortDateOf(value) : 'Pick a date'}
        <input type="date" aria-label="Pick a start date" min={today} max={shiftDay(today, 365)} value={picked ? value : ''} onChange={(e) => onChange(startOn(today, e.target.value))} />
      </label>
    </div>
  )
}

/** The build weeks a plan has, by name (Foundation, Build), for the preview's week switch. */
function buildWeeks(phases: Omit<PlanPhase, 'id'>[]): { name: string; week: PlanWeek }[] {
  const out: { name: string; week: PlanWeek }[] = []
  phases.forEach((ph, i) => {
    if (ph.maintain || ph.after) return
    if (!out.some((x) => x.name === ph.name)) out.push({ name: ph.name, week: phaseWeek({ phases: phases as PlanPhase[] }, i) })
  })
  return out
}

/**
 * A plan before it starts (Plans 1, step 3): its photograph, what it is, how the weeks go, a build
 * week, maintenance after, eating for it, who it's for, and when to start.
 */
export function PlanPreview({ entry, onBack, onStart, onMaintenance, note }: {
  entry: CatalogueEntry
  onBack: () => void
  onStart: (startedAt: string) => void
  onMaintenance: () => void
  /** the last plan's "do differently", when this one follows it */
  note?: string
}) {
  const routines = useStore((s) => s.data.routines)
  const profile = useStore((s) => s.data.profile)
  const quiet = useStore((s) => quietNumbers(s.data))
  const t = entry.template
  const phases = t?.phases ?? entry.plan?.phases ?? []
  const weeks = buildWeeks(phases)
  const [shown, setShown] = useState(Math.min(1, Math.max(0, weeks.length - 1)))
  const [start, setStart] = useState(todayStr())
  const n = totalWeeks({ phases })
  const art = planArt(t?.id ?? entry.plan?.baseTemplateId)
  const fitsHere = !!t && fits(t, fitOf(profile))
  return (
    <div className="screen pp">
      <div className={'pp-hero' + (art ? '' : ' plain')}>
        {art && <img src={art} alt="" style={{ objectPosition: t?.artAt }} onError={(e) => { e.currentTarget.style.display = 'none' }} />}
        {art && <span className="shade" aria-hidden="true" />}
        <button className="pp-back" aria-label="Back" onClick={onBack}><Icon name="chevL" size={18} stroke={2.6} /></button>
        <div className="pp-cap">
          {fitsHere && <span className="fits">Fits your goal: {goalLabel(profile.goal)}</span>}
          <h1>{entry.name}</h1>
          <div className="num">{entry.line}</div>
        </div>
      </div>
      {note && <div className="card plan-note">From your last plan: “{note}”</div>}
      {t && <p className="pp-about">{t.about}</p>}
      <section className="card pp-weeks">
        <div className="pp-k">How the {n} weeks go</div>
        <Timeline cells={timeline({ phases: phases as PlanPhase[] })} endLabel={`Week ${n}`} />
        <TimelineKey />
        {t && <div className="pp-wt">{t.weeksText}</div>}
      </section>
      {weeks.length > 0 && (
        <>
          <div className="pp-wh">
            <h2>{weeks.length > 1 ? `A ${weeks[shown].name.toLowerCase()} week` : 'The week'}</h2>
            {weeks.length > 1 && (
              <span className="chips">
                {weeks.map((w, i) => <button key={w.name} className={'chip sm' + (i === shown ? ' on' : '')} aria-pressed={i === shown} onClick={() => setShown(i)}>{w.name}</button>)}
              </span>
            )}
          </div>
          <WeekRows week={weeks[shown].week} routines={routines} />
        </>
      )}
      <div className="list">
        <button className="li" onClick={onMaintenance}>
          <span className="catsq sm" style={{ background: 'var(--fill)' }} aria-hidden="true" />
          <div className="m"><div className="t">After the plan: maintenance</div><div className="s">When the plan ends, you can switch to maintenance: the same workouts with fewer sets, to keep what you've built for as long as you need.</div></div>
          <Chevron />
        </button>
        {t && (
          <div className="li">
            <span className="catsq sm" style={{ background: 'var(--food-fill)' }} aria-hidden="true" />
            <div className="m"><div className="t">Eating for this plan</div><div className="s">{eatingLine(t, profile.goal, quiet)}</div></div>
          </div>
        )}
      </div>
      {t && (
        <div className="list pp-facts">
          <div className="li"><span className="k">For</span><span>{t.forWho}</span></div>
          <div className="li"><span className="k">Kit</span><span>{t.kit}</span></div>
          <div className="li"><span className="k">Time</span><span>{t.time}</span></div>
        </div>
      )}
      {t?.id === 'pure-muscle-growth' && (!profile.training?.experience || profile.training.experience === 'beginner') && (
        <div className="foot" style={{ padding: '0 4px 8px' }}>New to lifting? Full body system is a better first plan.</div>
      )}
      <div className="foot" style={{ padding: '0 4px' }}>{t?.safety ? t.safety + ' ' : ''}General fitness information only, not medical advice. Talk to a GP before starting a new exercise programme.</div>
      <div className="pp-cta">
        <StartChoice value={start} onChange={setStart} />
        <button className="btn" onClick={() => onStart(start)}>Start plan</button>
      </div>
    </div>
  )
}

/** How maintenance works (Plans 1, full-screen card): reached from the preview, details and the end. */
export function MaintenanceCard({ onClose }: { onClose: () => void }) {
  const steps: [string, string][] = [
    ['What maintenance is', "A lighter way to train once a plan ends. You keep doing the same workouts, just with fewer sets. It's for busy spells, a breather between plans, or whenever you'd like to hold steady."],
    ['Why it works', 'People who had trained for a few months kept most of their strength and muscle for months on about a third of their usual sets, sometimes training just once a week. Older adults kept more when they did a bit more, so Stronger with age keeps about two thirds.'],
    ['What changes in Tali', 'Your workouts open on the shorter version, usually 2 sets instead of 3, on two or three days a week. Light cardio and balance sessions stay if you want them. You can do the full workout any day.'],
    ['The one thing to keep: the weight', "Lift the same weights you finished the plan on, and stop a couple of reps before you couldn't do another. Fewer sets is fine. Much lighter weights is what lets progress slip."],
    ["How long, and what's next", "As long as you need. We'll check in after about 8 weeks and suggest a new plan around 12, whenever you're ready. A week or two off along the way won't undo your work."],
  ]
  return (
    <Sheet title="After your plan" onClose={onClose} tall left={null} right={<button className="navbtn" onClick={onClose}>Close</button>}>
      <h2 className="mc-h">Keeping what you've built</h2>
      <div className="mc-bars" aria-hidden="true"><span className="b1">Your plan: building</span><span className="b2">Maintenance: holding steady</span></div>
      <ol className="mc-steps">
        {steps.map(([h, t], i) => (
          <li key={h}><span className="mc-n num">{i + 1}</span><div><div className="mc-t">{h}</div><div className="mc-p">{t}</div></div></li>
        ))}
      </ol>
      <div className="stack sheet-cta"><button className="btn" onClick={onClose}>Got it</button></div>
    </Sheet>
  )
}
