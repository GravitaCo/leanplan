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
import { finishedProfile, restLine, summaryFor, whyRows, type SummaryModel, type WhyRow, type WizardDraft } from '@/core/domain/wizard'
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
import { PlanEditSheet } from '../plan/PlanSheets'
import { SUMMARY } from './copy'

const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const k = (n: number) => n.toLocaleString('en-GB')
const uniq = (xs: string[]) => [...new Set(xs)]
/** "Goblet squat: a gentler choice for the knees." → "A gentler choice for the knees." */
const afterName = (t: string) => { const i = t.indexOf(': '); const r = i > 0 && i < 48 ? t.slice(i + 2) : t; return r.charAt(0).toUpperCase() + r.slice(1) }

export function Summary({ d, onEdit, onPersonalise, onAddWeight, onAddHeight, onClose }: {
  d: WizardDraft; onEdit: () => void; onPersonalise: () => void; onAddWeight: () => void; onAddHeight: () => void; onClose?: () => void
}) {
  const data = useStore((s) => s.data)
  const finish = useStore((s) => s.finishOnboarding)
  const setTab = useStore((s) => s.setTab)
  const health = canSaveHealthAnswers(data)
  const today = todayStr()
  const m: SummaryModel = useMemo(() => summaryFor(data.profile, d, { healthConsent: health, days: data.days, currentWeight: latestWeight(data, today), today }),
    [data, d, health, today])
  const [day, setDay] = useState<PlannedSession | null>(null)
  const [row, setRow] = useState<WhyRow | null>(null)
  const [how, setHow] = useState(false)
  const [ifThen, setIfThen] = useState(false)
  const r = m.result
  const plan = r.plan
  const rows = whyRows(m, d)
  const first = d.mode === 'first'

  const start = () => {
    const at = new Date().toISOString()
    const profile = finishedProfile(m, d, at, today, data.profile)
    const sug = first && m.targets.kcal != null ? suggestedTargets(profile, m.kg, m.routing) : null
    const target = sug && 'kcal' in sug ? { kcal: sug.kcal, p: sug.p, c: sug.c, f: sug.f } : null
    finish({ profile, plan: plan, target, weightKg: first ? m.kg : null })
    setTab('today')
    onClose?.()
  }

  const byDay = new Map<number, PlannedSession[]>()
  for (const s of plan.sessions) byDay.set(s.weekday, [...(byDay.get(s.weekday) ?? []), s])
  const firstSession = plan.sessions[0]
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
      <div className="sm-week">
        {WEEK_ORDER.map((wd) => {
          const ss = byDay.get(wd) ?? []
          if (!ss.length) return <div className="sm-day" key={wd}><span className="d">{SHORT[wd]}</span><span className="m"><span className="t">{restLine(d)}</span></span></div>
          return ss.map((s) => (
            <button className="sm-day" key={wd + s.routineId} onClick={() => setDay(s)} aria-label={`${DAY_NAME[wd]}: ${s.name}. Why each part is here`}>
              <span className="d">{SHORT[wd]}</span>
              <span className="m"><span className="t">{s.name}</span>
                <span className="s num">About {s.mins} min{r.starter ? ' · no equipment' : s === firstSession && plan.easeInWeeks > 0 ? ' · easy first week' : ''}{s.optional ? ' · if you like' : ''}</span></span>
              <Thumb video={thumbOf(s)} />
            </button>
          ))
        })}
      </div>

      <h2 className="sm-h2 sm">{SUMMARY.whyH}</h2>
      <div className="sm-rows">
        {rows.map((x) => (
          <button className="sm-row" key={x.key} onClick={() => setRow(x)}>
            <span className="m"><span className="t">{x.title}</span><span className="s">{x.sub}</span></span>
            <Chevron />
          </button>
        ))}
      </div>

      {first && <FoodCard m={m} onHow={() => setHow(true)} onAddWeight={onAddWeight} onAddHeight={onAddHeight} />}

      <div className="sm-rows">
        <button className="sm-row" onClick={() => setIfThen(true)}>
          <span className="m"><span className="t">{SUMMARY.ifThen}</span><span className="s">{SUMMARY.ifThenS}</span></span>
          <Chevron />
        </button>
      </div>

      <div className="stack" style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="btn ob-btn" onClick={start}>Start</button>
        <button className="linkbtn ob-alt" onClick={onEdit}>Change my answers</button>
      </div>

      {day && <DaySheet s={day} whys={r.why} onClose={() => setDay(null)} />}
      {row && <WhySheet row={row} onClose={() => setRow(null)} />}
      {how && (
        <BareSheet label={SUMMARY.howT} onClose={() => setHow(false)}>
          <div className="feel-hd"><h2>{SUMMARY.howT}</h2><button className="navbtn b" onClick={() => setHow(false)}>Done</button></div>
          <div className="sm-why" style={{ marginTop: 12 }}>{SUMMARY.how.map((p) => <p key={p}>{p}</p>)}</div>
        </BareSheet>
      )}
      {ifThen && <PlanEditSheet onClose={() => setIfThen(false)} />}
    </div>
  )
}

function FoodCard({ m, onHow, onAddWeight, onAddHeight }: { m: SummaryModel; onHow: () => void; onAddWeight: () => void; onAddHeight: () => void }) {
  const t = m.targets
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

function DaySheet({ s, whys, onClose }: { s: PlannedSession; whys: Why[]; onClose: () => void }) {
  const title = `${DAY_NAME[s.weekday]} · ${s.name}`
  const note = uniq([...s.why, ...whys.filter((w) => w.about === 'ease-in' || w.about === 'dose')].map(renderWhy)).slice(0, 3)
  return (
    <BareSheet label={title} onClose={onClose}>
      <div className="feel-hd"><h2>{title}</h2><button className="navbtn b" onClick={onClose}>Done</button></div>
      <div className="sm-sheet-sub">{SUMMARY.daySub}</div>
      <div className="sm-rows">
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
      <div className="sm-why">{lines.map((l) => <p key={l}>{l}</p>)}</div>
    </BareSheet>
  )
}
