import { useStore } from '@/store/store'
import { ymd, todayStr, parseYmd } from '@/core/domain/date'

const LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const TYPE_COLOR: Record<string, string> = {
  Push: 'var(--protein)',
  Pull: 'var(--good)',
  Legs: 'var(--accent)',
  Cardio: 'var(--carbs)',
  Rest: 'var(--muted)',
}

export function WeekStrip() {
  const cur = useStore((s) => s.cur)
  const days = useStore((s) => s.data.days)
  const schedule = useStore((s) => s.data.schedule)
  const setDate = useStore((s) => s.setDate)

  const curDate = parseYmd(cur)
  const dow = curDate.getDay()
  const mondayOff = dow === 0 ? -6 : 1 - dow
  const today = todayStr()

  return (
    <div style={{ display: 'flex', gap: 2, margin: '14px 0 4px' }}>
      {Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(curDate)
        d.setDate(curDate.getDate() + mondayOff + i)
        const dStr = ymd(d)
        const isViewing = dStr === cur
        const isToday = dStr === today
        const wkDone = !!days[dStr]?.workout?.type
        const sched = schedule[d.getDay()] || 'Rest'
        const typeColor = isViewing ? 'var(--accent)' : wkDone ? 'var(--accent)' : TYPE_COLOR[sched] || 'var(--muted)'

        return (
          <div
            key={i}
            onClick={() => setDate(dStr)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 5,
              cursor: 'pointer',
            }}
          >
            <div className="mono" style={{ fontSize: 9 }}>
              {LABELS[i]}
            </div>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                background: isViewing ? 'var(--accent)' : 'var(--card-2)',
                color: isViewing ? '#fff' : wkDone ? 'var(--accent)' : 'var(--muted)',
                boxShadow: isToday && !isViewing ? '0 0 0 2px var(--accent)' : 'none',
              }}
            >
              {wkDone ? '✓' : d.getDate()}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 8,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: typeColor,
                maxWidth: 42,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              {sched}
            </div>
          </div>
        )
      })}
    </div>
  )
}
