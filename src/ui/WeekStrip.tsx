import { useStore } from '@/store/store'
import { fmtDate, parseYmd, shiftDay, todayStr } from '@/core/domain/date'
import { dayStat, weekOf } from '@/core/domain/insights'
import { Rings } from './charts'
import { Icon } from './icons'

const DOW = 'MTWTFSS'

/** Monday–Sunday strip: each day shows a mini energy ring and its planned session. */
export function WeekStrip() {
  const cur = useStore((s) => s.cur)
  const data = useStore((s) => s.data)
  const setDate = useStore((s) => s.setDate)
  const today = todayStr()
  return (
    <div className="week">
      {weekOf(cur).map((d, i) => {
        const st = dayStat(data, d)
        const sched = data.schedule[parseYmd(d).getDay()] || 'Rest'
        const f = fmtDate(d)
        return (
          <button key={d} className={'wd' + (d === cur ? ' sel' : '') + (d === today ? ' today' : '') + (st.future ? ' future' : '')}
            onClick={() => setDate(d)} aria-label={`${f.dow} ${f.full}`} aria-pressed={d === cur}>
            <span className="l">{DOW[i]}</span>
            <span className="rw">
              <Rings items={[{ pct: st.t.k / st.r.mid, color: 'var(--energy)' }]} size={34} stroke={3.5} />
              <span className="num">{parseYmd(d).getDate()}</span>
            </span>
            <span className={'t' + (st.done ? ' done' : '')}>{st.done ? '✓ Done' : sched}</span>
          </button>
        )
      })}
    </div>
  )
}

/** "‹ Today · 22 Sep ›" day switcher for the page eyebrow. */
export function DayNav() {
  const cur = useStore((s) => s.cur)
  const setDate = useStore((s) => s.setDate)
  const f = fmtDate(cur)
  const short = f.full.split(' ').slice(0, 2).join(' ')
  return (
    <span className="daynav">
      <button onClick={() => setDate(shiftDay(cur, -1))} aria-label="Previous day"><Icon name="chevL" size={16} stroke={2.6} /></button>
      <span>{cur === todayStr() ? 'Today' : f.dow} · {short}</span>
      <button onClick={() => setDate(shiftDay(cur, 1))} aria-label="Next day"><Icon name="chevR" size={16} stroke={2.6} /></button>
    </span>
  )
}
