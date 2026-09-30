/**
 * The summary (Design canvas row Onboarding 3, note s-ob3; ob4-7 for maintenance only): "Here's a
 * starting point, not a test". It shows only what the engine generated for these answers: "Built
 * from your answers" for a generated week, "Starter week: tell us more to personalise it" for the
 * Starter week (engine §5). Every "why" row opens the engine's own reasons, rendered here from
 * their codes. Start is the only thing that changes the person's plan and targets (§10, §12).
 */
import { useMemo, useState } from 'react'
import { useStore } from '@/store/store'
import { canSaveHealthAnswers } from '@/data/consent'
import { finishedProfile, planFitLine, restLine, sessionLine, summaryFor, warmupFor, whyRows, type SummaryModel, type WhyRow, type WizardDraft } from '@/core/domain/wizard'
import { PLAN_TEMPLATES, phasesOf, phaseWeek, templateById, type PlanTemplate } from '@/core/domain/plans'
import { isBuiltinKey, keyTitle, keyVideo, templateFor } from '@/core/domain/routines'
import { LIFTS } from '@/core/data/workouts'
import type { WorkoutType } from '@/core/types'
import { Icon } from '@/ui/icons'
import { planArt } from '../plan/PlanParts'
import { renderWhy, type PlannedSession } from '@/core/domain/engine'
import { HELD_AT_MAINTENANCE_NOTE, suggestedTargets } from '@/core/domain/nutrition'
import { latestWeight } from '@/core/domain/insights'
import { todayStr, DAY_NAME } from '@/core/domain/date'
import { EXERCISE_BY_ID } from '@/core/data/exercises'
import { WEEK_ORDER } from '@/core/domain/engine/inputs'
import type { Why } from '@/core/types'
import { BareSheet } from '@/ui/primitives'
import { Chevron } from '@/ui/icons'
import { Thumb } from '../train/Thumb'
import { MAINT_SHEET, OTHERS, REDO, SUMMARY } from './copy'

const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const k = (n: number) => n.toLocaleString('en-GB')
const uniq = (xs: string[]) => [...new Set(xs)]
/** "Goblet squat: a gentler choice for the knees." → "A gentler choice for the knees." */
const afterName = (t: string) => { const i = t.indexOf(': '); const r = i > 0 && i < 48 ? t.slice(i + 2) : t; return r.charAt(0).toUpperCase() + r.slice(1) }

export function Summary({ d, onEdit, onPersonalise, onAddWeight, onAddHeight, onAddAge, onAnswers, onChoosePlan, onClose }: {
  d: WizardDraft; onEdit: () => void; onPersonalise: () => void; onAddWeight: () => void; onAddHeight: () => void; onAddAge: () => void
  /** "See your health check answers" (ob4-8): before Start they're the wizard's own question */
  onAnswers: () => void
  /** "See other plans" (ob3-6): a Tali plan instead of the suggested week, or undefined to switch back */
  onChoosePlan: (templateId: string | undefined) => void
  onClose?: () => void
}) {
  const data = useStore((s) => s.data)
  const finish = useStore((s) => s.finishOnboarding)
  const setTab = useStore((s) => s.setTab)
  const startPlan = useStore((s) => s.startPlan)
  const openProfile = useStore((s) => s.openProfile)
  const health = canSaveHealthAnswers(data)
  const today = todayStr()
  const m: SummaryModel = useMemo(() => summaryFor(data.profile, d, { healthConsent: health, days: data.days, currentWeight: latestWeight(data, today), today }),
    [data, d, health, today])
  const [day, setDay] = useState<PlannedSession | null>(null)
  const [row, setRow] = useState<WhyRow | null>(null)
  const [how, setHow] = useState(false)
  const [maint, setMaint] = useState(false)
  const [others, setOthers] = useState(false)
  // Redo setup: Start saves the answers, then asks before touching the week (never automatic)
  const [offer, setOffer] = useState(false)
  const r = m.result
  const plan = r.plan
  const rows = whyRows(m, d)
  const first = d.mode === 'first'
  // a Tali plan chosen instead of the suggested week (the answers are saved either way)
  const chosen = templateById(d.planChoice)

  const start = (rebuild = true, then?: () => void) => {
    const at = new Date().toISOString()
    const profile = finishedProfile(m, d, at, today, data.profile)
    const sug = first && m.targets.kcal != null ? suggestedTargets(profile, m.kg, m.routing) : null
    const target = sug && 'kcal' in sug ? { kcal: sug.kcal, p: sug.p, c: sug.c, f: sug.f } : null
    // a redo's weight left as it was is no new weigh-in
    const weightKg = !first || (d.redo && d.weight === d.redo.weight) ? null : m.kg
    finish({ profile, plan: rebuild && !chosen ? plan : null, target, weightKg })
    // the same way the Plan tab starts one (PlanScreen's begin)
    if (chosen) startPlan({ name: chosen.name, phases: phasesOf(chosen), source: 'recommended', baseTemplateId: chosen.id, startedAt: today })
    setTab('today')
    onClose?.()
    then?.()
  }

  const byDay = new Map<number, PlannedSession[]>()
  for (const s of plan.sessions) byDay.set(s.weekday, [...(byDay.get(s.weekday) ?? []), s])
  const thumbOf = (s: PlannedSession) => s.slots.map((x) => EXERCISE_BY_ID[x.exId]?.video).find((v) => v?.poster)

  return (
    <div className="wz" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 50px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 40px)' }}>
      <div className="wz-eyebrow">{r.starter ? SUMMARY.starter : SUMMARY.built}</div>
      <h1 className="wz-h xl">{SUMMARY.title}</h1>
      <div className="wz-lead body" style={{ marginTop: -8 }}>{SUMMARY.lead}</div>

      {r.starter && (
        <section className="sm-starter">
          <div className="t">{SUMMARY.starterCardT}</div>
          <div className="s">{SUMMARY.starterCardS}</div>
          <button className="btn gray bp-btn" onClick={onPersonalise}>Personalise it</button>
        </section>
      )}

      <h2 className="sm-h2">Your week</h2>
      {chosen ? <TemplateWeek t={chosen} /> : <div className="sm-week">
        {WEEK_ORDER.map((wd) => {
          const ss = byDay.get(wd) ?? []
          if (!ss.length) return <div className="sm-day" key={wd}><span className="d">{SHORT[wd]}</span><span className="m"><span className="t">{restLine(d)}</span></span></div>
          return ss.map((s) => (
            <button className="sm-day" key={wd + s.routineId} onClick={() => setDay(s)} aria-label={`${DAY_NAME[wd]}: ${s.name}. Why each part is here`}>
              <span className="d">{SHORT[wd]}</span>
              <span className="m"><span className="t">{s.name}</span>
                <span className="s num">{sessionLine(s, r.starter)}</span></span>
              <Thumb video={thumbOf(s)} />
            </button>
          ))
        })}
      </div>}

      <div className="sm-rows">
        <button className="sm-row lg" onClick={() => setOthers(true)}>
          <span className="m"><span className="t">{SUMMARY.others}</span><span className="s">{SUMMARY.othersS}</span></span>
          <Chevron />
        </button>
      </div>

      {/* the reasons are the generated week's: a chosen Tali plan has its own (Plan tab) */}
      {!chosen && <>
        <h2 className="sm-h2 sm">{SUMMARY.whyH}</h2>
        <div className="sm-rows">
          {rows.map((x) => (
            <button className="sm-row" key={x.key} onClick={() => setRow(x)}>
              <span className="m"><span className="t">{x.title}</span><span className="s">{x.sub}</span></span>
              <Chevron />
            </button>
          ))}
        </div>
      </>}

      {first && <FoodCard m={m} onHow={() => setHow(true)} onAddWeight={onAddWeight} onAddHeight={onAddHeight} onAddAge={onAddAge}
        onMaint={() => setMaint(true)} onHealth={() => start(true, () => openProfile('health'))} />}

      <div className="stack" style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="btn ob-btn" onClick={() => (d.redo ? setOffer(true) : start())}>Start</button>
        <button className="linkbtn ob-alt" onClick={onEdit}>Change my answers</button>
      </div>

      {day && <DaySheet s={day} whys={r.why} warm={warmupFor(d)} onClose={() => setDay(null)} />}
      {row && <WhySheet row={row} onClose={() => setRow(null)} />}
      {how && (
        <BareSheet label={SUMMARY.howT} onClose={() => setHow(false)}>
          <div className="feel-hd"><h2>{SUMMARY.howT}</h2><button className="navbtn b" onClick={() => setHow(false)}>Done</button></div>
          <div className="sm-why" style={{ marginTop: 12 }}>{SUMMARY.how.map((p) => <p key={p}>{p}</p>)}</div>
        </BareSheet>
      )}
      {maint && <MaintSheet onClose={() => setMaint(false)} onAnswers={() => { setMaint(false); onAnswers() }} />}
      {others && <OthersSheet d={d} m={m} chosen={chosen} onPick={(id) => { onChoosePlan(id); setOthers(false) }} onClose={() => setOthers(false)} />}
      {offer && (
        <BareSheet label={REDO.offerT} onClose={() => setOffer(false)}>
          <h2 className="cs-t">{REDO.offerT}</h2>
          <div className="cs-lead">{REDO.offer}</div>
          <button className="btn ob-btn" onClick={() => start(true)}>{REDO.rebuild}</button>
          <button className="linkbtn ob-alt" onClick={() => start(false)}>{REDO.keep}</button>
        </BareSheet>
      )}
    </div>
  )
}

function FoodCard({ m, onHow, onAddWeight, onAddHeight, onAddAge, onMaint, onHealth }: {
  m: SummaryModel; onHow: () => void; onAddWeight: () => void; onAddHeight: () => void; onAddAge: () => void; onMaint: () => void; onHealth: () => void
}) {
  const t = m.targets
  // ob4-7 and ob4-9: no number, and the card says logging works in full, why, and how to change it
  if (t.hidden === 'pregnancy') {
    return <section className="sm-food"><div className="k">Food</div><div className="big h18">{SUMMARY.maint}</div><div className="s ink">{SUMMARY.maintP}</div>
      <div className="s"><b>{SUMMARY.maintLongK}</b> {SUMMARY.maintLong}</div>
      <button className="linkbtn wz-link start sm" onClick={onMaint}>{SUMMARY.maintMore}</button></section>
  }
  if (t.hidden === 'no-consent') {
    return <section className="sm-food"><div className="k">Food</div><div className="big h18">{SUMMARY.noConsentT}</div><div className="s">{SUMMARY.noConsentS}</div>
      <button className="btn gray bp-btn" onClick={onHealth}>{SUMMARY.noConsentGo}</button></section>
  }
  if (t.hidden === 'no-age') {
    return <section className="sm-food"><div className="k">Food</div><div className="big h18">{SUMMARY.noAgeT}</div><div className="s">{SUMMARY.noAgeS}</div>
      <button className="btn gray bp-btn" onClick={onAddAge}>{SUMMARY.noAgeGo}</button></section>
  }
  if (t.hidden === 'no-weight') {
    return <section className="sm-food"><div className="k">Food</div><div className="big">{SUMMARY.noWeight}</div><div className="s">{SUMMARY.noWeightS}</div>
      <button className="btn gray bp-btn" onClick={onAddWeight}>Add weight</button></section>
  }
  if (t.hidden === 'no-height') {
    return <section className="sm-food"><div className="k">Food</div><div className="big">{SUMMARY.noHeight}</div><div className="s">{SUMMARY.noWeightS}</div>
      <button className="btn gray bp-btn" onClick={onAddHeight}>Add height</button></section>
  }
  if (t.hidden || t.kcal == null || !t.maintenance) {
    return <section className="sm-food"><div className="k">Food</div><div className="big">{SUMMARY.maint}</div><div className="s">{SUMMARY.maintS}</div></section>
  }
  return (
    <section className="sm-food" aria-label="Food">
      <div className="k">Food</div>
      <div className="big num" data-kcal={t.kcal}>About {k(t.kcal)} kcal a day to start</div>
      <div className="s num" data-low={t.maintenance.low} data-high={t.maintenance.high}>Likely maintenance {k(t.maintenance.low)}–{k(t.maintenance.high)}. Tali checks this against your weigh-ins after {t.reviewAfter}.</div>
      {t.heldAtMaintenance && <div className="s">{HELD_AT_MAINTENANCE_NOTE}</div>}
      <button className="linkbtn wz-link start sm" onClick={onHow}>How we worked this out</button>
    </section>
  )
}

function DaySheet({ s, whys, warm, onClose }: { s: PlannedSession; whys: Why[]; warm: number; onClose: () => void }) {
  const title = `${DAY_NAME[s.weekday]} · ${s.name}`
  const note = uniq([...s.why, ...whys.filter((w) => w.about === 'ease-in' || w.about === 'dose')].map(renderWhy)).slice(0, 3)
  return (
    <BareSheet label={title} onClose={onClose}>
      <div className="feel-hd"><h2>{title}</h2><button className="navbtn b" onClick={onClose}>Done</button></div>
      <div className="sm-sheet-sub">{SUMMARY.daySub}</div>
      <div className="sm-rows">
        <div className="sm-row"><span className="m"><span className="t">{SUMMARY.warmRow(warm)}</span><span className="s">{SUMMARY.warmRowS}</span></span></div>
        {s.slots.map((x, i) => {
          // the reason for the exercise itself first; sets and reps are in the note below
          const main = [...x.why.filter((w) => w.about === 'exercise' && w.code !== 'calibration' && w.code !== 'starter'), ...x.why.filter((w) => w.about !== 'exercise' && w.code !== 'calibration')]
          const line = main.length ? afterName(renderWhy(main[0])) : renderWhy(x.why[0] ?? { code: 'starter', about: 'exercise' })
          return (
            <div className="sm-row" key={x.exId + i}>
              <span className="m"><span className="t">{EXERCISE_BY_ID[x.exId]?.n.replace(/\s*\([^)]*\)\s*$/, '') ?? x.exId}</span>
                <span className="s">{line}</span><span className="s num" style={{ marginTop: 2 }}>{x.rx}</span></span>
            </div>
          )
        })}
      </div>
      {note.length > 0 && <div className="sm-sheet-note">{note.join(' ')}</div>}
    </BareSheet>
  )
}

function WhySheet({ row, onClose }: { row: WhyRow; onClose: () => void }) {
  const lines = uniq(row.whys.map(renderWhy))
  return (
    <BareSheet label={row.title} onClose={onClose}>
      <div className="feel-hd"><h2>{row.title}</h2><button className="navbtn b" onClick={onClose}>Done</button></div>
      <div className="sm-sheet-sub" style={{ marginTop: 2 }}>{row.sub}</div>
      <div className="sm-why">{[...(row.lines ?? []), ...lines].map((l) => <p key={l}>{l}</p>)}</div>
    </BareSheet>
  )
}

/** A chosen Tali plan's first week, in the summary's rows (its warm-up is the plans' 6 minutes). */
function TemplateWeek({ t }: { t: PlanTemplate }) {
  const routines = useStore((s) => s.data.routines)
  const week = phaseWeek({ phases: phasesOf(t) }, 0)
  return (
    <div className="sm-week">
      {WEEK_ORDER.map((wd) => {
        const keys = week[wd] ?? []
        if (!keys.length) return <div className="sm-day" key={wd}><span className="d">{SHORT[wd]}</span><span className="m"><span className="t">Rest</span></span></div>
        return keys.map((k) => {
          const n = templateFor(k, routines)?.ex.length ?? 0
          const lift = !isBuiltinKey(k) || LIFTS.includes(k as WorkoutType)
          return (
            <div className="sm-day" key={wd + k}>
              <span className="d">{SHORT[wd]}</span>
              <span className="m"><span className="t">{keyTitle(k, routines)}</span>
                {lift && n > 0 && <span className="s num">Warm-up, then {n} {n === 1 ? 'exercise' : 'exercises'}</span>}</span>
              <Thumb video={keyVideo(k, routines)} />
            </div>
          )
        })
      })}
    </div>
  )
}

/** ob4-8: what eating at maintenance means, for the person's own reason only. */
function MaintSheet({ onClose, onAnswers }: { onClose: () => void; onAnswers: () => void }) {
  return (
    <BareSheet label={MAINT_SHEET.title} onClose={onClose}>
      <div className="feel-hd"><h2>{MAINT_SHEET.title}</h2><button className="navbtn b" onClick={onClose}>Done</button></div>
      <section className="sm-maint">
        {MAINT_SHEET.rows.map(([h, t]) => <div key={h}><div className="t">{h}</div><div className="s">{t}</div></div>)}
      </section>
      <button className="linkbtn wz-link start sm" style={{ marginTop: 14, padding: '0 4px' }} onClick={onAnswers}>{MAINT_SHEET.answers}</button>
    </BareSheet>
  )
}

/** ob3-6: the suggested week at the top, then Tali's ready-made plans with how each fits. */
function OthersSheet({ d, m, chosen, onPick, onClose }: { d: WizardDraft; m: SummaryModel; chosen?: PlanTemplate; onPick: (id: string | undefined) => void; onClose: () => void }) {
  const plan = m.result.plan
  const n = plan.sessions.filter((s) => !s.optional).length
  const mins = plan.sessions.length ? Math.round(plan.sessions.reduce((a, s) => a + s.mins, 0) / plan.sessions.length) : 30
  const where = d.where === 'mix' ? 'a mix' : d.where === 'outdoors' ? 'outdoors' : d.where ?? (m.result.starter ? 'no equipment' : 'home')
  const mine = `${n} ${n === 1 ? 'day' : 'days'} · about ${mins} min · ${where}`
  return (
    <BareSheet label={OTHERS.title} onClose={onClose}>
      <div className="feel-hd"><h2>{OTHERS.title}</h2><button className="navbtn b" onClick={onClose}>{OTHERS.close}</button></div>
      <div className="sm-sheet-sub" style={{ marginTop: 0 }}>{OTHERS.lead}</div>
      <button className={'sm-mine' + (chosen ? '' : ' on')} aria-pressed={!chosen} onClick={() => onPick(undefined)}>
        <span className="m"><span className="k">{chosen ? OTHERS.mineOff : OTHERS.mineK}</span><span className="t">{OTHERS.mine}</span><span className="s num">{mine}</span></span>
        {!chosen && <span className="tick"><Icon name="check" size={14} stroke={2.6} /></span>}
      </button>
      <h3 className="sm-h2 sm" style={{ margin: '16px 4px 6px' }}>{OTHERS.h}</h3>
      <div className="sm-rows sm-plans">
        {PLAN_TEMPLATES.map((t) => {
          const on = chosen?.id === t.id
          return (
            <button className="sm-plan" key={t.id} aria-pressed={on} onClick={() => onPick(t.id)}>
              {planArt(t.id) ? <img src={planArt(t.id)} alt="" style={{ objectPosition: t.artAt }} /> : <span className="img" />}
              <span className="m"><span className="t">{t.name}</span><span className="s num">{t.tagline}</span>
                <span className="s fit">{on ? OTHERS.inUse + ' · ' : ''}{planFitLine(t, d, n)}</span></span>
              <Chevron />
            </button>
          )
        })}
      </div>
      <div className="sm-more">{OTHERS.more}</div>
    </BareSheet>
  )
}
