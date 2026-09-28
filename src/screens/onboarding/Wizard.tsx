/**
 * First-run onboarding (Design canvas rows Onboarding 1, 2 and 4; notes s-ob1, s-ob2, s-ob4):
 * the wizard, the setup card and the signposting screens, one question a screen. Behind
 * ONBOARDING_ENABLED. Pure decisions live in core/domain/wizard.ts; this file only asks and shows.
 *
 * The draft is kept on this device as it goes (data/onboardingDraft.ts) so a reload, or no
 * connection, never loses the way: it holds outcomes only, never the screener's own answers, and
 * is written only with a local health consent. Nothing reaches the profile until the summary's Start.
 */
import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { useStore } from '@/store/store'
import { canSaveHealthAnswers } from '@/data/consent'
import { clearDraft, loadDraft, saveDraft } from '@/data/onboardingDraft'
import { uuid } from '@/data/supabase'
import {
  AREA_OPTIONS, CONFIDENCE_OPTIONS, ENJOY_OPTIONS, GOAL_OPTIONS, HEALTH_STEPS, JOB_OPTIONS, KIT_OPTIONS, MINUTES_OPTIONS, MOVING_OPTIONS,
  STEP_OPTIONS, WHERE_OPTIONS, WHY_CHIPS, baselineOutcome, canSkip, defaultSpread, medicalOutcome, newDraft, nextStep, prevStep,
  progressOf, readinessOutcome, stepsFor, summaryFor, finishedProfile, type StepId, type WizardDraft, type WizardMode,
} from '@/core/domain/wizard'
import { MIN_AGE, wellbeingOutcome, type WellbeingAnswer } from '@/core/domain/onboarding'
import { todayStr } from '@/core/domain/date'
import { cmFromFtIn, ftInFromCm, kgFromLb, kgFromStLb, lbFromKg, stLbFromKg } from '@/core/domain/units'
import { SIGNPOSTS, beatFor } from '@/core/data/signposts'
import type { Lately } from '@/core/domain/engine'
import type { OnboardingOutcomes } from '@/core/types'
import { Icon } from '@/ui/icons'
import { useScrollLock } from '@/ui/primitives'
import { COPY, INTRO_POINTS, MEDICAL_ITEMS, NOTES, ONE_DAY_NOTE, PREGNANCY_FOLLOWUP, READINESS_ITEMS, WELLBEING_OPTIONS, WELLBEING_STATEMENT } from './copy'
import { Summary } from './Summary'

const WD_LETTERS: [number, string, string][] = [[1, 'M', 'Monday'], [2, 'T', 'Tuesday'], [3, 'W', 'Wednesday'], [4, 'T', 'Thursday'], [5, 'F', 'Friday'], [6, 'S', 'Saturday'], [0, 'S', 'Sunday']]

/** Anything health-related in the draft (plan §8: never kept without a local health consent). */
const hasHealth = (d: WizardDraft) => Object.keys(d.outcomes).length > 0 || d.pregnant !== undefined || d.height != null || d.weight != null ||
  !!d.sexAnswer || !!d.movement || !!d.areas

/**
 * The wizard, full screen. `mode` 'first' is the whole first run; 'setup' the setup card on its
 * own (Today's "Finish your setup", Plan's "Build my plan"), which only ever changes the plan.
 */
export function Onboarding({ mode, onClose }: { mode: WizardMode; onClose?: () => void }) {
  const data = useStore((s) => s.data)
  const health = canSaveHealthAnswers(data)
  const deleteUnder16 = useStore((s) => s.deleteUnder16)
  const [d, setD] = useState<WizardDraft>(() => {
    const saved = loadDraft()
    return saved && saved.mode === mode ? saved : newDraft(mode, uuid())
  })
  // the page opens at the top of each screen
  useEffect(() => { window.scrollTo(0, 0) }, [d.step])
  const put = (next: WizardDraft) => {
    setD(next)
    // never keep health answers on the device without the local consent record (plan §8)
    if (health || !hasHealth(next)) saveDraft(next)
  }
  const patch = (x: Partial<WizardDraft>) => put({ ...d, ...x })
  const go = (x: Partial<WizardDraft> = {}) => { const n = { ...d, ...x }; put(n.ret ? { ...n, ret: undefined, step: 'summary' } : { ...n, step: nextStep(n, health) }) }
  const back = () => { const p = prevStep(d, health); if (p) put({ ...d, step: p }); else if (mode === 'setup') { clearDraft(); onClose?.() } }
  const jump = (step: StepId) => put({ ...d, step })
  // a step that isn't in this run (a health step without consent, a skipped branch): move on
  useEffect(() => {
    const steps = stepsFor(d, health)
    if (!steps.includes(d.step)) put({ ...d, step: steps.find((s) => !HEALTH_STEPS.includes(s)) ?? 'summary' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.step, health])

  // the kind stop keeps nothing but the age it was given ("We haven't kept any of your answers")
  useEffect(() => {
    if (d.step === 'under16' && (d.name !== undefined || d.motivations || Object.keys(d.outcomes).length)) put({ ...newDraft(mode, d.seed), step: 'under16', age: d.age, skipped: d.skipped })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.step])
  const common = { d, go, back, patch }
  // each screen starts from the draft: a fresh component per step (two chip screens in a row
  // would otherwise share their state)
  return <Fragment key={d.step}>{screen()}</Fragment>
  function screen() {
  switch (d.step) {
    case 'intro': return <Intro onGo={() => go()} onSkip={() => put({ ...d, skipped: true, step: 'skip-age' })} />
    case 'skip-age': return <SkipAge {...common} />
    case 'name': return <Name {...common} />
    case 'age': return <Age {...common} />
    case 'under16': return <Under16 onWrong={() => put({ ...d, age: undefined, step: d.skipped ? 'skip-age' : 'age' })} onClose={() => { void deleteUnder16() }} />
    case 'ready': return <Ready {...common} />
    case 'ready-note': return <Note kind="readiness" onGo={() => go()} />
    case 'pregnancy-note': return <Note kind="pregnancy" onGo={() => go()} />
    case 'why': return <Why {...common} />
    case 'goal': return <GoalQ {...common} />
    case 'lately': return <LatelyQ {...common} />
    case 'wellbeing': return <Wellbeing {...common} />
    case 'wellbeing-note': return <Note kind="wellbeing" onGo={() => go()} />
    case 'body': return <Body {...common} />
    case 'medical': return <Medical {...common} />
    case 'medical-note': return <Note kind="medical" onGo={() => go()} />
    case 'weight': return <Weight {...common} />
    case 'move': return <Move {...common} />
    case 'handoff': return <Handoff onGo={() => go()} onLater={() => go({ later: true })} />
    case 'moving': return <Radio {...common} step="moving" opts={MOVING_OPTIONS.map(([k, t]) => [k, t])} value={d.moving} set={(v) => go({ moving: v })} clear={{ moving: undefined }} />
    case 'confidence': return <Radio {...common} step="confidence" opts={CONFIDENCE_OPTIONS} value={d.experience} set={(v) => go({ experience: v })} clear={{ experience: undefined }} />
    case 'days': return <Days {...common} />
    case 'minutes': return <Minutes {...common} />
    case 'where': return <Radio {...common} step="where" opts={WHERE_OPTIONS.map(([k, t]) => [k, t])} value={d.where} set={(v) => go({ where: v, ...(v === 'gym' ? { kit: undefined } : {}) })} clear={{ where: undefined }} />
    case 'kit': return <Chips {...common} step="kit" opts={KIT_OPTIONS} value={d.kit} none="nothing" clear={{ kit: undefined }} />
    case 'enjoy': return <Chips {...common} step="enjoy" opts={ENJOY_OPTIONS} value={d.enjoy} none="not-sure" clear={{ enjoy: undefined }} />
    case 'areas': return <Areas {...common} />
    case 'summary': return <Summary d={d} onEdit={() => jump(mode === 'setup' ? 'moving' : 'name')} onPersonalise={() => put({ ...d, later: false, step: 'moving' })}
      onAddWeight={() => put({ ...d, step: 'weight', ret: 'summary' })} onAddHeight={() => put({ ...d, step: 'body', ret: 'summary' })} onClose={onClose} />
  }
  }
}

/* ---------------- the frame every question shares ---------------- */

type Common = { d: WizardDraft; go: (x?: Partial<WizardDraft>) => void; back: () => void; patch: (x: Partial<WizardDraft>) => void }

function Frame({ step, back, onSkip, cta, children, title, lead }: { step: StepId; back: (() => void) | null; onSkip?: () => void; cta: ReactNode; children: ReactNode; title?: string; lead?: string | null }) {
  const p = progressOf(step)
  const c0 = COPY[step]
  const c = c0 && { ...c0, ...(title ? { title } : {}), ...(lead !== undefined ? { lead: lead ?? undefined } : {}) }
  return (
    <div className="wz">
      <div className="wz-top">
        <button className={'wz-back' + (back ? '' : ' none')} aria-label="Back" onClick={back ?? undefined} tabIndex={back ? 0 : -1}><Icon name="chevL" size={18} stroke={2.4} /></button>
        <span className="wz-left num">{p?.left}</span>
        <button className={'wz-skip' + (onSkip && canSkip(step) ? '' : ' none')} onClick={onSkip} tabIndex={onSkip && canSkip(step) ? 0 : -1}>Skip</button>
      </div>
      {p && (
        <div className="wz-bars" role="img" aria-label={`Question ${p.at} of ${p.of}`} style={{ gridTemplateColumns: `repeat(${p.of}, minmax(0, 1fr))` }}>
          {Array.from({ length: p.of }, (_, i) => <span key={i} className={i < p.at ? 'on' : ''} />)}
        </div>
      )}
      {c && <h1 className="wz-h">{c.title}</h1>}
      {c?.lead && <div className="wz-lead">{c.lead}</div>}
      {c?.why && <div className="wz-why"><Icon name="info" size={14} stroke={2.2} /><span><b>Why we ask:</b> {c.why}</span></div>}
      {children}
      <div className="ob-cta">{cta}</div>
    </div>
  )
}
const Cta = ({ label = 'Continue', onClick, disabled }: { label?: string; onClick: () => void; disabled?: boolean }) =>
  <button className="btn ob-btn" onClick={onClick} disabled={disabled}>{label}</button>

/* ---------------- Onboarding 1 ---------------- */

function Intro({ onGo, onSkip }: { onGo: () => void; onSkip: () => void }) {
  const c = COPY.intro!
  return (
    <div className="wz hero">
      <div className="wz-eyebrow">About 2 minutes</div>
      <h1 className="wz-h xl">{c.title}</h1>
      <div className="wz-lead body">{c.lead}</div>
      <ul className="wz-list-n">
        {INTRO_POINTS.map(([t, s], i) => <li key={t}><span className="n num">{i + 1}</span><span><span className="t">{t}</span><span className="s">{s}</span></span></li>)}
      </ul>
      <div className="wz-note">{c.note}</div>
      <div className="ob-cta">
        <button className="btn ob-btn" onClick={onGo}>Let’s go</button>
        <button className="linkbtn ob-alt" onClick={onSkip}>Skip, I’ll figure it out myself</button>
      </div>
    </div>
  )
}

function AgeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="wz-big">
      <input className="w2" type="number" inputMode="numeric" aria-label="Age in years" placeholder="0" value={value} min={1} max={120}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 3))} />
      <span className="u">years</span>
    </label>
  )
}
const ageOk = (v: string) => { const n = +v; return Number.isInteger(n) && n >= 1 && n <= 120 }

function SkipAge({ d, patch }: Common) {
  const finish = useStore((s) => s.finishOnboarding)
  const profile = useStore((s) => s.data.profile)
  const [v, setV] = useState(d.age != null ? String(d.age) : '')
  const c = COPY['skip-age']!
  const start = () => {
    const age = +v
    if (age < MIN_AGE) { patch({ age, step: 'under16' }); return }
    // straight in: the Starter week, no calorie numbers until the rest is answered
    const nd = { ...d, age }
    const today = todayStr()
    const m = summaryFor(profile, nd, { healthConsent: canSaveHealthAnswers(useStore.getState().data), today })
    const at = new Date().toISOString()
    finish({ profile: finishedProfile(m, nd, at, today, profile), plan: m.result.plan, target: null, weightKg: null })
  }
  return (
    <div className="wz">
      <div className="wz-top" />
      <h1 className="wz-h">{c.title}</h1>
      <div className="wz-lead">{c.lead}</div>
      <AgeInput value={v} onChange={setV} />
      <div className="wz-card quiet">{c.note}</div>
      <div className="ob-cta"><Cta label="Start using Tali" disabled={!ageOk(v)} onClick={start} /></div>
    </div>
  )
}

function Name({ d, go }: Common) {
  const [v, setV] = useState(d.name ?? '')
  return (
    <Frame step="name" back={null} onSkip={() => go({ name: undefined })} cta={<Cta onClick={() => go({ name: v.trim() || undefined })} />}>
      <label className="wz-field"><span className="l">First name</span>
        <input value={v} maxLength={40} autoComplete="given-name" onChange={(e) => setV(e.target.value)} placeholder="Sam" /></label>
    </Frame>
  )
}

function Age({ d, go, back }: Common) {
  const [v, setV] = useState(d.age != null ? String(d.age) : '')
  return (
    <Frame step="age" back={back} cta={<Cta disabled={!ageOk(v)} onClick={() => go({ age: +v })} />}>
      <AgeInput value={v} onChange={setV} />
      <div className="wz-note">{COPY.age!.note}</div>
    </Frame>
  )
}

function YesNo({ value, onChange, label }: { value: boolean | undefined; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="wz-seg" role="radiogroup" aria-label={label}>
      <button role="radio" aria-checked={value === true} className={value === true ? 'on' : ''} onClick={() => onChange(true)}>Yes</button>
      <button role="radio" aria-checked={value === false} className={value === false ? 'on' : ''} onClick={() => onChange(false)}>No</button>
    </div>
  )
}

function Ready({ d, go, back }: Common) {
  // the answers stay on this screen: only the outcome is kept (§8)
  const clear = d.outcomes.readiness === 'clear'
  const [items, setItems] = useState<(boolean | undefined)[]>(clear ? [false, false, false] : [undefined, undefined, d.pregnant ? true : undefined])
  const [preg, setPreg] = useState<boolean | undefined>(d.pregnant)
  const set = (i: number, v: boolean) => setItems(items.map((x, j) => (j === i ? v : x)))
  const done = () => {
    const readiness = readinessOutcome(items) ?? (d.outcomes.readiness === 'flagged' && items.every((x) => x === undefined) ? 'flagged' : undefined)
    const outcomes: OnboardingOutcomes = { ...d.outcomes, readiness }
    if (!readiness) delete outcomes.readiness
    go({ outcomes, pregnant: items[2] === true ? preg === true : items[2] === false ? false : undefined })
  }
  const skip = () => { const o = { ...d.outcomes }; delete o.readiness; go({ outcomes: o, pregnant: undefined }) }
  return (
    <Frame step="ready" back={back} onSkip={skip} cta={<Cta onClick={done} />}>
      <div className="wz-group">
        {READINESS_ITEMS.map((t, i) => (
          <div className="wz-q" key={t}>
            <span className="t">{t}</span>
            <YesNo label={t} value={items[i]} onChange={(v) => set(i, v)} />
            {i === 2 && items[2] === true && (
              <>
                <span className="t">{PREGNANCY_FOLLOWUP}</span>
                <YesNo label={PREGNANCY_FOLLOWUP} value={preg} onChange={setPreg} />
              </>
            )}
          </div>
        ))}
      </div>
      <div className="wz-note">{COPY.ready!.note}</div>
    </Frame>
  )
}

function Why({ d, go, back }: Common) {
  const known = new Set(WHY_CHIPS.map(([k]) => k))
  const [picked, setPicked] = useState<string[]>((d.motivations ?? []).filter((x) => known.has(x)))
  const [other, setOther] = useState((d.motivations ?? []).find((x) => !known.has(x)) ?? '')
  const toggle = (k: string) => setPicked(picked.includes(k) ? picked.filter((x) => x !== k) : [...picked, k])
  const all = [...picked, ...(other.trim() ? [other.trim().slice(0, 60)] : [])]
  return (
    <Frame step="why" back={back} onSkip={() => go({ motivations: undefined })} cta={<Cta onClick={() => go({ motivations: all.length ? all : undefined })} />}>
      <div className="wz-chips">
        {WHY_CHIPS.map(([k, t]) => <button key={k} role="checkbox" aria-checked={picked.includes(k)} className={'wz-chip' + (picked.includes(k) ? ' on' : '')} onClick={() => toggle(k)}>{t}</button>)}
      </div>
      <label className="wz-field"><input value={other} maxLength={60} placeholder="Something else" aria-label="Something else" onChange={(e) => setOther(e.target.value)} /></label>
    </Frame>
  )
}

function Opts<T extends string>({ opts, value, onPick, label, multi }: { opts: readonly (readonly [T, string, string?])[]; value: T | T[] | undefined; onPick: (v: T) => void; label: string; multi?: boolean }) {
  const on = (k: T) => (Array.isArray(value) ? value.includes(k) : value === k)
  return (
    <div className="wz-opts" role={multi ? 'group' : 'radiogroup'} aria-label={label}>
      {opts.map(([k, t, s]) => (
        <button key={k} role={multi ? 'checkbox' : 'radio'} aria-checked={on(k)} className={'wz-opt' + (on(k) ? ' on' : '')} onClick={() => onPick(k)}>
          <span className="m"><span className="t">{t}</span>{s && <span className="s">{s}</span>}</span>
          <span className={'wz-dot' + (multi ? ' sq' : '')}>{on(k) && <Icon name="check" size={14} stroke={2.6} />}</span>
        </button>
      ))}
    </div>
  )
}

function GoalQ({ d, go, back }: Common) {
  const [g, setG] = useState(d.goal)
  return (
    <Frame step="goal" back={back} cta={<Cta disabled={!g} onClick={() => go({ goal: g })} />}>
      <Opts label="Main goal" opts={GOAL_OPTIONS} value={g} onPick={setG} />
    </Frame>
  )
}

function Three<T extends string>({ k, opts, value, onPick }: { k: string; opts: [T, string][]; value: T | undefined; onPick: (v: T | undefined) => void }) {
  return (
    <div className="row"><span className="k">{k}</span>
      <div className="wz-three" role="radiogroup" aria-label={k}>
        {opts.map(([v, t]) => <button key={v} role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onClick={() => onPick(value === v ? undefined : v)}>{t}</button>)}
      </div>
    </div>
  )
}

function LatelyQ({ d, go, back }: Common) {
  // only the outcome (ok or low) is kept; the three answers stay on this screen
  const [l, setL] = useState<Lately>(d.outcomes.baseline === 'ok' ? { sleep: 'good', stress: 'low', room: 'plenty' } : {})
  const done = () => { const o = { ...d.outcomes, baseline: baselineOutcome(l) }; if (!o.baseline) delete o.baseline; go({ outcomes: o }) }
  const skip = () => { const o = { ...d.outcomes }; delete o.baseline; go({ outcomes: o }) }
  return (
    <Frame step="lately" back={back} onSkip={skip} cta={<Cta onClick={done} />}>
      <div className="wz-lately">
        <Three k="Sleep" opts={[['good', 'Mostly well'], ['mixed', 'Mixed'], ['poor', 'Mostly poorly']]} value={l.sleep} onPick={(v) => setL({ ...l, sleep: v })} />
        <Three k="Stress" opts={[['low', 'Low'], ['some', 'Some'], ['high', 'A lot']]} value={l.stress} onPick={(v) => setL({ ...l, stress: v })} />
        <Three k="Room for change right now" opts={[['plenty', 'Plenty'], ['some', 'A little'], ['little', 'Not much']]} value={l.room} onPick={(v) => setL({ ...l, room: v })} />
      </div>
    </Frame>
  )
}

function Wellbeing({ d, go, back }: Common) {
  const init: WellbeingAnswer | undefined = d.outcomes.wellbeing === 'clear' ? 'no' : d.outcomes.wellbeing === 'undisclosed' ? 'rather-not-say' : undefined
  const [a, setA] = useState<WellbeingAnswer | undefined>(init)
  const done = () => {
    const o = { ...d.outcomes, wellbeing: a ? wellbeingOutcome(a) : d.outcomes.wellbeing }
    if (!o.wellbeing) delete o.wellbeing
    go({ outcomes: o })
  }
  const skip = () => { const o = { ...d.outcomes }; delete o.wellbeing; go({ outcomes: o }) }
  return (
    <Frame step="wellbeing" back={back} onSkip={skip} cta={<Cta onClick={done} />}>
      <div className="wz-card" style={{ fontSize: 17, lineHeight: 1.45 }}>{WELLBEING_STATEMENT}</div>
      <Opts label="Food and weight" opts={WELLBEING_OPTIONS.map(([k, t]) => [k, t] as const)} value={a} onPick={setA} />
    </Frame>
  )
}

function Body({ d, go, back }: Common) {
  const [unit, setUnit] = useState(d.heightUnit ?? 'cm')
  const init = d.height ? ftInFromCm(d.height, 1) : null
  const [cm, setCm] = useState(d.height ? String(Math.round(d.height)) : '')
  const [ft, setFt] = useState(init ? String(init.ft) : '')
  const [inch, setInch] = useState(init ? String(init.in) : '')
  const [sex, setSex] = useState(d.sexAnswer)
  const height = unit === 'cm' ? (+cm || null) : (ft ? cmFromFtIn(+ft, +inch || 0) : null)
  const ok = height == null || (height >= 100 && height <= 250)
  const swap = (u: 'cm' | 'ft-in') => {
    if (u === unit) return
    if (u === 'ft-in' && +cm) { const x = ftInFromCm(+cm, 1); setFt(String(x.ft)); setInch(String(x.in)) }
    if (u === 'cm' && height) setCm(String(Math.round(height)))
    setUnit(u)
  }
  return (
    <Frame step="body" back={back} onSkip={() => go({ height: undefined, sexAnswer: undefined })}
      cta={<Cta disabled={!ok} onClick={() => go({ height: height ? Math.round(height * 10) / 10 : undefined, heightUnit: unit, sexAnswer: sex })} />}>
      <div className="wz-meas">
        <div className="hd"><span>Height</span>
          <div className="wz-useg" role="radiogroup" aria-label="Height unit">
            <button role="radio" aria-checked={unit === 'cm'} className={unit === 'cm' ? 'on' : ''} onClick={() => swap('cm')}>cm</button>
            <button role="radio" aria-checked={unit === 'ft-in'} className={unit === 'ft-in' ? 'on' : ''} onClick={() => swap('ft-in')}>ft in</button>
          </div>
        </div>
        {unit === 'cm'
          ? <div className="val"><input type="number" inputMode="numeric" aria-label="Height in centimetres" placeholder="170" value={cm} onChange={(e) => setCm(e.target.value.replace(/[^\d.]/g, '').slice(0, 5))} /><span className="u">cm</span></div>
          : <div className="val">
              <input className="w2" type="number" inputMode="numeric" aria-label="Feet" placeholder="5" value={ft} onChange={(e) => setFt(e.target.value.replace(/\D/g, '').slice(0, 1))} /><span className="u">ft</span>
              <input className="w2" type="number" inputMode="numeric" aria-label="Inches" placeholder="7" value={inch} onChange={(e) => setInch(e.target.value.replace(/\D/g, '').slice(0, 2))} /><span className="u">in</span>
            </div>}
      </div>
      <div className="wz-sexl">Sex <span>for the energy estimate</span></div>
      <div className="wz-seg lg" role="radiogroup" aria-label="Sex for the energy estimate">
        {([['female', 'Female'], ['male', 'Male'], ['unspecified', 'Prefer not to say']] as const).map(([k, t]) => (
          <button key={k} role="radio" aria-checked={sex === k} className={sex === k ? 'on' : ''} onClick={() => setSex(k)}>{t}</button>
        ))}
      </div>
      <div className="wz-note">{COPY.body!.note}</div>
    </Frame>
  )
}

function Medical({ d, go, back }: Common) {
  const flagged = d.outcomes.medical === 'flagged'
  const [ticked, setTicked] = useState<number[]>([])
  const [none, setNone] = useState(d.outcomes.medical === 'clear')
  const pick = (k: string) => {
    if (k === 'none') { setNone(!none); setTicked([]); return }
    const i = +k
    setNone(false)
    setTicked(ticked.includes(i) ? ticked.filter((x) => x !== i) : [...ticked, i])
  }
  const done = () => {
    const medical = medicalOutcome(ticked.length, none) ?? (flagged && !none ? 'flagged' : undefined)
    const o = { ...d.outcomes, medical }
    if (!medical) delete o.medical
    go({ outcomes: o })
  }
  const skip = () => { const o = { ...d.outcomes }; delete o.medical; go({ outcomes: o }) }
  const value = [...ticked.map(String), ...(none ? ['none'] : [])]
  return (
    <Frame step="medical" back={back} onSkip={skip} cta={<Cta onClick={done} />}>
      <Opts label="Conditions and medicines" multi opts={[...MEDICAL_ITEMS.map((t, i) => [String(i), t] as const), ['none', 'None of these'] as const]} value={value} onPick={pick} />
    </Frame>
  )
}

type WUnit = 'kg' | 'st-lb' | 'lb'
function Weight({ d, go, back }: Common) {
  const [unit, setUnit] = useState<WUnit>(d.weightUnit ?? 'kg')
  const sl = d.weight ? stLbFromKg(d.weight, 1) : null
  const [kg, setKg] = useState(d.weight ? String(Math.round(d.weight * 10) / 10) : '')
  const [st, setSt] = useState(sl ? String(sl.st) : '')
  const [lbPart, setLbPart] = useState(sl ? String(sl.lb) : '')
  const [lb, setLb] = useState(d.weight ? String(Math.round(lbFromKg(d.weight))) : '')
  const value = unit === 'kg' ? (+kg || null) : unit === 'lb' ? (+lb ? kgFromLb(+lb) : null) : (+st ? kgFromStLb(+st, +lbPart || 0) : null)
  const ok = value == null || (value >= 25 && value <= 350)
  const swap = (u: WUnit) => {
    if (u === unit) return
    if (value) {
      if (u === 'kg') setKg(String(Math.round(value * 10) / 10))
      if (u === 'lb') setLb(String(Math.round(lbFromKg(value))))
      if (u === 'st-lb') { const x = stLbFromKg(value, 1); setSt(String(x.st)); setLbPart(String(x.lb)) }
    }
    setUnit(u)
  }
  const num = (set: (v: string) => void, n = 5) => (e: { target: { value: string } }) => set(e.target.value.replace(/[^\d.]/g, '').slice(0, n))
  return (
    <Frame step="weight" back={back} onSkip={() => go({ weight: undefined })}
      cta={<Cta disabled={!ok} onClick={() => go({ weight: value ? Math.round(value * 10) / 10 : undefined, weightUnit: unit })} />}>
      <div className="wz-meas">
        <div className="hd"><span>Weight</span>
          <div className="wz-useg" role="radiogroup" aria-label="Weight unit">
            {([['kg', 'kg'], ['st-lb', 'st lb'], ['lb', 'lb']] as const).map(([k, t]) => <button key={k} role="radio" aria-checked={unit === k} className={unit === k ? 'on' : ''} onClick={() => swap(k)}>{t}</button>)}
          </div>
        </div>
        {unit === 'kg' && <div className="val"><input type="number" inputMode="decimal" aria-label="Weight in kilograms" placeholder="70" value={kg} onChange={num(setKg)} /><span className="u">kg</span></div>}
        {unit === 'lb' && <div className="val"><input type="number" inputMode="decimal" aria-label="Weight in pounds" placeholder="154" value={lb} onChange={num(setLb)} /><span className="u">lb</span></div>}
        {unit === 'st-lb' && <div className="val">
          <input className="w2" type="number" inputMode="numeric" aria-label="Stone" placeholder="11" value={st} onChange={num(setSt, 2)} /><span className="u">st</span>
          <input className="w2" type="number" inputMode="numeric" aria-label="Pounds" placeholder="0" value={lbPart} onChange={num(setLbPart, 2)} /><span className="u">lb</span>
        </div>}
      </div>
      <div className="wz-note">{COPY.weight!.note}</div>
    </Frame>
  )
}

function Move({ d, go, back }: Common) {
  const [job, setJob] = useState(d.movement?.kind === 'job')
  const [m, setM] = useState(d.movement)
  const done = () => go({ movement: m })
  if (job) {
    return (
      <Frame step="move" back={back} onSkip={() => go({ movement: undefined })} cta={<Cta label="Done" onClick={done} />} title="What’s a normal day like?" lead={null}>
        <Opts label="A normal day" opts={JOB_OPTIONS} value={m?.kind === 'job' ? m.job : undefined} onPick={(j) => setM({ kind: 'job', job: j })} />
        <button className="wz-link sm" onClick={() => setJob(false)}>Use steps instead</button>
      </Frame>
    )
  }
  return (
    <Frame step="move" back={back} onSkip={() => go({ movement: undefined })} cta={<Cta label="Done" onClick={done} />}>
      <Opts label="Steps on a normal day" opts={STEP_OPTIONS} value={m?.kind === 'steps' ? m.band : undefined} onPick={(b) => setM({ kind: 'steps', band: b })} />
      <button className="wz-link sm" onClick={() => setJob(true)}>Not sure? Describe your day instead</button>
    </Frame>
  )
}
/* ---------------- Onboarding 2: the setup card ---------------- */

function Handoff({ onGo, onLater }: { onGo: () => void; onLater: () => void }) {
  const c = COPY.handoff!
  return (
    <div className="wz">
      <div className="wz-top" />
      <div className="wz-tick"><Icon name="check" size={26} stroke={2.6} /></div>
      <h1 className="wz-h lg">{c.title}</h1>
      <div className="wz-lead body">{c.lead}</div>
      <div className="wz-card quiet">{c.note}</div>
      <div className="ob-cta">
        <button className="btn ob-btn" onClick={onGo}>Finish setup</button>
        <button className="linkbtn ob-alt" onClick={onLater}>Later</button>
      </div>
    </div>
  )
}

function Radio<T extends string>({ go, back, step, opts, value, set, clear }: Common & { step: StepId; opts: readonly (readonly [T, string, string?])[]; value: T | undefined; set: (v: T) => void; clear: Partial<WizardDraft> }) {
  const [v, setV] = useState<T | undefined>(value)
  return (
    <Frame step={step} back={back} onSkip={() => go(clear)} cta={<Cta onClick={() => (v ? set(v) : go(clear))} />}>
      <Opts label={COPY[step]?.title ?? step} opts={opts} value={v} onPick={setV} />
    </Frame>
  )
}

function Chips<T extends string>({ go, back, step, opts, value, none, clear }: Common & { step: StepId; opts: [T, string][]; value: T[] | undefined; none: T; clear: Partial<WizardDraft> }) {
  const [v, setV] = useState<T[]>(value ?? [])
  const toggle = (k: T) => setV(k === none ? (v.includes(none) ? [] : [none]) : v.includes(k) ? v.filter((x) => x !== k) : [...v.filter((x) => x !== none), k])
  return (
    <Frame step={step} back={back} onSkip={() => go(clear)} cta={<Cta onClick={() => go(v.length ? { [step === 'kit' ? 'kit' : 'enjoy']: v } as Partial<WizardDraft> : clear)} />}>
      <div className="wz-chips" role="group" aria-label={COPY[step]?.title}>
        {opts.map(([k, t]) => <button key={k} role="checkbox" aria-checked={v.includes(k)} className={'wz-chip' + (v.includes(k) ? ' on' : '')} onClick={() => toggle(k)}>{t}</button>)}
      </div>
    </Frame>
  )
}

function Days({ d, go, back }: Common) {
  const [n, setN] = useState<WizardDraft['daysPerWeek']>((d.weekdays?.length || d.daysPerWeek) as WizardDraft['daysPerWeek'])
  const [wd, setWd] = useState<number[]>(d.weekdays ?? [])
  const pickN = (x: number) => { setN(x as WizardDraft['daysPerWeek']); if (wd.length && wd.length !== x) setWd([]) }
  const toggle = (k: number) => {
    const next = wd.includes(k) ? wd.filter((x) => x !== k) : wd.length >= 6 ? wd : [...wd, k]
    setWd(next)
    setN(next.length ? (next.length as WizardDraft['daysPerWeek']) : n)
  }
  const one = n === 1
  return (
    <Frame step="days" back={back} onSkip={() => go({ daysPerWeek: undefined, weekdays: undefined })}
      cta={<Cta onClick={() => go(wd.length ? { weekdays: wd, daysPerWeek: undefined } : { daysPerWeek: n as WizardDraft['daysPerWeek'], weekdays: undefined })} />}>
      <div className="wz-nums" role="radiogroup" aria-label="Days a week" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' }}>
        {[1, 2, 3, 4, 5, 6].map((x) => <button key={x} role="radio" aria-checked={n === x} className={n === x ? 'on' : ''} onClick={() => pickN(x)}>{x}</button>)}
      </div>
      {one && <div className="wz-card quiet">{ONE_DAY_NOTE}</div>}
      <div className="wz-sub">{one ? 'Which day?' : 'Which days?'}</div>
      <div className="wz-wd" role="group" aria-label="Which days">
        {WD_LETTERS.map(([k, l, name]) => <button key={k} role="checkbox" aria-checked={wd.includes(k)} aria-label={name} className={wd.includes(k) ? 'on' : ''} onClick={() => toggle(k)}>{l}</button>)}
      </div>
      {!wd.length && <div className="wz-note">Not sure? Leave these and we’ll spread them out: {defaultSpread(n)}.</div>}
    </Frame>
  )
}

function Minutes({ d, go, back }: Common) {
  const [m, setM] = useState(d.minutes)
  return (
    <Frame step="minutes" back={back} onSkip={() => go({ minutes: undefined })} cta={<Cta onClick={() => go({ minutes: m })} />}>
      <div className="wz-nums" role="radiogroup" aria-label="Minutes a session" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
        {MINUTES_OPTIONS.map((x) => <button key={x} role="radio" aria-checked={m === x} className={m === x ? 'on' : ''} onClick={() => setM(x)}>{x === 60 ? '60+' : x}</button>)}
      </div>
      <div className="wz-note" style={{ textAlign: 'center' }}>{COPY.minutes!.note}</div>
    </Frame>
  )
}

function Areas({ d, go, back }: Common) {
  const [v, setV] = useState<string[]>(d.areas ? (d.areas.length ? d.areas : ['none']) : [])
  const pick = (k: string) => setV(k === 'none' ? (v.includes('none') ? [] : ['none']) : v.includes(k) ? v.filter((x) => x !== k) : [...v.filter((x) => x !== 'none'), k])
  const done = () => go({ areas: v.length ? (v.filter((x) => x !== 'none') as WizardDraft['areas']) : undefined })
  return (
    <Frame step="areas" back={back} onSkip={() => go({ areas: undefined })} cta={<Cta label="Build my week" onClick={done} />}>
      <Opts label="Areas to go easy on" multi opts={[...AREA_OPTIONS, ['none', 'None of these'] as const]} value={v} onPick={pick} />
      <div className="wz-note">{COPY.areas!.note}</div>
    </Frame>
  )
}

/* ---------------- Onboarding 4: signposting ---------------- */

type SP = { name: string; desc: string; num?: string; tel?: string }
const SPS: Record<'wellbeing' | 'readiness' | 'pregnancy' | 'medical' | 'under16', SP[]> = {
  wellbeing: [
    { name: 'Beat', desc: 'The UK’s eating disorder charity', num: beatFor('england'), tel: beatFor('england') },
    { name: 'NHS 111', desc: 'Medical help when it isn’t an emergency, any time', num: '111', tel: SIGNPOSTS.nhs111.phone },
    { name: 'Samaritans', desc: 'Talk about anything, any time, free', num: '116 123', tel: SIGNPOSTS.samaritans.phone },
    { name: 'Emergency', desc: 'If you or someone else is in danger now', num: '999', tel: SIGNPOSTS.emergency.phone },
  ],
  readiness: [
    { name: 'Your GP', desc: 'Before you build up, or if anything changes', num: 'Book' },
    { name: 'NHS 111', desc: 'Medical help when it isn’t an emergency, any time', num: '111', tel: SIGNPOSTS.nhs111.phone },
    { name: 'Emergency', desc: 'If you or someone else is in danger now', num: '999', tel: SIGNPOSTS.emergency.phone },
  ],
  pregnancy: [
    { name: 'Your midwife or GP', desc: 'For anything about you or your baby', num: 'Contact' },
    { name: 'NHS 111', desc: 'Medical help when it isn’t an emergency, any time', num: '111', tel: SIGNPOSTS.nhs111.phone },
    { name: 'Emergency', desc: 'If you or someone else is in danger now', num: '999', tel: SIGNPOSTS.emergency.phone },
  ],
  medical: [
    { name: 'Your GP or care team', desc: 'Before changing how much you eat', num: 'Contact' },
    { name: 'NHS 111', desc: 'Medical help when it isn’t an emergency, any time', num: '111', tel: SIGNPOSTS.nhs111.phone },
  ],
  under16: [{ name: 'Childline', desc: 'Free and confidential, for anyone under 19', num: '0800 1111', tel: SIGNPOSTS.childline.phone }],
}

function Signposts({ list }: { list: SP[] }) {
  return (
    <div className="wz-group">
      {list.map((s) => {
        const inner = <><span className="m"><span className="t">{s.name}</span><span className="s">{s.desc}</span></span><span className="n num">{s.num}</span></>
        return s.tel
          ? <a key={s.name} className="wz-sp" href={'tel:' + s.tel.replace(/\s/g, '')} aria-label={`${s.name}: call ${s.num}`}>{inner}</a>
          : <div key={s.name} className="wz-sp">{inner}</div>
      })}
    </div>
  )
}

function Note({ kind, onGo }: { kind: 'wellbeing' | 'readiness' | 'pregnancy' | 'medical'; onGo: () => void }) {
  useScrollLock()
  const c = NOTES[kind]
  return (
    <div className="wz" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 64px)' }}>
      <div className="wz-eyebrow">{c.eyebrow}</div>
      <h1 className="wz-h xl">{c.title}</h1>
      <div className="wz-lead body ink">{c.lead}</div>
      <div className="wz-sp-h">{c.h}</div>
      <Signposts list={SPS[kind]} />
      <div className="wz-note">{c.note}</div>
      <div className="ob-cta"><Cta onClick={onGo} /></div>
    </div>
  )
}

/** The kind stop (ob4-1). Close deletes the new account and this device's data (Benn, §14). */
export function Under16({ onWrong, onClose, deleting }: { onWrong?: () => void; onClose: () => void; deleting?: boolean }) {
  const busy = useStore((s) => s.deletingAccount)
  const c = NOTES.under16
  return (
    <div className="wz" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 110px)' }}>
      <h1 className="wz-h xl" style={{ margin: 0 }}>{c.title}</h1>
      <div className="wz-lead body ink">{c.lead}</div>
      <div className="wz-lead body">{c.more}</div>
      <Signposts list={SPS.under16} />
      <div className="wz-note">{c.note}</div>
      <div className="ob-cta">
        {!deleting && <Cta label="Close" disabled={busy} onClick={onClose} />}
        {!deleting && onWrong && <button className="linkbtn ob-alt" onClick={onWrong}>I typed my age wrong</button>}
      </div>
    </div>
  )
}
