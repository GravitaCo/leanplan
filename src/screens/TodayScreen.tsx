/**
 * Summary (Studio): the three pillars in order. Mind first (the day's check-in), then Food
 * (the day against its range, macros, quick checks and usuals), then Move (today's session),
 * then weight and supplements, and the week against the target range.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { selectAskCtx, useStore } from '@/store/store'
import { canSaveHealthAnswers, healthDeclined, quietNumbers } from '@/data/consent'
import { plannedKeys } from '@/core/domain/plans'
import { keyTitle, templateFor } from '@/core/domain/routines'
import { fmt, fmtDate, r1, shiftDay, todayStr } from '@/core/domain/date'
import { dayTotals } from '@/core/domain/nutrition'
import { activitySuggestion, markActivityShown } from '@/core/domain/activity'
import { builtinType, workoutsOf } from '@/core/domain/sessions'
import { ACTIVITY } from '@/core/data/constants'
import { CAPTURE_LABEL, dayMargin, entryErr, flaggedEntries, portionText } from '@/core/domain/estimate'
import {
  HUNGER, MEAL_LABEL, MOODS, dayOf, dayStat, energyStatus, ifThenOfferDue, mealNow, plansDue, latestWeight, rangeExtra, rangeFor, showBurnNote,
  sameAsYesterdayRow, usualEntries, usuals, weekOf, weekSummary, weightSeries, weightWeekDelta,
} from '@/core/domain/insights'
import { PageHeader, CatHead, pressable } from '@/ui/primitives'
import { initials } from '@/ui/ProfileButton'
import { MIND_REVIEWED, WELLBEING_ENABLED } from '@/data/wellbeingFlag'
import { Icon, Chevron } from '@/ui/icons'
import { KcalBar, MacroTrio, Sparkline, WeekBars } from '@/ui/charts'
import { WeekStrip } from '@/ui/WeekStrip'
import { WeightSheet } from './body/WeightSheet'
import { EditEntrySheet } from './food/EditEntrySheet'
import { AddFoodSheet } from './food/AddFoodSheet'
import { MarginSheet } from './food/MarginSheet'
import { CheckinSheet } from './today/CheckinSheet'
import { FirstPlanSheet, PlanReviewSheet } from './plan/PlanSheets'
import { LazyPregnancyCheckSheet } from './profile/lazyHealthAnswers'
import { ONBOARDING_ENABLED } from './onboarding/Consent'
import { pregnancyReaskDue } from '@/core/domain/onboarding'
import { foodAskDue, foodView, mealWords, proteinRangeFor } from '@/core/domain/foodMode'
import { FOOD9 } from './onboarding/copyApp'
import { FoodAskSheet } from './today/FoodAskSheet'
import { SetupCard, setupCardDue } from './onboarding/Consent'
import { pickAsks, type AskId } from '@/core/domain/asks'
import { thingOptions } from '@/core/domain/mind'
import { offerLighter } from '@/core/domain/dayOptions'
import { thingByKey, type Thing } from '@/core/data/skills'
import { MindCard } from './today/MindCard'
import { ThingPlanSheet } from './today/ThingPlanSheet'
import { LowMoodBanner, useLowMoodSignpost } from './today/LowMoodBanner'
import { SupportSheet } from './mind/SupportSheet'
import { lowMoodShownOn } from '@/data/deviceOnly'
import { BANNER_ASK, checkedIn, lastWeighIn, pillarsOn, summaryDue, weighInSub } from './today/summary'
import { LIGHTER_CHOICES, SAME_AS_YESTERDAY } from './today/summaryCopy'
import './today/summary.css'

type SheetKind = { k: 'weight' } | { k: 'checkin' } | { k: 'margin' } | { k: 'plans' } | { k: 'edit'; i: number } | { k: 'add' } | { k: 'thing-plan'; thing: Thing } | { k: 'support' } | null

/** "22–28 Sept", or "29 Sept – 5 Oct" across a month end. */
function weekSpan(a: string, b: string): string {
  const d = (x: string, o: Intl.DateTimeFormatOptions) => new Date(x + 'T12:00').toLocaleDateString('en-GB', o)
  return d(a, { month: 'short' }) === d(b, { month: 'short' })
    ? `${d(a, { day: 'numeric' })}–${d(b, { day: 'numeric', month: 'short' })}`
    : `${d(a, { day: 'numeric', month: 'short' })} – ${d(b, { day: 'numeric', month: 'short' })}`
}

export function TodayScreen() {
  const data = useStore((s) => s.data)
  const cur = useStore((s) => s.cur)
  const setTab = useStore((s) => s.setTab)
  const toggleSupp = useStore((s) => s.toggleSupp)
  const logEntries = useStore((s) => s.logEntries)
  const setPrefs = useStore((s) => s.setPrefs)
  const showToast = useStore((s) => s.showToast)
  const openProfile = useStore((s) => s.openProfile)
  const [sheet, setSheet] = useState<SheetKind>(null)
  const [dismissedMissed, setDismissedMissed] = useState(false)
  // ob7-3: the 12-week "Does this still apply?", once when it's due, never blocking (closing = Ask me later)
  const reaskDue = useStore((s) => ONBOARDING_ENABLED && pregnancyReaskDue(s.data.profile.pregnancy, todayStr()))
  const [reask, setReask] = useState(false)
  // ob5-4: "Plan when you'll do it", once, after the first workout (the 12-week question goes first)
  const ifThenDue = useStore((s) => ONBOARDING_ENABLED && s.cur === todayStr() && ifThenOfferDue(s.data))
  const [ifThen, setIfThen] = useState(false)
  // Onboarding 9: the one in-app ask (never a push): day 14 for Sometimes (ob9-3), week 4 for Yes (ob9-4)
  const foodAsk0 = useStore((s) => (!ONBOARDING_ENABLED || s.cur !== todayStr() ? null : foodAskDue(s.data.profile, todayStr(), canSaveHealthAnswers(s.data))))
  const [foodAsk, setFoodAsk] = useState<'today' | 'range' | null>(null)
  // (the effects that open these sheets sit below the asks budget, in the same order as before)
  const openMind = useStore((s) => s.openMind)
  const noteActivityShown = useStore((s) => s.noteActivityShown)
  const markLowMoodShown = useStore((s) => s.markLowMoodShown)
  const repeatYesterday = useStore((s) => s.repeatYesterday)

  const p = data.profile
  // Onboarding 9: a wellbeing Yes or Sometimes shows Today in words (Sometimes until its own yes at day 14)
  const fv = foodView(p)
  const quiet = quietNumbers(data)
  const gentle = quiet || !fv.todayNumbers
  const yes = fv.mode === 'yes'
  const some = fv.mode === 'sometimes'
  const day = dayOf(data, cur)
  const t = dayTotals(day)
  const tg = data.target
  const r = rangeFor(data, cur)
  const st = energyStatus(t.k, r)
  const margin = dayMargin(day.foods)
  const flags = flaggedEntries(day.foods, p)
  const isToday = cur === todayStr()
  const f = fmtDate(cur)

  const sess = workoutsOf(day, cur)
  // the plan's workouts for the day, or the schedule's one (unknown keys are left out)
  const planned = plannedKeys(data, cur)
  const first = planned[0]
  const openTrain = useStore((s) => s.openTrain)
  const logged = sess.length > 0
  const isRest = !logged && !first

  const meal = mealNow()
  const us = isToday ? usuals(data, cur, meal) : []
  const due = isToday ? plansDue(p) : []
  const hasHistory = Object.keys(data.days).some((d) => d < cur && data.days[d].foods.length)
  const missed = isToday && !dismissedMissed && hasHistory && !dayOf(data, shiftDay(cur, -1)).foods.length && !day.foods.length
  // activity-level suggestion (plan P1.5): an offer only, never applied by itself; no numbers;
  // hidden in gentle mode; the range-change note wins on the same day; no downward nudge on a
  // "welcome back" day
  const sugRaw = isToday && !gentle && !showBurnNote(data) ? activitySuggestion(data, cur) : null
  const suggest = sugRaw && !(missed && !sugRaw.up) ? sugRaw : null
  const suggestShown = suggest && !missed ? suggest : null

  const rows = weekOf(cur).map((d) => dayStat(data, d))
  const past = rows.filter((x) => !x.future)
  const ws = weekSummary(data, rows)
  const weights = weightSeries(data, cur, 14)
  const wDelta = weightWeekDelta(data, cur)
  const supps = p.supplements || []
  // the range on a day without workouts (rangeFor's own maths: the ±15% range for Sometimes)
  const ex = rangeExtra(data, cur)
  const baseLo = r.lo - ex, baseHi = r.hi - ex
  const mw = mealWords(day.foods)
  const kgNow = latestWeight(data, cur)
  const pRange = fv.protein === 'range' ? proteinRangeFor(p, kgNow) : null

  // Move card: what today holds (a logged session wins over the plan)
  const plan = first ? templateFor(first, data.routines) : null
  const moveTitle = logged
    ? sess.length > 1 ? `${sess.length} sessions` : sess[0].title || builtinType(sess[0])
    : isRest ? 'Rest day' : planned.length > 1 ? planned.map((k) => keyTitle(k, data.routines)).join(' + ') : plan?.title || keyTitle(first!, data.routines)
  const moveSub = logged
    ? sess.length > 1 ? 'Logged today' : sess[0].modality === 'strength' ? 'Logged' : `Logged${sess[0].mins ? ` · ${sess[0].mins} min` : ''}`
    : isRest ? 'Recovery counts too'
    : planned.length > 1 ? `${planned.length} workouts planned` : first === 'Cardio' ? (plan?.ex[0]?.t || 'Cardio') : plan ? `${plan.ex.length} ${plan.ex.length === 1 ? 'exercise' : 'exercises'}` : 'Planned'

  const loggedDays = past.filter((x) => x.logged).length
  const dl = ws.prevAvgP != null ? Math.round(ws.avgP - ws.prevAvgP) : null
  const energyLine: ReactNode = ws.logged >= 2
    ? gentle
      ? <>You logged on {ws.logged} days this week.{ws.inRange && !yes ? ` ${ws.inRange} of them landed in your range.` : ''}</>
      : <>You averaged <b className="num">{fmt(ws.avgK)} kcal</b> on the {ws.logged} days you logged, and {ws.inRange} {ws.inRange === 1 ? 'was' : 'were'} in your range.</>
    : <>Log a couple of days and your weekly picture fills in here. Averages say far more than any single day.</>
  const suppsTaken = supps.filter((s) => day.supps[s.id]).length

  // conditional prompts share one slot under Mind, most time-sensitive first;
  // the plans review is time-sensitive too, so it shows alongside rather than waiting
  const burnNote = showBurnNote(data) && !gentle
  const prompt: 'missed' | 'suggest' | 'burn' | null =
    missed ? 'missed' : suggest ? 'suggest' : burnNote ? 'burn' : null

  // ---------- wellbeing (WELLBEING_ENABLED; board B2, build plan WP7) ----------
  // With the flag off: every pillar on, no asks budget, and everything below reads as before.
  const wb = WELLBEING_ENABLED
  const on = pillarsOn(wb ? p.mind?.off : undefined)
  const ctx0 = wb && isToday ? selectAskCtx({ data }, cur) : null
  // WP15: the low-mood signpost belongs to the Mind pillar; with Mind off it never takes the day
  const askCtx = ctx0 && { ...ctx0, signpostToday: !!ctx0.signpostToday && on.mind }
  const hard = !!askCtx?.hard
  const things = askCtx ? thingOptions({
    hard, off: p.mind?.off, gentle, wellbeingRouting: yes || some, sessionToday: logged || planned.length > 0,
    windDownAt: p.mind?.windDownAt, skillsAvailable: MIND_REVIEWED,
  }) : []
  const checked = checkedIn(day.checkin)
  // the one prompt slot: what is due today goes through the asks budget (core/domain/asks); a held
  // ask is never shown, opened or marked seen, and comes back on a day it shows
  const pick = askCtx ? pickAsks(summaryDue({
    signpost: askCtx.signpostToday, checkin: !checked, thing: checked && (things.length > 0 || !!thingByKey(day.checkin?.thing?.key)),
    planReview: due.length > 0, banner: prompt, ifThen: ifThenDue, foodAsk: !!foodAsk0, pregnancyReask: reaskDue,
    quickCheck: flags.length > 0,
  }, on), askCtx) : null
  const shown = (id: AskId) => !pick || pick.show.includes(id)
  const promptOk = !!prompt && shown(BANNER_ASK[prompt])
  const reaskGo = reaskDue && shown('pregnancy-reask')
  const ifThenGo = ifThenDue && shown('if-then-offer')
  const foodAskGo = foodAsk0 && shown('food-ask') ? foodAsk0 : null
  const suggestVisible = suggestShown && shown('activity') ? suggestShown : null
  // WP15 (board B6 frame 2): the only ask on its day; shown once, marked with the local date
  const signpost = useLowMoodSignpost(!!pick?.show.includes('signpost'), cur, lowMoodShownOn(data), markLowMoodShown)
  useEffect(() => { if (reaskGo && !sheet) setReask(true) }, [reaskGo]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (ifThenGo && !reask && !sheet) setIfThen(true) }, [ifThenGo, reask]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (foodAskGo && !reask && !ifThen && !sheet) setFoodAsk(foodAskGo) }, [foodAskGo, reask, ifThen]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!suggestVisible) return
    // nutrition-accuracy: only a suggestion that actually showed is recorded
    if (wb) noteActivityShown(pick)
    else if (markActivityShown(data, cur)) setPrefs({ activityShown: cur })
  }, [suggestVisible?.level, cur]) // eslint-disable-line react-hooks/exhaustive-deps
  // Food on a hard day: "Same as yesterday" leads the usuals (nutrition-accuracy R1 to R4)
  const same = wb && hard && on.food ? sameAsYesterdayRow(data, cur, meal, { gentle }) : null
  // Weight on a hard day: when it was, not the weekly change, and no sparkline (R5, R6)
  const lastW = wb && hard ? lastWeighIn(data.days, cur) : null
  // Move: Train offers the lighter choices (the same test TrainScreen uses; B2.26)
  const lighterMove = wb && !logged && !isRest &&
    offerLighter(day.checkin, Object.keys(data.days).filter((d) => d < cur).sort().reverse().map((d) => data.days[d]?.checkin))

  return (
    <div className="screen">
      <PageHeader
        eyebrow={<>{isToday ? 'Today' : f.dow} · {f.full.split(' ').slice(0, 2).join(' ')}</>}
        title="Summary"
        // with the wellbeing flag on, PageHeader carries the Profile avatar itself (canvas section 9)
        right={WELLBEING_ENABLED ? undefined : <button className="avatar" aria-label="Profile" onClick={() => setTab('profile')}>{initials(p.name) || <Icon name="person" />}</button>}
      />
      <WeekStrip />
      {/* ob2-0b, behind the onboarding flag: on the Starter week until the setup card is done */}
      {setupCardDue(data) && <SetupCard />}

      <div className="pillars">
        {/* ---------- Mind ---------- */}
        {wb ? on.mind && (
          <MindCard checkin={day.checkin} isToday={isToday} hard={hard} thingSlot={shown('thing')} options={things} windDownAt={p.mind?.windDownAt}
            onOpen={() => openMind()}
            onCheckIn={() => (healthDeclined(data) ? openProfile('health') : setSheet({ k: 'checkin' }))}
            onMakePlan={(thing) => setSheet({ k: 'thing-plan', thing })} />
        ) : <button className="card pcard mind-row" onClick={() => (healthDeclined(data) ? openProfile('health') : setSheet({ k: 'checkin' }))}>
          <span className="psq" style={{ background: 'var(--mind-fill)' }}><Icon name="smile" size={20} /></span>
          <span className="m">
            <span className="pk" style={{ color: 'var(--mind-ink)' }}>Mind</span>
            <span className="pt">{day.checkin?.mood ? `Feeling ${MOODS[day.checkin.mood - 1].toLowerCase()}` : day.checkin ? 'Checked in' : isToday ? 'How are you today?' : 'How was this day?'}</span>
            <span className="ps">{day.checkin
              ? day.checkin.hunger ? `Hunger: ${HUNGER[day.checkin.hunger - 1]} · tap to update` : 'Tap to update your check-in'
              : 'Mood, sleep, stress and energy · 20 seconds'}</span>
          </span>
          <Chevron />
        </button>}

        {signpost.show && <LowMoodBanner onSupport={() => setSheet({ k: 'support' })} onDismiss={signpost.dismiss} />}

        {prompt === 'missed' && promptOk && (
          <div className="banner">
            <span style={{ color: 'var(--mind-ink)' }}><Icon name="leaf" /></span>
            <div><b>Welcome back.</b><br /><span className="muted">A day off logging doesn't undo anything. Pick up from here.</span></div>
            <button className="x" aria-label="Dismiss" onClick={() => setDismissedMissed(true)}><Icon name="x" size={12} stroke={3} /></button>
          </div>
        )}

        {prompt === 'suggest' && promptOk && suggest && (
          <div className="card dayopt">
            <div className="t">{suggest.up ? '' : 'Weeks vary. '}Your logged sessions over the last 4 weeks
              fit <b>{ACTIVITY[suggest.level].label.replace(/ \(.*\)$/, '')}</b> best.
              {suggest.up ? ' Want to update your activity level to match?' : ' If you do more than you log, your current setting may still be right. Want to update it?'}</div>
            <div className="chips">
              <button className="chip" onClick={() => {
                setPrefs({ activityLevel: suggest.level, activityAsked: cur, activityMult: undefined })
                showToast('Activity level updated. Your targets only change if you choose to.')
                openProfile('metrics')
              }}>Update</button>
              <button className="chip" onClick={() => setPrefs({ activityAsked: cur })}>Keep as is</button>
            </div>
          </div>
        )}

        {prompt === 'burn' && promptOk && (
          <div className="banner">
            <span style={{ color: 'var(--food-ink)' }}><Icon name="info" /></span>
            <div><b>Your range on workout days has changed.</b><br /><span className="muted">{p.activityLevel === 'sedentary'
              ? 'Workouts now add only the energy above what you use at rest, so they are no longer counted twice. '
              : 'It now leaves workouts out, because your activity level already includes your training. '}
              Past days are unchanged.</span></div>
            <button className="x" aria-label="Dismiss" onClick={() => setPrefs({ burnNoteSeen: true })}><Icon name="x" size={12} stroke={3} /></button>
          </div>
        )}

        {due.length > 0 && shown('plan-review') && (
          <button className="banner" onClick={() => setSheet({ k: 'plans' })}>
            <span style={{ color: 'var(--mind-ink)' }}><Icon name="bulb" /></span>
            <div><b>How are your plans going?</b><br />
              <span className="muted">A 10-second check-in on {due.length === 1 ? 'your plan' : `${due.length} plans`}. Plans work best when you revisit them.</span></div>
          </button>
        )}

        {/* ---------- Food ---------- */}
        {on.food && <section className="card pcard" aria-labelledby="sum-food">
          <div className="ph">
            <h2 id="sum-food" className="pk" style={{ color: 'var(--food-ink)' }}>Food</h2>
            <button className="linkbtn" onClick={() => setTab('food')}>Open</button>
          </div>
          {yes ? (
            // ob9-2, Yes: totals in words, no target, no "room left"
            <div {...pressable(() => setTab('food'))} aria-label="Open Food" className="f9">
              <div className="kbig w">{FOOD9.meals(mw.slots.length)}</div>
              <div className="f9-s">{mw.slots.length ? FOOD9.withProtein(mw.withProtein, mw.slots.length) : FOOD9.empty}</div>
            </div>
          ) : some && gentle ? (
            // ob9-2, Sometimes for its first 14 days (and after "Keep it on Food"): words, the range on Food
            <div className="f9">
              <div {...pressable(() => setTab('food'))} aria-label="Open Food" className="f9">
                <div className="kbig w">{st.gentle}</div>
                <div className="f9-s">{FOOD9.slots(mw.slots, mw.withProtein)}</div>
              </div>
              {/* pregnant or breastfeeding: Food shows no range, so there's none to point to */}
              {!p.pregnancy?.flagged && <button className="linkbtn f9-link" onClick={() => setTab('food')}>{FOOD9.seeRange}</button>}
            </div>
          ) : (
            <>
              <div {...pressable(() => setTab('food'))} aria-label="Open Food">
                {gentle ? (
                  <div className="kbig w">{st.gentle}</div>
                ) : (
                  <div className="kbig"><span className="num">{fmt(t.k)}</span><small className="num">of {fmt(r.lo)}–{fmt(r.hi)} kcal</small></div>
                )}
                <KcalBar k={t.k} lo={r.lo} hi={r.hi} />
              </div>
              {!gentle && (
                <div className="pline num">
                  {/* Sometimes: the range only, never a number to aim at */}
                  <span>{some ? st.gentle : st.word}</span>
                  {t.k > 0 && (
                    <>{' · '}<button className="linkbtn inl num" aria-label="About this estimate" onClick={() => setSheet({ k: 'margin' })}>give or take {margin}</button></>
                  )}
                </div>
              )}
              {some
                ? pRange && <div className="pline num">{FOOD9.proteinRange(Math.round(t.p), pRange.low, pRange.high)}</div>
                : <MacroTrio p={t.p} c={t.c} f={t.f} tp={tg.p} tc={tg.c} tf={tg.f} />}
            </>
          )}
          <button className="btn gray" onClick={() => setSheet({ k: 'add' })}><Icon name="plus" size={18} stroke={2.6} />{yes ? FOOD9.logMeal : 'Add food'}</button>
        </section>}

        {flags.length > 0 && on.food && shown('quick-check') && (
          <div className="list">
            <div style={{ padding: '14px 16px 6px' }}>
              <CatHead color="mind" icon="target" label="Worth a quick check" />
              <div className="sub">{flags.length === 1 ? 'This estimate moves' : 'These estimates move'} your total the most. A quick tweak keeps your numbers honest.</div>
            </div>
            {flags.slice(0, 3).map(({ x, i }) => (
              <button className="li" key={i} onClick={() => setSheet({ k: 'edit', i })}>
                <div className="m"><div className="t">{x.n}</div>
                  <div className="s">{x.how ? CAPTURE_LABEL[x.how] : 'Estimate'}{gentle ? '' : ` · ± ${fmt(x.k * entryErr(x))} kcal`}</div></div>
                <span className="tr" style={{ color: 'var(--tint)' }}>Adjust</span>
              </button>
            ))}
          </div>
        )}

        {on.food && (us.length > 0 || same) && (
          <div>
            <div className="lbl">Your usual {MEAL_LABEL[meal].toLowerCase()}</div>
            <div className="list">
              {same && (
                <div className="li wb-same" {...pressable(() => repeatYesterday(meal))}>
                  <div className="m"><div className="t">{SAME_AS_YESTERDAY}</div>
                    <div className="s num wrap">{same.sub}</div></div>
                  <span className="addc"><Icon name="plus" size={16} stroke={2.8} /></span>
                </div>
              )}
              {us.map((u) => (
                <div className="li" key={u.n} {...pressable(() => logEntries(usualEntries(data, u.n, meal)))}>
                  <div className="m"><div className="t">{u.n}</div>
                    <div className="s">{portionText(u.last)}{gentle ? '' : ` · ${fmt(u.last.k)} kcal`}</div></div>
                  <span className="addc"><Icon name="plus" size={16} stroke={2.8} /></span>
                </div>
              ))}
            </div>
            {us.length > 0 && <div className="foot">Logged {us[0].count} times recently. One tap adds your usual portion.</div>}
          </div>
        )}

        {/* ---------- Move ---------- */}
        {on.move && <section className="card pcard" aria-labelledby="sum-move">
          <h2 id="sum-move" className="pk" style={{ color: 'var(--move-ink)' }}>Move</h2>
          <div className="mv" {...pressable(() => setTab('train'))}>
            <span className="psq lg" style={{ background: 'var(--move-fill)' }}><Icon name={isRest ? 'leaf' : logged ? 'checkc' : 'dumbbell'} size={24} /></span>
            <span className="m">
              <span className="pt b">{moveTitle}</span>
              <span className="ps">{lighterMove ? `${moveSub} · ${LIGHTER_CHOICES}` : moveSub}</span>
            </span>
            {!logged && !isRest
              ? <button className="btn sm" onClick={(e) => { e.stopPropagation(); openTrain(first!) }}>Start</button>
              : <Chevron />}
          </div>
        </section>}

        {/* ---------- Weight + supplements ---------- */}
        {((!quiet && on.food) || supps.length > 0) && (
          <div className="tiles">
            {!quiet && on.food && !fv.weightBack && (
              // Onboarding 9: weigh-ins still work, but no weight or trend is shown back
              <div className="tile st" {...pressable(() => setSheet({ k: 'weight' }))}>
                <span className="tk">Weight</span>
                <span className="v"><span className="w">{day.weight ? 'Logged' : 'Add'}</span></span>
                <span className="s">{day.weight ? 'Today' : 'Whenever it suits you'}</span>
              </div>
            )}
            {!quiet && on.food && fv.weightBack && wb && hard && (
              // a hard day (R5, R6): the last weigh-in and when it was; no weekly change, no sparkline
              <div className="tile st" {...pressable(() => setSheet({ k: 'weight' }))}>
                <span className="tk">Weight</span>
                <span className="v num">{lastW ? <>{r1(lastW.kg)}<small>kg</small></> : <span className="w">Add</span>}</span>
                <span className="s">{weighInSub(lastW?.d, cur)}</span>
              </div>
            )}
            {!quiet && on.food && fv.weightBack && !(wb && hard) && (
              <div className="tile st" {...pressable(() => setSheet({ k: 'weight' }))}>
                <span className="tk">Weight</span>
                <span className="v num">{day.weight ? <>{r1(day.weight)}<small>kg</small></> : weights.length ? <>{r1(weights[weights.length - 1])}<small>kg</small></> : <span className="w">Add</span>}</span>
                {weights.length > 1 && <div style={{ marginTop: 6 }}><Sparkline values={weights} w={120} h={26} color="var(--body-ink)" /></div>}
                <span className="s">{wDelta == null ? (day.weight ? 'Today' : 'Weekly trend appears here') : `${wDelta > 0 ? '+' : wDelta < 0 ? '−' : ''}${Math.abs(wDelta)} kg vs last week`}</span>
              </div>
            )}
            {supps.length > 0 && (
              <div className="tile st">
                <span className="tk">Supplements<span className="num">{suppsTaken} of {supps.length}</span></span>
                <div className="supps">
                  {supps.map((s) => (
                    <button key={s.id} aria-pressed={!!day.supps[s.id]} onClick={() => toggleSupp(s.id)}>
                      <span className={'chk sm' + (day.supps[s.id] ? ' on' : '')}>{day.supps[s.id] && <Icon name="check" size={11} stroke={3.6} />}</span>
                      <span className="n">{s.name}</span>
                      <span className="tm num">{s.time}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------- This week ---------- */}
        <section className="card pcard" aria-labelledby="sum-week">
          <div className="ph">
            <h2 id="sum-week" className="pk2">This week</h2>
            <span className="sub num" style={{ fontSize: 13 }}>{weekSpan(rows[0].d, rows[6].d)}</span>
          </div>
          <div>
            <div className="sk">Energy</div>
            <div className="wline">{energyLine}</div>
          </div>
          <div>
            <WeekBars rows={rows} lo={baseLo} hi={baseHi} cur={cur} numbers={!gentle} band={!yes} />
            <div className="wkey">
              <span><i className="bar" />Eaten{gentle ? '' : ', kcal'}</span>
              {!yes && <span><i className="band" /><span>Your range{gentle ? '' : <span className="num"> {fmt(baseLo)}–{fmt(baseHi)}</span>}{rows.some((x) => x.r.hi !== baseHi) ? ', higher on workout days' : ''}</span></span>}
            </div>
          </div>
          <div className="stat3">
            <div>
              <div className="sk">Protein</div>
              {ws.logged >= 2
                ? <><div className="sv num">{fmt(ws.avgP)} g</div><div className="ss">{dl == null ? 'a day' : Math.abs(dl) >= 5 ? `a day, ${dl > 0 ? 'up' : 'down'} ${Math.abs(dl)} g` : 'a day, steady'}</div></>
                : <><div className="sv num">–</div><div className="ss">after 2 days</div></>}
            </div>
            <div>
              <div className="sk">Workouts</div>
              {ws.planned
                ? <><div className="sv num">{ws.done} of {ws.planned}</div><div className="ss">{ws.done >= ws.planned ? 'planned. Nice work' : 'planned so far'}</div></>
                : <><div className="sv num">{ws.done}</div><div className="ss">none planned</div></>}
            </div>
            <div {...pressable(() => setTab('food'))} aria-label={`${loggedDays} of ${past.length} days logged this week`}>
              <div className="sk">Logged</div>
              <div className="sv num">{loggedDays} of {past.length}</div>
              <div className="dots">{rows.map((x) => <i key={x.d} className={x.logged ? 'on' : x.future ? 'fu' : ''} />)}</div>
            </div>
          </div>
        </section>
      </div>

      {sheet?.k === 'weight' && <WeightSheet onClose={() => setSheet(null)} />}
      {reask && <LazyPregnancyCheckSheet mode="checkin" onClose={() => setReask(false)} onAnswers={() => { setReask(false); openProfile('health-answers') }} />}
      {foodAsk && <FoodAskSheet ask={foodAsk} onClose={() => setFoodAsk(null)} />}
      {ifThen && ifThenDue && <FirstPlanSheet onDone={() => { setIfThen(false); setPrefs({ ifThenOffered: true }) }} />}
      {sheet?.k === 'checkin' && <CheckinSheet onClose={() => setSheet(null)} />}
      {sheet?.k === 'margin' && <MarginSheet onClose={() => setSheet(null)} />}
      {sheet?.k === 'plans' && <PlanReviewSheet onClose={() => setSheet(null)} />}
      {sheet?.k === 'edit' && <EditEntrySheet index={sheet.i} onClose={() => setSheet(null)} />}
      {sheet?.k === 'add' && <AddFoodSheet onClose={() => setSheet(null)} />}
      {sheet?.k === 'thing-plan' && <ThingPlanSheet thing={sheet.thing} onClose={() => setSheet(null)} />}
      {sheet?.k === 'support' && <SupportSheet onClose={() => setSheet(null)} />}
    </div>
  )
}
