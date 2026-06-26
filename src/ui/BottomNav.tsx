import type { Tab } from '@/store/store'
import { IcoHome, IcoFood, IcoDumbbell, IcoCalendar, IcoProfile } from './icons'

const TABS: { id: Tab; label: string; Icon: typeof IcoHome }[] = [
  { id: 'today', label: 'Today', Icon: IcoHome },
  { id: 'food', label: 'Food', Icon: IcoFood },
  { id: 'train', label: 'Train', Icon: IcoDumbbell },
  { id: 'plan', label: 'Plan', Icon: IcoCalendar },
  { id: 'profile', label: 'Profile', Icon: IcoProfile },
]

export function BottomNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: 'rgba(12,12,14,.9)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--line)',
        display: 'flex',
        maxWidth: 480,
        margin: '0 auto',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {TABS.map(({ id, label, Icon }) => {
        const on = active === id
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            style={{
              flex: 1,
              background: 'none',
              border: 0,
              padding: '11px 2px 9px',
              color: on ? 'var(--accent)' : 'var(--muted)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              fontSize: 10.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Icon width={22} height={22} />
            {label}
          </button>
        )
      })}
    </nav>
  )
}
