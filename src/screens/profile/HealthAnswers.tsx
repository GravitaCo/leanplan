/**
 * Onboarding 7 (boards ob7-1 to ob7-4, notes s-ob7; behind ONBOARDING_ENABLED): Profile › Health
 * data › Health check answers, its Change and Clear sheets, and the 12-week "Does this still
 * apply?" check-in that Today opens once when it's due. The decisions are core's
 * (healthAnswersView, rerunForAnswers); this file only shows and asks.
 */
import { useState } from 'react'
import { useStore } from '@/store/store'
import { wellbeingOutcome, type WellbeingAnswer } from '@/core/domain/onboarding'
import { medicalOutcome } from '@/core/domain/wizard'
import { BackButton, BareSheet } from '@/ui/primitives'
import { Icon } from '@/ui/icons'
import { CHECKIN, COPY, HEALTH_ANSWERS as H, MEDICAL_ITEMS, WELLBEING_OPTIONS, WELLBEING_STATEMENT } from '../onboarding/copy'
import { Opts } from '../onboarding/Opts'
import { answerRows, clearConfirmLine, type AnswerRow } from './healthAnswerRows'

type Open = { sheet: 'confirm'; row: AnswerRow } | { sheet: 'pregnancy' | 'medical' | 'wellbeing' } | null

/** ob7-1 / ob7-1b: the answers, or "Nothing kept from your health check." */
export function HealthAnswersScreen({ onBack }: { onBack: () => void }) {
  const profile = useStore((s) => s.data.profile)
  const clear = useStore((s) => s.clearHealthAnswer)
  const [open, setOpen] = useState<Open>(null)
  const rows = answerRows(profile)
  const onClear = (r: AnswerRow) => { if (r.confirm) setOpen({ sheet: 'confirm', row: r }); else clear(r.kind) }
  return (
    <div className="screen ha">
      <BackButton onClick={onBack} label="Health data" />
      <h1 className="ha-t">{H.title}</h1>
      <div className="ha-lead">{H.lead}</div>
      {rows.length ? (
        <div className="ha-list">
          {rows.map((r) => (
            <div className="ha-row" key={r.kind}>
              <span className="m">
                <span className="l">{r.label}</span>
                <span className="v">{r.value}</span>
                <span className="d">{r.does}</span>
              </span>
              <span className="acts">
                {r.change && <button className="ha-act" aria-label={`${H.change} ${r.label.toLowerCase()}`} onClick={() => setOpen({ sheet: r.kind === 'pregnancy' ? 'pregnancy' : r.kind === 'medical' ? 'medical' : 'wellbeing' })}>{H.change}</button>}
                {r.clear && <button className="ha-act" aria-label={`${H.clear} ${r.label.toLowerCase()}`} onClick={() => onClear(r)}>{H.clear}</button>}
              </span>
            </div>
          ))}
        </div>
      ) : <div className="ha-empty">{H.empty}</div>}
      <div className="ha-foot">{H.foot}</div>
      {open?.sheet === 'confirm' && <ClearConfirmSheet row={open.row} onClose={() => setOpen(null)} />}
      {open?.sheet === 'pregnancy' && <PregnancyCheckSheet mode="change" onClose={() => setOpen(null)} />}
      {open?.sheet === 'medical' && <MedicalSheet onClose={() => setOpen(null)} />}
      {open?.sheet === 'wellbeing' && <WellbeingSheet onClose={() => setOpen(null)} />}
    </div>
  )
}

/** ob7-2: Clear asks first for pregnancy and conditions; its line says what stays (clearConfirmLine). */
function ClearConfirmSheet({ row, onClose }: { row: AnswerRow; onClose: () => void }) {
  const clear = useStore((s) => s.clearHealthAnswer)
  const line = useStore((s) => clearConfirmLine(s.data.profile, row.kind))
  const title = H.confirmT(row.label)
  return (
    <BareSheet label={title} onClose={onClose} className="consent">
      <h2 className="cs-t">{title}</h2>
      <div className="cs-lead">{line}</div>
      <button className="btn ob-btn" onClick={() => { clear(row.kind); onClose() }}>{H.clear}</button>
      <button className="linkbtn ob-alt" onClick={onClose}>{H.keep}</button>
    </BareSheet>
  )
}

/** Change for conditions: the wizard's question (ob4-5), saved as the outcome only. */
function MedicalSheet({ onClose }: { onClose: () => void }) {
  const setAnswer = useStore((s) => s.setHealthAnswer)
  const flagged = useStore((s) => s.data.profile.outcomes?.medical === 'flagged')
  // the ticks themselves are never kept, so the sheet starts from "None of these" or nothing
  const [ticked, setTicked] = useState<number[]>([])
  const [none, setNone] = useState(!flagged)
  const pick = (k: string) => {
    if (k === 'none') { setNone(!none); setTicked([]); return }
    const i = +k
    setNone(false)
    setTicked(ticked.includes(i) ? ticked.filter((x) => x !== i) : [...ticked, i])
  }
  const outcome = medicalOutcome(ticked.length, none)
  const title = COPY.medical?.title ?? ''
  return (
    <BareSheet label={title} onClose={onClose} className="consent">
      <h2 className="cs-t">{title}</h2>
      <div className="cs-lead">{COPY.medical?.lead}</div>
      <Opts label="Conditions and medicines" multi opts={[...MEDICAL_ITEMS.map((t, i) => [String(i), t] as const), ['none', 'None of these'] as const]} value={[...ticked.map(String), ...(none ? ['none'] : [])]} onPick={pick} />
      <button className="btn ob-btn" disabled={!outcome} onClick={() => { if (outcome) setAnswer({ kind: 'medical', value: outcome }); onClose() }}>{CHECKIN.done}</button>
    </BareSheet>
  )
}

/** Change for food and weight: the wizard's four answers (ob1-6); picking one saves it. */
function WellbeingSheet({ onClose }: { onClose: () => void }) {
  const setAnswer = useStore((s) => s.setHealthAnswer)
  const title = COPY.wellbeing?.title ?? ''
  const pick = (a: WellbeingAnswer) => { const v = wellbeingOutcome(a); if (v) setAnswer({ kind: 'wellbeing', value: v }); onClose() }
  return (
    <BareSheet label={title} onClose={onClose} className="consent">
      <h2 className="cs-t">{title}</h2>
      <div className="cs-lead">{WELLBEING_STATEMENT}</div>
      <Opts label="Food and weight" opts={WELLBEING_OPTIONS.map(([k, t]) => [k, t] as const)} value={undefined} onPick={pick} />
    </BareSheet>
  )
}

/**
 * ob7-3 / ob7-4: "Does this still apply?". On Today (`checkin`) closing counts as Ask me later;
 * Still pregnant and Breastfeeding now close quietly and restart the 12 weeks; No longer thanks
 * them, with a link to the answers. From Profile's Change (`change`) closing changes nothing.
 */
export function PregnancyCheckSheet({ mode, onClose, onAnswers }: { mode: 'checkin' | 'change'; onClose: () => void; onAnswers?: () => void }) {
  const confirm = useStore((s) => s.confirmPregnancy)
  const snooze = useStore((s) => s.snoozePregnancyReask)
  const [thanks, setThanks] = useState(false)
  const later = () => { snooze(); onClose() }
  if (thanks) {
    return (
      <BareSheet label={CHECKIN.doneT} onClose={onClose} className="consent">
        <div className="ha-tick"><Icon name="check" size={26} stroke={2.6} /></div>
        <h2 className="cs-t" style={{ margin: 0 }}>{CHECKIN.doneT}</h2>
        {onAnswers && <button className="linkbtn ha-link" onClick={onAnswers}>{CHECKIN.seeAnswers}</button>}
        <button className="btn ob-btn" onClick={onClose}>{CHECKIN.done}</button>
      </BareSheet>
    )
  }
  const pick = (k: (typeof CHECKIN.options)[number][0]) => {
    if (k === 'no-longer') { confirm('no-longer'); if (mode === 'checkin') setThanks(true); else onClose(); return }
    confirm('still-applies')
    onClose()
  }
  return (
    <BareSheet label={CHECKIN.title} onClose={mode === 'checkin' ? later : onClose} className="consent">
      <h2 className="cs-t">{CHECKIN.title}</h2>
      <div className="cs-lead">{CHECKIN.lead}</div>
      <Opts label={CHECKIN.title} opts={CHECKIN.options} value={undefined} onPick={pick} />
      {mode === 'checkin' && <button className="linkbtn ob-alt" onClick={later}>{CHECKIN.later}</button>}
    </BareSheet>
  )
}
