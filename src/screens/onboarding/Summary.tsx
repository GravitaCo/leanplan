/**
 * The summary (Design canvas row Onboarding 3, note s-ob3; ob4-7 for maintenance only), in the
 * refined look (r6-summary, note s-r): a photo hero with the week's name and shape, the week as a
 * day strip, four reason chips with all of them a tap away, the Food card, "See other plans" and
 * "Start my week". It shows only what the engine generated for these answers: "Built from your
 * answers" for a generated week, "Starter week" for the Starter week (engine §5). Every reason
 * opens the engine's own, rendered here from their codes. Start is the only thing that changes
 * the person's plan and targets (§10, §12).
 */
import { useMemo, useState } from 'react'
import { useStore } from '@/store/store'
import { canSaveHealthAnswers } from '@/data/consent'
import { planFitLine, restLine, summaryFor, trainingFrom, warmupFor, whyRows, type SummaryModel, type WhyRow, type WizardDraft } from '@/core/domain/wizard'
import { PLAN_TEMPLATES, phasesOf, type PlanTemplate } from '@/core/domain/plans'
import { warmupForSlots } from '@/core/domain/routines'
import { PLAN_WARMUP_MINUTES, type WarmupBlock } from '@/core/domain/warmup'
import { Icon } from '@/ui/icons'
import { planArt } from '../plan/PlanParts'
import { SCREEN_H } from './screenHeading'
import type { PlannedSession } from '@/core/domain/engine'
import { HELD_AT_MAINTENANCE_NOTE } from '@/core/domain/nutrition'
import { explainStart } from '@/core/domain/targets'
import { latestWeight } from '@/core/domain/insights'
import { todayStr, DAY_NAME } from '@/core/domain/date'
import type { Why } from '@/core/types'
import { BareSheet } from '@/ui/primitives'
import { Chevron } from '@/ui/icons'
import { MAINT_SHEET, OTHERS, REDO, SUMMARY, SUMMARY_UI } from './copy'
import { chosenPlan, dayNote, exerciseName, foodCardKind, heroPlan as heroOf, mineLine, reasonChips, shapeLine, slotLine, startPayload, weekStrip, whyLines } from './summaryModel'

const DAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function Summary({ d, onEdit, onPersonalise, onAddWeight, onAddHeight, onAddAge, onAnswers, onChoosePlan, onClose }: {
  d: WizardDraft; onEdit: () => void; onPersonalise: () => void; onAddWeight: () => void; onAddHeight: () => void; onAddAge: () => void
  /** "See your health check answers" (ob4-8): before Start they're the wizard's own question */
  onAnswers: () => void
  /** "See other plans" (ob3-6): a Tilo plan instead of the suggested week, or undefined to switch back */
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
  const [all, setAll] = useState(false)
  const routines = useStore((s) => s.data.routines)
  // Redo setup: Start saves the answers, then asks before touching the week (never automatic)
  const [offer, setOffer] = useState(false)
  const r = m.result
  const rows = whyRows(m, d)
  const first = d.mode === 'first'
  // a Tilo plan chosen instead of the suggested week (the answers are saved either way)
  const chosen = chosenPlan(d)

  const start = (rebuild = true, then?: () => void) => {
    finish(startPayload(m, d, { at: new Date().toISOString(), today, base: data.profile, rebuild }))
    // the same way the Plan tab starts one (PlanScreen's begin)
    if (chosen) startPlan({ name: chosen.name, phases: phasesOf(chosen), source: 'recommended', baseTemplateId: chosen.id, startedAt: today })
    setTab('today')
    onClose?.()
    then?.()
  }

  // four reasons from the person's own answers first (r6-summary: days, sore spots, kit, a gentle start)
  const chips = reasonChips(rows)
  const heroPlan = heroOf(m, chosen)
  const art = planArt(heroPlan?.id)

  return (
    <div className="smry">
      {/* r6-summary: a result, not a report */}
      <header className="sm-hero">
        {art ? <img src={art} alt="" style={{ objectPosition: heroPlan?.artAt }} /> : <div className="ph" aria-hidden="true" />}
        <div className="shade" aria-hidden="true" />
        <div className="tx">
          <div className="k">{chosen ? chosen.name : r.starter ? SUMMARY.starter : SUMMARY.built}</div>
          <h1 {...SCREEN_H}>{r.starter && !chosen ? SUMMARY.starterHeroT : SUMMARY.heroT}</h1>
          <div className="s num">{chosen ? chosen.tagline : shapeLine(d, m)}</div>
        </div>
      </header>
      <div className="sm-body">
        {r.starter && !chosen && (
          <section className="sm-starter">
            <div className="t">{SUMMARY.starterCardT}</div>
            <div className="s">{SUMMARY.starterCardS}</div>
            <button className="btn gray bp-btn" onClick={onPersonalise}>{SUMMARY_UI.personalise}</button>
          </section>
        )}

        <section className="sm-strip" aria-label={SUMMARY_UI.week}>
          <div className="days">
            {weekStrip(m, chosen, routines).map(({ wd, sessions: ss, on, name }) => {
              return (
                <span className="dy" key={wd}>
                  <span className="l" aria-hidden="true">{DAY_LETTER[wd]}</span>
                  {ss.length
                    ? <button className="c on" onClick={() => setDay(ss[0])} aria-label={SUMMARY_UI.dayOpen(DAY_NAME[wd], name)}><Icon name="dumbbell" size={17} stroke={2} /></button>
                    : <span className={'c' + (on ? ' on' : '')} role="img" aria-label={SUMMARY_UI.day(DAY_NAME[wd], on ? name : restLine(d))}>{on && <Icon name="dumbbell" size={17} stroke={2} />}</span>}
                </span>
              )
            })}
          </div>
          <div className="w">{SUMMARY.warmLine(chosen ? PLAN_WARMUP_MINUTES : warmupFor(d))}</div>
        </section>

        {/* the reasons are the generated week's: a chosen Tilo plan has its own (Plan tab) */}
        {!chosen && chips.length > 0 && (
          <section className="sm-reasons">
            <div className="hd"><span className="t">{SUMMARY.whyH}</span><button className="linkbtn" onClick={() => setAll(true)}>{SUMMARY.allReasons}</button></div>
            <div className="chips">{chips.map((x) => <button key={x.key} onClick={() => setRow(x)}>{x.title}</button>)}</div>
          </section>
        )}

        {first && <FoodCard m={m} onHow={() => setHow(true)} onAddWeight={onAddWeight} onAddHeight={onAddHeight} onAddAge={onAddAge}
          onMaint={() => setMaint(true)} onHealth={() => start(true, () => openProfile('health'))} onAnswers={onAnswers} />}

        <button className="btn sm-others" onClick={() => setOthers(true)}>{SUMMARY.others}</button>
        <button className="linkbtn ob-alt" onClick={onEdit}>{SUMMARY.edit}</button>
      </div>
      <div className="ob-cta"><button className="btn ob-btn" onClick={() => (d.redo ? setOffer(true) : start())}>{SUMMARY.start}</button></div>

      {day && <DaySheet s={day} whys={r.why} warm={warmupForSlots(day.slots.map((x) => x.exId), warmupFor(d), trainingFrom(d))} onClose={() => setDay(null)} />}
      {row && <WhySheet row={row} onClose={() => setRow(null)} />}
      {all && (
        <BareSheet label={SUMMARY.whyH} onClose={() => setAll(false)}>
          <div className="feel-hd"><h2>{SUMMARY.whyH}</h2><button className="navbtn b" onClick={() => setAll(false)}>{SUMMARY_UI.done}</button></div>
          <div className="sm-rows" style={{ marginTop: 12 }}>
            {rows.map((x) => (
              <button className="sm-row" key={x.key} onClick={() => { setAll(false); setRow(x) }}>
                <span className="m"><span className="t">{x.title}</span><span className="s">{x.sub}</span></span>
                <Chevron />
              </button>
            ))}
          </div>
        </BareSheet>
      )}
      {how && (
        <BareSheet label={SUMMARY.howT} onClose={() => setHow(false)}>
          <div className="feel-hd"><h2>{SUMMARY.howT}</h2><button className="navbtn b" onClick={() => setHow(false)}>{SUMMARY_UI.done}</button></div>
          <HowRows m={m} />
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

function FoodCard({ m, onHow, onAddWeight, onAddHeight, onAddAge, onMaint, onHealth, onAnswers }: {
  m: SummaryModel; onHow: () => void; onAddWeight: () => void; onAddHeight: () => void; onAddAge: () => void; onMaint: () => void; onHealth: () => void
  /** ob9-1's "Change in Profile › Health check answers": before Start that's the wizard's own question (as ob4-8) */
  onAnswers: () => void
}) {
  const t = m.targets
  const kind = foodCardKind(m)
  // ob4-7 and ob4-9: no number, and the card says logging works in full, why, and how to change it
  if (kind === 'pregnancy') {
    return <section className="sm-food"><div className="k">{SUMMARY_UI.food}</div><div className="big h18">{SUMMARY.maint}</div><div className="s ink">{SUMMARY.maintP}</div>
      <div className="s"><b>{SUMMARY.maintLongK}</b> {SUMMARY.maintLong}</div>
      <button className="linkbtn wz-link start sm" onClick={onMaint}>{SUMMARY.maintMore}</button></section>
  }
  if (kind === 'no-consent') {
    return <section className="sm-food"><div className="k">{SUMMARY_UI.food}</div><div className="big h18">{SUMMARY.noConsentT}</div><div className="s">{SUMMARY.noConsentS}</div>
      <button className="btn gray bp-btn" onClick={onHealth}>{SUMMARY.noConsentGo}</button></section>
  }
  if (kind === 'no-age') {
    return <section className="sm-food"><div className="k">{SUMMARY_UI.food}</div><div className="big h18">{SUMMARY.noAgeT}</div><div className="s">{SUMMARY.noAgeS}</div>
      <button className="btn gray bp-btn" onClick={onAddAge}>{SUMMARY.noAgeGo}</button></section>
  }
  if (kind === 'no-weight') {
    return <section className="sm-food"><div className="k">{SUMMARY_UI.food}</div><div className="big">{SUMMARY.noWeight}</div><div className="s">{SUMMARY.noWeightS}</div>
      <button className="btn gray bp-btn" onClick={onAddWeight}>{SUMMARY_UI.addWeight}</button></section>
  }
  if (kind === 'no-height') {
    return <section className="sm-food"><div className="k">{SUMMARY_UI.food}</div><div className="big">{SUMMARY.noHeight}</div><div className="s">{SUMMARY.noWeightS}</div>
      <button className="btn gray bp-btn" onClick={onAddHeight}>{SUMMARY_UI.addHeight}</button></section>
  }
  // ob9-1 (and ob4-9): Yes has no number; Sometimes a range on Food, no number on the summary
  if (kind === 'yes') {
    return <section className="sm-food" aria-label={SUMMARY_UI.food}><div className="k">{SUMMARY_UI.food}</div><div className="big h20">{SUMMARY.yesT}</div><div className="s">{SUMMARY.yesS}</div>
      <button className="linkbtn wz-link start sm" onClick={onAnswers}>{SUMMARY.changeLink}</button></section>
  }
  if (kind === 'sometimes') {
    return <section className="sm-food" aria-label={SUMMARY_UI.food}><div className="k">{SUMMARY_UI.food}</div><div className="big h20">{SUMMARY.sometimesT}</div><div className="s">{SUMMARY.sometimesS}</div>
      <button className="linkbtn wz-link start sm" onClick={onAnswers}>{SUMMARY.changeLink}</button></section>
  }
  const e = explainStart(t)
  if (kind === 'maintenance' || t.kcal == null || !e) {
    return <section className="sm-food"><div className="k">{SUMMARY_UI.food}</div><div className="big">{SUMMARY.maint}</div><div className="s">{SUMMARY.maintS}</div></section>
  }
  return (
    <section className="sm-food" aria-label={SUMMARY_UI.food}>
      <div className="k">{SUMMARY_UI.food}</div>
      <div className="big h20 num" data-kcal={t.kcal}>{SUMMARY.startT(t.kcal)}</div>
      <div className="s num" data-estimate={e.estimate} data-diff={e.diff}>{SUMMARY.startS(e, t.reviewAfter, t.marginPct ?? 15)}</div>
      {t.heldAtMaintenance && <div className="s">{HELD_AT_MAINTENANCE_NOTE}</div>}
      <button className="linkbtn wz-link start sm" onClick={onHow}>{SUMMARY_UI.how}</button>
    </section>
  )
}

/** ob9-5: the estimate, how sure it is, the start and its pace, and the 3–4 week check. */
function HowRows({ m }: { m: SummaryModel }) {
  const t = m.targets
  const e = explainStart(t)
  if (!e || !t.maintenance) return null
  const H = SUMMARY.how
  const rows: [string, string][] = [
    [H.burnT, H.burn(e.estimate)],
    [H.sureT, H.sure(t.maintenance.low, t.maintenance.high, t.marginPct ?? 15)],
    [H.startT, H.start(e) + (t.heldAtMaintenance ? ` ${HELD_AT_MAINTENANCE_NOTE}` : '')],
    [H.nextT, H.next(t.reviewAfter)],
  ]
  return (
    <section className="sm-maint sm-how" style={{ marginTop: 12 }}>
      {rows.map(([h, x]) => <div key={h}><div className="t">{h}</div><div className="s num">{x}</div></div>)}
    </section>
  )
}

function DaySheet({ s, whys, warm, onClose }: { s: PlannedSession; whys: Why[]; warm: WarmupBlock; onClose: () => void }) {
  const title = `${DAY_NAME[s.weekday]} · ${s.name}`
  const note = dayNote(s, whys)
  return (
    <BareSheet label={title} onClose={onClose}>
      <div className="feel-hd"><h2>{title}</h2><button className="navbtn b" onClick={onClose}>{SUMMARY_UI.done}</button></div>
      <div className="sm-sheet-sub">{SUMMARY.daySub}</div>
      <div className="sm-rows">
        <div className="sm-row"><span className="m"><span className="t">{SUMMARY.warmRow(warm.mins)}</span><span className="s">{SUMMARY.warmRowS(warm.moves.map((x) => x.n))}</span></span></div>
        {s.slots.map((x, i) => {
          // the reason for the exercise itself first; sets and reps are in the note below
          const line = slotLine(x)
          return (
            <div className="sm-row" key={x.exId + i}>
              <span className="m"><span className="t">{exerciseName(x.exId)}</span>
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
  return (
    <BareSheet label={row.title} onClose={onClose}>
      <div className="feel-hd"><h2>{row.title}</h2><button className="navbtn b" onClick={onClose}>{SUMMARY_UI.done}</button></div>
      <div className="sm-sheet-sub" style={{ marginTop: 2 }}>{row.sub}</div>
      <div className="sm-why">{whyLines(row).map((l) => <p key={l}>{l}</p>)}</div>
    </BareSheet>
  )
}

/** ob4-8: what eating at maintenance means, for the person's own reason only. */
function MaintSheet({ onClose, onAnswers }: { onClose: () => void; onAnswers: () => void }) {
  return (
    <BareSheet label={MAINT_SHEET.title} onClose={onClose}>
      <div className="feel-hd"><h2>{MAINT_SHEET.title}</h2><button className="navbtn b" onClick={onClose}>{SUMMARY_UI.done}</button></div>
      <section className="sm-maint">
        {MAINT_SHEET.rows.map(([h, t]) => <div key={h}><div className="t">{h}</div><div className="s">{t}</div></div>)}
      </section>
      <button className="linkbtn wz-link start sm" style={{ marginTop: 14, padding: '0 4px' }} onClick={onAnswers}>{MAINT_SHEET.answers}</button>
    </BareSheet>
  )
}

/** ob3-6: the suggested week at the top, then Tilo's ready-made plans with how each fits. */
function OthersSheet({ d, m, chosen, onPick, onClose }: { d: WizardDraft; m: SummaryModel; chosen?: PlanTemplate; onPick: (id: string | undefined) => void; onClose: () => void }) {
  const { line: mine, days: n } = mineLine(d, m)
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
