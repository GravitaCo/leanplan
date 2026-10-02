/**
 * First-run onboarding (Design canvas rows Onboarding 1, 2 and 4; notes s-ob1, s-ob2, s-ob4):
 * the wizard, the setup card and the signposting screens, one question a screen. Behind
 * ONBOARDING_ENABLED. Pure decisions live in core/domain/wizard.ts; this file only asks and shows.
 *
 * The draft is kept on this device as it goes (data/onboardingDraft.ts) so a reload, or no
 * connection, never loses the way: it holds outcomes only, never the screener's own answers, and
 * is written only with a local health consent. Nothing reaches the profile until the summary's Start.
 */
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { useStore } from '@/store/store'
import { canSaveHealthAnswers } from '@/data/consent'
import { clearDraft, loadDraft, saveDraft } from '@/data/onboardingDraft'
import { uuid } from '@/data/supabase'
import {
  AREA_OPTIONS, CONFIDENCE_OPTIONS, ENJOY_OPTIONS, GOAL_OPTIONS, HEALTH_STEPS, afterAnswer, JOB_OPTIONS, KIT_OPTIONS, MOVING_OPTIONS,
  STEP_OPTIONS, WHERE_OPTIONS, WHY_CHIPS, baselineOutcome, canSkip, defaultSpread, medicalOutcome, newDraft, prevStep,
  progressOf, readinessOutcome, stepsFor, summaryFor, WIZARD_MIN_AGE, finishedProfile, draftFromProfile, type StepId, type WizardDraft, type WizardMode,
} from '@/core/domain/wizard'
import { latestWeight } from '@/core/domain/insights'
import { wellbeingAnswerOf, wellbeingOutcome, type WellbeingAnswer } from '@/core/domain/onboarding'
import { todayStr } from '@/core/domain/date'
import { CM_PER_IN, cmFromIn, ftInFromCm, kgFromLb, lbFromKg, stLbFromKg } from '@/core/domain/units'
import type { Lately } from '@/core/domain/engine'
import type { Goal, OnboardingOutcomes } from '@/core/types'
import { Icon, type IconName } from '@/ui/icons'
import { BareSheet, useScrollLock } from '@/ui/primitives'
import { ChoiceTiles, CheckTiles, type TileOpt } from '@/ui/Tiles'
import { Wheel } from '@/ui/Wheel'
import { Ruler } from '@/ui/Ruler'
import { warmupMinutesFor, rangeEngineMinutes, rangeLabel, SESSION_RANGES, type SessionRange } from '@/core/domain/warmup'
import partOnePhoto from '@/assets/onboarding/part-1-about-you.jpg'
import partTwoPhoto from '@/assets/plans/pure-muscle-growth.jpg'
import partThreePhoto from '@/assets/onboarding/part-3-your-plan.jpg'
import { COPY, DAYS_SPREAD, MINUTES_WARMUP, MINUTES_WARMUP_S, PARTS, partLabel, MEDICAL_ITEMS, NOTES, ONE_DAY_NOTE, TAP, TAP_GOAL, WHY_LINK, PREGNANCY_FOLLOWUP, PREGNANCY_OPTIONS, READINESS_ITEMS, WELLBEING_OPTIONS, WELLBEING_STATEMENT } from './copy'
import { Summary } from './Summary'
import { SCREEN_H } from './screenHeading'
import { SPS, Signposts, Under16, UnderAgeStop } from './AgeStop'

const WD_LETTERS: [number, string, string][] = [[1, 'M', 'Monday'], [2, 'T', 'Tuesday'], [3, 'W', 'Wednesday'], [4, 'T', 'Thursday'], [5, 'F', 'Friday'], [6, 'S', 'Saturday'], [0, 'S', 'Sunday']]

/** Anything health-related in the draft (plan §8: never kept without a local health consent). */
const hasHealth = (d: WizardDraft) => Object.keys(d.outcomes).length > 0 || d.pregnant !== undefined || d.height != null || d.weight != null ||
  !!d.sexAnswer || !!d.movement || !!d.areas

/**
 * The wizard, full screen. `mode` 'first' is the whole first run; 'setup' the setup card on its
 * own (Today's "Finish your setup", Plan's "Build my plan"), which only ever changes the plan.
 * `redo`: Profile's "Redo setup", the first run prefilled with the current answers (draftFromProfile);
 * back from the first question closes it, and the summary offers the plan rebuild.
 */
export function Onboarding({ mode, redo, onClose }: { mode: WizardMode; redo?: boolean; onClose?: () => void }) {
  const data = useStore((s) => s.data)
  const health = canSaveHealthAnswers(data)
  const deleteUnderAge = useStore((s) => s.deleteUnderAge)
  const raiseUnderAge = useStore((s) => s.raiseUnderAge)
  const [d, setD] = useState<WizardDraft>(() => {
    const saved = loadDraft()
    if (saved && saved.mode === mode && !!saved.redo === !!redo) return saved
    return redo ? draftFromProfile(data.profile, uuid(), { healthConsent: health, weight: latestWeight(data, todayStr()) }) : newDraft(mode, uuid())
  })
  const closable = mode === 'setup' || !!d.redo
  // the page opens at the top of each screen
  useEffect(() => { window.scrollTo(0, 0) }, [d.step])
  // and, after the first, VoiceOver and the keyboard start from its heading, not the old screen's
  // place (a tap-to-advance screen moves on with nothing focused). The first screen keeps the
  // browser's own start.
  // (compared with the last step, not a first-run flag, so StrictMode's double effect in dev
  // behaves as the build does)
  const shown = useRef(d.step)
  useEffect(() => {
    if (shown.current === d.step) return
    shown.current = d.step
    document.querySelector<HTMLElement>('[data-screen-h]')?.focus({ preventScroll: true })
  }, [d.step])
  const put = (next: WizardDraft) => {
    setD(next)
    // never keep health answers on the device without the local consent record (plan §8)
    // Redo setup's age stop keeps no under-18 age on the device: a reload asks the age again
    const keep = next.redo && next.step === 'under16' ? { ...next, age: undefined, step: 'age' as const } : next
    if (health || !hasHealth(keep)) saveDraft(keep)
  }
  const patch = (x: Partial<WizardDraft>) => put({ ...d, ...x })
  // `ret` (from the summary's "Add weight", "Add age", "See your health check answers") goes back to
  // the summary, but never past a note or stop the answer leads to: those show first, then return
  const go = (x: Partial<WizardDraft> = {}) => { const n = { ...d, ...x }; put({ ...n, ...afterAnswer(n, health) }) }
  const back = () => { const p = prevStep(d, health); if (p) put({ ...d, step: p }); else if (closable) { clearDraft(); onClose?.() } }
  const jump = (step: StepId) => put({ ...d, step })
  // a step that isn't in this run (a health step without consent, a skipped branch): move on
  useEffect(() => {
    const steps = stepsFor(d, health)
    if (!steps.includes(d.step)) put({ ...d, step: steps.find((s) => !HEALTH_STEPS.includes(s)) ?? 'summary' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.step, health])

  // the kind stop keeps nothing but the age it was given ("We haven't kept any of your answers")
  // Redo setup is an existing account: its stop is the app's (nothing syncs, reminders held,
  // Close and delete through the usual deletion), and its answers stay for "I typed my age wrong"
  useEffect(() => {
    if (d.step === 'under16' && d.redo) raiseUnderAge('profile', { inWizard: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.step])
  useEffect(() => {
    if (d.step === 'under16' && !d.redo && (d.name !== undefined || d.motivations || Object.keys(d.outcomes).length)) put({ ...newDraft(mode, d.seed), step: 'under16', age: d.age, skipped: d.skipped, ...(d.redo ? { redo: { training: {} } } : {}) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.step])
  const common = { d, go, back, patch, closable }
  // each screen starts from the draft: a fresh component per step (two chip screens in a row
  // would otherwise share their state)
  return <Fragment key={d.step}>{screen()}</Fragment>
  function screen() {
  switch (d.step) {
    case 'intro': return <PartIntro step="intro" photo={partOnePhoto} onGo={() => go()} onAlt={() => put({ ...d, skipped: true, step: 'skip-age' })} />
    case 'skip-age': return <SkipAge {...common} />
    case 'name': return <Name {...common} />
    case 'age': return <Age {...common} />
    case 'under16': return d.redo
      ? <UnderAgeStop source="profile" onWrong={() => put({ ...d, age: undefined, step: 'age' })} />
      : <Under16 onWrong={() => put({ ...d, age: undefined, step: d.skipped ? 'skip-age' : 'age' })} onClose={() => { void deleteUnderAge() }} />
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
    case 'handoff': return <PartIntro step="handoff" photo={partTwoPhoto} onGo={() => go()} onAlt={() => go({ later: true })} />
    case 'plan-intro': return <PartIntro step="plan-intro" photo={partThreePhoto} onGo={() => go()} />
    case 'moving': return <Radio {...common} step="moving" opts={MOVING_OPTIONS.map(([k, t]) => [k, t])} value={d.moving} set={(v) => go({ moving: v })} clear={{ moving: undefined }} />
    case 'confidence': return <Radio {...common} step="confidence" opts={CONFIDENCE_OPTIONS} value={d.experience} set={(v) => go({ experience: v })} clear={{ experience: undefined }} />
    case 'days': return <Days {...common} />
    case 'minutes': return <Minutes {...common} />
    case 'where': return <Radio {...common} step="where" opts={WHERE_OPTIONS.map(([k, t]) => [k, t])} value={d.where} set={(v) => go({ where: v, ...(v === 'gym' ? { kit: undefined } : {}) })} clear={{ where: undefined }} />
    case 'kit': return <Chips {...common} step="kit" opts={KIT_OPTIONS} value={d.kit} none="nothing" clear={{ kit: undefined }} />
    case 'enjoy': return <Chips {...common} step="enjoy" opts={ENJOY_OPTIONS} value={d.enjoy} none="not-sure" clear={{ enjoy: undefined }} />
    case 'areas': return <Areas {...common} />
    case 'summary': return <Summary d={d} onEdit={() => jump(mode === 'setup' ? 'moving' : 'name')} onPersonalise={() => put({ ...d, later: false, step: 'moving' })}
      onAddWeight={() => put({ ...d, step: 'weight', ret: 'summary' })} onAddHeight={() => put({ ...d, step: 'body', ret: 'summary' })}
      onAddAge={() => put({ ...d, step: 'age', ret: 'summary' })} onAnswers={() => put({ ...d, step: 'ready', ret: 'summary' })}
      onChoosePlan={(id) => put({ ...d, planChoice: id })} onClose={onClose} />
  }
  }
}

/* ---------------- the frame every question shares ---------------- */

type Common = { d: WizardDraft; go: (x?: Partial<WizardDraft>) => void; back: () => void; patch: (x: Partial<WizardDraft>) => void; closable?: boolean }

const cap1 = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

/**
 * Every question (note s-r): a round Back beside one thin progress bar, and Skip; a 34px title
 * with one short line under it, whose "Why we ask" opens the reasons (and the old footnote) in a
 * small sheet. `cta` is the foot: a Continue, or on tap-to-advance screens the "Tap one" line.
 */
function Frame({ step, back, onSkip, cta, children, title, lead }: { step: StepId; back: (() => void) | null; onSkip?: () => void; cta: ReactNode; children: ReactNode; title?: string; lead?: string | null }) {
  const [why, setWhy] = useState(false)
  const p = progressOf(step)
  const c0 = COPY[step]
  const c = c0 && { ...c0, ...(title ? { title } : {}), ...(lead !== undefined ? { lead: lead ?? undefined, line: undefined } : {}) }
  const line = c?.lead ?? c?.line
  const skip = !!onSkip && canSkip(step)
  const whyText = [c?.why && cap1(c.why), c?.note].filter((x): x is string => !!x)
  return (
    <div className="wz">
      <div className="wz-top">
        {back ? <button className="wz-back" aria-label="Back" onClick={back}><Icon name="chevL" size={18} stroke={2.4} /></button> : <span className="wz-back none" aria-hidden="true" />}
        {p ? <div className="wz-bar" role="img" aria-label={`Question ${p.at} of ${p.of}`}><span style={{ width: `${(p.at / p.of) * 100}%` }} /></div> : <span className="wz-bar none" />}
        {skip ? <button className="wz-skip" onClick={onSkip}>Skip</button> : <span className="wz-skip none" aria-hidden="true" />}
      </div>
      {c && <h1 className="wz-h" {...SCREEN_H}>{c.title}</h1>}
      {(line || whyText.length > 0) && (
        <div className="wz-lead">{line}{line && whyText.length > 0 ? ' ' : ''}
          {whyText.length > 0 && <button className="wz-whylink" onClick={() => setWhy(true)}>{WHY_LINK}</button>}
        </div>
      )}
      {children}
      <div className="ob-cta">{cta}</div>
      {why && (
        <BareSheet label={WHY_LINK} onClose={() => setWhy(false)}>
          <div className="feel-hd"><h2>{WHY_LINK}</h2><button className="navbtn b" onClick={() => setWhy(false)}>Done</button></div>
          <div className="sm-why" style={{ marginTop: 12 }}>{whyText.map((t) => <p key={t}>{t}</p>)}</div>
        </BareSheet>
      )}
    </div>
  )
}
const Cta = ({ label = 'Continue', onClick, disabled }: { label?: string; onClick: () => void; disabled?: boolean }) =>
  <button className="btn ob-btn" onClick={onClick} disabled={disabled}>{label}</button>
/** The foot of a tap-to-advance screen (note s-r): no Continue. */
const TapFoot = ({ text = TAP }: { text?: string }) => <div className="wz-tap">{text}</div>

/**
 * Tap-to-advance: the tile shows as chosen for a short beat, then the screen moves on. A second
 * tap in that beat is ignored, and leaving the screen cancels it.
 */
function useAdvance() {
  const t = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(t.current), [])
  // a second tap inside the beat changes the answer: the screen moves on with the latest pick,
  // after a fresh beat, so what's saved is always what's shown
  return (then: () => void) => {
    window.clearTimeout(t.current)
    t.current = window.setTimeout(() => { t.current = undefined; then() }, ADVANCE_MS)
  }
}
const ADVANCE_MS = 280

/* ---------------- Onboarding 1 ---------------- */

/**
 * The part intros (ob1-0, ob2-0, ob3-0): a photo, "Part n of 3" with a 3-step bar, the title, one
 * line and what's coming. Photos: Part 1 and Part 3 from the boards (Benn cleared them, 1 Oct 2026),
 * Part 2 the Pure muscle growth plan photo. Without one, a token-coloured block stands in.
 */
function PartIntro({ step, photo, onGo, onAlt }: { step: 'intro' | 'handoff' | 'plan-intro'; photo?: string; onGo: () => void; onAlt?: () => void }) {
  const c = COPY[step]!
  const p = PARTS[step]
  return (
    <div className="wz part">
      {photo ? <img className="wz-photo" src={photo} alt="" /> : <div className="wz-photo ph" aria-hidden="true" />}
      <section className="wz-part">
        <div className="wz-bars" role="img" aria-label={`Part ${p.n} of 3`} style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', marginTop: 0 }}>
          {[1, 2, 3].map((i) => <span key={i} className={i <= p.n ? 'on' : ''} />)}
        </div>
        <div className="wz-part-k"><span className="k">{partLabel(p.n, p.k)}</span>{p.time && <span className="r">{p.time}</span>}</div>
        <h1 className="wz-h" {...SCREEN_H}>{c.title}</h1>
        <div className="wz-lead">{c.lead}</div>
        <ul className="wz-dots">{p.points.map((t) => <li key={t}>{t}</li>)}</ul>
        {c.note && <div className="wz-note">{c.note}</div>}
      </section>
      <div className="ob-cta">
        <button className="btn ob-btn" onClick={onGo}>{p.go}</button>
        {onAlt && p.alt && <button className="linkbtn ob-alt" onClick={onAlt}>{p.alt}</button>}
      </div>
    </div>
  )
}

/** r2-age: the age wheel. Untouched it answers nothing, so Continue waits for a pick. */
const AgeWheel = ({ value, onChange }: { value: number | undefined; onChange: (v: number) => void }) =>
  <Wheel label="Age in years" unit="years" min={AGE_MIN} max={AGE_MAX} initial={30} value={value} onChange={onChange} valueText={(v) => `${v} years`} />
const AGE_MIN = 1
const AGE_MAX = 120

function SkipAge({ d, patch }: Common) {
  const finish = useStore((s) => s.finishOnboarding)
  const profile = useStore((s) => s.data.profile)
  const [v, setV] = useState<number | undefined>(d.age)
  const c = COPY['skip-age']!
  const start = () => {
    if (v == null) return
    const age = v
    if (age < WIZARD_MIN_AGE) { patch({ age, step: 'under16' }); return }
    // straight in: the Starter week, no calorie numbers until the rest is answered
    const nd = { ...d, age }
    const today = todayStr()
    const m = summaryFor(profile, nd, { healthConsent: canSaveHealthAnswers(useStore.getState().data), today })
    const at = new Date().toISOString()
    finish({ profile: finishedProfile(m, nd, at, today, profile), plan: m.result.plan, target: null, weightKg: null })
  }
  return (
    <div className="wz skipage">
      <div className="wz-top" />
      <h1 className="wz-h" {...SCREEN_H}>{c.title}</h1>
      <div className="wz-lead">{c.lead}</div>
      <AgeWheel value={v} onChange={setV} />
      <div className="wz-card quiet">{c.note}</div>
      <div className="ob-cta"><Cta label="Start using Tali" disabled={v == null} onClick={start} /></div>
    </div>
  )
}

function Name({ d, go, back, closable }: Common) {
  const [v, setV] = useState(d.name ?? '')
  return (
    <Frame step="name" back={closable ? back : null} onSkip={() => go({ name: undefined })} cta={<Cta onClick={() => go({ name: v.trim() || undefined })} />}>
      <label className="wz-field"><span className="l">First name</span>
        <input value={v} maxLength={40} autoComplete="given-name" onChange={(e) => setV(e.target.value)} placeholder="Sam" /></label>
    </Frame>
  )
}

function Age({ d, go, back }: Common) {
  const [v, setV] = useState<number | undefined>(d.age)
  return (
    <Frame step="age" back={back} cta={<Cta disabled={v == null} onClick={() => v != null && go({ age: v })} />}>
      <AgeWheel value={v} onChange={setV} />
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
  // which of the third item it is: pregnant or breastfeeding route to ob4-4, recent surgery to ob4-3
  const [which, setWhich] = useState<'pregnant' | 'breastfeeding' | 'surgery' | undefined>(d.pregnant ? 'pregnant' : undefined)
  const set = (i: number, v: boolean) => setItems(items.map((x, j) => (j === i ? v : x)))
  const done = () => {
    const readiness = readinessOutcome(items) ?? (d.outcomes.readiness === 'flagged' && items.every((x) => x === undefined) ? 'flagged' : undefined)
    const outcomes: OnboardingOutcomes = { ...d.outcomes, readiness }
    if (!readiness) delete outcomes.readiness
    go({ outcomes, pregnant: items[2] === true ? (which ? which !== 'surgery' : d.pregnant) : items[2] === false ? false : undefined })
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
                <div className="wz-seg" role="radiogroup" aria-label={PREGNANCY_FOLLOWUP}>
                  {PREGNANCY_OPTIONS.map(([k, t]) => <button key={k} role="radio" aria-checked={which === k} className={which === k ? 'on' : ''} onClick={() => setWhich(k)}>{t}</button>)}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </Frame>
  )
}

const tiles = <T extends string>(opts: readonly (readonly [T, string, string?])[]): TileOpt<T>[] => opts.map(([k, t, s]) => ({ k, t, s }))

function Why({ d, go, back }: Common) {
  const known = new Set(WHY_CHIPS.map(([k]) => k))
  const [picked, setPicked] = useState<string[]>((d.motivations ?? []).filter((x) => known.has(x)))
  const [other, setOther] = useState((d.motivations ?? []).find((x) => !known.has(x)) ?? '')
  const toggle = (k: string) => setPicked(picked.includes(k) ? picked.filter((x) => x !== k) : [...picked, k])
  const all = [...picked, ...(other.trim() ? [other.trim().slice(0, 60)] : [])]
  return (
    <Frame step="why" back={back} onSkip={() => go({ motivations: undefined })} cta={<Cta onClick={() => go({ motivations: all.length ? all : undefined })} />}>
      <CheckTiles grid label={COPY.why!.title} opts={tiles(WHY_CHIPS)} value={picked} onToggle={toggle} />
      <label className="wz-field"><input value={other} maxLength={60} placeholder="Something else" aria-label="Something else" onChange={(e) => setOther(e.target.value)} /></label>
    </Frame>
  )
}

/** r1-goal: each goal with its pictogram from Tali's icon set. */
const GOAL_ICON: Record<Goal, IconName> = { 'lose-fat': 'leaf', 'build-muscle': 'dumbbell', 'increase-strength': 'bolt', 'increase-endurance': 'heart', 'feel-better': 'smile' }

function GoalQ({ d, go, back }: Common) {
  const [g, setG] = useState(d.goal)
  const advance = useAdvance()
  return (
    <Frame step="goal" back={back} cta={<TapFoot text={TAP_GOAL} />}>
      <ChoiceTiles label="Main goal" opts={GOAL_OPTIONS.map(([k, t, s]) => ({ k, t, s, icon: GOAL_ICON[k] }))} value={g} onPick={(v) => { setG(v); advance(() => go({ goal: v })) }} />
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
  // a kept 'low' (back, or Redo setup) can't be shown as picks: nothing picked keeps it
  const done = () => { const o = { ...d.outcomes, baseline: baselineOutcome(l) ?? (d.outcomes.baseline === 'low' ? 'low' : undefined) }; if (!o.baseline) delete o.baseline; go({ outcomes: o }) }
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
  // Yes and Sometimes are stored apart now (Onboarding 9), so every answer can be shown again
  const init: WellbeingAnswer | undefined = wellbeingAnswerOf(d.outcomes.wellbeing)
  const [a, setA] = useState<WellbeingAnswer | undefined>(init)
  const advance = useAdvance()
  const pick = (v: WellbeingAnswer) => {
    setA(v)
    const o = { ...d.outcomes, wellbeing: wellbeingOutcome(v) }
    advance(() => go({ outcomes: o }))
  }
  const skip = () => { const o = { ...d.outcomes }; delete o.wellbeing; go({ outcomes: o }) }
  return (
    <Frame step="wellbeing" back={back} onSkip={skip} cta={<TapFoot />}>
      <div className="wz-card wz-state">{WELLBEING_STATEMENT}</div>
      <ChoiceTiles label="Food and weight" opts={tiles(WELLBEING_OPTIONS)} value={a} onPick={pick} />
    </Frame>
  )
}

type HUnit = 'cm' | 'ft-in'
function Body({ d, go, back }: Common) {
  const [unit, setUnit] = useState<HUnit>(d.heightUnit ?? 'cm')
  // the height in cm, or undefined until the ruler is moved (an untouched ruler answers nothing)
  const [cm, setCm] = useState<number | undefined>(d.height ?? undefined)
  const [sex, setSex] = useState(d.sexAnswer)
  const inches = (c: number) => Math.round(c / CM_PER_IN)
  const fig = (c: number) => unit === 'cm' ? { v: String(Math.round(c)), u: 'cm' } : (() => { const x = ftInFromCm(c, 1); return { v: `${x.ft}′${x.in}`, u: '' } })()
  const shown = cm ?? 170
  const f = fig(shown)
  return (
    <Frame step="body" back={back} onSkip={() => go({ height: undefined, sexAnswer: undefined })}
      cta={<Cta onClick={() => go({ height: cm ? Math.round(cm * 10) / 10 : undefined, heightUnit: unit, sexAnswer: sex })} />}>
      <UnitSeg label="Height unit" opts={[['cm', 'cm'], ['ft-in', 'ft in']]} value={unit} onChange={setUnit} />
      <div className={'pick-fig num' + (cm == null ? ' unset' : '')} aria-hidden="true"><span className="v h76">{f.v}</span>{f.u && <span className="u"> {f.u}</span>}</div>
      {unit === 'cm'
        ? <Ruler label="Height" min={100} max={250} initial={170} value={cm == null ? undefined : Math.round(cm)} onChange={setCm}
            valueText={(v) => `${v} centimetres`} />
        : <Ruler label="Height" min={inches(100) + 1} max={inches(250) - 1} initial={67} value={cm == null ? undefined : inches(cm)} onChange={(v) => setCm(cmFromIn(v))}
            major={12} mid={6} tickLabel={(v) => `${v / 12} ft`} valueText={(v) => { const x = ftInFromCm(cmFromIn(v), 1); return `${x.ft} feet ${x.in} inches` }} />}
      <div className="wz-sub"><b>Sex</b> <span>for the energy estimate</span></div>
      <ChoiceTiles className="three" label="Sex for the energy estimate" opts={[{ k: 'female', t: 'Female' }, { k: 'male', t: 'Male' }, { k: 'unspecified', t: 'Prefer not to say' }]} value={sex} onPick={setSex} />
    </Frame>
  )
}

function UnitSeg<T extends string>({ label, opts, value, onChange }: { label: string; opts: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="wz-useg c" role="radiogroup" aria-label={label}>
      {opts.map(([k, t]) => <button key={k} role="radio" aria-checked={value === k} className={value === k ? 'on' : ''} onClick={() => onChange(k)}>{t}</button>)}
    </div>
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
      <CheckTiles label="Conditions and medicines" opts={[...MEDICAL_ITEMS.map((t, i) => ({ k: String(i), t })), { k: 'none', t: 'None of these' }]} value={value} onToggle={pick} />
    </Frame>
  )
}

type WUnit = 'kg' | 'st-lb' | 'lb'
/** r3-weight: the figure at 88px over a ruler, in kg, st lb or lb. It's kept in kg, as before. */
function Weight({ d, go, back }: Common) {
  const [unit, setUnit] = useState<WUnit>(d.weightUnit ?? 'kg')
  // kg, or undefined until the ruler is moved (Continue then answers nothing, as an empty box did)
  const [kg, setKg] = useState<number | undefined>(d.weight ?? undefined)
  const shown = kg ?? 70
  const lb = (k: number) => Math.round(lbFromKg(k))
  const sl = stLbFromKg(shown, 1)
  const c = COPY.weight!
  return (
    <Frame step="weight" back={back} onSkip={() => go({ weight: undefined })}
      cta={<Cta onClick={() => go({ weight: kg ? Math.round(kg * 10) / 10 : undefined, weightUnit: unit })} />}>
      <UnitSeg label="Weight unit" opts={[['kg', 'kg'], ['st-lb', 'st lb'], ['lb', 'lb']]} value={unit} onChange={setUnit} />
      <div className={'pick-fig num' + (kg == null ? ' unset' : '')} aria-hidden="true" style={{ marginTop: 18 }}>
        {unit === 'st-lb'
          ? <><span className="v">{sl.st}</span><span className="u"> st </span><span className="v">{sl.lb}</span><span className="u"> lb</span></>
          : <><span className="v">{unit === 'kg' ? Math.round(shown) : lb(shown)}</span><span className="u"> {unit}</span></>}
      </div>
      {unit === 'kg'
        ? <Ruler label="Weight" min={25} max={350} initial={70} value={kg == null ? undefined : Math.round(kg)} onChange={setKg} valueText={(v) => `${v} kilograms`} />
        : <Ruler label="Weight" min={lb(25)} max={lb(350)} initial={lb(70)} value={kg == null ? undefined : lb(kg)} onChange={(v) => setKg(kgFromLb(v))}
            {...(unit === 'st-lb' ? { major: 14, mid: 7, tickLabel: (v: number) => `${Math.round(v / 14)} st`, valueText: (v: number) => { const x = stLbFromKg(kgFromLb(v), 1); return `${x.st} stone ${x.lb} pounds` } }
              : { valueText: (v: number) => `${v} pounds` })} />}
      {c.hint && <div className="wz-hint">{c.hint}</div>}
    </Frame>
  )
}

function Move({ d, go, back }: Common) {
  const [job, setJob] = useState(d.movement?.kind === 'job')
  const [m, setM] = useState(d.movement)
  const advance = useAdvance()
  const pick = (x: NonNullable<WizardDraft['movement']>) => { setM(x); advance(() => go({ movement: x })) }
  if (job) {
    return (
      <Frame step="move" back={back} onSkip={() => go({ movement: undefined })} cta={<TapFoot />} title="What’s a normal day like?" lead={null}>
        <ChoiceTiles label="A normal day" opts={tiles(JOB_OPTIONS)} value={m?.kind === 'job' ? m.job : undefined} onPick={(j) => pick({ kind: 'job', job: j })} />
        <button className="wz-link sm" onClick={() => setJob(false)}>Use steps instead</button>
      </Frame>
    )
  }
  return (
    <Frame step="move" back={back} onSkip={() => go({ movement: undefined })} cta={<TapFoot />}>
      <ChoiceTiles label="Steps on a normal day" opts={tiles(STEP_OPTIONS)} value={m?.kind === 'steps' ? m.band : undefined} onPick={(b) => pick({ kind: 'steps', band: b })} />
      <button className="wz-link sm" onClick={() => setJob(true)}>Not sure? Describe your day instead</button>
    </Frame>
  )
}
/* ---------------- Onboarding 2: the setup card ---------------- */

/** A single choice that moves on when tapped (moving, confidence, where). */
function Radio<T extends string>({ go, back, step, opts, value, set, clear }: Common & { step: StepId; opts: readonly (readonly [T, string, string?])[]; value: T | undefined; set: (v: T) => void; clear: Partial<WizardDraft> }) {
  const [v, setV] = useState<T | undefined>(value)
  const advance = useAdvance()
  return (
    <Frame step={step} back={back} onSkip={() => go(clear)} cta={<TapFoot />}>
      <ChoiceTiles label={COPY[step]?.title ?? step} opts={tiles(opts)} value={v} onPick={(x) => { setV(x); advance(() => set(x)) }} />
    </Frame>
  )
}

/** Kit and enjoy: a two-column grid. Enjoy's "Not sure yet" is a link under it (r5-enjoy). */
function Chips<T extends string>({ go, back, step, opts, value, none, clear }: Common & { step: StepId; opts: [T, string][]; value: T[] | undefined; none: T; clear: Partial<WizardDraft> }) {
  const [v, setV] = useState<T[]>(value ?? [])
  const toggle = (k: T) => setV(k === none ? (v.includes(none) ? [] : [none]) : v.includes(k) ? v.filter((x) => x !== k) : [...v.filter((x) => x !== none), k])
  const field = step === 'kit' ? 'kit' : 'enjoy'
  const noneLink = step === 'enjoy'
  const shown = noneLink ? opts.filter(([k]) => k !== none) : opts
  const noneLabel = opts.find(([k]) => k === none)?.[1] ?? ''
  return (
    <Frame step={step} back={back} onSkip={() => go(clear)} cta={<Cta onClick={() => go(v.length ? { [field]: v } as Partial<WizardDraft> : clear)} />}>
      <CheckTiles grid tall={step === 'enjoy'} label={COPY[step]?.title ?? step} opts={tiles(shown)} value={v} onToggle={toggle} />
      {noneLink && <button className="wz-link sm" aria-pressed={v.includes(none)} onClick={() => go({ [field]: [none] } as Partial<WizardDraft>)}>{noneLabel}</button>}
    </Frame>
  )
}

const WD_SHORT: Record<number, string> = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' }

/** r4-days: large 1–6 buttons, then the week as day circles with the chosen days spelled out. */
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
  const chosen = WD_LETTERS.filter(([k]) => wd.includes(k)).map(([k]) => WD_SHORT[k]).join(', ')
  return (
    <Frame step="days" back={back} onSkip={() => go({ daysPerWeek: undefined, weekdays: undefined })}
      cta={<Cta onClick={() => go(wd.length ? { weekdays: wd, daysPerWeek: undefined } : { daysPerWeek: n as WizardDraft['daysPerWeek'], weekdays: undefined })} />}>
      <div className="wz-nums days" role="radiogroup" aria-label="Days a week">
        {[1, 2, 3, 4, 5, 6].map((x) => <button key={x} role="radio" aria-checked={n === x} className={'num' + (n === x ? ' on' : '')} onClick={() => pickN(x)}>{x}</button>)}
      </div>
      {one && <div className="wz-card quiet ink">{ONE_DAY_NOTE}</div>}
      <section className="wz-week">
        <div className="hd"><span className="t">{one ? 'Which day?' : 'Which days?'}</span>{chosen && <span className="s">{chosen}</span>}</div>
        <div className="wz-wd" role="group" aria-label="Which days">
          {WD_LETTERS.map(([k, l, name]) => <button key={k} role="checkbox" aria-checked={wd.includes(k)} aria-label={name} className={wd.includes(k) ? 'on' : ''} onClick={() => toggle(k)}>{l}</button>)}
        </div>
        {!wd.length && <div className="s">{DAYS_SPREAD(defaultSpread(n))}</div>}
      </section>
    </Frame>
  )
}

/** ob2-4: the length as a range; the engine gets its nearest length (core/domain/warmup). */
function Minutes({ d, go, back }: Common) {
  const [r, setR] = useState<SessionRange | undefined>(d.sessionRange)
  const pick = (x: SessionRange | undefined) => (x ? { sessionRange: x, minutes: rangeEngineMinutes(x) } : { sessionRange: undefined, minutes: undefined })
  return (
    <Frame step="minutes" back={back} onSkip={() => go(pick(undefined))} cta={<Cta onClick={() => go(r ? pick(r) : { sessionRange: d.sessionRange, minutes: d.minutes })} />}>
      <div className="wz-nums rng" role="radiogroup" aria-label="Minutes a session">
        {SESSION_RANGES.map((x) => <button key={x} role="radio" aria-checked={r === x} aria-label={`${rangeLabel(x)} minutes`} className={'num' + (r === x ? ' on' : '')} onClick={() => setR(x)}>{rangeLabel(x)}</button>)}
      </div>
      <div className="wz-unit">{COPY.minutes!.unit}</div>
      {r && (
        <div className="wz-card wz-warm">
          <span className="t">{MINUTES_WARMUP(warmupMinutesFor(r))}</span>
          <span className="s">{MINUTES_WARMUP_S}</span>
        </div>
      )}
    </Frame>
  )
}

function Areas({ d, go, back }: Common) {
  const [v, setV] = useState<string[]>(d.areas ? (d.areas.length ? d.areas : ['none']) : [])
  const pick = (k: string) => setV(k === 'none' ? (v.includes('none') ? [] : ['none']) : v.includes(k) ? v.filter((x) => x !== k) : [...v.filter((x) => x !== 'none'), k])
  const done = () => go({ areas: v.length ? (v.filter((x) => x !== 'none') as WizardDraft['areas']) : undefined })
  return (
    <Frame step="areas" back={back} onSkip={() => go({ areas: undefined })} cta={<Cta label="Build my week" onClick={done} />}>
      <CheckTiles label="Areas to go easy on" opts={[...tiles(AREA_OPTIONS), { k: 'none', t: 'None of these' }]} value={v} onToggle={pick} />
    </Frame>
  )
}

/* ---------------- Onboarding 4: signposting ---------------- */

// the signpost lists and the 18+ stop live in ./AgeStop (loaded with the app, so the stop works offline)

function Note({ kind, onGo }: { kind: 'wellbeing' | 'readiness' | 'pregnancy' | 'medical'; onGo: () => void }) {
  useScrollLock()
  const c = NOTES[kind]
  return (
    <div className="wz" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 64px)' }}>
      <div className="wz-eyebrow">{c.eyebrow}</div>
      <h1 className="wz-h xl" {...SCREEN_H}>{c.title}</h1>
      <div className="wz-lead body ink">{c.lead}</div>
      <div className="wz-sp-h">{c.h}</div>
      <Signposts list={SPS[kind]} />
      <div className="wz-note">{c.note}</div>
      <div className="ob-cta"><Cta onClick={onGo} /></div>
    </div>
  )
}

