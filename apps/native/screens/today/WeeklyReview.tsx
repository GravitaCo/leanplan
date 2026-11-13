/**
 * The weekly review and the maintenance loop's sheets, ported from src/screens/review/WeeklyReview.tsx
 * (boards ml-a1 to ml-d1, approved 8 Oct 2026): "Your week", "Change one thing" (ml-a5), the 4-week
 * check (ml-b1 to ml-b3), "Your range, from your logs" (ml-b4), "Keeping it steady" (ml-c3), the
 * one-time weight ask (ml-c4) and the review day and reminder (ml-d1). Every decision is core's
 * (maintenanceLoop.ts) and the words are loopCopy.ts's; the few words the web keeps inline in its
 * JSX are repeated here verbatim (to move into a shared copy file through the lead). Styles follow
 * src/styles/loop.css.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, Text, View, useColorScheme } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from '@/store/store'
import { healthLoggingAllowed } from '@/data/consent'
import { fmt, shiftDay, todayStr } from '@/core/domain/date'
import {
  adaptiveMaintenance, careWeek, learnedTarget, loopSafety, maintenanceDrift, suggestRateAdjustment, weeklyReview,
  type AdaptiveMaintenance, type DriftSuggestion, type LoopOption, type RangeChange, type RateSuggestion, type ReviewChoice,
} from '@/core/domain/maintenanceLoop'
import {
  CHECK_LEAD, CHECK_ROWS, CHECK_TITLE, CHOICE_TEXT, ENCOURAGE, GENTLE_FOOT, PATTERN_FOOT, changeOneLead, hungerWords, moodWords,
  optionText, patternText, reviewRows, sleepWords, stressWords, weightSub,
} from '@/core/domain/loopCopy'
import { latestWeight } from '@/core/domain/insights'
import { weekPicture, type MindContext, type WeekPicture } from '@/core/domain/weekPicture'
import type { IfThenPlan } from '@/core/types'
import { font, num, useTokens, type Tokens } from '../../lib/theme'
import { BareSheet, T, TIcon, type TIconName } from './ui'

/** "28 Sept to 4 Oct", or "5 to 11 Oct" within a month (the web's spanText). */
export function spanText(a: string, b: string): string {
  const d = (x: string, o: Intl.DateTimeFormatOptions) => new Date(x + 'T12:00').toLocaleDateString('en-GB', o)
  return d(a, { month: 'short' }) === d(b, { month: 'short' })
    ? `${d(a, { day: 'numeric' })} to ${d(b, { day: 'numeric', month: 'short' })}`
    : `${d(a, { day: 'numeric', month: 'short' })} to ${d(b, { day: 'numeric', month: 'short' })}`
}

const ICON: Record<'mind' | 'move' | 'food' | 'weight', TIconName> = { mind: 'heart', move: 'dumbbell', food: 'fork', weight: 'weight' }

/** loop.css's board tokens: --raised is --bg in light and --elev in dark. Inside a loop sheet the
 *  sheet is --bg in light (so its cards read as cards) and its cards go up to --elev in dark. */
function useLoop() {
  const t = useTokens()
  const dark = useColorScheme() === 'dark'
  return { t, dark, raised: dark ? t.elev : t.bg, sheetBg: dark ? t.sheet : t.bg, sheetCard: dark ? t.elev : t.card }
}

type After = { k: 'rate'; r: Extract<RateSuggestion, { kind: 'options' | 'on-pace' }> } | { k: 'drift'; r: Extract<DriftSuggestion, { kind: 'drift' }> } | { k: 'learned'; r: Extract<AdaptiveMaintenance, { kind: 'estimate' }> } | null

export function WeeklyReviewScreen({ onBack, onPlanSheet }: {
  onBack: () => void
  /** PlanEditSheet (N8): an existing plan's id to change, or '' for a new one; `then` runs when it closes */
  onPlanSheet: (id: string, then?: () => void) => void
}) {
  const { t } = useLoop()
  const insets = useSafeAreaInsets()
  const data = useStore((s) => s.data)
  const markOpened = useStore((s) => s.markReviewOpened)
  const choose = useStore((s) => s.chooseNextWeek)
  const notePattern = useStore((s) => s.notePatternShown)
  const reviewPlans = useStore((s) => s.reviewPlans)
  const setPrefs = useStore((s) => s.setPrefs)
  const applyRange = useStore((s) => s.applyRangeChange)
  const showToast = useStore((s) => s.showToast)
  const today = todayStr()
  const consent = healthLoggingAllowed(data)
  const p = data.profile
  const [lastAt] = useState(p.lastReviewAt)
  const rv = useMemo(() => weeklyReview(data, today, { healthConsent: consent, lastReviewAt: lastAt, reviewDay: p.reviewDay ?? 0, patternShown: p.patternShown }), [data, today, consent, lastAt, p.reviewDay, p.patternShown])
  const safety = loopSafety(data, latestWeight(data, today), consent)
  const [askWeight, setAskWeight] = useState(() => p.reviewWeight === undefined && !safety.quiet && !rv.welcomeBack)
  const [pick, setPick] = useState<ReviewChoice>(rv.welcomeBack ? 'pick-up' : 'keep')
  const [option, setOption] = useState<LoopOption | null>(null)
  const [changeOpen, setChangeOpen] = useState(false)
  const [after, setAfter] = useState<After>(null)
  const [offer, setOffer] = useState(false)
  const [patternLine] = useState(() => rv.pattern?.line ?? null)
  const pattern = patternLine?.code ?? null

  useEffect(() => { markOpened() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (pattern) notePattern(pattern) }, [pattern]) // eslint-disable-line react-hooks/exhaustive-deps

  const done = () => {
    const chosen = pick === 'change-one' && option ? option : undefined
    choose(pick, chosen)
    if ((chosen === 'range-less' || chosen === 'range-more') && rv.changeOne.range) applyRange(rv.changeOne.range)
    if (chosen === 'hungry-days-plan' || chosen === 'hungry-evenings-plan') { onPlanSheet('', onBack); return }
    if (chosen) showToast('Noted for next week.')
    const held = (m: MindContext) => careWeek(m) || m.wellbeing === 'flagged' || m.wellbeing === 'sometimes'
    if (!rv.welcomeBack && !held(rv.mind) && lastAt !== today) {
      const o = { healthConsent: consent }
      const weekAgo = shiftDay(today, -7)
      const lastHeld = held(weeklyReview(data, weekAgo, { healthConsent: consent }).mind)
      const rate = suggestRateAdjustment(data, today, o), rate0 = suggestRateAdjustment(data, weekAgo, o)
      if (rate.kind === 'options' && (lastHeld || !(rate0.kind === 'options' && rate0.pace === rate.pace))) return setAfter({ k: 'rate', r: rate })
      if (rate.kind === 'on-pace' && (lastHeld || rate0.kind === 'none')) return setAfter({ k: 'rate', r: rate })
      const drift = maintenanceDrift(data, today, o)
      if (drift.kind === 'drift' && (lastHeld || maintenanceDrift(data, weekAgo, o).kind !== 'drift')) return setAfter({ k: 'drift', r: drift })
      const learned = adaptiveMaintenance(data, today, o)
      if (learned.kind === 'estimate' && (lastHeld || adaptiveMaintenance(data, weekAgo, o).kind !== 'estimate') && Math.abs(learned.maint - data.target.kcal) >= 100) return setAfter({ k: 'learned', r: learned })
    }
    if (p.reviewPush === undefined) return setOffer(true)
    onBack()
  }

  const rows = reviewRows(rv)
  const plans = rv.welcomeBack ? [] : rv.mind.plansDue
  const hard = rv.encouragement === 'hard'
  const choices: { k: ReviewChoice; title: string; sub: string }[] = rv.choices.map((k) => {
    const c = k === 'ease-off' && rv.gentle ? CHOICE_TEXT['ease-off-gentle'] : k === 'change-one' && hard ? CHOICE_TEXT['change-one-hard'] : k === 'keep' && rv.encouragement === 'lighter' ? CHOICE_TEXT['keep-lighter'] : CHOICE_TEXT[k]
    return { k, title: c.title, sub: c.sub }
  })
  const card = { backgroundColor: t.card, borderRadius: 22, padding: 16 }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }} testID="weekly-review">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        {/* .rv-top */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44, marginTop: insets.top + 10 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} hitSlop={4}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.card, alignItems: 'center', justifyContent: 'center' }}>
            <TIcon name="chevL" size={18} stroke={2.4} color={t.label} />
          </Pressable>
          <T s={13} c={t.label2}>{rv.welcomeBack ? 'This week so far' : spanText(rv.week.from, rv.week.to)}</T>
        </View>
        <Text accessibilityRole="header" style={[font(600), { fontSize: 34, lineHeight: 40, letterSpacing: -0.85, color: t.label, marginTop: 14, marginHorizontal: 4 }]}>{rv.welcomeBack ? 'Welcome back' : 'Your week'}</Text>
        {rv.welcomeBack
          ? <T s={17} c={t.label2} style={{ lineHeight: 25, marginTop: 6, marginHorizontal: 4 }}>Nothing to catch up on. Here’s where things are now.</T>
          : <T s={15} c={t.label2} style={{ marginTop: 2, marginHorizontal: 4 }}>A two-minute look back</T>}

        <View style={{ paddingTop: 18, gap: 14 }}>
          {(rows.length > 0 || !rv.welcomeBack) && (
            <View accessibilityLabel="What you did" style={[card, { paddingBottom: 6 }]}>
              <T w={600} s={17}>{rv.welcomeBack && rv.since ? `What you did since ${new Date(rv.since + 'T12:00').toLocaleDateString('en-GB', { weekday: 'long' })}` : 'What you did'}</T>
              <T s={15} c={t.label2} style={{ lineHeight: 22, marginTop: 4, marginBottom: 6 }}>{ENCOURAGE[rv.encouragement]}</T>
              {rows.map((r) => (
                <View key={r.pillar} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 12, borderTopWidth: 1, borderTopColor: t.sep }}>
                  <Sq t={t} pillar={r.pillar}><TIcon name={ICON[r.pillar]} size={18} color={sqInk(t, r.pillar)} /></Sq>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T w={600} s={17} style={[num, { lineHeight: 22 }]}>{r.title}</T>
                    {r.sub && <T s={14} c={t.label2} style={[num, { lineHeight: 20, marginTop: 2 }]}>{r.sub}</T>}
                  </View>
                </View>
              ))}
              {rv.gentle && <T s={12} c={t.label2} style={{ lineHeight: 18, borderTopWidth: 1, borderTopColor: t.sep, paddingVertical: 10 }}>{GENTLE_FOOT}</T>}
            </View>
          )}

          {patternLine && (
            <View accessibilityLabel="Something in your data" style={[card, { flexDirection: 'row', gap: 14 }]}>
              <Sq t={t} pillar="mind"><TIcon name="trend" size={18} color={t.mind} /></Sq>
              <View style={{ flex: 1 }}>
                <T w={600} s={13} c={t.mindInk}>Something in your data</T>
                <T s={15} style={{ lineHeight: 22, marginTop: 2 }}>{patternText(patternLine.code, rv.gentle)}</T>
                <T s={13} c={t.label2} style={{ marginTop: 4 }}>{PATTERN_FOOT}</T>
              </View>
            </View>
          )}

          {rv.why.length > 0 && !rv.welcomeBack && !hard && (
            <View accessibilityLabel="Why this matters to you" style={[card, { gap: 8 }]}>
              <T w={600} s={13} c={t.label2}>Why this matters to you</T>
              {rv.why.map((w) => <T key={w} s={17} style={{ lineHeight: 24 }}>“{w}”</T>)}
            </View>
          )}

          {plans.map((pl) => <PlanCard key={pl.id} plan={pl} onAnswer={(r) => reviewPlans({ [pl.id]: r })} onChange={() => onPlanSheet(pl.id)} />)}

          {/* .rv-next */}
          <View style={{ gap: 10 }}>
            <T w={600} s={22} style={{ marginTop: 6, marginHorizontal: 4 }}>For next week</T>
            <View accessibilityRole="radiogroup" accessibilityLabel="For next week" style={{ backgroundColor: t.card, borderRadius: 22, overflow: 'hidden' }}>
              {choices.map((c, i) => {
                const on = pick === c.k
                return (
                  <Pressable key={c.k} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setPick(c.k)}
                    style={{ gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderTopColor: t.sep, backgroundColor: on ? t.tintSoft : undefined }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <T w={600} s={17}>{c.title}</T>
                        <T s={13} c={t.label2} style={{ lineHeight: 18, marginTop: 2 }}>{c.sub}</T>
                      </View>
                      <Dot on={on} />
                    </View>
                    {pick === 'change-one' && c.k === 'change-one' && (rv.changeOne.ctx === 'gentle'
                      ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                          {rv.changeOne.options.map((o) => (
                            <Pressable key={o} accessibilityRole="button" accessibilityState={{ selected: option === o }} onPress={() => setOption(o)} hitSlop={{ top: 4, bottom: 4 }}
                              style={{ height: 36, paddingHorizontal: 14, borderRadius: 18, justifyContent: 'center', backgroundColor: t.card, borderWidth: option === o ? 1.5 : 0, borderColor: t.label }}>
                              <Text style={[font(option === o ? 600 : 500), { fontSize: 14, color: t.label }]}>{optionText(o, null).title}</Text>
                            </Pressable>
                          ))}
                        </View>
                      : <Pressable accessibilityRole="button" onPress={() => setChangeOpen(true)} style={{ alignSelf: 'flex-start' }}>
                          <Text style={[font(500), { fontSize: 15, color: t.tint }]}>{option ? optionText(option, rv.changeOne.range).title : 'See the options'}</Text>
                        </Pressable>)}
                  </Pressable>
                )
              })}
            </View>
            <PillBtn kind="done" title="Done" onPress={done} />
          </View>
        </View>
      </ScrollView>

      {askWeight && <WeightAskSheet onAnswer={(on) => { setPrefs({ reviewWeight: on }); setAskWeight(false) }} />}
      {changeOpen && (
        <ChangeOneSheet mind={rv.mind} ctx={rv.changeOne.ctx} options={rv.changeOne.options} range={rv.changeOne.range} value={option}
          onClose={() => setChangeOpen(false)} onPick={(o) => { setOption(o); setChangeOpen(false) }} />
      )}
      {after?.k === 'rate' && <CheckSheet r={after.r} onClose={onBack} />}
      {after?.k === 'drift' && <DriftSheet r={after.r} onClose={onBack} />}
      {after?.k === 'learned' && <LearnedSheet r={after.r} onClose={onBack} />}
      {offer && <ReviewDaySheet onClose={() => { if (useStore.getState().data.profile.reviewPush === undefined) setPrefs({ reviewPush: false }); onBack() }} />}
    </View>
  )
}

const sqInk = (t: Tokens, k: 'mind' | 'move' | 'food' | 'weight') => (k === 'mind' ? t.mind : k === 'move' ? t.move : t.foodInk)

/** `.rv-sq` */
function Sq({ t, pillar, children }: { t: Tokens; pillar: 'mind' | 'move' | 'food' | 'weight'; children: ReactNode }) {
  const bg = pillar === 'mind' ? t.mindFill : pillar === 'move' ? t.moveFill : t.foodFill
  return <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
}

/** `.rv-dot` */
function Dot({ on }: { on: boolean }) {
  const t = useTokens()
  return (
    <View style={[{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, on ? { backgroundColor: t.tint } : { borderWidth: 1.5, borderColor: t.dash }]}>
      {on && <TIcon name="check" size={12} stroke={3.4} color={t.onTint} />}
    </View>
  )
}

/** `.rv-done` (ink) and `.rv-keep` (raised, with a hairline); `sm` is 48 tall. */
function PillBtn({ kind, title, onPress, sm, disabled }: { kind: 'done' | 'keep'; title: string; onPress: () => void; sm?: boolean; disabled?: boolean }) {
  const { t, raised } = useLoop()
  const h = sm ? 48 : 52
  const keepBg = raised
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [{ height: h, borderRadius: h / 2, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
        kind === 'done' ? { backgroundColor: t.btn, marginTop: 4 } : { backgroundColor: keepBg, borderWidth: 1, borderColor: t.sep }]}>
      <Text style={[font(600), { fontSize: 17, color: kind === 'done' ? t.btnInk : t.label }]}>{title}</Text>
    </Pressable>
  )
}

/** `.rv-pill` (36 tall, 44 touch) */
function Pill({ title, on, onPress, bg }: { title: string; on?: boolean; onPress?: () => void; bg: string }) {
  const t = useTokens()
  const s = { height: 36, paddingHorizontal: 14, borderRadius: 18, justifyContent: 'center' as const, backgroundColor: bg, borderWidth: on ? 1.5 : 0, borderColor: t.label }
  const label = <Text style={[font(600), { fontSize: 14, color: t.label }]}>{title}</Text>
  return onPress
    ? <Pressable accessibilityRole="button" accessibilityState={{ selected: !!on }} onPress={onPress} hitSlop={{ top: 4, bottom: 4 }} style={s}>{label}</Pressable>
    : <View accessibilityLiveRegion="polite" style={s}>{label}</View>
}

/** ml-a1 "Your plan": the if-then plan due a check-in, answered in one tap. */
function PlanCard({ plan, onAnswer, onChange }: { plan: IfThenPlan; onAnswer: (r: 'worked' | 'no') => void; onChange: () => void }) {
  const { t, raised } = useLoop()
  const [said, setSaid] = useState<'worked' | 'no' | null>(null)
  const answer = (r: 'worked' | 'no') => { setSaid(r); onAnswer(r) }
  return (
    <View accessibilityLabel="Your plan" style={{ backgroundColor: t.card, borderRadius: 22, padding: 16, gap: 10 }}>
      <T w={600} s={13} c={t.mindInk}>Your plan</T>
      <T s={15} style={{ lineHeight: 22 }}>If {plan.when.replace(/^when\s+/i, '')}, then I’ll {plan.then.replace(/\.$/, '')}.</T>
      <T s={13} c={t.label2}>How did it go this week?</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pill title="It helped" on={said === 'worked'} onPress={() => answer('worked')} bg={raised} />
        <Pill title="Not really" on={said === 'no'} onPress={() => answer('no')} bg={raised} />
        <Pill title="Change it" onPress={onChange} bg={raised} />
      </View>
    </View>
  )
}

/* ---------------- sheets ---------------- */

function LoopSheet({ label, children, onClose }: { label: string; children: ReactNode; onClose: () => void }) {
  const { sheetBg } = useLoop()
  return <BareSheet label={label} onClose={onClose} bg={sheetBg}><View style={{ gap: 14, paddingBottom: 18 }}>{children}</View></BareSheet>
}

function SheetHead({ title, close, onClose }: { title: string; close?: string; onClose?: () => void }) {
  const t = useTokens()
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
      <Text accessibilityRole="header" style={[font(600), { fontSize: 22, color: t.label, flex: 1 }]}>{title}</Text>
      {close && onClose && <Pressable accessibilityRole="button" onPress={onClose} hitSlop={10}><Text style={[font(400), { fontSize: 16, color: t.tint }]}>{close}</Text></Pressable>}
    </View>
  )
}

function Lead({ children }: { children: ReactNode }) {
  const t = useTokens()
  return <T s={15} c={t.label2} style={{ lineHeight: 22 }}>{children}</T>
}

/** `.rv-radios` inside a loop sheet (`.lp .rv-radio`: a row) */
function Radios({ label, children }: { label: string; children: ReactNode }) {
  const { sheetCard } = useLoop()
  return <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ backgroundColor: sheetCard, borderRadius: 22, overflow: 'hidden' }}>{children}</View>
}

function OptionRow({ o, range, on, onPick, long, drift, first }: { o: LoopOption; range: RangeChange | null; on: boolean; onPick: () => void; long?: boolean; drift?: boolean; first?: boolean }) {
  const t = useTokens()
  const x = optionText(o, range, { long, drift })
  const tone = x.tag === 'Move' ? t.moveInk : x.tag === 'Food' ? t.foodInk : x.tag === 'Your range' ? t.label2 : t.mindInk
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={onPick}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 16, borderTopWidth: first ? 0 : 1, borderTopColor: t.sep, backgroundColor: on ? t.tintSoft : undefined }}>
      <View style={{ flex: 1 }}>
        <T w={600} s={12} c={tone}>{x.tag}</T>
        <T w={600} s={17}>{x.title}</T>
        {x.sub && <T s={13} c={t.label2} style={[num, { lineHeight: 18, marginTop: 2 }]}>{x.sub}</T>}
      </View>
      <Dot on={on} />
    </Pressable>
  )
}

function Note({ children }: { children: string }) {
  const t = useTokens()
  return <T s={13} c={t.label2} style={{ textAlign: 'center' }}>{children}</T>
}

/** ml-a5 */
function ChangeOneSheet({ mind, ctx, options, range, value, onClose, onPick }: {
  mind: MindContext; ctx: 'calm' | 'hard' | 'gentle' | 'drift'; options: LoopOption[]; range: RangeChange | null; value: LoopOption | null
  onClose: () => void; onPick: (o: LoopOption) => void
}) {
  const [o, setO] = useState<LoopOption | null>(value ?? options[0] ?? null)
  return (
    <LoopSheet label="Change one thing" onClose={onClose}>
      <SheetHead title="Change one thing" close="Cancel" onClose={onClose} />
      <Lead>{changeOneLead(ctx, mind)}</Lead>
      <Radios label="Change one thing">
        {options.map((x, i) => <OptionRow key={x} first={i === 0} o={x} range={range} on={o === x} onPick={() => setO(x)} long />)}
      </Radios>
      <PillBtn kind="done" title="Try this next week" onPress={() => { if (o) onPick(o) }} disabled={!o} />
    </LoopSheet>
  )
}

/** The mind, move and food rows for the check sheets (`.lp-card`, `.lp-r`). */
function SideBySide({ week, span, cap, weight, food, sleepHunger }: { week: WeekPicture; span?: WeekPicture; cap: string; weight?: ReactNode; food?: ReactNode; sleepHunger?: boolean }) {
  const { t, sheetCard } = useLoop()
  const m = week.mind
  const quietOk = useStore((s) => !loopSafety(s.data, null, healthLoggingAllowed(s.data)).quiet)
  const rows: [string, 'mind' | 'move' | 'food', ReactNode][] = []
  const add = (l: string, k: 'mind' | 'move' | 'food', v: ReactNode | null) => { if (v) rows.push([l, k, v]) }
  const lw = (x: string | null) => (x && span && /\d+ days$/.test(x) ? x + ' last week' : x)
  const b = (s: ReactNode) => <Text style={font(600)}>{s}</Text>
  add('Sleep', 'mind', lw(sleepWords(m)))
  add('Stress', 'mind', lw(stressWords(m)))
  add('Mood', 'mind', moodWords(m))
  add('Hunger', 'mind', hungerWords(m, !!sleepHunger))
  const mv = (span ?? week).move, fd = (span ?? week).food
  const sess = mv.sessions - mv.walks
  add('Move', 'move', sess ? <>{b(`${sess} ${sess === 1 ? 'session' : 'sessions'}`)} done{mv.walks ? ', plus walks' : ''}</> : mv.walks ? b(`${mv.walks} ${mv.walks === 1 ? 'walk' : 'walks'}`) : null)
  add('Food', 'food', food ?? (fd.loggedDays && quietOk ? <>Averaged {b(`${fmt(Math.round((fd.avgKcal ?? 0) / 10) * 10)} kcal`)}{fd.inRangeDays ? `, with ${fd.inRangeDays} ${fd.inRangeDays === 1 ? 'day' : 'days'} in your range` : null}</> : null))
  const tone = { mind: t.mindInk, move: t.moveInk, food: t.foodInk }
  const row = (l: string, k: 'mind' | 'move' | 'food', v: ReactNode) => (
    <View key={l} style={{ flexDirection: 'row', gap: 10, paddingVertical: 9, borderTopWidth: 1, borderTopColor: t.sep }}>
      <Text style={[font(600), { width: 64, fontSize: 13, lineHeight: 20, color: tone[k] }]}>{l}</Text>
      <Text style={[font(400), num, { flex: 1, fontSize: 14, lineHeight: 20, color: t.label }]}>{v}</Text>
    </View>
  )
  return (
    <View accessibilityLabel={`${cap}, all together`} style={{ backgroundColor: sheetCard, borderRadius: 22, paddingTop: 6, paddingHorizontal: 16, paddingBottom: 8 }}>
      <T s={13} c={t.label2} style={{ paddingTop: 6, paddingBottom: 8 }}>{cap}</T>
      {rows.map(([l, k, v]) => row(l, k, v))}
      {weight && row('Weight', 'food', weight)}
    </View>
  )
}

/** ml-b1 to ml-b3 */
function CheckSheet({ r, onClose }: { r: Extract<RateSuggestion, { kind: 'options' | 'on-pace' }>; onClose: () => void }) {
  const { t, sheetCard } = useLoop()
  const [o, setO] = useState<LoopOption | null>(null)
  const applyRange = useStore((s) => s.applyRangeChange)
  const choose = useStore((s) => s.chooseNextWeek)
  const n = r.trend.n
  const pace = r.kind === 'on-pace' ? 'in-line' : r.pace
  const weight = <>Weighed in {n} times. {weightSub({ weighIns: n, words: { kind: 'pace', pace }, weeks: Math.round(r.trend.windowDays / 7) }, false)}</>
  const pickIt = (x: LoopOption) => {
    setO(x)
    if (r.kind === 'options' && (x === 'range-less' || x === 'range-more') && r.range) applyRange(r.range)
    choose('change-one', x)
    onClose()
  }
  return (
    <LoopSheet label={CHECK_TITLE} onClose={onClose}>
      <SheetHead title={CHECK_TITLE} close="Close" onClose={onClose} />
      {r.kind === 'on-pace' ? (
        <View style={{ backgroundColor: sheetCard, borderRadius: 22, padding: 16, flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.foodFill, alignItems: 'center', justifyContent: 'center' }}><TIcon name="check" size={16} stroke={3} color={t.foodInk} /></View>
          <T s={17} style={{ flex: 1, lineHeight: 25 }}>No change needed. Four weeks in line with your pace, so we’ll keep things as they are.</T>
        </View>
      ) : <Lead>{CHECK_LEAD}</Lead>}
      <SideBySide week={r.week} span={r.span} cap={CHECK_ROWS} weight={weight} />
      {r.kind === 'options' && r.ctx === 'hard' && <T s={15} style={{ backgroundColor: sheetCard, borderRadius: 22, paddingVertical: 14, paddingHorizontal: 16, lineHeight: 22, overflow: 'hidden' }}>After a week like this one, the sleep and stress options come first.</T>}
      {r.kind === 'options' ? (
        <>
          <Radios label="Options">
            {r.options.map((x, i) => <OptionRow key={x} first={i === 0} o={x} range={r.range} on={o === x} onPick={() => pickIt(x)} />)}
          </Radios>
          <PillBtn kind="keep" title="Keep things as they are" onPress={() => { choose('keep'); onClose() }} />
          <Note>Nothing changes unless you choose it.</Note>
        </>
      ) : <PillBtn kind="done" title="Good, carry on" onPress={onClose} />}
    </LoopSheet>
  )
}

/** ml-c3 */
function DriftSheet({ r, onClose }: { r: Extract<DriftSuggestion, { kind: 'drift' }>; onClose: () => void }) {
  const { t, sheetCard } = useLoop()
  const [o, setO] = useState<LoopOption | null>(null)
  const applyRange = useStore((s) => s.applyRangeChange)
  const setStart = useStore((s) => s.setSteadyStart)
  const choose = useStore((s) => s.chooseNextWeek)
  const pickIt = (x: LoopOption) => {
    setO(x)
    if ((x === 'range-less' || x === 'range-more') && r.range) applyRange(r.range)
    if (x === 'new-start') setStart(r.check.trend.level)
    choose('change-one', x)
    onClose()
  }
  return (
    <LoopSheet label="Keeping it steady" onClose={onClose}>
      <SheetHead title="Keeping it steady" close="Close" onClose={onClose} />
      <Lead>Your weigh-ins have sat a little {r.side} your steady range for 2 weeks. That’s common, and there are a few ways to steer it.</Lead>
      <View accessibilityLabel="Weight" style={{ backgroundColor: sheetCard, borderRadius: 22, paddingTop: 6, paddingHorizontal: 16, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 9, borderTopWidth: 1, borderTopColor: t.sep }}>
          <Text style={[font(600), { width: 64, fontSize: 13, lineHeight: 20, color: t.foodInk }]}>Weight</Text>
          <Text style={[font(400), { flex: 1, fontSize: 14, lineHeight: 20, color: t.label }]}>Weighed in {r.weighIns} times over 2 weeks.</Text>
        </View>
      </View>
      <SideBySide week={r.week} cap="The last 2 weeks" />
      <Radios label="Options">
        {r.options.map((x, i) => <OptionRow key={x} first={i === 0} o={x} range={r.range} on={o === x} onPick={() => pickIt(x)} drift />)}
      </Radios>
      <PillBtn kind="keep" title="Keep things as they are" onPress={() => { choose('keep'); onClose() }} />
      <Note>Nothing changes unless you choose it.</Note>
    </LoopSheet>
  )
}

/** ml-b4 */
function LearnedSheet({ r, onClose }: { r: Extract<AdaptiveMaintenance, { kind: 'estimate' }>; onClose: () => void }) {
  const { t, dark, sheetCard } = useLoop()
  const data = useStore((s) => s.data)
  const save = useStore((s) => s.saveTargets)
  const today = todayStr()
  const [w, setW] = useState(0)
  const lo = Math.min(r.lo, r.start.lo), hi = Math.max(r.hi, r.start.hi)
  const x = (v: number) => ((v - lo) / (hi - lo)) * w
  const span = weekPicture(data, r.from, shiftDay(today, -1), today)
  const week = weekPicture(data, shiftDay(today, -7), shiftDay(today, -1), today)
  const next = learnedTarget(data, r, latestWeight(data, today) ?? 0)
  const use = () => {
    if (!next) return
    save(next.target)
    onClose()
  }
  const ticks = [...new Set([r.start.lo, r.lo, r.hi, r.start.hi])].sort((a, b) => a - b)
  return (
    <LoopSheet label="Your range, from your logs" onClose={onClose}>
      <SheetHead title="Your range, from your logs" close="Close" onClose={onClose} />
      <View style={{ backgroundColor: sheetCard, borderRadius: 22, padding: 16 }}>
        <T s={13} c={t.label2}>What your logs say keeps you steady</T>
        <Text style={[font(600), num, { fontSize: 34, letterSpacing: -0.7, color: t.label, marginTop: 2 }]}>{fmt(r.lo)} to {fmt(r.hi)} <Text style={[font(500), { fontSize: 17, color: t.label2 }]}>kcal a day</Text></Text>
        <View importantForAccessibility="no-hide-descendants" onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: 34, marginTop: 14, marginBottom: 8 }}>
          {w > 0 && <>
            <View style={{ position: 'absolute', top: 6, height: 10, borderRadius: 5, left: x(r.start.lo), width: x(r.start.hi) - x(r.start.lo), backgroundColor: dark ? t.fill : t.fill2 }} />
            <View style={{ position: 'absolute', top: 6, height: 10, borderRadius: 5, left: x(r.lo), width: x(r.hi) - x(r.lo), backgroundColor: dark ? t.label2 : t.band }} />
            {ticks.map((v, i) => (
              <Text key={v} onLayout={undefined} style={[font(400), num, { position: 'absolute', top: 20, fontSize: 11, color: t.label2, width: 60,
                left: i === 0 ? x(v) : i === ticks.length - 1 ? x(v) - 60 : x(v) - 30, textAlign: i === 0 ? 'left' : i === ticks.length - 1 ? 'right' : 'center' }]}>{fmt(v)}</Text>
            ))}
          </>}
        </View>
        <T s={14} c={t.label2} style={[num, { lineHeight: 20 }]}>Narrower than the starting estimate of {fmt(r.start.lo)} to {fmt(r.start.hi)}, which came from your answers. It’s what keeps you steady going by what you log, so it works as a target even if some things go unlogged.</T>
        {next?.floored && <T s={14} c={t.label2} style={{ lineHeight: 20 }}>Tilo keeps your target at a safe minimum, so it starts a little higher than this.</T>}
      </View>
      <SideBySide week={week} span={span} cap={`Based on the last ${Math.round(r.days / 7)} weeks`}
        food={<><Text style={font(600)}>{r.loggedDays} complete days</Text> logged, averaging {fmt(r.avgKcal)} kcal</>}
        weight={<Text style={font(600)}>{r.weighIns} weigh-ins</Text>} />
      {next ? (
        <>
          <PillBtn kind="done" title="Use this range" onPress={use} />
          <PillBtn kind="keep" title="Keep my current range" onPress={onClose} />
        </>
      ) : <PillBtn kind="done" title="Good to know" onPress={onClose} />}
    </LoopSheet>
  )
}

const CHIPS = ['Sleep', 'Stress', 'Mood', 'Hunger', 'Movement', 'Food', 'Weight']
function ChipsRow() {
  const { t, sheetCard } = useLoop()
  return (
    <View importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {CHIPS.map((c) => <Text key={c} style={[font(600), { fontSize: 13, color: t.label, paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999, backgroundColor: sheetCard, overflow: 'hidden' }]}>{c}</Text>)}
    </View>
  )
}

/** ml-c4: the one-time ask. Two equal choices; closing it leaves weight out. */
function WeightAskSheet({ onAnswer }: { onAnswer: (on: boolean) => void }) {
  return (
    <LoopSheet label="Include your weight in reviews?" onClose={() => onAnswer(false)}>
      <SheetHead title="Include your weight in reviews?" />
      <Lead>It’s up to you. If you turn it on, your review shows how often you weighed in and, after 4 weeks, how things are going in words. Never a chart or a week-to-week number. You can change this any time.</Lead>
      <ChipsRow />
      <PillBtn kind="done" title="Include it" onPress={() => onAnswer(true)} />
      <PillBtn kind="keep" title="Leave it out" onPress={() => onAnswer(false)} />
    </LoopSheet>
  )
}

const DAYS: [number, string, string][] = [[1, 'M', 'Monday'], [2, 'T', 'Tuesday'], [3, 'W', 'Wednesday'], [4, 'T', 'Thursday'], [5, 'F', 'Friday'], [6, 'S', 'Saturday'], [0, 'S', 'Sunday']]
export const dayName = (d: number) => DAYS.find((x) => x[0] === d)![2]

/** ml-d1: the review day, and the opt-in reminder (off unless the person says "Remind me"). */
export function ReviewDaySheet({ onClose }: { onClose: () => void }) {
  const { t, dark, sheetCard } = useLoop()
  const day = useStore((s) => s.data.profile.reviewDay ?? 0)
  const push = useStore((s) => s.data.profile.reviewPush)
  const time = useStore((s) => s.data.profile.reviewPushTime ?? '09:00')
  const setPrefs = useStore((s) => s.setPrefs)
  const setReviewPush = useStore((s) => s.setReviewPush)
  const showToast = useStore((s) => s.showToast)
  const remind = async () => {
    const ok = await setReviewPush(true)
    showToast(ok ? 'Weekly reminder on' : typeof Notification !== 'undefined' && Notification.permission === 'denied' ? 'Notifications are off for Tilo in your settings' : 'Couldn’t turn the reminder on. Try again when you’re online')
  }
  const sec = { backgroundColor: sheetCard, borderRadius: 22, padding: 16, gap: 10 }
  const d = (s: string) => <T s={13} c={t.label2} style={{ lineHeight: 19 }}>{s}</T>
  return (
    <LoopSheet label="Your weekly review" onClose={onClose}>
      <SheetHead title="Your weekly review" close="Done" onClose={onClose} />
      <Lead>A two-minute look back at your week, with everything side by side.</Lead>
      <ChipsRow />
      <View style={sec}>
        <T w={600} s={17}>Which day suits you?</T>
        <View accessibilityRole="radiogroup" accessibilityLabel="Which day suits you?" style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>
          {DAYS.map(([n, s, full]) => {
            const on = day === n
            return (
              <Pressable key={n} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={full} onPress={() => setPrefs({ reviewDay: n })}
                style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.tint : dark ? t.fill2 : t.card }}>
                <Text style={[font(600), { fontSize: 15, color: on ? t.onTint : t.label }]}>{s}</Text>
              </Pressable>
            )
          })}
        </View>
        {d(`It’ll be waiting on Summary from ${dayName(day)} morning. No pressure to open it that day.`)}
      </View>
      <View style={sec}>
        <T w={600} s={17}>Want a reminder for your weekly review?</T>
        {d(`One note on ${dayName(day)}, nothing else.`)}
        {push
          ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Pill title="Reminder on" on bg={dark ? t.elev : t.bg} /><Pill title="Turn it off" onPress={() => setReviewPush(false)} bg={dark ? t.elev : t.bg} /></View>
          : <>
              <PillBtn kind="done" sm title="Remind me" onPress={remind} />
              <PillBtn kind="keep" sm title="No thanks" onPress={() => { if (push === undefined) setPrefs({ reviewPush: false }); onClose() }} />
            </>}
        {d(`Once a week on ${dayName(day)} at ${time} UK time. It only says “Your week is ready”, nothing from your log. Turn it off any time in Profile.`)}
      </View>
    </LoopSheet>
  )
}
