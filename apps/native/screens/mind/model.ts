/**
 * The Mind tab's view models for native (ported from src/screens/MindScreen.tsx and
 * src/screens/mind/*): what each screen shows and does, as plain typed functions over the shared
 * store, with no JSX and no React Native, so they are unit-tested in Node. Screens (once N1's kit
 * lands) only compose lib/ui primitives around these. Words come from the web's copy files and the
 * shared helpers; nothing here is retyped or re-derived.
 */
import { useStore, type MindView, type StoreState } from '@/store/store'
import { healthDeclined } from '@/data/consent'
import { isHHMM } from '@/core/domain/checkin'
import { SLEEP_BANDS } from '@/core/domain/checkin'
import { bandLabel } from '@/core/domain/sleep'
import { REFLECTION_LATER, reflectionLines, type WeekReflection } from '@/core/domain/mind'
import { todayStr } from '@/core/domain/date'
import { NATIONS, type UkNation } from '@/core/data/signposts'
import {
  DEFAULT_ROUTINE, RESET_DEFAULT_LENGTH, RESET_LENGTHS, resetTicksThing, routineChoices, routineItems, routineSub,
  routineToSave, skillById, skillsWithScreen, type Skill, type WindDownItem,
} from '@/core/data/skills'
import type { CheckIn, SkillId } from '@/core/types'
import { MIND, REFLECTION, SUPPORT_MIND, UNLOAD, WIND_DOWN } from '@/screens/mind/copy'
import { RESET, finishedLine, leftLine, lengthLabel } from '@/screens/mind/resetCopy'
import { SUPPORT } from '@/screens/onboarding/copyApp'
import { supportList } from '@/screens/profile/supportRows'
import { checkinPairs, mindEyebrow } from '@/screens/mind/pageLogic'
import { reflectionFor, reflectionSpan } from '@/screens/mind/reflection'
import { UNLOAD_MAX_PAIRS, type UnloadPair } from '@/screens/mind/unloadNotes'

/* ======================= the Mind page (B5) ======================= */

export interface SkillRow { id: MindView; name: string; sub: string; icon: string; pillar: Skill['pillar'] }

export interface MindPageModel {
  eyebrow: string
  title: string
  /** today's answers, label and value, in B5 order; empty before the check-in */
  pairs: [string, string][]
  /** the check-in card's button: "Update" (gray) after a check-in, "Check in" (ink) before */
  checkinButton: { title: string; kind: 'gray' | 'ink' }
  /** the skills with a screen, only while MIND_REVIEWED is on */
  skills: SkillRow[]
}

export function mindPageModel(today: string, checkin: CheckIn | null | undefined, skillsOn: boolean): MindPageModel {
  const pairs = checkinPairs(checkin)
  return {
    eyebrow: mindEyebrow(today),
    title: MIND.title,
    pairs,
    checkinButton: pairs.length ? { title: MIND.update, kind: 'gray' } : { title: MIND.checkIn, kind: 'ink' },
    skills: skillsOn ? skillsWithScreen().map((s) => ({ id: s.id as MindView, name: s.name, sub: s.sub, icon: s.icon, pillar: s.pillar })) : [],
  }
}

/**
 * Where the Mind page's check-in button goes: Profile's health section while health data is
 * declined (as the Summary card), else the check-in sheet for today, moving the selected day there
 * first since the sheet edits the selected day.
 */
export function openMindCheckin(st: Pick<StoreState, 'data' | 'cur' | 'setDate' | 'openProfile'>, today = todayStr()): 'health' | 'sheet' {
  if (healthDeclined(st.data)) { st.openProfile('health'); return 'health' }
  if (st.cur !== today) st.setDate(today)
  return 'sheet'
}

/* ======================= the pushed views ======================= */

/**
 * The Mind tab's stack, newest last: a skill screen, or Unload's sheet over the page or a screen
 * (Wind down's routine opens Reset and Unload from inside it, and Back returns there).
 */
export type MindStack = readonly MindView[]

export const pushView = (s: MindStack, v: MindView): MindStack => [...s, v]
export const popView = (s: MindStack): MindStack => s.slice(0, -1)

/** What the stack shows: the top screen (none: the page), Unload's sheet on top, Reset's Back label. */
export function stackView(s: MindStack): { screen: Exclude<MindView, 'unload'> | null; unload: boolean; resetBack: string; hideTabBar: boolean } {
  const screens = s.filter((v): v is Exclude<MindView, 'unload'> => v !== 'unload')
  const screen = screens[screens.length - 1] ?? null
  const fromWindDown = screen === 'reset' && screens[screens.length - 2] === 'wind-down'
  return {
    screen,
    unload: s[s.length - 1] === 'unload',
    resetBack: fromWindDown ? skillById('wind-down')!.name : MIND.title,
    // Reset, Wind down and Get outside are card screens with no tab bar (as on the web)
    hideTabBar: screen !== null,
  }
}

/** A one-thing chip with a skill opens its view on arrival (openMind), only once the skill screens are reviewed. */
export const stackOnArrival = (open: MindView | null, reviewed: boolean): MindStack | null => (open && reviewed ? [open] : null)

/* ======================= Reset (B7) ======================= */

export type ResetStage = 'ready' | 'running' | 'finished' | 'stopped'
export type ResetLength = (typeof RESET_LENGTHS)[number]

export interface ResetState { stage: ResetStage; len: ResetLength; run: number }
export type ResetAction = { type: 'start' } | { type: 'stop' } | { type: 'finish' } | { type: 'length'; len: ResetLength }

export const resetInitial: ResetState = { stage: 'ready', len: RESET_DEFAULT_LENGTH as ResetLength, run: 0 }

export function resetReducer(s: ResetState, a: ResetAction): ResetState {
  switch (a.type) {
    case 'start': return s.stage === 'ready' ? { ...s, stage: 'running', run: s.run + 1 } : s
    case 'stop': return s.stage === 'running' ? { ...s, stage: 'stopped' } : s
    case 'finish': return s.stage === 'running' ? { ...s, stage: 'finished' } : s
    // picking a length after a run ends goes back to ready; a length can't change mid-run (it's hidden)
    case 'length': return s.stage === 'running' ? s : { ...s, len: a.len, stage: 'ready' }
  }
}

/** Which parts Reset shows in each stage (the Glow boards). */
export interface ResetView {
  /** the sub-line, the length picker and the how-to */
  intro: boolean
  /** B7.10 above the pacer while running with Reduce Motion on */
  reducedLine: string | null
  pacer: boolean
  /** "1:20 left" while running */
  left: string | null
  /** the end card: "That's 2 minutes." and B7.15 when finished; B7.15 alone when stopped */
  end: { title: string | null; line: string } | null
  button: { title: string; kind: 'ink' | 'gray'; does: 'start' | 'stop' | 'back' }
  lengths: [string, string][]
}

export function resetView(s: ResetState, reduced: boolean, left: string): ResetView {
  const running = s.stage === 'running'
  const ended = s.stage === 'finished' || s.stage === 'stopped'
  return {
    intro: !running,
    reducedLine: running && reduced ? RESET.reduced : null,
    pacer: !ended,
    left: running ? leftLine(left) : null,
    end: s.stage === 'finished' ? { title: finishedLine(s.len), line: RESET.comeBack } : s.stage === 'stopped' ? { title: null, line: RESET.comeBack } : null,
    button: s.stage === 'ready' ? { title: RESET.start, kind: 'ink', does: 'start' } : running ? { title: RESET.stop, kind: 'gray', does: 'stop' } : { title: RESET.done, kind: 'ink', does: 'back' },
    lengths: RESET_LENGTHS.map((m) => [String(m), lengthLabel(m)]),
  }
}

/**
 * A finished run: logged once (logSkill), and today's thing ticked done when it's a Reset thing
 * (doneThing; Benn, 10 Oct 2026). A stopped run never calls this, so it changes nothing.
 */
export function finishReset(st: Pick<StoreState, 'data' | 'logSkill' | 'doneThing'>, today = todayStr()): void {
  st.logSkill('reset')
  if (resetTicksThing(st.data.days[today]?.checkin?.thing)) st.doneThing()
}

/* ======================= Support (B6 frame 1) ======================= */

export interface SupportRowModel {
  name: string
  desc: string
  /** the number on the right in --tint, or none (the GP row) */
  num?: string
  /** what tapping the row (or, with a web link, the number) opens */
  href?: string
  /** the web's aria-label on the link: "Samaritans: call 116 123", "Shout: text 85258" */
  a11y?: string
  /** the row and the number are separate targets (a row with a web link) */
  numOnly?: boolean
  web?: { href: string; label: string }
}

export interface SupportModel {
  title: string
  lead: string
  /** "Showing services for the whole UK" / "… for England" */
  showing: string
  /** "Choose" before a pick, "Change" after (Benn, 10 Oct 2026) */
  pick: string
  nations: [UkNation, string][]
  rows: SupportRowModel[]
  /** under the list, in order: the choose-a-nation line (whole UK only), not a crisis service, the private foot */
  foots: string[]
}

const telHref = (tel: string) => 'tel:' + tel.replace(/\s/g, '')

/** The sheet for a nation (null: none picked yet). Pure: the sheet records, counts and sends nothing. */
export function supportModel(nation: UkNation | null): SupportModel {
  const name = nation ? NATIONS.find(([k]) => k === nation)![1] : SUPPORT_MIND.anyNation
  return {
    title: SUPPORT.title,
    lead: SUPPORT.lead,
    showing: SUPPORT.showing(name),
    pick: nation ? SUPPORT.change : SUPPORT.choose,
    nations: NATIONS,
    rows: supportList(nation, { context: 'mind' }).map((s): SupportRowModel => {
      const web = s.web ? { href: s.web, label: s.webLabel ?? 'Webchat and email' } : undefined
      if (s.sms) return { name: s.name, desc: s.desc, num: s.num, href: s.sms, a11y: `${s.name}: text ${s.num}`, web }
      if (s.tel) return { name: s.name, desc: s.desc, num: s.num, href: telHref(s.tel), a11y: `${s.name}: call ${s.num}`, numOnly: !!s.web, web }
      return { name: s.name, desc: s.desc, num: s.num || undefined, web }
    }),
    foots: [...(nation ? [] : [SUPPORT.chooseNation]), SUPPORT_MIND.notCrisis, SUPPORT_MIND.foot],
  }
}

/* ======================= Unload (B8) ======================= */

export interface UnloadForm { pairs: UnloadPair[]; ok: string; okOpen: boolean; view: 'form' | 'earlier'; moved: boolean }
export type UnloadAction =
  | { type: 'pair'; i: number; patch: Partial<UnloadPair> }
  | { type: 'add' }
  | { type: 'ok'; text: string }
  | { type: 'toggleOk' }
  | { type: 'earlier' }
  | { type: 'form' }

const blank = (): UnloadPair => ({ mind: '', next: '' })
export const unloadInitial = (): UnloadForm => ({ pairs: [blank()], ok: '', okOpen: false, view: 'form', moved: false })

export function unloadReducer(s: UnloadForm, a: UnloadAction): UnloadForm {
  switch (a.type) {
    case 'pair': return { ...s, pairs: s.pairs.map((p, j) => (j === a.i ? { ...p, ...a.patch } : p)) }
    // "Add another" stops at UNLOAD_MAX_PAIRS (the row goes)
    case 'add': return s.pairs.length < UNLOAD_MAX_PAIRS ? { ...s, pairs: [...s.pairs, blank()] } : s
    case 'ok': return { ...s, ok: a.text }
    case 'toggleOk': return { ...s, okOpen: !s.okOpen }
    // swapping views inside the open sheet doesn't slide it up again
    case 'earlier': return { ...s, view: 'earlier', moved: true }
    case 'form': return { ...s, view: 'form', moved: true }
  }
}

/** Unload's fixed words and the rows its list shows for the form state. */
export function unloadView(s: UnloadForm, notesKept: number) {
  return {
    title: UNLOAD.title,
    showEarlier: s.view === 'earlier' && notesKept > 0,
    canAdd: s.pairs.length < UNLOAD_MAX_PAIRS,
    earlierRow: notesKept > 0,
    /** the device-only foot, the not-reading line (its link opens Support) and the crisis line */
    foots: { local: UNLOAD.local, notReadLead: UNLOAD.notReadLead, notReadLink: UNLOAD.notReadLink, notCrisis: UNLOAD.notCrisis },
    deleteLabel: (day: string) => `${UNLOAD.delete}, ${day}`,
  }
}

/* ======================= Wind down (B12) ======================= */

export interface WindDownStep { key: string; name: string; sub: string; icon: string; opens: Extract<SkillId, 'reset' | 'unload'> | null }

export function windDownModel(mind: { windDownAt?: string; routine?: string[] } | undefined, declined: boolean) {
  const skill = skillById('wind-down')!
  const time = isHHMM(mind?.windDownAt) ? mind!.windDownAt : undefined
  return {
    title: skill.name,
    sub: skill.sub,
    routineLabel: WIND_DOWN.routine,
    /** "From 22:30" on the label's right, only with a time set */
    from: time ? WIND_DOWN.from(time) : null,
    time,
    steps: routineItems(mind?.routine).map((i): WindDownStep => ({ key: i.key, name: i.name, sub: routineSub(i), icon: i.icon, opens: i.skill === 'reset' || i.skill === 'unload' ? i.skill : null })),
    /** "Change your routine": the sheet, or Profile's health section while health data is declined (the routine is health data) */
    change: declined ? ('health' as const) : ('sheet' as const),
    foots: [WIND_DOWN.anyOrder, WIND_DOWN.gp],
  }
}

/** The routine sheet's rows (the ready steps) and its starting picks. */
export const routineSheetRows = (): WindDownItem[] => routineChoices()
export const routineStart = (stored: string[] | undefined): string[] => [...(stored ?? DEFAULT_ROUTINE)]
export const flipPick = (picked: string[], k: string): string[] => (picked.includes(k) ? picked.filter((x) => x !== k) : [...picked, k])

/**
 * Done: saves the picks (keys only) only when they differ from what's stored (or from the default
 * when nothing is). Cancel never calls this. Returns whether it saved; setMindPrefs refuses without
 * a current health yes.
 */
export function saveRoutine(st: Pick<StoreState, 'setMindPrefs'>, picked: string[], stored: string[] | undefined): boolean {
  const next = routineToSave(picked, stored)
  const same = JSON.stringify(next) === JSON.stringify(stored ?? DEFAULT_ROUTINE)
  return same ? false : st.setMindPrefs({ routine: next })
}

/* ======================= Your week (B4, B5.16) ======================= */

export interface ReflectionView {
  title: string
  span: string
  /** "5 check-ins this week", the one line with no label */
  count: string | null
  lines: { label: string; value: string; bands: { label: string; on: boolean }[] | null }[]
  /** B4.7 when there's no observation */
  later: string | null
  observation: WeekReflection['observation']
  /** "See your whole week", left out with Food off */
  link: string | null
}

export function reflectionView(r: WeekReflection, link: boolean): ReflectionView {
  const [first, ...rest] = reflectionLines(r)
  const count = first && !first.label ? first : null
  const lines = (count ? rest : [first, ...rest].filter(Boolean)).map((l) => ({
    label: l.label!,
    value: l.value,
    bands: l.label === MIND.sleep && r.sleep !== 'not-enough' ? SLEEP_BANDS.map((b) => ({ label: bandLabel(b), on: b === r.sleep })) : null,
  }))
  return {
    title: REFLECTION.title,
    span: reflectionSpan(r.days[0], r.days[6]),
    count: count ? count.value : null,
    lines,
    later: r.observation ? null : REFLECTION_LATER,
    observation: r.observation,
    link: link ? REFLECTION.seeWeek : null,
  }
}

/** The week card for the store's state today, or null (Mind off, the first two weeks, a signpost day). */
export function reflectionModel(st: Pick<StoreState, 'data'>, today = todayStr()): ReflectionView | null {
  const shown = reflectionFor(st, today)
  return shown ? reflectionView(shown.r, shown.link) : null
}

/** "See your whole week": Summary, today (scrolling to its This week card is N4's). */
export function openWholeWeek(st: Pick<StoreState, 'setDate' | 'setTab'>, today = todayStr()): void {
  st.setDate(today)
  st.setTab('today')
}

/* ======================= hooks (thin: the store selectors the screens read) ======================= */

export const useMindPage = (skillsOn: boolean): MindPageModel => {
  const today = todayStr()
  const checkin = useStore((s) => s.data.days[today]?.checkin)
  return mindPageModel(today, checkin, skillsOn)
}
export const useReflection = (): ReflectionView | null => reflectionModel({ data: useStore((s) => s.data) })
export const useWindDown = () => {
  const mind = useStore((s) => s.data.profile.mind)
  const declined = useStore((s) => healthDeclined(s.data))
  return windDownModel(mind, declined)
}
