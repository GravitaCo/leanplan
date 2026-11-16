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
  STEP_OPTIONS, WHERE_OPTIONS, WHY_CHIPS, canSkip, defaultSpread, newDraft, prevStep,
  progressOf, stepsFor, summaryFor, WIZARD_MIN_AGE, finishedProfile, draftFromProfile, type StepId, type WizardDraft, type WizardMode,
} from '@/core/domain/wizard'
import {
  areasAnswer, areasInit, daysAnswer, daysInit, daysPickN, daysSkip, daysToggle, keptDraft, latelyAnswer, latelyInit, mayKeep, medicalAnswer, medicalInit, medicalPick,
  minutesAnswer, minutesContinue, readinessAnswer, readinessInit, readinessSkip, stopReset, toggleExclusive, whyAnswer, whyInit, withoutOutcome, type DaysPicks, type MedicalPicks, type ReadinessPicks,
} from '@/core/domain/wizardAnswers'
import { latestWeight } from '@/core/domain/insights'
import { wellbeingAnswerOf, wellbeingOutcome, type WellbeingAnswer } from '@/core/domain/onboarding'
import { todayStr } from '@/core/domain/date'
import { CM_PER_IN, cmFromIn, ftInFromCm, kgFromLb, lbFromKg, stLbFromKg } from '@/core/domain/units'
import type { Lately } from '@/core/domain/engine'
import type { Goal } from '@/core/types'
import { Icon, type IconName } from '@/ui/icons'
import { BareSheet, useScrollLock } from '@/ui/primitives'
import { ChoiceTiles, CheckTiles, type TileOpt } from '@/ui/Tiles'
import { Wheel } from '@/ui/Wheel'
import { Ruler } from '@/ui/Ruler'
import { warmupMinutesFor, rangeLabel, SESSION_RANGES, type SessionRange } from '@/core/domain/warmup'
import partOnePhoto from '@/assets/onboarding/part-1-about-you.jpg'
import partTwoPhoto from '@/assets/plans/pure-muscle-growth.jpg'
import partThreePhoto from '@/assets/onboarding/part-3-your-plan.jpg'
import { COPY, DAYS_SPREAD, MINUTES_WARMUP, MINUTES_WARMUP_S, PARTS, partLabel, MEDICAL_ITEMS, NOTES, ONE_DAY_NOTE, TAP, TAP_GOAL, WHY_LINK, PREGNANCY_FOLLOWUP, PREGNANCY_OPTIONS, READINESS_ITEMS, WELLBEING_OPTIONS, WELLBEING_STATEMENT, WIZ } from './copy'
import { Summary } from './Summary'
import { SCREEN_H } from './screenHeading'
import { SPS, Signposts, Under16, UnderAgeStop } from './AgeStop'

const WD_LETTERS: [number, string, string][] = [[1, 'M', 'Monday'], [2, 'T', 'Tuesday'], [3, 'W', 'Wednesday'], [4, 'T', 'Thursday'], [5, 'F', 'Friday'], [6, 'S', 'Saturday'], [0, 'S', 'Sunday']]

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
    // never keep health answers on the device without the local consent record (plan §8), nor
    // Redo setup's under-18 age (core/domain/wizardAnswers)
    if (mayKeep(next, health)) saveDraft(keptDraft(next))
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
    const reset = stopReset(d, mode)
    if (reset) put(reset)
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
    case 'medical-note': return <Note kind={d.outcomes.medical === 'no-deficit' ? 'medicalNoDeficit' : 'medical'} onGo={() => go()} />
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
        {back ? <button className="wz-back" aria-label={WIZ.back} onClick={back}><Icon name="chevL" size={18} stroke={2.4} /></button> : <span className="wz-back none" aria-hidden="true" />}
        {p ? <div className="wz-bar" role="img" aria-label={WIZ.progress(p.at, p.of)}><span style={{ width: `${(p.at / p.of) * 100}%` }} /></div> : <span className="wz-bar none" />}
        {skip ? <button className="wz-skip" onClick={onSkip}>{WIZ.skip}</button> : <span className="wz-skip none" aria-hidden="true" />}
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
          <div className="feel-hd"><h2>{WHY_LINK}</h2><button className="navbtn b" onClick={() => setWhy(false)}>{WIZ.done}</button></div>
          <div className="sm-why" style={{ marginTop: 12 }}>{whyText.map((t) => <p key={t}>{t}</p>)}</div>
        </BareSheet>
      )}
    </div>
  )
}
const Cta = ({ label = WIZ.cont, onClick, disabled }: { label?: string; onClick: () => void; disabled?: boolean }) =>
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
        <div className="wz-bars" role="img" aria-label={WIZ.part(p.n)} style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', marginTop: 0 }}>
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
  <Wheel label={WIZ.age.label} unit={WIZ.age.unit} min={AGE_MIN} max={AGE_MAX} initial={30} value={value} onChange={onChange} valueText={WIZ.age.value} />
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
      <div className="ob-cta"><Cta label={WIZ.startUsing} disabled={v == null} onClick={start} /></div>
    </div>
  )
}

function Name({ d, go, back, closable }: Common) {
  const [v, setV] = useState(d.name ?? '')
  return (
    <Frame step="name" back={closable ? back : null} onSkip={() => go({ name: undefined })} cta={<Cta onClick={() => go({ name: v.trim() || undefined })} />}>
      <label className="wz-field"><span className="l">{WIZ.firstName}</span>
        <input value={v} maxLength={40} autoComplete="given-name" onChange={(e) => setV(e.target.value)} placeholder={WIZ.namePlaceholder} /></label>
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
      <button role="radio" aria-checked={value === true} className={value === true ? 'on' : ''} onClick={() => onChange(true)}>{WIZ.yes}</button>
      <button role="radio" aria-checked={value === false} className={value === false ? 'on' : ''} onClick={() => onChange(false)}>{WIZ.no}</button>
    </div>
  )
}

function Ready({ d, go, back }: Common) {
  // the answers stay on this screen: only the outcome is kept (§8)
  // which of the third item it is: pregnant or breastfeeding route to ob4-4, recent surgery to ob4-3
  const [r, setR] = useState<ReadinessPicks>(() => readinessInit(d))
  const { items, which } = r
  const set = (i: number, v: boolean) => setR({ ...r, items: items.map((x, j) => (j === i ? v : x)) })
  const setWhich = (w: ReadinessPicks['which']) => setR({ ...r, which: w })
  const done = () => go(readinessAnswer(d, r))
  const skip = () => go(readinessSkip(d))
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
  const [init] = useState(() => whyInit(d, WHY_CHIPS.map(([k]) => k)))
  const [picked, setPicked] = useState<string[]>(init.picked)
  const [other, setOther] = useState(init.other)
  const toggle = (k: string) => setPicked(picked.includes(k) ? picked.filter((x) => x !== k) : [...picked, k])
  return (
    <Frame step="why" back={back} onSkip={() => go({ motivations: undefined })} cta={<Cta onClick={() => go(whyAnswer(picked, other))} />}>
      <CheckTiles grid label={COPY.why!.title} opts={tiles(WHY_CHIPS)} value={picked} onToggle={toggle} />
      <label className="wz-field"><input value={other} maxLength={60} placeholder={WIZ.somethingElse} aria-label={WIZ.somethingElse} onChange={(e) => setOther(e.target.value)} /></label>
    </Frame>
  )
}

/** r1-goal: each goal with its pictogram from Tilo's icon set. */
const GOAL_ICON: Record<Goal, IconName> = { 'lose-fat': 'leaf', maintain: 'steady', 'build-muscle': 'dumbbell', 'increase-strength': 'bolt', 'increase-endurance': 'heart', 'feel-better': 'smile' }

function GoalQ({ d, go, back }: Common) {
  const [g, setG] = useState(d.goal)
  const advance = useAdvance()
  return (
    <Frame step="goal" back={back} cta={<TapFoot text={TAP_GOAL} />}>
      <ChoiceTiles label={WIZ.mainGoal} opts={GOAL_OPTIONS.map(([k, t, s]) => ({ k, t, s, icon: GOAL_ICON[k] }))} value={g} onPick={(v) => { setG(v); advance(() => go({ goal: v })) }} />
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
  // a kept 'low' (back, or Redo setup) can't be shown as picks: nothing picked keeps it
  const [l, setL] = useState<Lately>(() => latelyInit(d))
  const done = () => go(latelyAnswer(d, l))
  const skip = () => go(withoutOutcome(d, 'baseline'))
  return (
    <Frame step="lately" back={back} onSkip={skip} cta={<Cta onClick={done} />}>
      <div className="wz-lately">
        <Three k={WIZ.lately.sleep.k} opts={WIZ.lately.sleep.opts} value={l.sleep} onPick={(v) => setL({ ...l, sleep: v })} />
        <Three k={WIZ.lately.stress.k} opts={WIZ.lately.stress.opts} value={l.stress} onPick={(v) => setL({ ...l, stress: v })} />
        <Three k={WIZ.lately.room.k} opts={WIZ.lately.room.opts} value={l.room} onPick={(v) => setL({ ...l, room: v })} />
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
  const skip = () => go(withoutOutcome(d, 'wellbeing'))
  return (
    <Frame step="wellbeing" back={back} onSkip={skip} cta={<TapFoot />}>
      <div className="wz-card wz-state">{WELLBEING_STATEMENT}</div>
      <ChoiceTiles label={WIZ.foodAndWeight} opts={tiles(WELLBEING_OPTIONS)} value={a} onPick={pick} />
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
      <UnitSeg label={WIZ.height.unitLabel} opts={WIZ.height.units} value={unit} onChange={setUnit} />
      <div className={'pick-fig num' + (cm == null ? ' unset' : '')} aria-hidden="true"><span className="v h76">{f.v}</span>{f.u && <span className="u"> {f.u}</span>}</div>
      {unit === 'cm'
        ? <Ruler label={WIZ.height.label} min={100} max={250} initial={170} value={cm == null ? undefined : Math.round(cm)} onChange={setCm}
            valueText={WIZ.height.cm} />
        : <Ruler label={WIZ.height.label} min={inches(100) + 1} max={inches(250) - 1} initial={67} value={cm == null ? undefined : inches(cm)} onChange={(v) => setCm(cmFromIn(v))}
            major={12} mid={6} tickLabel={(v) => WIZ.height.tick(v / 12)} valueText={(v) => { const x = ftInFromCm(cmFromIn(v), 1); return WIZ.height.ftIn(x.ft, x.in) }} />}
      <div className="wz-sub"><b>{WIZ.sex.k}</b> <span>{WIZ.sex.s}</span></div>
      <ChoiceTiles className="three" label={WIZ.sex.label} opts={WIZ.sex.opts.map(([k, t]) => ({ k, t }))} value={sex} onPick={setSex} />
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
  // back here with nothing ticked: the stored yes stays (the ticks themselves were never kept)
  const [m, setM] = useState<MedicalPicks>(() => medicalInit(d))
  const pick = (k: string) => setM(medicalPick(m, k === 'none' ? 'none' : +k))
  const done = () => go(medicalAnswer(d, m))
  const skip = () => go(withoutOutcome(d, 'medical'))
  const value = [...m.ticked.map(String), ...(m.none ? ['none'] : [])]
  return (
    <Frame step="medical" back={back} onSkip={skip} cta={<Cta onClick={done} />}>
      <CheckTiles label={WIZ.medicalLabel} opts={[...MEDICAL_ITEMS.map((t, i) => ({ k: String(i), t })), { k: 'none', t: WIZ.noneOfThese }]} value={value} onToggle={pick} />
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
      <UnitSeg label={WIZ.weight.unitLabel} opts={WIZ.weight.units} value={unit} onChange={setUnit} />
      <div className={'pick-fig num' + (kg == null ? ' unset' : '')} aria-hidden="true" style={{ marginTop: 18 }}>
        {unit === 'st-lb'
          ? <><span className="v">{sl.st}</span><span className="u"> st </span><span className="v">{sl.lb}</span><span className="u"> lb</span></>
          : <><span className="v">{unit === 'kg' ? Math.round(shown) : lb(shown)}</span><span className="u"> {unit}</span></>}
      </div>
      {unit === 'kg'
        ? <Ruler label={WIZ.weight.label} min={25} max={350} initial={70} value={kg == null ? undefined : Math.round(kg)} onChange={setKg} valueText={WIZ.weight.kg} />
        : <Ruler label={WIZ.weight.label} min={lb(25)} max={lb(350)} initial={lb(70)} value={kg == null ? undefined : lb(kg)} onChange={(v) => setKg(kgFromLb(v))}
            {...(unit === 'st-lb' ? { major: 14, mid: 7, tickLabel: (v: number) => WIZ.weight.tick(Math.round(v / 14)), valueText: (v: number) => { const x = stLbFromKg(kgFromLb(v), 1); return WIZ.weight.stLb(x.st, x.lb) } }
              : { valueText: WIZ.weight.lb })} />}
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
      <Frame step="move" back={back} onSkip={() => go({ movement: undefined })} cta={<TapFoot />} title={WIZ.move.jobTitle} lead={null}>
        <ChoiceTiles label={WIZ.move.jobLabel} opts={tiles(JOB_OPTIONS)} value={m?.kind === 'job' ? m.job : undefined} onPick={(j) => pick({ kind: 'job', job: j })} />
        <button className="wz-link sm" onClick={() => setJob(false)}>{WIZ.move.toSteps}</button>
      </Frame>
    )
  }
  return (
    <Frame step="move" back={back} onSkip={() => go({ movement: undefined })} cta={<TapFoot />}>
      <ChoiceTiles label={WIZ.move.stepsLabel} opts={tiles(STEP_OPTIONS)} value={m?.kind === 'steps' ? m.band : undefined} onPick={(b) => pick({ kind: 'steps', band: b })} />
      <button className="wz-link sm" onClick={() => setJob(true)}>{WIZ.move.toJob}</button>
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
  const toggle = (k: T) => setV(toggleExclusive(v, k, none))
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
  const [p, setP] = useState<DaysPicks>(() => daysInit(d))
  const { n, weekdays: wd } = p
  const pickN = (x: number) => setP(daysPickN(p, x))
  const toggle = (k: number) => setP(daysToggle(p, k))
  const one = n === 1
  const chosen = WD_LETTERS.filter(([k]) => wd.includes(k)).map(([k]) => WD_SHORT[k]).join(', ')
  return (
    <Frame step="days" back={back} onSkip={() => go(daysSkip)} cta={<Cta onClick={() => go(daysAnswer(p))} />}>
      <div className="wz-nums days" role="radiogroup" aria-label={WIZ.days.label}>
        {[1, 2, 3, 4, 5, 6].map((x) => <button key={x} role="radio" aria-checked={n === x} className={'num' + (n === x ? ' on' : '')} onClick={() => pickN(x)}>{x}</button>)}
      </div>
      {one && <div className="wz-card quiet ink">{ONE_DAY_NOTE}</div>}
      <section className="wz-week">
        <div className="hd"><span className="t">{one ? WIZ.days.which1 : WIZ.days.which}</span>{chosen && <span className="s">{chosen}</span>}</div>
        <div className="wz-wd" role="group" aria-label={WIZ.days.whichLabel}>
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
  return (
    <Frame step="minutes" back={back} onSkip={() => go(minutesAnswer(undefined))} cta={<Cta onClick={() => go(minutesContinue(d, r))} />}>
      <div className="wz-nums rng" role="radiogroup" aria-label={WIZ.minutes.label}>
        {SESSION_RANGES.map((x) => <button key={x} role="radio" aria-checked={r === x} aria-label={WIZ.minutes.value(rangeLabel(x))} className={'num' + (r === x ? ' on' : '')} onClick={() => setR(x)}>{rangeLabel(x)}</button>)}
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
  const [v, setV] = useState<string[]>(() => areasInit(d))
  const pick = (k: string) => setV(toggleExclusive(v, k, 'none'))
  const done = () => go(areasAnswer(v))
  return (
    <Frame step="areas" back={back} onSkip={() => go({ areas: undefined })} cta={<Cta label={WIZ.areas.build} onClick={done} />}>
      <CheckTiles label={WIZ.areas.label} opts={[...tiles(AREA_OPTIONS), { k: 'none', t: WIZ.noneOfThese }]} value={v} onToggle={pick} />
    </Frame>
  )
}

/* ---------------- Onboarding 4: signposting ---------------- */

// the signpost lists and the 18+ stop live in ./AgeStop (loaded with the app, so the stop works offline)

function Note({ kind, onGo }: { kind: 'wellbeing' | 'readiness' | 'pregnancy' | 'medical' | 'medicalNoDeficit'; onGo: () => void }) {
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

