/**
 * Summary (Apple Health style): activity rings for energy, protein and training; quick
 * checks on the estimates that move the total; one-tap usuals; pinned tiles; supplements;
 * and the week against the target range.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { useStore } from '@/store/store'
import { fmt, fmtDate, r1, shiftDay, todayStr } from '@/core/domain/date'
import { dayTotals } from '@/core/domain/nutrition'
import { activitySuggestion, markActivityShown } from '@/core/domain/activity'
import { ACTIVITY } from '@/core/data/constants'
import { CAPTURE_LABEL, dayMargin, entryErr, flaggedEntries, portionText } from '@/core/domain/estimate'
import {
  HUNGER, MEAL_LABEL, MOODS, dayOf, dayStat, energyStatus, mealNow, plansDue, rangeFor, rangeWidth, showBurnNote,
  usualEntries, usuals, weekOf, weekSummary, weightSeries, weightWeekDelta,
} from '@/core/domain/insights'
import { PageHeader, CatHead, Tile, pressable } from '@/ui/primitives'
import { Icon, Chevron } from '@/ui/icons'
import { Rings, Sparkline, WeekBars } from '@/ui/charts'
import { WeekStrip } from '@/ui/WeekStrip'
import { WeightSheet } from './body/WeightSheet'
import { EditEntrySheet } from './food/EditEntrySheet'
import { MarginSheet } from './food/MarginSheet'
import { CheckinSheet } from './today/CheckinSheet'
import { PlanReviewSheet } from './plan/PlanSheets'

type SheetKind = { k: 'weight' } | { k: 'checkin' } | { k: 'margin' } | { k: 'plans' } | { k: 'edit'; i: number } | null

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

  const wk = day.workout
  const sched = data.schedule[f.idx] || 'Rest'
  const logged = !!wk?.type
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
  useEffect(() => {
    if (suggest && markActivityShown(data, cur)) setPrefs({ activityShown: cur })
  }, [suggest?.level, cur]) // eslint-disable-line react-hooks/exhaustive-deps

  const rows = weekOf(cur).map((d) => dayStat(data, d))
  const past = rows.filter((x) => !x.future)
  const ws = weekSummary(data, rows)
  const weights = weightSeries(data, cur, 14)
  const wDelta = weightWeekDelta(data, cur)
  const supps = p.supplements || []
  const baseLo = tg.kcal - rangeWidth(p), baseHi = tg.kcal + rangeWidth(p)
  const syncLabel = !authed ? 'on this device' : sync === 'syncing' ? 'syncing…' : sync === 'error' ? 'sync error' : sync === 'offline' ? 'offline' : sync === 'synced' ? 'synced' : ''

  const activity = logged
    ? wk!.type === 'Cardio' ? <>{wk!.mins || '?'}<small> min</small></> : <span className="w">{wk!.type} done</span>
    : <span className="w">{isRest ? 'Rest day' : sched + ' planned'}</span>

  const highlights: ReactNode[] = []
  if (ws.logged >= 2) {
    highlights.push(gentle
      ? <>You logged on {ws.logged} days this week.{ws.inRange ? ` ${ws.inRange} of them landed in your range.` : ''}</>
      : <>You averaged <b className="num">{fmt(ws.avgK)} kcal</b> on the {ws.logged} days you logged, and {ws.inRange} {ws.inRange === 1 ? 'was' : 'were'} in your range.</>)
    const dl = ws.prevAvgP != null ? Math.round(ws.avgP - ws.prevAvgP) : null
    highlights.push(<>Protein averaged <b className="num">{fmt(ws.avgP)} g</b>{dl == null ? ' a day.' : Math.abs(dl) >= 5 ? `, ${dl > 0 ? 'up' : 'down'} ${Math.abs(dl)} g a day on last week.` : ', steady on last week.'}</>)
  } else {
    highlights.push(<>Log a couple of days and your weekly picture fills in here. Averages say far more than any single day.</>)
  }
  if (ws.planned) highlights.push(<><b className="num">{ws.done} of {ws.planned}</b> planned sessions done{ws.done >= ws.planned ? '. Nice work.' : ' so far.'}</>)

  return (
    <div className="screen">
      <PageHeader
        eyebrow={<>{isToday ? 'Today' : f.dow} · {f.full.split(' ').slice(0, 2).join(' ')}
          {syncLabel && <button className="navbtn" style={{ fontSize: 13, color: 'var(--label3)', textTransform: 'none' }} onClick={() => runSync()}>{syncLabel}</button>}</>}
        title="Summary"
        right={<button className="avatar" aria-label="Profile" onClick={() => setTab('profile')}>{initials(p.name) || <Icon name="person" />}</button>}
      />
      <WeekStrip />

      {missed && (
        <div className="banner">
          <span style={{ color: 'var(--energy-ink)' }}><Icon name="leaf" /></span>
          <div><b>Welcome back.</b><br /><span className="muted">A day off logging doesn't undo anything. Pick up from here.</span></div>
          <button className="x" aria-label="Dismiss" onClick={() => setDismissedMissed(true)}><Icon name="x" size={12} stroke={3} /></button>
        </div>
      )}

      {suggest && (
        <div className="card dayopt">
          <div className="t">{suggest.up ? '' : 'Weeks vary. '}Your logged sessions over the last 4 weeks
            fit <b>{ACTIVITY[suggest.level].label.replace(/ \(.*\)$/, '')}</b> best.
            {suggest.up ? ' Want to update your activity level to match?' : ' If you do more than you log, your current setting may still be right. Want to update it?'}</div>
          <div className="chips">
            <button className="chip" onClick={() => {
              setPrefs({ activityLevel: suggest.level, activityAsked: cur })
              showToast('Activity level updated. Your targets only change if you choose to.')
              setTab('profile')
            }}>Update</button>
            <button className="chip" onClick={() => setPrefs({ activityAsked: cur })}>Keep as is</button>
          </div>
        </div>
      )}

      {showBurnNote(data) && !gentle && (
        <div className="banner">
          <span style={{ color: 'var(--energy-ink)' }}><Icon name="info" /></span>
          <div><b>Your range on workout days has changed.</b><br /><span className="muted">{p.activityLevel === 'sedentary'
            ? 'Workouts now add only the energy above what you use at rest, so they are no longer counted twice. '
            : 'It now leaves workouts out, because your activity level already includes your training. '}
            Past days are unchanged.</span></div>
          <button className="x" aria-label="Dismiss" onClick={() => setPrefs({ burnNoteSeen: true })}><Icon name="x" size={12} stroke={3} /></button>
        </div>
      )}

      <div className="card" {...pressable(() => setTab('food'))}>
        <div className="hero">
          <Rings size={124} items={[
            { pct: t.k / r.mid, color: 'var(--energy)' },
            { pct: t.p / tg.p, color: 'var(--protein)' },
            { pct: logged ? 1 : 0, color: 'var(--activity)' },
          ]} />
          <div className="legend">
            <div className="lg"><div className="k" style={{ color: 'var(--energy-ink)' }}>Energy</div>
              <div className="v num">{gentle ? <span className="w">{st.short}</span> : <>{fmt(t.k)}<small> / {fmt(r.mid)} kcal</small></>}</div></div>
            <div className="lg"><div className="k" style={{ color: 'var(--protein-ink)' }}>Protein</div>
              <div className="v num">{fmt(t.p)}<small> / {tg.p} g</small></div></div>
            <div className="lg"><div className="k" style={{ color: 'var(--activity-ink)' }}>Activity</div>
              <div className="v num">{activity}</div></div>
          </div>
        </div>
        <div className="hero-f">
          <span className="grow">{gentle ? 'See your meals' : st.word}</span>
          {t.k > 0 && !gentle && (
            <button className="pm num" aria-label="About this estimate" onClick={(e) => { e.stopPropagation(); setSheet({ k: 'margin' }) }}>± {margin}</button>
          )}
          <Chevron />
        </div>
      </div>

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

      {due.length > 0 && (
        <button className="banner" onClick={() => setSheet({ k: 'plans' })}>
          <span style={{ color: 'var(--mind-ink)' }}><Icon name="bulb" /></span>
          <div><b>How are your plans going?</b><br />
            <span className="muted">A 10-second check-in on {due.length === 1 ? 'your plan' : `${due.length} plans`}. Plans work best when you revisit them.</span></div>
        </button>
      )}

      {us.length > 0 && (
        <>
          <div className="sec-t">Your usual {MEAL_LABEL[meal].toLowerCase()}</div>
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
        </>
      )}

      <div className="sec-t">Pinned</div>
      <div className="tiles">
        <Tile color="activity" icon="dumbbell" label="Workout" onPress={() => setTab('train')}
          value={<span className="w">{logged ? (wk!.option === 'swap' ? (wk!.cardioType === 'Mobility' ? 'Mobility' : 'Easy walk') : wk!.type) : isRest ? 'Rest' : sched}</span>}
          sub={logged ? 'Logged' : isRest ? 'Recovery counts too' : 'Tap to start'} />
        <Tile color="mind" icon="smile" label="Check-in" onPress={() => setSheet({ k: 'checkin' })}
          value={<span className="w">{day.checkin?.mood ? MOODS[day.checkin.mood - 1] : 'How are you?'}</span>}
          sub={day.checkin?.hunger ? `Hunger: ${HUNGER[day.checkin.hunger - 1]}` : "How you're doing"} />
        {!gentle && (
          <Tile color="body" icon="scale" label="Weight" onPress={() => setSheet({ k: 'weight' })}
            value={day.weight ? <>{r1(day.weight)}<small>kg</small></> : weights.length ? <>{r1(weights[weights.length - 1])}<small>kg</small></> : <span className="w">Add</span>}
            extra={weights.length > 1 ? <div style={{ marginTop: 6 }}><Sparkline values={weights} w={120} h={28} color="var(--body)" /></div> : undefined}
            sub={wDelta == null ? (day.weight ? 'Today' : 'Weekly trend appears here') : `${wDelta > 0 ? '+' : wDelta < 0 ? '−' : ''}${Math.abs(wDelta)} kg vs last week`} />
        )}
        <Tile color="energy" icon="checkc" label="Consistency" onPress={() => setTab('food')}
          value={<>{past.filter((x) => x.logged).length}<small>of {past.length} days</small></>}
          extra={<div className="dots">{rows.map((x) => <i key={x.d} className={x.logged ? 'on' : x.future ? 'fu' : ''} />)}</div>}
          sub="logged this week" />
      </div>

      {supps.length > 0 && (
        <>
          <div className="sec-t">Supplements<span className="sub num">{supps.filter((s) => day.supps[s.id]).length} of {supps.length}</span></div>
          <div className="list">
            {supps.map((s) => (
              <button className="li" key={s.id} aria-pressed={!!day.supps[s.id]} onClick={() => toggleSupp(s.id)}>
                <span className={'chk' + (day.supps[s.id] ? ' on' : '')}>{day.supps[s.id] && <Icon name="check" size={15} stroke={3.2} />}</span>
                <div className="m"><div className="t">{s.name}</div></div>
                <span className="tr num">{s.time}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="sec-t">This week</div>
      <div className="card">
        <CatHead color="energy" icon="chart" label="Energy" meta={gentle ? undefined : <span className="num">{fmt(baseLo)}–{fmt(baseHi)} kcal range</span>} />
        <WeekBars rows={rows} lo={baseLo} hi={baseHi} cur={cur} />
        {highlights.map((h, i) => <div className="hl" key={i}>{h}</div>)}
      </div>

      {sheet?.k === 'weight' && <WeightSheet onClose={() => setSheet(null)} />}
      {sheet?.k === 'checkin' && <CheckinSheet onClose={() => setSheet(null)} />}
      {sheet?.k === 'margin' && <MarginSheet onClose={() => setSheet(null)} />}
      {sheet?.k === 'plans' && <PlanReviewSheet onClose={() => setSheet(null)} />}
      {sheet?.k === 'edit' && <EditEntrySheet index={sheet.i} onClose={() => setSheet(null)} />}
    </div>
  )
}
