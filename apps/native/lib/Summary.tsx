/**
 * Summary, rebuilt from src/screens/TodayScreen.tsx (N4 Today): the same store, the same core
 * functions, the same decisions and words, so what shows equals the web for the same data. The
 * pillars in order: Mind (the wellbeing Mind card, or the check-in row with the flag off), the
 * low-mood signpost, the weekly review card and its reminder ask, the one banner slot (welcome
 * back, the activity suggestion, the range note), the plans banner, Food (three food views), the
 * quick checks, the usuals (with "Same as yesterday" on a hard day), Move and Weight, supplements,
 * and This week. What is asked of the person goes through the asks budget (core/domain/asks), one
 * sheet at a time, in the web's order. Sheets other streams own open their stand-ins (links.ts).
 */
import { useEffect, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { selectAskCtx, useStore } from '@/store/store'
import { canSaveHealthAnswers, healthDeclined, healthLoggingAllowed, quietNumbers } from '@/data/consent'
import { plannedKeys } from '@/core/domain/plans'
import { keyTitle, templateFor } from '@/core/domain/routines'
import { dayMonthOf, fmt, fmtDate, r1, shiftDay, todayStr } from '@/core/domain/date'
import { dayTotals } from '@/core/domain/nutrition'
import { activitySuggestion, markActivityShown } from '@/core/domain/activity'
import { builtinType, workoutsOf } from '@/core/domain/sessions'
import { ACTIVITY } from '@/core/data/constants'
import { CAPTURE_LABEL, dayMargin, entryErr, flaggedEntries, portionText } from '@/core/domain/estimate'
import {
  HUNGER, MEAL_LABEL, MOODS, dayOf, dayStat, energyStatus, ifThenOfferDue, mealNow, plansDue, latestWeight, rangeExtra, rangeFor, showBurnNote,
  sameAsYesterdayRow, usualEntries, usuals, weekOf, weekSummary,
} from '@/core/domain/insights'
import { careWeek, loopSafety, nextReviewDay, reminderAskDue, reminderLapsed, reviewDayOn, reviewWaiting, weightRow } from '@/core/domain/maintenanceLoop'
import { dayPictures, mindContext } from '@/core/domain/weekPicture'
import { weightTileWords } from '@/core/domain/loopCopy'
import { foodAskDue, foodView, mealWords, proteinRangeFor } from '@/core/domain/foodMode'
import { medicalReaskDue, pregnancyReaskDue } from '@/core/domain/onboarding'
import { pickAsks, type AskId } from '@/core/domain/asks'
import { thingOptions } from '@/core/domain/mind'
import { offerLighter } from '@/core/domain/dayOptions'
import { thingByKey } from '@/core/data/skills'
import { lowMoodShownOn, medicalReasked } from '@/data/deviceOnly'
import { MIND_REVIEWED, WELLBEING_ENABLED } from '@/data/wellbeingFlag'
import { ONBOARDING_ENABLED } from '@/data/onboardingFlag'
import { BANNER_ASK, checkedIn, pillarsOn, summaryDue } from '@/screens/today/summary'
import { LIGHTER_CHOICES, SAME_AS_YESTERDAY } from '@/copy/summary'
import { useLowMoodSignpost } from '@/screens/today/lowMoodSignpost'
import { FOOD9 } from '@/copy/onboardingApp'
import { Banner, Btn, Card, Chip, Chips, LinkBtn, List, Tile } from './ui/kit'
import { CatHead, PageHeader, Row } from './ui/primitives'
import { Foot, Lbl } from './ui/text'
import { Chevron, Icon } from './ui/icons'
import { KcalBar, MacroTrio, WeekBars } from './ui/charts'
import { WeekStrip } from './ui/WeekStrip'
import { BTN, font, num, tx, useTokens } from './theme'
import { MindCard } from '../screens/today/MindCard'
import { LowMoodBanner } from '../screens/today/LowMoodBanner'
import { CheckinSheet } from '../screens/today/CheckinSheet'
import { WeightSheet } from '../screens/today/WeightSheet'
import { FoodAskSheet, MedicalSheet, PregnancyCheckSheet } from '../screens/today/AskSheets'
import { WeeklyReviewScreen } from '../screens/today/WeeklyReview'
import { notYet } from '../screens/today/links'
import { openSupportStandIn } from '../screens/today/supportStandIn'

/** Plan's FirstPlanSheet (N8) is in the native app: flips with its swap. */
const FIRST_PLAN_SHEET = false

type SheetKind = { k: 'weight' } | { k: 'checkin' } | null

const kgOf = (s: { days: Record<string, { weight: number | null }> }, d: string | undefined) => (d ? s.days[d]?.weight ?? null : null)

/** "22–28 Sept", or "29 Sept – 5 Oct" across a month end (as TodayScreen's weekSpan). */
function weekSpan(a: string, b: string): string {
  const d = (x: string, o: Intl.DateTimeFormatOptions) => new Date(x + 'T12:00').toLocaleDateString('en-GB', o)
  return d(a, { month: 'short' }) === d(b, { month: 'short' })
    ? `${d(a, { day: 'numeric' })}–${d(b, { day: 'numeric', month: 'short' })}`
    : `${d(a, { day: 'numeric', month: 'short' })} – ${d(b, { day: 'numeric', month: 'short' })}`
}

// cross-stream sheets (stand-ins until their streams land; native-build-plan §2)
const openAddFood = () => notYet('Add food', 'Food')
const openEditEntry = () => notYet('Adjust this entry', 'Food')
const openMargin = () => notYet('About this estimate', 'Food')
const openPlanReview = () => notYet('How are your plans going?', 'Plan')
const openSupport = openSupportStandIn

export function Summary() {
  const reviewOpen = useStore((s) => s.reviewOpen)
  const closeReview = useStore((s) => s.closeReview)
  if (reviewOpen) {
    return (
      <WeeklyReviewScreen onBack={closeReview} onPlanSheet={(_id, then) => { notYet('Your plan', 'Plan'); then?.() }} />
    )
  }
  return <SummaryPage />
}

function SummaryPage() {
  const t = useTokens()
  const data = useStore((s) => s.data)
  const cur = useStore((s) => s.cur)
  const toggleSupp = useStore((s) => s.toggleSupp)
  const logEntries = useStore((s) => s.logEntries)
  const setPrefs = useStore((s) => s.setPrefs)
  const showToast = useStore((s) => s.showToast)
  const [sheet, setSheet] = useState<SheetKind>(null)
  const openReview = useStore((s) => s.openReview)
  const [dismissedMissed, setDismissedMissed] = useState(false)
  // ob7-3: the 12-week "Does this still apply?", once when it's due, never blocking
  const reaskDue = useStore((s) => ONBOARDING_ENABLED && pregnancyReaskDue(s.data.profile.pregnancy, todayStr()))
  const [reask, setReask] = useState(false)
  const medReaskDue = useStore((s) => ONBOARDING_ENABLED && canSaveHealthAnswers(s.data) && medicalReaskDue(s.data.profile, medicalReasked(s.data)))
  const markMedicalReasked = useStore((s) => s.markMedicalReasked)
  const [medReask, setMedReask] = useState(false)
  // ob5-4: "Plan when you'll do it", once, after the first workout
  // the offer's sheet is Plan's (FirstPlanSheet, N8): until it lands the offer isn't due on native,
  // so it is never shown or marked as made by a stand-in (mental-performance)
  const ifThenDue = useStore((s) => FIRST_PLAN_SHEET && ONBOARDING_ENABLED && s.cur === todayStr() && ifThenOfferDue(s.data))
  const [ifThen, setIfThen] = useState(false)
  // Onboarding 9: the one in-app ask (never a push)
  const foodAsk0 = useStore((s) => (!ONBOARDING_ENABLED || s.cur !== todayStr() ? null : foodAskDue(s.data.profile, todayStr(), canSaveHealthAnswers(s.data))))
  const [foodAsk, setFoodAsk] = useState<'today' | 'range' | null>(null)
  const openMind = useStore((s) => s.openMind)
  const openTrain = useStore((s) => s.openTrain)
  const openProfile = useStore((s) => s.openProfile)
  const setTab = useStore((s) => s.setTab)
  const noteActivityShown = useStore((s) => s.noteActivityShown)
  const markLowMoodShown = useStore((s) => s.markLowMoodShown)
  const repeatYesterday = useStore((s) => s.repeatYesterday)
  const keepReviewPush = useStore((s) => s.keepReviewPush)
  const setReviewPush = useStore((s) => s.setReviewPush)

  const p = data.profile
  const fv = foodView(p)
  const quiet = quietNumbers(data)
  const gentle = quiet || !fv.todayNumbers
  const yes = fv.mode === 'yes'
  const some = fv.mode === 'sometimes'
  const day = dayOf(data, cur)
  const tot = dayTotals(day)
  const tg = data.target
  const r = rangeFor(data, cur)
  const st = energyStatus(tot.k, r)
  const margin = dayMargin(day.foods)
  const flags = flaggedEntries(day.foods, p)
  const isToday = cur === todayStr()
  const f = fmtDate(cur)

  const sess = workoutsOf(day, cur)
  const planned = plannedKeys(data, cur)
  const first = planned[0]
  const logged = sess.length > 0
  const isRest = !logged && !first

  const meal = mealNow()
  const us = isToday ? usuals(data, cur, meal) : []
  const due = isToday ? plansDue(p) : []
  const hasHistory = Object.keys(data.days).some((d) => d < cur && data.days[d].foods.length)
  const missed = isToday && !dismissedMissed && hasHistory && !dayOf(data, shiftDay(cur, -1)).foods.length && !day.foods.length
  const sugRaw = isToday && !gentle && !showBurnNote(data) ? activitySuggestion(data, cur) : null
  const suggest = sugRaw && !(missed && !sugRaw.up) ? sugRaw : null
  const suggestShown = suggest && !missed ? suggest : null

  const rows = weekOf(cur).map((d) => dayStat(data, d))
  const past = rows.filter((x) => !x.future)
  const ws = weekSummary(data, rows)
  const consent = healthLoggingAllowed(data)
  const lastW = Object.keys(data.days).filter((d) => d <= cur && data.days[d]?.weight).sort().pop()
  const wSafety = loopSafety(data, kgOf(data, lastW), consent)
  const wRow = isToday ? weightRow(data, cur, 0, wSafety) : null
  const reviewDue = isToday && reviewWaiting(data, cur, consent)
  const care = isToday && careWeek(mindContext(data, dayPictures(data, shiftDay(cur, -7), shiftDay(cur, -1), cur)))
  const skipDay = consent && care && p.reviewPush ? nextReviewDay(cur, p.reviewDay ?? 0) : null
  useEffect(() => { if (skipDay && p.reviewPushSkip !== skipDay) setPrefs({ reviewPushSkip: skipDay }) }, [skipDay]) // eslint-disable-line react-hooks/exhaustive-deps
  const keepAsk = isToday && !care && reminderAskDue(p, cur)
  const lapsed = isToday && reminderLapsed(p, cur)
  useEffect(() => { if (lapsed) setReviewPush(false) }, [lapsed]) // eslint-disable-line react-hooks/exhaustive-deps
  const supps = p.supplements || []
  const ex = rangeExtra(data, cur)
  const baseLo = r.lo - ex, baseHi = r.hi - ex
  const mw = mealWords(day.foods)
  const kgNow = latestWeight(data, cur)
  const pRange = fv.protein === 'range' ? proteinRangeFor(p, kgNow) : null

  const plan = first ? templateFor(first, data.routines) : null
  const moveTitle = logged
    ? sess.length > 1 ? `${sess.length} sessions` : sess[0].title || builtinType(sess[0])
    : isRest ? 'Rest day' : planned.length > 1 ? planned.map((k) => keyTitle(k, data.routines)).join(' + ') : plan?.title || keyTitle(first!, data.routines)
  const moveSub = logged
    ? sess.length > 1 ? 'Logged today' : sess[0].modality === 'strength' ? 'Logged' : `Logged${sess[0].mins ? ` · ${sess[0].mins} min` : ''}`
    : isRest ? 'Recovery counts too'
    : planned.length > 1 ? `${planned.length} workouts planned` : first === 'Cardio' ? (plan?.ex[0]?.t || 'Cardio') : plan ? `${plan.ex.length} ${plan.ex.length === 1 ? 'exercise' : 'exercises'}` : 'Planned'

  const workoutsDone = past.reduce((a, x) => a + workoutsOf(dayOf(data, x.d), x.d).length, 0)
  const dl = ws.prevAvgP != null ? Math.round(ws.avgP - ws.prevAvgP) : null
  const b600 = [font(600), num, { color: t.label }]
  const energyLine: ReactNode = ws.logged >= 2
    ? gentle
      ? `You logged on ${ws.logged} days this week.${ws.inRange && !yes ? ` ${ws.inRange} landed in your range.` : ''}`
      : <>You averaged <Text style={b600}>{fmt(ws.avgK)} kcal</Text> on the {ws.logged} days you logged, and {ws.inRange} {ws.inRange === 1 ? 'was' : 'were'} in your range.</>
    : 'Log a couple of days and your weekly picture fills in here. Averages say far more than any single day.'
  const suppsTaken = supps.filter((s) => day.supps[s.id]).length

  const burnNote = showBurnNote(data) && !gentle
  const prompt: 'missed' | 'suggest' | 'burn' | null = missed ? 'missed' : suggest ? 'suggest' : burnNote ? 'burn' : null

  // ---------- wellbeing (WELLBEING_ENABLED; board B2) ----------
  const wb = WELLBEING_ENABLED
  const on = pillarsOn(wb ? p.mind?.off : undefined)
  const ctx0 = wb && isToday ? selectAskCtx({ data }, cur) : null
  const askCtx = ctx0 && { ...ctx0, signpostToday: !!ctx0.signpostToday && on.mind }
  const hard = !!askCtx?.hard
  const things = askCtx ? thingOptions({
    hard, off: p.mind?.off, gentle, wellbeingRouting: yes || some, sessionToday: logged || planned.length > 0,
    windDownAt: p.mind?.windDownAt, skillsAvailable: MIND_REVIEWED,
  }) : []
  const checked = checkedIn(day.checkin)
  const pick = askCtx ? pickAsks(summaryDue({
    signpost: askCtx.signpostToday, checkin: !checked, thing: checked && (things.length > 0 || !!thingByKey(day.checkin?.thing?.key)),
    planReview: due.length > 0, review: reviewDue, reviewKeep: keepAsk, banner: prompt, ifThen: ifThenDue, foodAsk: !!foodAsk0, pregnancyReask: reaskDue, medicalReask: medReaskDue,
    quickCheck: flags.length > 0,
  }, on), askCtx) : null
  const shown = (id: AskId) => !pick || pick.show.includes(id)
  const promptOk = !!prompt && shown(BANNER_ASK[prompt])
  const reaskGo = reaskDue && shown('pregnancy-reask')
  const medReaskGo = medReaskDue && shown('medical-reask')
  const ifThenGo = ifThenDue && shown('if-then-offer')
  const foodAskGo = foodAsk0 && shown('food-ask') ? foodAsk0 : null
  const suggestVisible = suggestShown && shown('activity') ? suggestShown : null
  const signpost = useLowMoodSignpost(!!pick?.show.includes('signpost'), cur, lowMoodShownOn(data))
  useEffect(() => { if (reaskGo && !sheet) setReask(true) }, [reaskGo]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (medReaskGo && !reaskGo && !reask && !sheet) setMedReask(true) }, [medReaskGo, reaskGo, reask]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (ifThenGo && !reaskGo && !medReaskGo && !reask && !medReask && !sheet) setIfThen(true) }, [ifThenGo, reaskGo, medReaskGo, reask, medReask]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (foodAskGo && !reaskGo && !medReaskGo && !ifThenGo && !reask && !medReask && !ifThen && !sheet) setFoodAsk(foodAskGo) }, [foodAskGo, reaskGo, medReaskGo, ifThenGo, reask, medReask, ifThen]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!suggestVisible) return
    // nutrition-accuracy: only a suggestion that actually showed is recorded
    if (wb) noteActivityShown(pick)
    else if (markActivityShown(data, cur)) setPrefs({ activityShown: cur })
  }, [suggestVisible?.level, cur]) // eslint-disable-line react-hooks/exhaustive-deps
  const same = wb && hard && on.food ? sameAsYesterdayRow(data, cur, meal, { gentle }) : null
  const lighterMove = wb && !logged && !isRest &&
    offerLighter(day.checkin, Object.keys(data.days).filter((d) => d < cur).sort().reverse().map((d) => data.days[d]?.checkin))

  const openCheckin = () => (healthDeclined(data) ? openProfile('health') : setSheet({ k: 'checkin' }))
  const pk = (color: string, label: string) => <Text style={[tx(13, 600), { color: color }]}>{label}</Text>
  const sub = { fontSize: 13, color: t.label2 }
  const psq = (bg: string, icon: ReactNode, size = 40) => <View style={{ width: size, height: size, borderRadius: size === 56 ? 14 : 12, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>

  // ---------- Move, Weight ----------
  const showWeight = !quiet && on.food
  const showMove = on.move
  const moveIcon = (size: number) => <Icon name={isRest ? 'leaf' : logged ? 'checkc' : 'dumbbell'} size={size} color={t.label} />
  const startBtn = (h: number) => !logged && !isRest
    // `.mv .btn.sm` (40, centred in the row) and `.tile.mvt .btn.sm` (32, 14 pt)
    ? <Btn small title="Start" onPress={() => openTrain(first!)} style={{ minHeight: h, height: h, borderRadius: h / 2, paddingHorizontal: h === 40 ? 18 : 14, alignSelf: h === 40 ? 'center' : 'flex-start' }} textStyle={h === 40 ? undefined : { fontSize: 14 }} />
    : null
  const weightTile = !fv.weightBack || p.reviewWeight !== true ? (
    <Tile onPress={() => setSheet({ k: 'weight' })} label="Weight" style={{ flex: 1 }}>
      <Text style={[tx(13, 600), { color: t.label2 }]}>Weight</Text>
      <Text style={[tx(19, 600), { color: t.label }, { marginTop: 2, lineHeight: 29 }]}>{day.weight ? 'Logged' : 'Add'}</Text>
      <Text style={[tx(12, 400), { color: t.label2 }]}>{day.weight ? 'Today' : 'Whenever it suits you'}</Text>
    </Tile>
  ) : (
    <Tile onPress={() => setSheet({ k: 'weight' })} label="Weight" style={{ flex: 1 }}>
      <Text style={[tx(13, 600), { color: t.label2 }]}>Weight</Text>
      {lastW
        ? <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 2 }}>
            <Text style={[tx(26, 600), num, { lineHeight: 29, letterSpacing: -0.5, color: t.label }]}>{r1(data.days[lastW].weight!)}</Text>
            <Text style={[tx(15, 600), { color: t.label2 }]}>kg</Text>
          </View>
        : <Text style={[tx(19, 600), { color: t.label }, { marginTop: 2, lineHeight: 29 }]}>Add</Text>}
      <Text style={[tx(12, 400), { color: t.label2 }]}>{lastW ? (lastW === cur ? 'Today' : lastW > shiftDay(cur, -7) ? fmtDate(lastW).dow : dayMonthOf(lastW)) : 'Whenever it suits you'}</Text>
      {/* .wt-trend; a hard day (nutrition R5, R6): the last weigh-in and when it was, no trend */}
      {wRow && !hard ? <Text style={[tx(13, 500), { color: t.label }, { lineHeight: 17, marginTop: 6 }]}>{weightTileWords(wRow)}</Text> : null}
    </Tile>
  )

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
      <PageHeader eyebrow={`${isToday ? 'Today' : f.dow} · ${f.full.split(' ').slice(0, 2).join(' ')}`} title="Summary" />
      <WeekStrip />
      {/* ob2-0b's setup card belongs to Onboarding (N11), behind ONBOARDING_ENABLED */}

      <View style={{ gap: 14 }}>
        {/* ---------- Mind ---------- */}
        {wb ? on.mind && (
          <MindCard checkin={day.checkin} isToday={isToday} hard={hard} thingSlot={shown('thing')} options={things} windDownAt={p.mind?.windDownAt}
            onOpen={() => openMind()}
            onOpenView={(v) => openMind(v)}
            onCheckIn={openCheckin}
            onMakePlan={() => notYet('Make it a plan', 'Plan')} plans={p.plans} day={cur} />
        ) : (
          <Tile onPress={openCheckin} label="Mind" style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            {psq(t.mindFill, <Icon name="smile" size={20} color={t.label} />)}
            <View style={{ flex: 1, minWidth: 0 }}>
              {pk(t.mindInk, 'Mind')}
              <Text style={[tx(17, 500), { color: t.label }]}>{day.checkin?.mood ? `Feeling ${MOODS[day.checkin.mood - 1].toLowerCase()}` : day.checkin ? 'Checked in' : isToday ? 'How are you today?' : 'How was this day?'}</Text>
              <Text style={[tx(13, 400), { color: t.label2 }, { marginTop: 1 }]}>{day.checkin
                ? day.checkin.hunger ? `Hunger: ${HUNGER[day.checkin.hunger - 1]} · tap to update` : 'Tap to update your check-in'
                : 'Mood, sleep, stress and energy · 20 seconds'}</Text>
            </View>
            <Chevron color={t.label3} />
          </Tile>
        )}

        {signpost.show && <LowMoodBanner today={cur} markShown={markLowMoodShown} onSupport={openSupport} onDismiss={signpost.dismiss} />}

        {reviewDue && shown('review') && (
          // .card.rv-due
          <View style={{ backgroundColor: t.card, borderRadius: t.radius, flexDirection: 'row', alignItems: 'center' }}>
            <Pressable accessibilityRole="button" onPress={openReview} style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingLeft: 16, paddingRight: 4, opacity: pressed ? 0.7 : 1 })}>
              {psq(t.mindFill, <Icon name="review" size={20} color={t.label} />)}
              <View style={{ flex: 1 }}>
                {pk(t.mindInk, 'Weekly review')}
                <Text style={[tx(17, 500), { color: t.label }]}>Your week</Text>
                <Text style={[tx(13, 400), { color: t.label2 }, { marginTop: 1 }]}>A two-minute look back</Text>
              </View>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Hide until next week" onPress={() => setPrefs({ reviewHidden: reviewDayOn(cur, p.reviewDay ?? 0) })}
              style={{ width: 44, height: 44, marginRight: 6, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="x" size={20} stroke={2.2} color={t.label2} />
            </Pressable>
          </View>
        )}

        {keepAsk && shown('review-keep') && (
          <Banner icon="bell" iconColor={t.mindInk} title="Keep the weekly reminder?" body="It’s paused for now. Some weeks you won’t need it, and that’s fine.">
            <View style={{ marginTop: 8 }}>
              <Chips>
                <Chip title="Keep it" onPress={() => keepReviewPush(true)} />
                <Chip title="Turn it off" onPress={() => keepReviewPush(false)} />
              </Chips>
            </View>
          </Banner>
        )}

        {prompt === 'missed' && promptOk && (
          <Banner icon="leaf" iconColor={t.mindInk} onDismiss={() => setDismissedMissed(true)} title="Welcome back." body="A day off logging doesn't undo anything. Pick up from here." />
        )}

        {prompt === 'suggest' && promptOk && suggest && (
          // .card.dayopt
          <Card plain>
            <Text style={[tx(17, 600), { color: t.label }, { lineHeight: 22, marginBottom: 10 }]}>{suggest.up ? '' : 'Weeks vary. '}Your logged sessions over the last 4 weeks fit <Text style={font(700)}>{ACTIVITY[suggest.level].label.replace(/ \(.*\)$/, '')}</Text> best.
              {suggest.up ? ' Want to update your activity level to match?' : ' If you do more than you log, your current setting may still be right. Want to update it?'}</Text>
            <Chips>
              <Chip title="Update" onPress={() => {
                setPrefs({ activityLevel: suggest.level, activityAsked: cur, activityMult: undefined })
                showToast('Activity level updated. Your targets only change if you choose to.')
                openProfile('metrics')
              }} />
              <Chip title="Keep as is" onPress={() => setPrefs({ activityAsked: cur })} />
            </Chips>
          </Card>
        )}

        {prompt === 'burn' && promptOk && (
          <Banner icon="info" iconColor={t.foodInk} onDismiss={() => setPrefs({ burnNoteSeen: true })} title="Your range on workout days has changed." body={`${p.activityLevel === 'sedentary'
            ? 'Workouts now add only the energy above what you use at rest, so they are no longer counted twice. '
            : 'It now leaves workouts out, because your activity level already includes your training. '}Past days are unchanged.`} />
        )}

        {due.length > 0 && !reviewDue && shown('plan-review') && (
          <Banner icon="bulb" iconColor={t.mindInk} onPress={openPlanReview} title="How are your plans going?" body={`A 10-second check-in on ${due.length === 1 ? 'your plan' : `${due.length} plans`}. Plans work best when you revisit them.`} />
        )}

        {/* ---------- Food ---------- */}
        {on.food && (
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              {pk(t.foodInk, 'Food')}
              <LinkBtn title="Open" onPress={() => setTab('food')} />
            </View>
            {yes ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Open Food" onPress={() => setTab('food')} style={{ gap: 8 }}>
                <Text style={[tx(22, 600), { color: t.label }, { lineHeight: 26 }]}>{FOOD9.meals(mw.slots.length)}</Text>
                <Text style={[tx(15, 400), { color: t.label2 }, { lineHeight: 22 }]}>{mw.slots.length ? FOOD9.withProtein(mw.withProtein, mw.slots.length) : FOOD9.empty}</Text>
              </Pressable>
            ) : some && gentle ? (
              <View style={{ gap: 8 }}>
                <Pressable accessibilityRole="button" accessibilityLabel="Open Food" onPress={() => setTab('food')} style={{ gap: 8 }}>
                  <Text style={[tx(22, 600), { color: t.label }, { lineHeight: 26 }]}>{st.gentle}</Text>
                  <Text style={[tx(15, 400), { color: t.label2 }, { lineHeight: 22 }]}>{FOOD9.slots(mw.slots, mw.withProtein)}</Text>
                </Pressable>
                {!p.pregnancy?.flagged && <View style={{ alignSelf: 'flex-start' }}><LinkBtn title={FOOD9.seeRange} onPress={() => setTab('food')} style={{ fontSize: 14, paddingVertical: 0, paddingHorizontal: 0 }} /></View>}
              </View>
            ) : (
              <>
                <Pressable accessibilityRole="button" accessibilityLabel="Open Food" onPress={() => setTab('food')} style={{ gap: 14 }}>
                  {gentle
                    ? <Text style={[tx(24, 600), { color: t.label }, { lineHeight: 29 }]}>{st.gentle}</Text>
                    : (
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                        <Text style={[tx(44, 600), num, { lineHeight: 46, letterSpacing: -1.3, color: t.label }]}>{fmt(tot.k)}</Text>
                        <Text style={[tx(15, 400), num, { color: t.label2 }]}>of {fmt(r.lo)}–{fmt(r.hi)} kcal</Text>
                      </View>
                    )}
                  <KcalBar k={tot.k} lo={r.lo} hi={r.hi} />
                </Pressable>
                {!gentle && (
                  <Text style={[tx(13, 400), num, { lineHeight: 18, color: t.label2 }]}>
                    {some ? st.gentle : st.word}
                    {tot.k > 0 && <>{' · '}<Text accessibilityRole="link" accessibilityLabel="About this estimate" onPress={openMargin} style={{ color: t.tint }}>give or take {margin}</Text></>}
                  </Text>
                )}
                {some
                  ? pRange && <Text style={[tx(13, 400), num, { lineHeight: 18, color: t.label2 }]}>{FOOD9.proteinRange(Math.round(tot.p), pRange.low, pRange.high)}</Text>
                  : <MacroTrio p={tot.p} c={tot.c} f={tot.f} tp={tg.p} tc={tg.c} tf={tg.f} />}
              </>
            )}
            <Btn kind="gray" title={yes ? FOOD9.logMeal : 'Add food'} onPress={openAddFood} style={{ minHeight: 48, borderRadius: 24 }} textStyle={{ fontSize: 16 }}
              icon={<Icon name="plus" size={20} stroke={2.6} color={t.label} />} />
          </Card>
        )}

        {flags.length > 0 && on.food && shown('quick-check') && (
          <List>
            <View style={{ paddingTop: 14, paddingHorizontal: 16, paddingBottom: 6 }}>
              <CatHead color="mind" icon="target" label="Worth a quick check" />
              <Text style={[tx(15, 400), { color: t.label2 }]}>{flags.length === 1 ? 'This estimate moves' : 'These estimates move'} your total the most. A quick tweak keeps your numbers honest.</Text>
            </View>
            {flags.slice(0, 3).map(({ x, i }) => (
              <Row key={i} onPress={openEditEntry} title={x.n}
                sub={`${x.how ? CAPTURE_LABEL[x.how] : 'Estimate'}${gentle ? '' : ` · ± ${fmt(x.k * entryErr(x))} kcal`}`}
                right={<Text style={[tx(17, 400, 1.3, BTN), { color: t.tint }]}>Adjust</Text>} />
            ))}
          </List>
        )}

        {on.food && (us.length > 0 || same) && (
          <View>
            <Lbl>Your usual {MEAL_LABEL[meal].toLowerCase()}</Lbl>
            <List style={{ marginBottom: 8 }}>
              {same && (
                <Pressable accessibilityRole="button" onPress={() => repeatYesterday(meal)} style={({ pressed }) => [LI, pressed && { backgroundColor: t.fill }]}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={[tx(17, 400), { color: t.label }]}>{SAME_AS_YESTERDAY}</Text>
                    <Text style={[tx(13, 400), { color: t.label2 }, [num, { marginTop: 2, lineHeight: 18 }]]}>{same.sub}</Text>
                  </View>
                  <AddCircle />
                </Pressable>
              )}
              {us.map((u) => (
                <Row key={u.n} onPress={() => logEntries(usualEntries(data, u.n, meal))} title={u.n}
                  sub={`${portionText(u.last)}${gentle ? '' : ` · ${fmt(u.last.k)} kcal`}`} right={<AddCircle />} />
              ))}
            </List>
            {us.length > 0 && <Foot>Logged {us[0].count} times recently. One tap adds your usual portion.</Foot>}
          </View>
        )}

        {/* ---------- Move and Weight ---------- */}
        {showWeight && !showMove && <View style={{ flexDirection: 'row' }}>{weightTile}</View>}
        {showWeight && showMove ? (
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'stretch' }}>
            <Tile style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                {pk(t.moveInk, 'Move')}
                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: t.moveFill, marginTop: -4, marginRight: -2, alignItems: 'center', justifyContent: 'center' }}>{moveIcon(20)}</View>
              </View>
              <Pressable accessibilityRole="button" onPress={() => setTab('train')} style={{ flex: 1, justifyContent: 'flex-end', gap: 4, paddingTop: 12 }}>
                <Text style={[tx(19, 600), { color: t.label }, { lineHeight: 23, letterSpacing: -0.2 }]}>{moveTitle}</Text>
                <Text style={[tx(12, 400), { color: t.label2 }]}>{lighterMove ? `${moveSub} · ${LIGHTER_CHOICES}` : moveSub}</Text>
              </Pressable>
              {!logged && !isRest && <View style={{ marginTop: 10 }}>{startBtn(32)}</View>}
            </Tile>
            {weightTile}
          </View>
        ) : showMove && (
          <Card>
            {pk(t.moveInk, 'Move')}
            <Pressable accessibilityRole="button" onPress={() => setTab('train')} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              {psq(t.moveFill, moveIcon(20), 56)}
              <View style={{ flex: 1 }}>
                <Text style={[tx(17, 600), { color: t.label }]}>{moveTitle}</Text>
                <Text style={[tx(13, 400), { color: t.label2 }, { marginTop: 1 }]}>{lighterMove ? `${moveSub} · ${LIGHTER_CHOICES}` : moveSub}</Text>
              </View>
              {startBtn(40) ?? <Chevron color={t.label3} />}
            </Pressable>
          </Card>
        )}
        {supps.length > 0 && (
          <Tile>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text style={[tx(13, 600), { color: t.label2 }]}>Supplements</Text>
              <Text style={[tx(13, 500), { color: t.label2 }, num]}>{suppsTaken} of {supps.length}</Text>
            </View>
            <View style={{ marginTop: 4 }}>
              {supps.map((s) => {
                const taken = !!day.supps[s.id]
                return (
                  <Pressable key={s.id} accessibilityRole="checkbox" accessibilityState={{ checked: taken }} onPress={() => toggleSupp(s.id)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5, minHeight: 32 }}>
                    <View style={[{ width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, taken ? { backgroundColor: t.tint } : { borderWidth: 1.5, borderColor: t.dash }]}>
                      {taken && <Icon name="check" size={20} stroke={3.6} color={t.onTint} />}
                    </View>
                    <Text style={[tx(14, 400), { color: t.label }, { flex: 1, minWidth: 0, lineHeight: 17 }]}>{s.name}</Text>
                    <Text style={[tx(12, 400), { color: t.label2 }, num]}>{s.time}</Text>
                  </Pressable>
                )
              })}
            </View>
          </Tile>
        )}

        {/* ---------- This week ---------- */}
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text style={[tx(17, 600), { color: t.label }]}>This week</Text>
            <Text style={[tx(13, 400), { color: t.label2 }, num]}>{weekSpan(rows[0].d, rows[6].d)}</Text>
          </View>
          {on.food && (
            <View>
              <Text style={[tx(13), sub]}>Energy</Text>
              <Text style={[tx(15, 400), { lineHeight: 21, color: t.label, marginTop: 2 }]}>{energyLine}</Text>
            </View>
          )}
          {on.food && (
            <View>
              <WeekBars rows={rows} lo={baseLo} hi={baseHi} cur={cur} numbers={!gentle} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 4, marginTop: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 8, height: 12, borderRadius: 3, backgroundColor: t.energy }} />
                  <Text style={[tx(13), sub]}>{`Eaten${gentle ? '' : ', kcal'}`}</Text>
                </View>
                {!yes && <Text style={[tx(13), num, sub]}>{`Your range${gentle ? '' : ` ${fmt(baseLo)}–${fmt(baseHi)}`}${rows.some((x) => x.r.hi !== baseHi) ? ', higher on workout days' : ''}`}</Text>}
              </View>
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: 14, borderTopWidth: 1, borderTopColor: t.sep, paddingTop: 14 }}>
            {on.food && (
              <View style={{ flex: 1 }}>
                <Text style={[tx(13), sub]}>Protein</Text>
                {ws.logged >= 2
                  ? <><Text style={[tx(20, 600), { color: t.label }, [num, { marginTop: 2 }]]}>{fmt(ws.avgP)} g</Text><Text style={[tx(12, 400), { color: t.label2 }, { marginTop: 1 }]}>{dl == null ? 'a day' : Math.abs(dl) >= 5 ? `a day, ${dl > 0 ? 'up' : 'down'} ${Math.abs(dl)} g` : 'a day, steady'}</Text></>
                  : <><Text style={[tx(20, 600), { color: t.label }, [num, { marginTop: 2 }]]}>–</Text><Text style={[tx(12, 400), { color: t.label2 }, { marginTop: 1 }]}>after 2 days</Text></>}
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[tx(13), sub]}>Workouts</Text>
              {workoutsDone
                ? <><Text style={[tx(20, 600), { color: t.label }, [num, { marginTop: 2 }]]}>{workoutsDone}</Text><Text style={[tx(12, 400), { color: t.label2 }, { marginTop: 1 }]}>done this week</Text></>
                : <><Text style={[tx(20, 600), { color: t.label }, { marginTop: 2 }]}>None yet</Text><Text style={[tx(12, 400), { color: t.label2 }, { marginTop: 1 }]}>this week</Text></>}
            </View>
            {on.food && (
              <Pressable style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={`${ws.logged === 1 ? '1 day' : `${ws.logged} days`} logged this week`} onPress={() => setTab('food')}>
                <Text style={[tx(13), sub]}>Logged</Text>
                <Text style={[tx(20, 600), { color: t.label }, [num, { marginTop: 2 }]]}>{ws.logged === 1 ? '1 day' : `${ws.logged} days`}</Text>
              </Pressable>
            )}
          </View>
        </Card>
      </View>
    </ScrollView>

      {sheet?.k === 'weight' && <WeightSheet onClose={() => setSheet(null)} />}
      {medReask && <MedicalSheet onClose={() => { markMedicalReasked(); setMedReask(false) }} />}
      {reask && <PregnancyCheckSheet onClose={() => setReask(false)} onAnswers={() => { setReask(false); openProfile('health-answers') }} />}
      {foodAsk && <FoodAskSheet ask={foodAsk} onClose={() => setFoodAsk(null)} />}
      {sheet?.k === 'checkin' && <CheckinSheet onClose={() => setSheet(null)} onSupport={openSupport} />}
    </View>
  )
}

/** `.li` for the Same as yesterday row, whose sub wraps (`.s.wrap`). TODO(N1-followup): N1's Row
 *  with a wrapping sub (P1b), then this goes. */
const LI = { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingVertical: 10, paddingHorizontal: 16 } as const

/** `.addc` */
function AddCircle() {
  const t = useTokens()
  return <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: t.fill, alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" size={20} stroke={2.8} color={t.tint} /></View>
}
