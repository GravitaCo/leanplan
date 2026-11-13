/**
 * Summary, rebuilt for the spike from src/screens/TodayScreen.tsx: the same store, the same core
 * functions and the same words, so the numbers equal the web's for the same data. Covered: the
 * header, the week strip, Mind (the check-in row), Food (all three food views), Move and Weight,
 * and This week. Left for N4 (Today): the wellbeing Mind card with the one thing, banners and the
 * asks budget, quick checks, usuals, supplements, the weekly review and every sheet.
 */
import type { ReactNode } from 'react'
import { Alert, ScrollView, Text, View } from 'react-native'
import { selectAskCtx, useStore } from '@/store/store'
import { healthLoggingAllowed, quietNumbers } from '@/data/consent'
import { plannedKeys } from '@/core/domain/plans'
import { keyTitle, templateFor } from '@/core/domain/routines'
import { dayMonthOf, fmt, fmtDate, r1, shiftDay, todayStr } from '@/core/domain/date'
import { dayTotals } from '@/core/domain/nutrition'
import { builtinType, workoutsOf } from '@/core/domain/sessions'
import { dayMargin } from '@/core/domain/estimate'
import { HUNGER, MOODS, dayOf, dayStat, energyStatus, rangeExtra, rangeFor, weekOf, weekSummary, latestWeight } from '@/core/domain/insights'
import { loopSafety, weightRow } from '@/core/domain/maintenanceLoop'
import { weightTileWords } from '@/core/domain/loopCopy'
import { foodView, mealWords, proteinRangeFor } from '@/core/domain/foodMode'
import { offerLighter } from '@/core/domain/dayOptions'
import { WELLBEING_ENABLED } from '@/data/wellbeingFlag'
import { pillarsOn } from '@/screens/today/summary'
import { LIGHTER_CHOICES } from '@/screens/today/summaryCopy'
import { FOOD9 } from '@/screens/onboarding/copyApp'
import { Card, Btn, LinkBtn, Tile } from './ui/kit'
import { PageHeader } from './ui/primitives'
import { Chevron, Icon } from './ui/icons'
import { KcalBar, MacroTrio, WeekBars } from './ui/charts'
import { WeekStrip } from './ui/WeekStrip'
import { font, num, useTokens } from './theme'

const kgOf = (s: { days: Record<string, { weight: number | null }> }, d: string | undefined) => (d ? s.days[d]?.weight ?? null : null)
const later = (what: string) => () => Alert.alert(what, 'Not in the spike yet: it arrives with its feature stream.')

/** "22–28 Sept", or "29 Sept – 5 Oct" across a month end (as TodayScreen's weekSpan). */
function weekSpan(a: string, b: string): string {
  const d = (x: string, o: Intl.DateTimeFormatOptions) => new Date(x + 'T12:00').toLocaleDateString('en-GB', o)
  return d(a, { month: 'short' }) === d(b, { month: 'short' })
    ? `${d(a, { day: 'numeric' })}–${d(b, { day: 'numeric', month: 'short' })}`
    : `${d(a, { day: 'numeric', month: 'short' })} – ${d(b, { day: 'numeric', month: 'short' })}`
}

export function Summary() {
  const t = useTokens()
  const data = useStore((s) => s.data)
  const cur = useStore((s) => s.cur)

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
  const isToday = cur === todayStr()
  const f = fmtDate(cur)

  const sess = workoutsOf(day, cur)
  const planned = plannedKeys(data, cur)
  const first = planned[0]
  const logged = sess.length > 0
  const isRest = !logged && !first

  const rows = weekOf(cur).map((d) => dayStat(data, d))
  const past = rows.filter((x) => !x.future)
  const ws = weekSummary(data, rows)
  const consent = healthLoggingAllowed(data)
  const lastW = Object.keys(data.days).filter((d) => d <= cur && data.days[d]?.weight).sort().pop()
  const wSafety = loopSafety(data, kgOf(data, lastW), consent)
  const wRow = isToday ? weightRow(data, cur, 0, wSafety) : null
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

  const wb = WELLBEING_ENABLED
  const on = pillarsOn(wb ? p.mind?.off : undefined)
  const ctx0 = wb && isToday ? selectAskCtx({ data }, cur) : null
  const hard = !!ctx0?.hard
  const lighterMove = wb && !logged && !isRest &&
    offerLighter(day.checkin, Object.keys(data.days).filter((d) => d < cur).sort().reverse().map((d) => data.days[d]?.checkin))

  const T = (s: object, children: ReactNode, extra?: object) => <Text style={[s, extra]}>{children}</Text>
  const b600 = [font(600), num, { color: t.label }]
  const energyLine: ReactNode = ws.logged >= 2
    ? gentle
      ? `You logged on ${ws.logged} days this week.${ws.inRange && !yes ? ` ${ws.inRange} landed in your range.` : ''}`
      : <>You averaged <Text style={b600}>{fmt(ws.avgK)} kcal</Text> on the {ws.logged} days you logged, and {ws.inRange} {ws.inRange === 1 ? 'was' : 'were'} in your range.</>
    : 'Log a couple of days and your weekly picture fills in here. Averages say far more than any single day.'

  const showWeight = !quiet && on.food
  const showMove = on.move
  // .psq: the icon in --label (20 pt: the web's `svg.i` size wins over the 18 or 24 it asks for)
  const moveIcon = <Icon name={isRest ? 'leaf' : logged ? 'checkc' : 'dumbbell'} color={t.label} />
  const pk = (color: string, label: string) => T([font(600), { fontSize: 13, color }], label)
  const sub = { fontSize: 13, color: t.label2 }

  const weightTile = !fv.weightBack || p.reviewWeight !== true ? (
    <Tile onPress={later('Weight')} label="Weight" style={{ flex: 1 }}>
      {T([font(600), sub], 'Weight')}
      {T([font(600), { fontSize: 19, color: t.label, marginTop: 2 }], day.weight ? 'Logged' : 'Add')}
      {T([font(400), { fontSize: 12, color: t.label2 }], day.weight ? 'Today' : 'Whenever it suits you')}
    </Tile>
  ) : (
    <Tile onPress={later('Weight')} label="Weight" style={{ flex: 1 }}>
      {T([font(600), sub], 'Weight')}
      {lastW
        ? <Text style={[font(600), num, { fontSize: 26, letterSpacing: -0.5, color: t.label, marginTop: 2 }]}>{r1(data.days[lastW].weight!)}<Text style={[font(600), { fontSize: 15, color: t.label2 }]}>kg</Text></Text>
        : T([font(600), { fontSize: 19, color: t.label, marginTop: 2 }], 'Add')}
      {T([font(400), { fontSize: 12, color: t.label2 }], lastW ? (lastW === cur ? 'Today' : lastW > shiftDay(cur, -7) ? fmtDate(lastW).dow : dayMonthOf(lastW)) : 'Whenever it suits you')}
      {/* .wt-trend (loop.css) */}
      {wRow && !hard ? T([font(500), { fontSize: 13, lineHeight: 17, color: t.label, marginTop: 6 }], weightTileWords(wRow)) : null}
    </Tile>
  )

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
      <PageHeader eyebrow={`${isToday ? 'Today' : f.dow} · ${f.full.split(' ').slice(0, 2).join(' ')}`} title="Summary" />
      <WeekStrip />

      <View style={{ gap: 14 }}>
        {/* ---------- Mind (the check-in row; the wellbeing Mind card is N4) ---------- */}
        {on.mind && (
          <Tile onPress={later('Check-in')} label="Mind" style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: t.mindFill, alignItems: 'center', justifyContent: 'center' }}><Icon name="smile" color={t.label} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              {pk(t.mindInk, 'Mind')}
              {T([font(600), { fontSize: 17, color: t.label }], day.checkin?.mood ? `Feeling ${MOODS[day.checkin.mood - 1].toLowerCase()}` : day.checkin ? 'Checked in' : isToday ? 'How are you today?' : 'How was this day?')}
              {T([font(400), { fontSize: 13, color: t.label2 }], day.checkin
                ? day.checkin.hunger ? `Hunger: ${HUNGER[day.checkin.hunger - 1]} · tap to update` : 'Tap to update your check-in'
                : 'Mood, sleep, stress and energy · 20 seconds')}
            </View>
            <Chevron color={t.label3} />
          </Tile>
        )}

        {/* ---------- Food ---------- */}
        {on.food && (
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              {pk(t.foodInk, 'Food')}
              <LinkBtn title="Open" onPress={later('Food')} />
            </View>
            {yes ? (
              <View>
                {T([font(600), { fontSize: 24, lineHeight: 29, color: t.label }], FOOD9.meals(mw.slots.length))}
                {T([font(400), { fontSize: 15, color: t.label2, marginTop: 4 }], mw.slots.length ? FOOD9.withProtein(mw.withProtein, mw.slots.length) : FOOD9.empty)}
              </View>
            ) : some && gentle ? (
              <View>
                {T([font(600), { fontSize: 24, lineHeight: 29, color: t.label }], st.gentle)}
                {T([font(400), { fontSize: 15, color: t.label2, marginTop: 4 }], FOOD9.slots(mw.slots, mw.withProtein))}
                {!p.pregnancy?.flagged && <LinkBtn title={FOOD9.seeRange} onPress={later('Food')} style={{ fontSize: 14, marginTop: 8 }} />}
              </View>
            ) : (
              <>
                <View style={{ gap: 14 }}>
                  {gentle
                    ? T([font(600), { fontSize: 24, lineHeight: 29, color: t.label }], st.gentle)
                    : (
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                        <Text style={[font(600), num, { fontSize: 44, lineHeight: 46, letterSpacing: -1.3, color: t.label }]}>{fmt(tot.k)}</Text>
                        <Text style={[font(400), num, { fontSize: 15, color: t.label2 }]}>of {fmt(r.lo)}–{fmt(r.hi)} kcal</Text>
                      </View>
                    )}
                  <KcalBar k={tot.k} lo={r.lo} hi={r.hi} />
                </View>
                {!gentle && (
                  <Text style={[font(400), num, { fontSize: 13, lineHeight: 18, color: t.label2 }]}>
                    {some ? st.gentle : st.word}
                    {tot.k > 0 && <>{' · '}<Text onPress={later('About this estimate')} style={{ color: t.tint }}>give or take {margin}</Text></>}
                  </Text>
                )}
                {some
                  ? pRange && T([font(400), num, { fontSize: 13, color: t.label2 }], FOOD9.proteinRange(Math.round(tot.p), pRange.low, pRange.high))
                  : <MacroTrio p={tot.p} c={tot.c} f={tot.f} tp={tg.p} tc={tg.c} tf={tg.f} />}
              </>
            )}
            {/* .pcard .btn.gray: 48 high, 16 pt */}
            <Btn kind="gray" title={yes ? FOOD9.logMeal : 'Add food'} onPress={later('Add food')} style={{ height: 48, borderRadius: 24 }} textStyle={{ fontSize: 16 }}
              icon={<Icon name="plus" size={20} stroke={2.6} color={t.label} />} />
          </Card>
        )}

        {/* ---------- Move and Weight ---------- */}
        {showWeight && !showMove && <View style={{ flexDirection: 'row' }}><View style={{ flex: 1 }}>{weightTile}</View></View>}
        {showWeight && showMove ? (
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'stretch' }}>
            <Tile style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                {pk(t.moveInk, 'Move')}
                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: t.moveFill, marginTop: -4, marginRight: -2, alignItems: 'center', justifyContent: 'center' }}>{moveIcon}</View>
              </View>
              <View style={{ flex: 1, justifyContent: 'flex-end', gap: 4, paddingTop: 12 }}>
                {T([font(600), { fontSize: 19, lineHeight: 23, color: t.label }], moveTitle)}
                {T([font(400), { fontSize: 12, color: t.label2 }], lighterMove ? `${moveSub} · ${LIGHTER_CHOICES}` : moveSub)}
              </View>
              {/* .tile.mvt .btn.sm: 32 high, 14 pt */}
              {!logged && !isRest && <View style={{ marginTop: 10 }}><Btn small title="Start" onPress={later('Train')} style={{ height: 32, borderRadius: 16, paddingHorizontal: 14 }} textStyle={{ fontSize: 14 }} /></View>}
            </Tile>
            <View style={{ flex: 1 }}>{weightTile}</View>
          </View>
        ) : showMove && (
          <Card>
            {pk(t.moveInk, 'Move')}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: t.moveFill, alignItems: 'center', justifyContent: 'center' }}>{moveIcon}</View>
              <View style={{ flex: 1 }}>
                {T([font(600), { fontSize: 17, color: t.label }], moveTitle)}
                {T([font(400), { fontSize: 13, color: t.label2 }], lighterMove ? `${moveSub} · ${LIGHTER_CHOICES}` : moveSub)}
              </View>
              {/* .mv .btn.sm: 40 high */}
              {!logged && !isRest ? <Btn small title="Start" onPress={later('Train')} style={{ height: 40, borderRadius: 20, paddingHorizontal: 18 }} /> : <Chevron color={t.label3} />}
            </View>
          </Card>
        )}

        {/* ---------- This week ---------- */}
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            {T([font(600), { fontSize: 17, color: t.label }], 'This week')}
            {T([font(400), num, { fontSize: 13, color: t.label2 }], weekSpan(rows[0].d, rows[6].d))}
          </View>
          {on.food && (
            <View>
              {T([font(400), sub], 'Energy')}
              {T([font(400), { fontSize: 15, lineHeight: 21, color: t.label, marginTop: 2 }], energyLine)}
            </View>
          )}
          {on.food && (
            <View>
              <WeekBars rows={rows} lo={baseLo} hi={baseHi} cur={cur} numbers={!gentle} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 4, marginTop: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 8, height: 12, borderRadius: 3, backgroundColor: t.energy }} />
                  {T([font(400), sub], `Eaten${gentle ? '' : ', kcal'}`)}
                </View>
                {!yes && T([font(400), num, sub], `Your range${gentle ? '' : ` ${fmt(baseLo)}–${fmt(baseHi)}`}${rows.some((x) => x.r.hi !== baseHi) ? ', higher on workout days' : ''}`)}
              </View>
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: 14, borderTopWidth: 1, borderTopColor: t.sep, paddingTop: 14 }}>
            {on.food && (
              <View style={{ flex: 1 }}>
                {T([font(400), sub], 'Protein')}
                {ws.logged >= 2
                  ? <>{T([font(600), num, { fontSize: 20, color: t.label, marginTop: 2 }], `${fmt(ws.avgP)} g`)}{T([font(400), { fontSize: 12, color: t.label2, marginTop: 1 }], dl == null ? 'a day' : Math.abs(dl) >= 5 ? `a day, ${dl > 0 ? 'up' : 'down'} ${Math.abs(dl)} g` : 'a day, steady')}</>
                  : <>{T([font(600), num, { fontSize: 20, color: t.label, marginTop: 2 }], '–')}{T([font(400), { fontSize: 12, color: t.label2, marginTop: 1 }], 'after 2 days')}</>}
              </View>
            )}
            <View style={{ flex: 1 }}>
              {T([font(400), sub], 'Workouts')}
              {workoutsDone
                ? <>{T([font(600), num, { fontSize: 20, color: t.label, marginTop: 2 }], workoutsDone)}{T([font(400), { fontSize: 12, color: t.label2, marginTop: 1 }], 'done this week')}</>
                : <>{T([font(600), { fontSize: 20, color: t.label, marginTop: 2 }], 'None yet')}{T([font(400), { fontSize: 12, color: t.label2, marginTop: 1 }], 'this week')}</>}
            </View>
            {on.food && (
              <View style={{ flex: 1 }}>
                {T([font(400), sub], 'Logged')}
                {T([font(600), num, { fontSize: 20, color: t.label, marginTop: 2 }], ws.logged === 1 ? '1 day' : `${ws.logged} days`)}
              </View>
            )}
          </View>
        </Card>
      </View>
    </ScrollView>
  )
}
