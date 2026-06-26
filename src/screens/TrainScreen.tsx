import { useEffect, useMemo, useState } from 'react'
import { useStore } from '@/store/store'
import type { SetEntry, WorkoutType } from '@/core/types'
import { WORKOUTS, LIFTS } from '@/core/data/workouts'
import { fmtDate } from '@/core/domain/date'
import { howToLink } from '@/core/domain/workout'

const TABS: WorkoutType[] = ['Legs', 'Push', 'Pull', 'Cardio']

function lastSessionOf(days: Record<string, { workout: { type: string; ex?: { name: string; sets: SetEntry[] }[] } | null }>, cur: string, type: string) {
  const ds = Object.keys(days)
    .filter((d) => d !== cur && days[d].workout && days[d].workout!.type === type)
    .sort()
  return ds.length ? days[ds[ds.length - 1]].workout : null
}

export function TrainScreen() {
  const cur = useStore((s) => s.cur)
  const data = useStore((s) => s.data)
  const saveWorkout = useStore((s) => s.saveWorkout)
  const saveCardio = useStore((s) => s.saveCardio)

  const day = data.days[cur] || { foods: [], supps: {}, weight: null, workout: null }
  const logged = day.workout
  const fd = fmtDate(cur)
  const sched = data.schedule[fd.idx] || 'Rest'

  const initial: WorkoutType =
    (logged?.type as WorkoutType) || (LIFTS.includes(sched as WorkoutType) ? (sched as WorkoutType) : 'Cardio')
  const [sel, setSel] = useState<WorkoutType>(initial)
  useEffect(() => {
    setSel(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur])

  // editable set state for lifts: index -> sets[]
  const wk = sel !== 'Cardio' ? WORKOUTS[sel] : null
  const loggedSets = logged?.type === sel ? logged.ex : null
  const [sets, setSets] = useState<Record<number, SetEntry[]>>({})
  useEffect(() => {
    if (!wk) return
    const next: Record<number, SetEntry[]> = {}
    wk.ex.forEach((_, i) => {
      next[i] = loggedSets?.[i]?.sets?.length
        ? loggedSets[i].sets.map((s) => ({ ...s }))
        : [
            { w: '', reps: '' },
            { w: '', reps: '' },
          ]
    })
    setSets(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, cur])

  // cardio state
  const cardio = logged?.type === 'Cardio' ? logged : null
  const [cardioType, setCardioType] = useState(cardio?.cardioType || 'Walk')
  const [mins, setMins] = useState(cardio?.mins || '')
  useEffect(() => {
    setCardioType(cardio?.cardioType || 'Walk')
    setMins(cardio?.mins || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur])

  const last = useMemo(() => (sel !== 'Cardio' ? lastSessionOf(data.days, cur, sel) : null), [data.days, cur, sel])

  const dayName = fd.dow
  const banner = logged
    ? `Logged ${dayName}: ${logged.type === 'Cardio' ? 'Cardio' : WORKOUTS[logged.type].title}. Tap a different session below to change it.`
    : sched === 'Rest'
      ? `${dayName} is a rest day. Recover — a walk is fine. You can still log a session below.`
      : `${dayName}'s plan: ${WORKOUTS[sched]?.title || sched}. Doing something else? Tap any session — it only changes today.`

  function updateSet(exi: number, si: number, field: keyof SetEntry, value: string) {
    setSets((prev) => {
      const copy = { ...prev, [exi]: prev[exi].map((s, i) => (i === si ? { ...s, [field]: value } : s)) }
      return copy
    })
  }
  function addSet(exi: number) {
    setSets((prev) => ({ ...prev, [exi]: [...prev[exi], { w: '', reps: '' }] }))
  }

  function commitLift() {
    if (!wk) return
    const ex = wk.ex.map((e, i) => ({
      name: e.n,
      sets: (sets[i] || []).filter((s) => s.w !== '' || s.reps !== ''),
    }))
    saveWorkout(sel, ex)
  }

  return (
    <div className="screen">
      <div className="page-hdr">
        <div className="page-date">{fd.dow}, {fd.full}</div>
        <h1 className="page-title">Train</h1>
      </div>

      {/* segmented */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 13, padding: 4, marginBottom: 14 }}>
        {TABS.map((tb) => (
          <button
            key={tb}
            onClick={() => setSel(tb)}
            style={{
              flex: 1,
              border: 0,
              background: sel === tb ? 'var(--accent)' : 'transparent',
              color: sel === tb ? '#fff' : 'var(--muted)',
              padding: '9px 4px',
              borderRadius: 9,
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {tb}
          </button>
        ))}
      </div>

      <div
        style={{
          fontSize: 13,
          color: 'var(--muted)',
          background: 'var(--card)',
          border: '1px solid var(--line)',
          borderRadius: 14,
          padding: '12px 14px',
          marginBottom: 14,
          lineHeight: 1.45,
        }}
      >
        {banner}
      </div>

      {sel === 'Cardio' ? (
        <>
          <div className="card">
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{WORKOUTS.Cardio.ex[0].n}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>{WORKOUTS.Cardio.ex[0].cue}</div>
            <div className="field">
              <label>Type</label>
              <select value={cardioType} onChange={(e) => setCardioType(e.target.value)}>
                {['Walk', 'Incline treadmill', 'Stationary bike', 'Cross-trainer', 'Rower', 'Other'].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Minutes</label>
              <input type="number" inputMode="numeric" value={mins} onChange={(e) => setMins(e.target.value)} placeholder="e.g. 25" />
            </div>
            <button className="btn" onClick={() => saveCardio(cardioType, mins)}>
              Save cardio
            </button>
          </div>
        </>
      ) : (
        <>
          {wk!.ex.map((e, exi) => {
            const isPlank = e.n.toLowerCase().includes('plank')
            const lastEx = last?.ex?.[exi]
            const lastTxt =
              lastEx?.sets?.length
                ? 'Last: ' +
                  lastEx.sets
                    .map((s) => (s.w ? s.w + 'kg' : '') + (s.w && s.reps ? '×' : '') + (s.reps || ''))
                    .filter(Boolean)
                    .join(', ')
                : ''
            return (
              <div className="card" key={exi}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{e.n}</div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      background: 'var(--card-2)',
                      padding: '3px 8px',
                      borderRadius: 8,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {e.t}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', margin: '6px 0 10px' }}>{e.cue}</div>
                <a
                  href={howToLink(e.n)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: 'var(--ink)',
                    textDecoration: 'none',
                    background: 'var(--card-2)',
                    padding: '5px 11px',
                    borderRadius: 8,
                    marginBottom: 10,
                  }}
                >
                  ▶ Watch how to perform
                </a>
                {lastTxt && (
                  <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.4px' }}>
                    {lastTxt}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {(sets[exi] || []).map((s, si) => (
                    <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 46, fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Set {si + 1}</span>
                      {!isPlank && (
                        <>
                          <input
                            type="number"
                            inputMode="decimal"
                            placeholder="kg"
                            value={s.w}
                            onChange={(ev) => updateSet(exi, si, 'w', ev.target.value)}
                            style={{ padding: '9px 10px' }}
                          />
                          <span style={{ fontSize: 12, color: 'var(--muted)', width: 30 }}>kg</span>
                        </>
                      )}
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder={isPlank ? 'seconds' : 'reps'}
                        value={s.reps}
                        onChange={(ev) => updateSet(exi, si, 'reps', ev.target.value)}
                        style={{ padding: '9px 10px' }}
                      />
                      <span style={{ fontSize: 12, color: 'var(--muted)', width: 34 }}>{isPlank ? 'sec' : 'reps'}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => addSet(exi)}
                  style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', background: 'none', border: 0, padding: '8px 0', cursor: 'pointer' }}
                >
                  + add set
                </button>
              </div>
            )
          })}
          <button className="btn" onClick={commitLift}>
            Save {sel} session
          </button>
        </>
      )}

      <div
        style={{
          fontSize: 13,
          color: 'var(--muted)',
          background: 'var(--card)',
          border: '1px solid var(--line)',
          borderRadius: 14,
          padding: '12px 14px',
          margin: '16px 0',
          lineHeight: 1.45,
        }}
      >
        <b style={{ color: 'var(--ink)' }}>How to progress:</b> keep ~2–3 reps in the tank each set. When you hit the top
        of the rep range on all sets with good form, add a little weight next time. Rest ~90 seconds between sets.
      </div>
    </div>
  )
}
