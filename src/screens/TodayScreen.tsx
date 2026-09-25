/**
 * Summary (Studio): the three pillars in order. Mind first (the day's check-in), then Food
 * (the day against its range, macros, quick checks and usuals), then Move (today's session),
 * then weight and supplements, and the week against the target range.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { useStore } from '@/store/store'
import type { WorkoutType } from '@/core/types'
import { plannedOn } from '@/core/domain/week'
import { fmt, fmtDate, r1, shiftDay, todayStr } from '@/core/domain/date'
import { dayTotals } from '@/core/domain/nutrition'
import { activitySuggestion, markActivityShown } from '@/core/domain/activity'
import { sessionsOf } from '@/core/domain/sessions'
import { ACTIVITY } from '@/core/data/constants'
import { WORKOUTS } from '@/core/data/workouts'
import { CAPTURE_LABEL, dayMargin, entryErr, flaggedEntries, portionText } from '@/core/domain/estimate'
import {
  HUNGER, MEAL_LABEL, MOODS, dayOf, dayStat, energyStatus, mealNow, plansDue, rangeFor, rangeWidth, showBurnNote,
  usualEntries, usuals, weekOf, weekSummary, weightSeries, weightWeekDelta,
} from '@/core/domain/insights'
import { PageHeader, CatHead, pressable } from '@/ui/primitives'
import { Icon, Chevron } from '@/ui/icons'
import { KcalBar, MacroTrio, Sparkline, WeekBars } from '@/ui/charts'
import { WeekStrip } from '@/ui/WeekStrip'
import { WeightSheet } from './body/WeightSheet'
import { EditEntrySheet } from './food/EditEntrySheet'
import { AddFoodSheet } from './food/AddFoodSheet'
import { MarginSheet } from './food/MarginSheet'
import { CheckinSheet } from './today/CheckinSheet'
import { PlanReviewSheet } from './plan/PlanSheets'

type SheetKind = { k: 'weight' } | { k: 'checkin' } | { k: 'margin' } | { k: 'plans' } | { k: 'edit'; i: number } | { k: 'add' } | null

function initials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

export function TodayScreen() {
  const data = useStore((s) => s.data)
  const cur = useStore((s) => s.cur)
  const sync = useStore((s) => s.sync)
  const authed = useStore((s) => s.authed)
  const setTab = useStore((s) => s.setTab)
  const toggleSupp = useStore((s) => s.toggleSupp)
  const logEntries = useStore((s) => s.logEntries)
  const runSync = useStore((s) => s.runSync)
  const setPrefs = useStore((s) => s.setPrefs)
  const showToast = useStore((s) => s.showToast)
  const openProfile = useStore((s) => s.openProfile)
  const [sheet, setSheet] = useState<SheetKind>(null)
  const [dismissedMissed, setDismissedMissed] = useState(false)

  const p = data.profile
  const gentle = !!p.gentle
  const day = dayOf(data, cur)
  const t = dayTotals(day)
  const tg = data.target
  const r = rangeFor(data, cur)
  const st = energyStatus(t.k, r)
  const margin = dayMargin(day.foods)
  const flags = flaggedEntries(day.foods, p)
  const isToday = cur === todayStr()
  const f = fmtDate(cur)

  const sess = sessionsOf(day, cur)
  // anything unknown in the schedule reads as Rest (see plannedOn)
  const sched = plannedOn(data.schedule, f.idx)
  const openTrain = useStore((s) => s.openTrain)
  const logged = sess.length > 0
  const isRest = !logged && sched === 'Rest'

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
  useEffect(() => {
    if (suggestShown && markActivityShown(data, cur)) setPrefs({ activityShown: cur })
  }, [suggestShown?.level, cur]) // eslint-disable-line react-hooks/exhaustive-deps

  const rows = weekOf(cur).map((d) => dayStat(data, d))
  const past = rows.filter((x) => !x.future)
  const ws = weekSummary(data, rows)
  const weights = weightSeries(data, cur, 14)
  const wDelta = weightWeekDelta(data, cur)
  const supps = p.supplements || []
  const baseLo = tg.kcal - rangeWidth(p), baseHi = tg.kcal + rangeWidth(p)
  const syncLabel = !authed ? 'not syncing' : sync === 'syncing' ? 'syncing…' : sync === 'error' ? 'sync error' : sync === 'offline' ? 'offline' : sync === 'synced' ? 'synced' : ''

  // Move card: what today holds (a logged session wins over the plan)
  const plan = WORKOUTS[sched]
  const moveTitle = logged
    ? sess.length > 1 ? `${sess.length} sessions` : sess[0].title || ((sess[0].routineId || '').replace('builtin-', ''))
    : isRest ? 'Rest day' : plan?.title || sched
  const moveSub = logged
    ? sess.length > 1 ? 'Logged today' : sess[0].modality === 'strength' ? 'Logged' : `Logged${sess[0].mins ? ` · ${sess[0].mins} min` : ''}`
    : isRest ? 'Recovery counts too'
    : sched === 'Cardio' ? (plan?.ex[0]?.t || 'Cardio') : plan ? `${plan.ex.length} exercises` : 'Planned'

  const loggedDays = past.filter((x) => x.logged).length
  const dl = ws.prevAvgP != null ? Math.round(ws.avgP - ws.prevAvgP) : null
  const energyLine: ReactNode = ws.logged >= 2
    ? gentle
      ? <>You logged on {ws.logged} days this week.{ws.inRange ? ` ${ws.inRange} of them landed in your range.` : ''}</>
      : <>You averaged <b className="num">{fmt(ws.avgK)} kcal</b> on the {ws.logged} days you logged, and {ws.inRange} {ws.inRange === 1 ? 'was' : 'were'} in your range.</>
    : <>Log a couple of days and your weekly picture fills in here. Averages say far more than any single day.</>
  const suppsTaken = supps.filter((s) => day.supps[s.id]).length

  // conditional prompts share one slot under Mind, most time-sensitive first;
  // the plans review is time-sensitive too, so it shows alongside rather than waiting
  const burnNote = showBurnNote(data) && !gentle
  const prompt: 'missed' | 'suggest' | 'burn' | null =
    missed ? 'missed' : suggest ? 'suggest' : burnNote ? 'burn' : null

  return (
    <div className="screen">
      <PageHeader
        eyebrow={<>{isToday ? 'Today' : f.dow} · {f.full.split(' ').slice(0, 2).join(' ')}
          {syncLabel && <button className="navbtn" style={{ fontSize: 13, color: 'var(--label3)' }} onClick={() => runSync()}>{syncLabel}</button>}</>}
        title="Summary"
        right={<button className="avatar" aria-label="Profile" onClick={() => setTab('profile')}>{initials(p.name) || <Icon name="person" />}</button>}
      />
      <WeekStrip />

      <div className="pillars">
        {/* ---------- Mind ---------- */}
        <button className="card pcard mind-row" onClick={() => setSheet({ k: 'checkin' })}>
          <span className="psq" style={{ background: 'var(--mind-fill)' }}><Icon name="smile" size={20} /></span>
          <span className="m">
            <span className="pk" style={{ color: 'var(--mind-ink)' }}>Mind</span>
            <span className="pt">{day.checkin?.mood ? `Feeling ${MOODS[day.checkin.mood - 1].toLowerCase()}` : day.checkin ? 'Checked in' : isToday ? 'How are you today?' : 'How was this day?'}</span>
            <span className="ps">{day.checkin
              ? day.checkin.hunger ? `Hunger: ${HUNGER[day.checkin.hunger - 1]} · tap to update` : 'Tap to update your check-in'
              : 'Mood, sleep, stress and energy · 20 seconds'}</span>
          </span>
          <Chevron />
        </button>

        {prompt === 'missed' && (
          <div className="banner">
            <span style={{ color: 'var(--mind-ink)' }}><Icon name="leaf" /></span>
            <div><b>Welcome back.</b><br /><span className="muted">A day off logging doesn't undo anything. Pick up from here.</span></div>
            <button className="x" aria-label="Dismiss" onClick={() => setDismissedMissed(true)}><Icon name="x" size={12} stroke={3} /></button>
          </div>
        )}

        {prompt === 'suggest' && suggest && (
          <div className="card dayopt">
            <div className="t">{suggest.up ? '' : 'Weeks vary. '}Your logged sessions over the last 4 weeks
              fit <b>{ACTIVITY[suggest.level].label.replace(/ \(.*\)$/, '')}</b> best.
              {suggest.up ? ' Want to update your activity level to match?' : ' If you do more than you log, your current setting may still be right. Want to update it?'}</div>
            <div className="chips">
              <button className="chip" onClick={() => {
                setPrefs({ activityLevel: suggest.level, activityAsked: cur })
                showToast('Activity level updated. Your targets only change if you choose to.')
                openProfile('metrics')
              }}>Update</button>
              <button className="chip" onClick={() => setPrefs({ activityAsked: cur })}>Keep as is</button>
            </div>
          </div>
        )}

        {prompt === 'burn' && (
          <div className="banner">
            <span style={{ color: 'var(--food-ink)' }}><Icon name="info" /></span>
            <div><b>Your range on workout days has changed.</b><br /><span className="muted">{p.activityLevel === 'sedentary'
              ? 'Workouts now add only the energy above what you use at rest, so they are no longer counted twice. '
              : 'It now leaves workouts out, because your activity level already includes your training. '}
              Past days are unchanged.</span></div>
            <button className="x" aria-label="Dismiss" onClick={() => setPrefs({ burnNoteSeen: true })}><Icon name="x" size={12} stroke={3} /></button>
          </div>
        )}

        {due.length > 0 && (
          <button className="banner" onClick={() => setSheet({ k: 'plans' })}>
            <span style={{ color: 'var(--mind-ink)' }}><Icon name="bulb" /></span>
            <div><b>How are your plans going?</b><br />
              <span className="muted">A 10-second check-in on {due.length === 1 ? 'your plan' : `${due.length} plans`}. Plans work best when you revisit them.</span></div>
          </button>
        )}

        {/* ---------- Food ---------- */}
        <section className="card pcard" aria-labelledby="sum-food">
          <div className="ph">
            <h2 id="sum-food" className="pk" style={{ color: 'var(--food-ink)' }}>Food</h2>
            <button className="linkbtn" onClick={() => setTab('food')}>Open</button>
          </div>
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
              <span>{st.word}</span>
              {t.k > 0 && (
                <>{' · '}<button className="linkbtn inl num" aria-label="About this estimate" onClick={() => setSheet({ k: 'margin' })}>give or take {margin}</button></>
              )}
            </div>
          )}
          <MacroTrio p={t.p} c={t.c} f={t.f} tp={tg.p} tc={tg.c} tf={tg.f} />
          <button className="btn gray" onClick={() => setSheet({ k: 'add' })}><Icon name="plus" size={18} stroke={2.6} />Add food</button>
        </section>

        {flags.length > 0 && (
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

        {us.length > 0 && (
          <div>
            <div className="lbl">Your usual {MEAL_LABEL[meal].toLowerCase()}</div>
            <div className="list">
              {us.map((u) => (
                <div className="li" key={u.n} {...pressable(() => logEntries(usualEntries(data, u.n, meal)))}>
                  <div className="m"><div className="t">{u.n}</div>
                    <div className="s">{portionText(u.last)}{gentle ? '' : ` · ${fmt(u.last.k)} kcal`}</div></div>
                  <span className="addc"><Icon name="plus" size={16} stroke={2.8} /></span>
                </div>
              ))}
            </div>
            <div className="foot">Logged {us[0].count} times recently. One tap adds your usual portion.</div>
          </div>
        )}

        {/* ---------- Move ---------- */}
        <section className="card pcard" aria-labelledby="sum-move">
          <h2 id="sum-move" className="pk" style={{ color: 'var(--move-ink)' }}>Move</h2>
          <div className="mv" {...pressable(() => setTab('train'))}>
            <span className="psq lg" style={{ background: 'var(--move-fill)' }}><Icon name={isRest ? 'leaf' : logged ? 'checkc' : 'dumbbell'} size={24} /></span>
            <span className="m">
              <span className="pt b">{moveTitle}</span>
              <span className="ps">{moveSub}</span>
            </span>
            {!logged && !isRest
              ? <button className="btn sm" onClick={(e) => { e.stopPropagation(); openTrain(sched as WorkoutType) }}>Start</button>
              : <Chevron />}
          </div>
        </section>

        {/* ---------- Weight + supplements ---------- */}
        {(!gentle || supps.length > 0) && (
          <div className="tiles">
            {!gentle && (
              <div className="tile st" {...pressable(() => setSheet({ k: 'weight' }))}>
                <span className="tk">Weight</span>
                <span className="v num">{day.weight ? <>{r1(day.weight)}<small>kg</small></> : weights.length ? <>{r1(weights[weights.length - 1])}<small>kg</small></> : <span className="w">Add</span>}</span>
                {weights.length > 1 && <div style={{ marginTop: 6 }}><Sparkline values={weights} w={120} h={26} color="var(--body)" /></div>}
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
            <span className="sub" style={{ fontSize: 13 }}>{gentle ? 'Mon to Sun' : <span className="num">Range {fmt(baseLo)}–{fmt(baseHi)} kcal</span>}</span>
          </div>
          <div>
            <div className="sk">Energy</div>
            <div className="wline">{energyLine}</div>
          </div>
          <WeekBars rows={rows} lo={baseLo} hi={baseHi} cur={cur} />
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
      {sheet?.k === 'checkin' && <CheckinSheet onClose={() => setSheet(null)} />}
      {sheet?.k === 'margin' && <MarginSheet onClose={() => setSheet(null)} />}
      {sheet?.k === 'plans' && <PlanReviewSheet onClose={() => setSheet(null)} />}
      {sheet?.k === 'edit' && <EditEntrySheet index={sheet.i} onClose={() => setSheet(null)} />}
      {sheet?.k === 'add' && <AddFoodSheet onClose={() => setSheet(null)} />}
    </div>
  )
}
