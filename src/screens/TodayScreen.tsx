import { useState } from 'react'
import { useStore } from '@/store/store'
import { fmtDate, todayStr, r0, r1 } from '@/core/domain/date'
import { dayTotals } from '@/core/domain/nutrition'
import { workoutBurn } from '@/core/domain/workout'
import { WORKOUTS } from '@/core/data/workouts'
import { WeekStrip } from '@/ui/WeekStrip'
import { MacroBlock, CheckRow } from '@/ui/primitives'
import { WeightSheet } from './body/WeightSheet'

function profileWeight(days: Record<string, { weight: number | null }>, cur: string, fallback?: number | null) {
  if (days[cur]?.weight) return days[cur].weight
  if (fallback) return fallback
  const sorted = Object.keys(days).sort().reverse()
  for (const d of sorted) if (days[d]?.weight) return days[d].weight
  return null
}

export function TodayScreen() {
  const cur = useStore((s) => s.cur)
  const data = useStore((s) => s.data)
  const setTab = useStore((s) => s.setTab)
  const toggleSupp = useStore((s) => s.toggleSupp)
  const setWeight = useStore((s) => s.setWeight)

  const [bw, setBw] = useState('')
  const [showWeight, setShowWeight] = useState(false)

  const day = data.days[cur] || { foods: [], supps: {}, weight: null, workout: null }
  const t = dayTotals(day)
  const tg = data.target
  const burn = workoutBurn(day.workout, profileWeight(data.days, cur, data.profile.weight))
  const budget = tg.kcal + burn
  const left = budget - t.k
  const pct = budget ? (t.k / budget) * 100 : 0
  const variant = pct > 100 ? 'over' : pct >= 90 ? 'warn' : ''

  const hr = new Date().getHours()
  const greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening'
  const firstName = (data.profile.name || '').split(' ')[0]
  const fd = fmtDate(cur)

  const sched = data.schedule[fd.idx] || 'Rest'
  const wk = day.workout
  const wkLogged = !!(wk && wk.type)
  const isRest = !wkLogged && sched === 'Rest'
  const wkType = wkLogged ? wk!.type : sched
  const wkTitle = wkLogged
    ? wk!.type === 'Cardio'
      ? 'Cardio session'
      : WORKOUTS[wk!.type]?.title || wk!.type
    : sched === 'Rest'
      ? 'Rest day'
      : WORKOUTS[sched]?.title || sched
  const wkDesc = wkLogged
    ? wk!.type === 'Cardio'
      ? `${wk!.mins || '?'} min ${wk!.cardioType || 'cardio'} · tap to edit`
      : 'Session logged · open Train to see sets'
    : isRest
      ? 'Recovery day — your body adapts at rest'
      : 'Open Train to log your sets for today'

  const supps = data.profile.supplements || []
  const suppDone = supps.filter((s) => day.supps[s.id]).length
  const weight = day.weight

  return (
    <div className="screen">
      <div className="page-hdr">
        <div className="page-date">
          {fd.dow}, {fd.full}
        </div>
        <h1 className="page-title">
          {greet}
          {firstName ? `, ${firstName}` : ''}
        </h1>
      </div>

      <WeekStrip />

      {/* Energy hero card (cream) */}
      <div className="card cream" style={{ marginTop: 12 }}>
        <div className="mono" style={{ marginBottom: 4 }}>
          Energy left
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
          <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-1.5px', color: left < 0 ? 'var(--over)' : 'var(--cream-ink)' }}>
            {r0(Math.abs(left))}
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--cream-sub)' }}>
            kcal {left < 0 ? 'over' : 'left'}
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--cream-sub)', marginBottom: 12 }}>
          {r0(t.k)} eaten · {budget} target
          {burn ? ` · +${burn} workout` : ''}
        </div>
        <div style={{ height: 11, background: 'rgba(0,0,0,.08)', borderRadius: 8, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: Math.min(100, pct) + '%',
              background: variant === 'over' ? 'var(--over)' : variant === 'warn' ? 'var(--warn)' : 'var(--accent)',
              borderRadius: 8,
              transition: 'width .35s',
            }}
          />
        </div>
      </div>

      {/* macros */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
        <MacroBlock label="Protein" value={t.p} goal={tg.p} color="var(--protein)" />
        <MacroBlock label="Carbs" value={t.c} goal={tg.c} color="var(--accent)" />
        <MacroBlock label="Fat" value={t.f} goal={tg.f} color="var(--carbs)" />
      </div>

      {/* workout card */}
      <div className="card">
        <div className="mono" style={{ marginBottom: 6 }}>
          {wkType} · {wkLogged ? 'Logged' : isRest ? 'Rest day' : 'Scheduled'}
        </div>
        <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 4, letterSpacing: '-0.3px' }}>{wkTitle}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: isRest ? 0 : 14, lineHeight: 1.45 }}>{wkDesc}</div>
        {!isRest && (
          <button className="btn" onClick={() => setTab('train')}>
            {wkLogged ? 'View session' : '▶ Start workout'}
          </button>
        )}
      </div>

      {/* supplements + weight */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="mono" style={{ marginBottom: 8 }}>
            Supplements{supps.length ? ` · ${suppDone}/${supps.length}` : ''}
          </div>
          {supps.length ? (
            <>
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.8px', lineHeight: 1 }}>
                {suppDone}
                <span style={{ color: 'var(--muted)', fontSize: 16, fontWeight: 500 }}> / {supps.length}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', margin: '4px 0 6px' }}>
                {suppDone === supps.length ? 'All done ✓' : 'tap to check off'}
              </div>
              {supps.slice(0, 3).map((s) => (
                <div key={s.id} style={{ marginTop: -4 }}>
                  <CheckRow on={!!day.supps[s.id]} label={s.name} onClick={() => toggleSupp(s.id)} />
                </div>
              ))}
            </>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginTop: 4 }}>
              No supplements.
              <br />
              Add them in Profile.
            </div>
          )}
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div
            className="mono"
            style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}
            onClick={() => setShowWeight(true)}
          >
            <span>Body weight</span>
            <span style={{ color: 'var(--accent)' }}>Trend ›</span>
          </div>
          {weight ? (
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.8px', lineHeight: 1, marginBottom: 10 }}>
              {r1(weight)}
              <span style={{ color: 'var(--muted)', fontSize: 14, fontWeight: 500 }}> kg</span>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 10px' }}>Not logged today</div>
          )}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="number"
              inputMode="decimal"
              placeholder="kg"
              value={bw}
              onChange={(e) => setBw(e.target.value)}
              style={{ padding: '8px 10px', fontSize: 14 }}
            />
            <button
              className="pill accent"
              style={{ whiteSpace: 'nowrap', flexShrink: 0, padding: '8px 12px' }}
              onClick={() => {
                const v = parseFloat(bw)
                if (v) {
                  setWeight(v)
                  setBw('')
                }
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>

      {/* eaten */}
      <div className="section-label">Eaten {cur === todayStr() ? 'today' : 'this day'}</div>
      <div className="card">
        {day.foods.length ? (
          day.foods.map((x, i) => (
            <div className="row" key={i}>
              <div className="grow">
                <div className="name">{x.n}</div>
                <div className="meta">
                  {x.grams}
                  {x.unit || 'g'} · {r0(x.p)}p {r0(x.c)}c {r0(x.f)}f
                </div>
              </div>
              <span className="pill" style={{ color: 'var(--ink)' }}>
                {r0(x.k)} kcal
              </span>
            </div>
          ))
        ) : (
          <div className="empty">
            No food logged yet — tap <b>Food</b> to add some.
          </div>
        )}
      </div>

      {showWeight && <WeightSheet onClose={() => setShowWeight(false)} />}
    </div>
  )
}
