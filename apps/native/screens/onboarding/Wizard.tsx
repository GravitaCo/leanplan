/**
 * First-run onboarding on native (Design canvas rows Onboarding 1, 2 and 4): the screens of the
 * web's src/screens/onboarding/Wizard.tsx on N1's lib/ui. The flow is useWizardFlow (the shared
 * core's rules), each screen's answers are core/domain/wizardAnswers.ts, and every word is
 * src/copy/onboarding.ts, so web and native ask the same, keep the same and say the same. Behind
 * ONBOARDING_ENABLED (useOnboardingGate).
 *
 * The few controls only onboarding draws (the round Back, the question bar, the yes/no and unit
 * segments, the three-way "lately" buttons, the day and minute buttons, the name field) are built
 * here from tokens to the web's onboarding.css. TODO(N1-followup): move any another stream needs.
 */
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { useStore } from '@/store/store'
import { canSaveHealthAnswers } from '@/data/consent'
import {
  AREA_OPTIONS, CONFIDENCE_OPTIONS, ENJOY_OPTIONS, GOAL_OPTIONS, JOB_OPTIONS, KIT_OPTIONS, MOVING_OPTIONS, STEP_OPTIONS, WHERE_OPTIONS, WHY_CHIPS,
  canSkip, defaultSpread, finishedProfile, progressOf, summaryFor, WIZARD_MIN_AGE, type StepId, type WizardDraft, type WizardMode,
} from '@/core/domain/wizard'
import {
  areasAnswer, areasInit, daysAnswer, daysInit, daysPickN, daysSkip, daysToggle, latelyAnswer, latelyInit, medicalAnswer, medicalInit, medicalPick,
  minutesAnswer, minutesContinue, readinessAnswer, readinessInit, readinessSkip, toggleExclusive, whyAnswer, whyInit, withoutOutcome,
  type DaysPicks, type MedicalPicks, type ReadinessPicks,
} from '@/core/domain/wizardAnswers'
import { wellbeingAnswerOf, wellbeingOutcome, type WellbeingAnswer } from '@/core/domain/onboarding'
import { todayStr } from '@/core/domain/date'
import { CM_PER_IN, cmFromIn, ftInFromCm, kgFromLb, lbFromKg, stLbFromKg } from '@/core/domain/units'
import { warmupMinutesFor, rangeLabel, SESSION_RANGES, type SessionRange } from '@/core/domain/warmup'
import type { Lately } from '@/core/domain/engine'
import type { Goal } from '@/core/types'
import {
  COPY, DAYS_SPREAD, MINUTES_WARMUP, MINUTES_WARMUP_S, PARTS, partLabel, MEDICAL_ITEMS, NOTES, ONE_DAY_NOTE, TAP, TAP_GOAL, WHY_LINK,
  PREGNANCY_FOLLOWUP, PREGNANCY_OPTIONS, READINESS_ITEMS, WELLBEING_OPTIONS, WELLBEING_STATEMENT, WIZ,
} from '@/copy/onboarding'
import { BTN, num, tx, useTokens } from '../../lib/theme'
import { Btn, LinkBtn, slop } from '../../lib/ui/kit'
import { BareSheet } from '../../lib/ui/primitives'
import { CheckTiles, ChoiceTiles, type TileOpt } from '../../lib/ui/Tiles'
import { Icon, type IconName } from '../../lib/ui/icons'
import { Ruler } from '../../lib/ui/Ruler'
import { Wheel } from '../../lib/ui/Wheel'
import { Foot, Lead, Note as NoteText, OB_BTN, Page, ScreenH, SheetHead, WzCard, focusOnMount } from './frame'
import { Signposts, SPS } from './Signposts'
import { Summary } from './Summary'
import { ageStop as n2AgeStop, type AgeStopRender } from './AgeStop'
import { CoverImage, PHOTOS } from './art'
import { useWizardFlow, type WizardFlow } from './useWizardFlow'

const WD_LETTERS: [number, string, string][] = [[1, 'M', 'Monday'], [2, 'T', 'Tuesday'], [3, 'W', 'Wednesday'], [4, 'T', 'Thursday'], [5, 'F', 'Friday'], [6, 'S', 'Saturday'], [0, 'S', 'Sunday']]
const WD_SHORT: Record<number, string> = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' }

/**
 * The wizard, full screen. `mode` 'first' is the whole first run; 'setup' the setup card alone.
 * `redo`: Profile's Redo setup (and Set up my plan). `ageStop`: N2's 18+ stop (./AgeStop).
 */
export function Onboarding({ mode, redo, onClose, ageStop = n2AgeStop }: { mode: WizardMode; redo?: boolean; onClose?: () => void; ageStop?: AgeStopRender }) {
  const f = useWizardFlow({ mode, redo, onClose })
  const { d, go, put, jump } = f
  const deleteUnderAge = useStore((s) => s.deleteUnderAge)
  // after the first screen, VoiceOver starts from each new screen's heading
  const shown = useRef(d.step)
  if (shown.current !== d.step) { shown.current = d.step; focusOnMount.on = true }
  useEffect(() => () => { focusOnMount.on = false }, [])
  // a fresh component per step (two chip screens in a row would otherwise share their state)
  return <Fragment key={d.step}>{screen()}</Fragment>
  function screen(): ReactNode {
    switch (d.step) {
      case 'intro': return <PartIntro step="intro" photo={PHOTOS.part1} onGo={() => go()} onAlt={() => put({ ...d, skipped: true, step: 'skip-age' })} />
      case 'skip-age': return <SkipAge f={f} />
      case 'name': return <Name f={f} />
      case 'age': return <Age f={f} />
      case 'under16': return d.redo
        ? ageStop({ redo: true, onWrong: () => put({ ...d, age: undefined, step: 'age' }), onClose: () => {} })
        : ageStop({ redo: false, onWrong: () => put({ ...d, age: undefined, step: d.skipped ? 'skip-age' : 'age' }), onClose: () => { void deleteUnderAge() } })
      case 'ready': return <Ready f={f} />
      case 'ready-note': return <Note kind="readiness" onGo={() => go()} />
      case 'pregnancy-note': return <Note kind="pregnancy" onGo={() => go()} />
      case 'why': return <Why f={f} />
      case 'goal': return <GoalQ f={f} />
      case 'lately': return <LatelyQ f={f} />
      case 'wellbeing': return <Wellbeing f={f} />
      case 'wellbeing-note': return <Note kind="wellbeing" onGo={() => go()} />
      case 'body': return <Body f={f} />
      case 'medical': return <Medical f={f} />
      case 'medical-note': return <Note kind={d.outcomes.medical === 'no-deficit' ? 'medicalNoDeficit' : 'medical'} onGo={() => go()} />
      case 'weight': return <Weight f={f} />
      case 'move': return <Move f={f} />
      case 'handoff': return <PartIntro step="handoff" photo={PHOTOS.part2} onGo={() => go()} onAlt={() => go({ later: true })} />
      case 'plan-intro': return <PartIntro step="plan-intro" photo={PHOTOS.part3} onGo={() => go()} />
      case 'moving': return <Radio f={f} step="moving" opts={MOVING_OPTIONS} value={d.moving} set={(v) => go({ moving: v })} clear={{ moving: undefined }} />
      case 'confidence': return <Radio f={f} step="confidence" opts={CONFIDENCE_OPTIONS} value={d.experience} set={(v) => go({ experience: v })} clear={{ experience: undefined }} />
      case 'days': return <Days f={f} />
      case 'minutes': return <Minutes f={f} />
      case 'where': return <Radio f={f} step="where" opts={WHERE_OPTIONS} value={d.where} set={(v) => go({ where: v, ...(v === 'gym' ? { kit: undefined } : {}) })} clear={{ where: undefined }} />
      case 'kit': return <Chips f={f} step="kit" opts={KIT_OPTIONS} value={d.kit} none="nothing" clear={{ kit: undefined }} />
      case 'enjoy': return <Chips f={f} step="enjoy" opts={ENJOY_OPTIONS} value={d.enjoy} none="not-sure" clear={{ enjoy: undefined }} />
      case 'areas': return <Areas f={f} />
      case 'summary': return <Summary d={d} onEdit={() => jump(mode === 'setup' ? 'moving' : 'name')} onPersonalise={() => put({ ...d, later: false, step: 'moving' })}
        onAddWeight={() => put({ ...d, step: 'weight', ret: 'summary' })} onAddHeight={() => put({ ...d, step: 'body', ret: 'summary' })}
        onAddAge={() => put({ ...d, step: 'age', ret: 'summary' })} onAnswers={() => put({ ...d, step: 'ready', ret: 'summary' })}
        onChoosePlan={(id) => put({ ...d, planChoice: id })} onClose={onClose} />
    }
  }
}

type P = { f: WizardFlow }
const cap1 = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
const tiles = <T extends string>(opts: readonly (readonly [T, string, string?])[]): TileOpt<T>[] => opts.map(([k, t, s]) => ({ k, t, s }))

/* ---------------- the frame every question shares ---------------- */

/**
 * Every question (note s-r): a round Back beside one thin progress bar, and Skip; the 34 pt title with
 * one short line under it, whose "Why we ask" opens the reasons in a small sheet; `cta` is the foot.
 */
function Frame({ step, back, onSkip, cta, children, title, lead }: { step: StepId; back: (() => void) | null; onSkip?: () => void; cta: ReactNode; children: ReactNode; title?: string; lead?: string | null }) {
  const t = useTokens()
  const [why, setWhy] = useState(false)
  const p = progressOf(step)
  const c0 = COPY[step]
  const c = c0 && { ...c0, ...(title ? { title } : {}), ...(lead !== undefined ? { lead: lead ?? undefined, line: undefined } : {}) }
  const line = c?.lead ?? c?.line
  const skip = !!onSkip && canSkip(step)
  const whyText = [c?.why && cap1(c.why), c?.note].filter((x): x is string => !!x)
  return (
    <Page cta={cta}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, height: 44 }}>
        {back
          ? <Pressable accessibilityRole="button" accessibilityLabel={WIZ.back} onPress={back} hitSlop={slop(36, 36)}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.card, alignItems: 'center', justifyContent: 'center' }}><Icon name="chevL" size={20} stroke={2.4} color={t.label} /></Pressable>
          : <View style={{ width: 36 }} />}
        {p
          ? <View accessibilityRole="image" accessibilityLabel={WIZ.progress(p.at, p.of)} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: t.sep, overflow: 'hidden' }}>
              <View style={{ width: `${(p.at / p.of) * 100}%`, height: 4, borderRadius: 2, backgroundColor: t.label }} />
            </View>
          : <View style={{ flex: 1 }} />}
        {skip
          ? <Pressable accessibilityRole="button" onPress={onSkip} hitSlop={slop(34, 22)} style={{ minWidth: 34 }}><Text style={[tx(16, 500, 1.3, BTN), { color: t.tint, textAlign: 'right' }]}>{WIZ.skip}</Text></Pressable>
          : <View style={{ minWidth: 34 }} />}
      </View>
      {c && <ScreenH>{c.title}</ScreenH>}
      {(line || whyText.length > 0) && (
        <Text style={[tx(17, 400, 1.45), { color: t.label2, marginTop: -4 }]}>
          {line}{line && whyText.length > 0 ? ' ' : ''}
          {whyText.length > 0 && <Text accessibilityRole="button" onPress={() => setWhy(true)} style={[tx(17, 500, 1.45, BTN), { color: t.tint }]}>{WHY_LINK}</Text>}
        </Text>
      )}
      {children}
      {why && (
        <BareSheet label={WHY_LINK} onClose={() => setWhy(false)}>
          <SheetHead title={WHY_LINK} onDone={() => setWhy(false)} />
          <View style={{ marginTop: 12 }}>{whyText.map((x) => <Text key={x} style={[tx(16, 400, 1.45), { color: t.label, marginBottom: 10 }]}>{x}</Text>)}</View>
        </BareSheet>
      )}
    </Page>
  )
}

const Cta = ({ label = WIZ.cont, onClick, disabled }: { label?: string; onClick: () => void; disabled?: boolean }) =>
  <Btn title={label} onPress={onClick} disabled={disabled} style={OB_BTN} />
/** The foot of a tap-to-advance screen (note s-r): no Continue. */
function TapFoot({ text = TAP }: { text?: string }) {
  const t = useTokens()
  return <Text style={[tx(14), { textAlign: 'center', color: t.label2, paddingTop: 18 }]}>{text}</Text>
}

/** Tap-to-advance: the tile shows as chosen for a short beat, then moves on with the latest pick. */
function useAdvance() {
  const tm = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(tm.current), [])
  return (then: () => void) => {
    clearTimeout(tm.current)
    tm.current = setTimeout(() => { tm.current = undefined; then() }, ADVANCE_MS)
  }
}
const ADVANCE_MS = 280

/* ---------------- Onboarding 1 ---------------- */

/** The part intros (ob1-0, ob2-0, ob3-0): a photo, "Part n of 3" with a 3-step bar, the title, one line and what's coming. */
function PartIntro({ step, photo, onGo, onAlt }: { step: 'intro' | 'handoff' | 'plan-intro'; photo: number; onGo: () => void; onAlt?: () => void }) {
  const t = useTokens()
  const c = COPY[step]!
  const p = PARTS[step]
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Page top={0} gap={0} pad={0}>
        {/* .wz-photo: object-position 50% 40% */}
        <CoverImage source={photo} height={330} posY={0.4} />
        <View style={{ marginTop: -40, backgroundColor: t.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 22, paddingHorizontal: 20, gap: 14 }}>
          <View accessibilityRole="image" accessibilityLabel={WIZ.part(p.n)} style={{ flexDirection: 'row', gap: 3 }}>
            {[1, 2, 3].map((i) => <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= p.n ? t.label : t.sep }} />)}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text style={[tx(13, 600), { color: t.tint }]}>{partLabel(p.n, p.k)}</Text>
            {p.time ? <Text style={[tx(13), { color: t.label2 }]}>{p.time}</Text> : null}
          </View>
          <ScreenH style={{ marginTop: -4 }}>{c.title}</ScreenH>
          <Lead>{c.lead}</Lead>
          <View style={{ gap: 10 }}>
            {p.points.map((x) => (
              <View key={x} style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.tint, marginTop: 9 }} />
                <Text style={[tx(16, 400, 1.4), { color: t.label, flex: 1 }]}>{x}</Text>
              </View>
            ))}
          </View>
          {c.note && <NoteText>{c.note}</NoteText>}
        </View>
      </Page>
      <Foot>
        <Btn title={p.go} onPress={onGo} style={OB_BTN} />
        {onAlt && p.alt ? <LinkBtn title={p.alt} onPress={onAlt} style={{ fontSize: 16, textAlign: 'center', paddingVertical: 4 }} /> : null}
      </Foot>
    </View>
  )
}

/** r2-age: the age wheel. Untouched it answers nothing, so Continue waits for a pick. */
const AgeWheel = ({ value, onChange }: { value: number | undefined; onChange: (v: number) => void }) =>
  <Wheel label={WIZ.age.label} unit={WIZ.age.unit} min={1} max={120} initial={30} value={value} onChange={onChange} valueText={WIZ.age.value} />

function SkipAge({ f }: P) {
  const { d, patch } = f
  const finish = useStore((s) => s.finishOnboarding)
  const profile = useStore((s) => s.data.profile)
  const [v, setV] = useState<number | undefined>(d.age)
  const c = COPY['skip-age']!
  const start = () => {
    if (v == null) return
    if (v < WIZARD_MIN_AGE) { patch({ age: v, step: 'under16' }); return }
    // straight in: the Starter week, no calorie numbers until the rest is answered
    const nd = { ...d, age: v }
    const today = todayStr()
    const m = summaryFor(profile, nd, { healthConsent: canSaveHealthAnswers(useStore.getState().data), today })
    finish({ profile: finishedProfile(m, nd, new Date().toISOString(), today, profile), plan: m.result.plan, target: null, weightKg: null })
  }
  return (
    <Page cta={<Cta label={WIZ.startUsing} disabled={v == null} onClick={start} />}>
      <View style={{ height: 44 }} />
      <ScreenH style={{ marginTop: 12 }}>{c.title}</ScreenH>
      <Lead>{c.lead}</Lead>
      <AgeWheel value={v} onChange={setV} />
      <WzCard quiet>{c.note!}</WzCard>
    </Page>
  )
}

/** `.wz-field`: a card with an optional small label over a 20 pt input. */
function Field({ label, value, onChange, placeholder, maxLength, autoComplete }: { label?: string; value: string; onChange: (v: string) => void; placeholder: string; maxLength: number; autoComplete?: 'given-name' }) {
  const t = useTokens()
  return (
    <View style={{ backgroundColor: t.card, borderRadius: 22, paddingVertical: 14, paddingHorizontal: 16, gap: 4 }}>
      {label && <Text style={[tx(13), { color: t.label2 }]}>{label}</Text>}
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={t.label3} maxLength={maxLength}
        autoComplete={autoComplete} accessibilityLabel={label ?? placeholder} style={[tx(20, 400, 1.3, 0), { color: t.label, padding: 0 }]} />
    </View>
  )
}

function Name({ f }: P) {
  const { d, go, back, closable } = f
  const [v, setV] = useState(d.name ?? '')
  return (
    <Frame step="name" back={closable ? back : null} onSkip={() => go({ name: undefined })} cta={<Cta onClick={() => go({ name: v.trim() || undefined })} />}>
      <Field label={WIZ.firstName} value={v} onChange={setV} placeholder={WIZ.namePlaceholder} maxLength={40} autoComplete="given-name" />
    </Frame>
  )
}

function Age({ f }: P) {
  const { d, go, back } = f
  const [v, setV] = useState<number | undefined>(d.age)
  return (
    <Frame step="age" back={back} cta={<Cta disabled={v == null} onClick={() => v != null && go({ age: v })} />}>
      <AgeWheel value={v} onChange={setV} />
    </Frame>
  )
}

/** `.wz-seg`: a radio segment on --fill (readiness yes/no, the pregnancy follow-up). */
function WzSeg<T extends string | boolean>({ label, opts, value, onChange }: { label: string; opts: [T, string][]; value: T | undefined; onChange: (v: T) => void }) {
  const t = useTokens()
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', gap: 2, padding: 2, borderRadius: 11, backgroundColor: t.fill }}>
      {opts.map(([k, x]) => {
        const on = value === k
        return (
          <Pressable key={String(k)} accessibilityRole="radio" aria-checked={on} onPress={() => onChange(k)} hitSlop={slop(0, 38)}
            style={{ flex: 1, paddingVertical: 9, paddingHorizontal: 4, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.segon : 'transparent', boxShadow: on ? '0 1px 3px rgba(0, 0, 0, 0.12)' : undefined }}>
            <Text style={[tx(15, 500, 1.25, BTN), { color: on ? t.label : t.label2, textAlign: 'center' }]}>{x}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function Ready({ f }: P) {
  const t = useTokens()
  const { d, go, back } = f
  // the answers stay on this screen: only the outcome is kept (§8)
  const [r, setR] = useState<ReadinessPicks>(() => readinessInit(d))
  const set = (i: number, v: boolean) => setR({ ...r, items: r.items.map((x, j) => (j === i ? v : x)) })
  const q = [tx(16, 400, 1.35), { color: t.label }]
  return (
    <Frame step="ready" back={back} onSkip={() => go(readinessSkip(d))} cta={<Cta onClick={() => go(readinessAnswer(d, r))} />}>
      <View style={{ backgroundColor: t.card, borderRadius: t.radius, overflow: 'hidden' }}>
        {READINESS_ITEMS.map((x, i) => (
          <View key={x} style={[{ gap: 10, paddingVertical: 14, paddingHorizontal: 16 }, i < 2 && { borderBottomWidth: 1, borderBottomColor: t.sep }]}>
            <Text style={q}>{x}</Text>
            <WzSeg label={x} opts={[[true, WIZ.yes], [false, WIZ.no]]} value={r.items[i]} onChange={(v) => set(i, v)} />
            {i === 2 && r.items[2] === true && (
              <>
                <Text style={q}>{PREGNANCY_FOLLOWUP}</Text>
                <WzSeg label={PREGNANCY_FOLLOWUP} opts={PREGNANCY_OPTIONS.map(([k, y]) => [k, y])} value={r.which} onChange={(w) => setR({ ...r, which: w })} />
              </>
            )}
          </View>
        ))}
      </View>
    </Frame>
  )
}

function Why({ f }: P) {
  const { d, go, back } = f
  const [init] = useState(() => whyInit(d, WHY_CHIPS.map(([k]) => k)))
  const [picked, setPicked] = useState<string[]>(init.picked)
  const [other, setOther] = useState(init.other)
  const toggle = (k: string) => setPicked(picked.includes(k) ? picked.filter((x) => x !== k) : [...picked, k])
  return (
    <Frame step="why" back={back} onSkip={() => go({ motivations: undefined })} cta={<Cta onClick={() => go(whyAnswer(picked, other))} />}>
      <CheckTiles grid label={COPY.why!.title} opts={tiles(WHY_CHIPS)} value={picked} onToggle={toggle} />
      <Field value={other} onChange={setOther} placeholder={WIZ.somethingElse} maxLength={60} />
    </Frame>
  )
}

/** r1-goal: each goal with its pictogram from Tilo's icon set. */
const GOAL_ICON: Record<Goal, IconName> = { 'lose-fat': 'leaf', maintain: 'steady', 'build-muscle': 'dumbbell', 'increase-strength': 'bolt', 'increase-endurance': 'heart', 'feel-better': 'smile' }

function GoalQ({ f }: P) {
  const { d, go, back } = f
  const [g, setG] = useState(d.goal)
  const advance = useAdvance()
  return (
    <Frame step="goal" back={back} cta={<TapFoot text={TAP_GOAL} />}>
      <ChoiceTiles label={WIZ.mainGoal} opts={GOAL_OPTIONS.map(([k, t, s]) => ({ k, t, s, icon: GOAL_ICON[k] }))} value={g} onPick={(v) => { setG(v); advance(() => go({ goal: v })) }} />
    </Frame>
  )
}

/** `.wz-three`: three buttons that toggle (sleep, stress, room for change). */
function Three<T extends string>({ k, opts, value, onPick }: { k: string; opts: [T, string][]; value: T | undefined; onPick: (v: T | undefined) => void }) {
  const t = useTokens()
  return (
    <View style={{ gap: 10 }}>
      <Text style={[tx(17, 600), { color: t.label }]}>{k}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={k} style={{ flexDirection: 'row', gap: 6 }}>
        {opts.map(([v, x]) => {
          const on = value === v
          return (
            <Pressable key={v} accessibilityRole="radio" aria-checked={on} onPress={() => onPick(on ? undefined : v)}
              style={{ flex: 1, minHeight: 52, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.btn : t.bg }}>
              <Text style={[tx(15, 500, 1.25, BTN), { textAlign: 'center', color: on ? t.btnInk : t.label }]}>{x}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

function LatelyQ({ f }: P) {
  const t = useTokens()
  const { d, go, back } = f
  // only the outcome (ok or low) is kept; the three answers stay on this screen
  const [l, setL] = useState<Lately>(() => latelyInit(d))
  const L = WIZ.lately
  return (
    <Frame step="lately" back={back} onSkip={() => go(withoutOutcome(d, 'baseline'))} cta={<Cta onClick={() => go(latelyAnswer(d, l))} />}>
      <View style={{ backgroundColor: t.card, borderRadius: 22, padding: 16, gap: 18 }}>
        <Three k={L.sleep.k} opts={L.sleep.opts} value={l.sleep} onPick={(v) => setL({ ...l, sleep: v })} />
        <Three k={L.stress.k} opts={L.stress.opts} value={l.stress} onPick={(v) => setL({ ...l, stress: v })} />
        <Three k={L.room.k} opts={L.room.opts} value={l.room} onPick={(v) => setL({ ...l, room: v })} />
      </View>
    </Frame>
  )
}

function Wellbeing({ f }: P) {
  const t = useTokens()
  const { d, go, back } = f
  // Yes and Sometimes are stored apart (Onboarding 9), so every answer can be shown again
  const [a, setA] = useState<WellbeingAnswer | undefined>(wellbeingAnswerOf(d.outcomes.wellbeing))
  const advance = useAdvance()
  const pick = (v: WellbeingAnswer) => { setA(v); const o = { ...d.outcomes, wellbeing: wellbeingOutcome(v) }; advance(() => go({ outcomes: o })) }
  return (
    <Frame step="wellbeing" back={back} onSkip={() => go(withoutOutcome(d, 'wellbeing'))} cta={<TapFoot />}>
      {/* `.wz-state`'s 18 loses to `.wz-card`'s 14 on web */}
      <WzCard><Text style={[tx(19, 500, 1.4), { color: t.label }]}>{WELLBEING_STATEMENT}</Text></WzCard>
      <ChoiceTiles label={WIZ.foodAndWeight} opts={tiles(WELLBEING_OPTIONS)} value={a} onPick={pick} />
    </Frame>
  )
}

/** `.wz-useg.c`: the unit switch, centred. */
function UnitSeg<T extends string>({ label, opts, value, onChange }: { label: string; opts: [T, string][]; value: T; onChange: (v: T) => void }) {
  const t = useTokens()
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ alignSelf: 'center', flexDirection: 'row', padding: 2, gap: 2, borderRadius: 11, backgroundColor: t.fill, minWidth: opts.length > 2 ? 210 : 150, marginTop: 6 }}>
      {opts.map(([k, x]) => {
        const on = value === k
        return (
          <Pressable key={k} accessibilityRole="radio" aria-checked={on} onPress={() => onChange(k)} hitSlop={slop(0, 28)}
            style={{ flex: 1, borderRadius: 9, paddingVertical: 6, paddingHorizontal: 12, alignItems: 'center', backgroundColor: on ? t.segon : 'transparent', boxShadow: on ? '0 1px 3px rgba(0, 0, 0, 0.12)' : undefined }}>
            <Text style={[tx(13, 500, 1.3, BTN), { color: on ? t.label : t.label2 }]}>{x}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/** `.pick-fig`: the big figure over a ruler (Geist 300, as the web; `.unset` in label3). */
function Fig({ parts, unset, big = 88 }: { parts: [string, 'v' | 'u'][]; unset: boolean; big?: 76 | 88 }) {
  const t = useTokens()
  return (
    <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ textAlign: 'center' }}>
      {parts.map(([x, k], i) => k === 'v'
        ? <Text key={i} style={[tx(big, 300, 1, -0.04), num, { letterSpacing: -0.04 * big, color: unset ? t.label3 : t.label }]}>{x}</Text>
        : <Text key={i} style={[tx(big === 76 ? 24 : 26, 500, 1), { color: t.label2 }]}>{x}</Text>)}
    </Text>
  )
}

type HUnit = 'cm' | 'ft-in'
function Body({ f }: P) {
  const t = useTokens()
  const { d, go, back } = f
  const [unit, setUnit] = useState<HUnit>(d.heightUnit ?? 'cm')
  // the height in cm, or undefined until the ruler is moved (an untouched ruler answers nothing)
  const [cm, setCm] = useState<number | undefined>(d.height ?? undefined)
  const [sex, setSex] = useState(d.sexAnswer)
  const inches = (c: number) => Math.round(c / CM_PER_IN)
  const shown = cm ?? 170
  const fig: [string, 'v' | 'u'][] = unit === 'cm' ? [[String(Math.round(shown)), 'v'], [' cm', 'u']] : (() => { const x = ftInFromCm(shown, 1); return [[`${x.ft}′${x.in}`, 'v']] as [string, 'v' | 'u'][] })()
  const H = WIZ.height
  return (
    <Frame step="body" back={back} onSkip={() => go({ height: undefined, sexAnswer: undefined })}
      cta={<Cta onClick={() => go({ height: cm ? Math.round(cm * 10) / 10 : undefined, heightUnit: unit, sexAnswer: sex })} />}>
      <UnitSeg label={H.unitLabel} opts={H.units} value={unit} onChange={setUnit} />
      <Fig parts={fig} unset={cm == null} big={76} />
      {/* keyed by unit, so a switch starts the ruler afresh on its own range */}
      {unit === 'cm'
        ? <Ruler key="cm" label={H.label} min={100} max={250} initial={170} value={cm == null ? undefined : Math.round(cm)} onChange={setCm} valueText={H.cm} />
        : <Ruler key="in" label={H.label} min={inches(100) + 1} max={inches(250) - 1} initial={67} value={cm == null ? undefined : inches(cm)} onChange={(v) => setCm(cmFromIn(v))}
            major={12} mid={6} tickLabel={(v) => H.tick(v / 12)} valueText={(v) => { const x = ftInFromCm(cmFromIn(v), 1); return H.ftIn(x.ft, x.in) }} />}
      <Text style={[tx(17), { color: t.label, marginTop: 4, marginBottom: -8 }]}><Text style={tx(17, 600)}>{WIZ.sex.k}</Text> <Text style={{ color: t.label2 }}>{WIZ.sex.s}</Text></Text>
      <ChoiceTiles three label={WIZ.sex.label} opts={WIZ.sex.opts.map(([k, x]) => ({ k, t: x }))} value={sex} onPick={setSex} />
    </Frame>
  )
}

function Medical({ f }: P) {
  const { d, go, back } = f
  // back here with nothing ticked: the stored yes stays (the ticks themselves were never kept)
  const [m, setM] = useState<MedicalPicks>(() => medicalInit(d))
  const value = [...m.ticked.map(String), ...(m.none ? ['none'] : [])]
  return (
    <Frame step="medical" back={back} onSkip={() => go(withoutOutcome(d, 'medical'))} cta={<Cta onClick={() => go(medicalAnswer(d, m))} />}>
      <CheckTiles label={WIZ.medicalLabel} opts={[...MEDICAL_ITEMS.map((t, i) => ({ k: String(i), t })), { k: 'none', t: WIZ.noneOfThese }]} value={value}
        onToggle={(k) => setM(medicalPick(m, k === 'none' ? 'none' : +k))} />
    </Frame>
  )
}

type WUnit = 'kg' | 'st-lb' | 'lb'
/** r3-weight: the figure at 88 pt over a ruler, in kg, st lb or lb; kept in kg, as on web. */
function Weight({ f }: P) {
  const t = useTokens()
  const { d, go, back } = f
  const [unit, setUnit] = useState<WUnit>(d.weightUnit ?? 'kg')
  const [kg, setKg] = useState<number | undefined>(d.weight ?? undefined)
  const shown = kg ?? 70
  const lb = (k: number) => Math.round(lbFromKg(k))
  const sl = stLbFromKg(shown, 1)
  const W = WIZ.weight
  const c = COPY.weight!
  const fig: [string, 'v' | 'u'][] = unit === 'st-lb' ? [[String(sl.st), 'v'], [' st ', 'u'], [String(sl.lb), 'v'], [' lb', 'u']] : [[String(unit === 'kg' ? Math.round(shown) : lb(shown)), 'v'], [' ' + unit, 'u']]
  return (
    <Frame step="weight" back={back} onSkip={() => go({ weight: undefined })} cta={<Cta onClick={() => go({ weight: kg ? Math.round(kg * 10) / 10 : undefined, weightUnit: unit })} />}>
      <UnitSeg label={W.unitLabel} opts={W.units} value={unit} onChange={setUnit} />
      <View style={{ marginTop: 18 }}><Fig parts={fig} unset={kg == null} /></View>
      {unit === 'kg'
        ? <Ruler key="kg" label={W.label} min={25} max={350} initial={70} value={kg == null ? undefined : Math.round(kg)} onChange={setKg} valueText={W.kg} />
        : <Ruler key={unit} label={W.label} min={lb(25)} max={lb(350)} initial={lb(70)} value={kg == null ? undefined : lb(kg)} onChange={(v) => setKg(kgFromLb(v))}
            {...(unit === 'st-lb' ? { major: 14, mid: 7, tickLabel: (v: number) => W.tick(Math.round(v / 14)), valueText: (v: number) => { const x = stLbFromKg(kgFromLb(v), 1); return W.stLb(x.st, x.lb) } }
              : { valueText: W.lb })} />}
      {c.hint && <Text style={[tx(15, 400, 1.4), { textAlign: 'center', color: t.label2 }]}>{c.hint}</Text>}
    </Frame>
  )
}

/** `.wz-link.sm`: a centred tinted link under the tiles. */
function SmLink({ title, onPress, pressed }: { title: string; onPress: () => void; pressed?: boolean }) {
  const t = useTokens()
  // a LinkBtn that can carry aria-pressed (enjoy's "Not sure yet", as on web)
  return (
    <Pressable accessibilityRole="button" aria-pressed={pressed} onPress={onPress} hitSlop={8} style={({ pressed: p }) => ({ alignSelf: 'center', opacity: p ? 0.7 : 1 })}>
      <Text style={[tx(15, 500, 1.3, BTN), { color: t.tint, textAlign: 'center', paddingVertical: 4, paddingHorizontal: 4 }]}>{title}</Text>
    </Pressable>
  )
}

function Move({ f }: P) {
  const { d, go, back } = f
  const [job, setJob] = useState(d.movement?.kind === 'job')
  const [m, setM] = useState(d.movement)
  const advance = useAdvance()
  const pick = (x: NonNullable<WizardDraft['movement']>) => { setM(x); advance(() => go({ movement: x })) }
  const M = WIZ.move
  if (job) {
    return (
      <Frame step="move" back={back} onSkip={() => go({ movement: undefined })} cta={<TapFoot />} title={M.jobTitle} lead={null}>
        <ChoiceTiles label={M.jobLabel} opts={tiles(JOB_OPTIONS)} value={m?.kind === 'job' ? m.job : undefined} onPick={(j) => pick({ kind: 'job', job: j })} />
        <SmLink title={M.toSteps} onPress={() => setJob(false)} />
      </Frame>
    )
  }
  return (
    <Frame step="move" back={back} onSkip={() => go({ movement: undefined })} cta={<TapFoot />}>
      <ChoiceTiles label={M.stepsLabel} opts={tiles(STEP_OPTIONS)} value={m?.kind === 'steps' ? m.band : undefined} onPick={(b) => pick({ kind: 'steps', band: b })} />
      <SmLink title={M.toJob} onPress={() => setJob(true)} />
    </Frame>
  )
}

/* ---------------- Onboarding 2: the setup card ---------------- */

/** A single choice that moves on when tapped (moving, confidence, where). */
function Radio<T extends string>({ f, step, opts, value, set, clear }: P & { step: StepId; opts: readonly (readonly [T, string, string?])[]; value: T | undefined; set: (v: T) => void; clear: Partial<WizardDraft> }) {
  const [v, setV] = useState<T | undefined>(value)
  const advance = useAdvance()
  return (
    <Frame step={step} back={f.back} onSkip={() => f.go(clear)} cta={<TapFoot />}>
      <ChoiceTiles label={COPY[step]?.title ?? step} opts={tiles(opts)} value={v} onPick={(x) => { setV(x); advance(() => set(x)) }} />
    </Frame>
  )
}

/** Kit and enjoy: a two-column grid. Enjoy's "Not sure yet" is a link under it (r5-enjoy). */
function Chips<T extends string>({ f, step, opts, value, none, clear }: P & { step: StepId; opts: [T, string][]; value: T[] | undefined; none: T; clear: Partial<WizardDraft> }) {
  const [v, setV] = useState<T[]>(value ?? [])
  const field = step === 'kit' ? 'kit' : 'enjoy'
  const noneLink = step === 'enjoy'
  const shown = noneLink ? opts.filter(([k]) => k !== none) : opts
  const noneLabel = opts.find(([k]) => k === none)?.[1] ?? ''
  return (
    <Frame step={step} back={f.back} onSkip={() => f.go(clear)} cta={<Cta onClick={() => f.go(v.length ? { [field]: v } as Partial<WizardDraft> : clear)} />}>
      <CheckTiles grid tall={step === 'enjoy'} label={COPY[step]?.title ?? step} opts={tiles(shown)} value={v} onToggle={(k) => setV(toggleExclusive(v, k, none))} />
      {noneLink && <SmLink title={noneLabel} pressed={v.includes(none)} onPress={() => f.go({ [field]: [none] } as Partial<WizardDraft>)} />}
    </Frame>
  )
}

/** r4-days: large 1–6 buttons, then the week as day circles with the chosen days spelled out. */
function Days({ f }: P) {
  const t = useTokens()
  const { d, go, back } = f
  const [p, setP] = useState<DaysPicks>(() => daysInit(d))
  const { n, weekdays: wd } = p
  const one = n === 1
  const chosen = WD_LETTERS.filter(([k]) => wd.includes(k)).map(([k]) => WD_SHORT[k]).join(', ')
  return (
    <Frame step="days" back={back} onSkip={() => go(daysSkip)} cta={<Cta onClick={() => go(daysAnswer(p))} />}>
      <View accessibilityRole="radiogroup" accessibilityLabel={WIZ.days.label} style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
        {[1, 2, 3, 4, 5, 6].map((x) => (
          <Pressable key={x} accessibilityRole="radio" aria-checked={n === x} onPress={() => setP(daysPickN(p, x))}
            style={{ flex: 1, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: n === x ? t.btn : t.card }}>
            <Text style={[tx(26, n === x ? 600 : 400, 1.2, BTN), num, { color: n === x ? t.btnInk : t.label }]}>{x}</Text>
          </Pressable>
        ))}
      </View>
      {one && <WzCard quiet ink>{ONE_DAY_NOTE}</WzCard>}
      <View style={{ backgroundColor: t.card, borderRadius: 22, paddingVertical: 18, paddingHorizontal: 16, gap: 14, marginTop: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <Text style={[tx(17, 600), { color: t.label }]}>{one ? WIZ.days.which1 : WIZ.days.which}</Text>
          {chosen ? <Text style={[tx(14, 400, 1.4), { color: t.label2, flexShrink: 1, textAlign: 'right' }]}>{chosen}</Text> : null}
        </View>
        <View role="group" accessibilityLabel={WIZ.days.whichLabel} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {WD_LETTERS.map(([k, l, name]) => {
            const on = wd.includes(k)
            return (
              <Pressable key={k} accessibilityRole="checkbox" aria-checked={on} accessibilityLabel={name} onPress={() => setP(daysToggle(p, k))}
                style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.btn : t.card }}>
                <Text style={[tx(16, 600, 1.3, BTN), { color: on ? t.btnInk : t.label }]}>{l}</Text>
              </Pressable>
            )
          })}
        </View>
        {!wd.length && <Text style={[tx(14, 400, 1.4), { color: t.label2 }]}>{DAYS_SPREAD(defaultSpread(n))}</Text>}
      </View>
    </Frame>
  )
}

/** ob2-4: the length as a range in a 3-column grid; the engine gets its nearest length. */
function Minutes({ f }: P) {
  const t = useTokens()
  const { d, go, back } = f
  const [r, setR] = useState<SessionRange | undefined>(d.sessionRange)
  const [w, setW] = useState(0)
  const cell = w ? (w - 16) / 3 : undefined
  return (
    <Frame step="minutes" back={back} onSkip={() => go(minutesAnswer(undefined))} cta={<Cta onClick={() => go(minutesContinue(d, r))} />}>
      <View accessibilityRole="radiogroup" accessibilityLabel={WIZ.minutes.label} onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {SESSION_RANGES.map((x) => (
          <Pressable key={x} accessibilityRole="radio" aria-checked={r === x} accessibilityLabel={WIZ.minutes.value(rangeLabel(x))} onPress={() => setR(x)}
            style={{ width: cell, flexBasis: cell === undefined ? '30%' : undefined, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: r === x ? t.btn : t.card }}>
            <Text style={[tx(18, r === x ? 600 : 500, 1.2, BTN), num, { color: r === x ? t.btnInk : t.label }]}>{rangeLabel(x)}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[tx(13), { textAlign: 'center', color: t.label2, marginTop: -8 }]}>{COPY.minutes!.unit}</Text>
      {r && (
        <WzCard style={{ gap: 4 }}>
          <Text style={[tx(16, 400, 1.45), { color: t.label }]}>{MINUTES_WARMUP(warmupMinutesFor(r))}</Text>
          <Text style={[tx(14, 400, 1.45), { color: t.label2 }]}>{MINUTES_WARMUP_S}</Text>
        </WzCard>
      )}
    </Frame>
  )
}

function Areas({ f }: P) {
  const { d, go, back } = f
  const [v, setV] = useState<string[]>(() => areasInit(d))
  return (
    <Frame step="areas" back={back} onSkip={() => go({ areas: undefined })} cta={<Cta label={WIZ.areas.build} onClick={() => go(areasAnswer(v))} />}>
      <CheckTiles label={WIZ.areas.label} opts={[...tiles(AREA_OPTIONS), { k: 'none', t: WIZ.noneOfThese }]} value={v} onToggle={(k) => setV(toggleExclusive(v, k, 'none'))} />
    </Frame>
  )
}

/* ---------------- Onboarding 4: signposting ---------------- */

function Note({ kind, onGo }: { kind: 'wellbeing' | 'readiness' | 'pregnancy' | 'medical' | 'medicalNoDeficit'; onGo: () => void }) {
  const t = useTokens()
  const c = NOTES[kind]
  return (
    <Page top={64} cta={<Cta onClick={onGo} />}>
      <Text style={[tx(13, 600), { color: t.tint }]}>{c.eyebrow}</Text>
      <ScreenH style={{ marginTop: -8 }}>{c.title}</ScreenH>
      <Lead body ink>{c.lead}</Lead>
      <Text style={[tx(13), { color: t.label2, paddingHorizontal: 4, marginBottom: -8 }]}>{c.h}</Text>
      <Signposts list={SPS[kind]} />
      <NoteText>{c.note}</NoteText>
    </Page>
  )
}
