import type { Tab } from '@/store/store'
import { Icon, type IconName } from './icons'

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'today', label: 'Summary', icon: 'heart' },
  { id: 'food', label: 'Food', icon: 'fork' },
  { id: 'train', label: 'Train', icon: 'dumbbell' },
  { id: 'plan', label: 'Plan', icon: 'calendar' },
  { id: 'profile', label: 'Profile', icon: 'person' },
]

export function BottomNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="tabbar" aria-label="Main">
      <div className="in">
        {TABS.map(({ id, label, icon }) => {
          const on = active === id
          return (
            <button key={id} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined} onClick={() => onChange(id)}>
              <Icon name={icon} size={25} stroke={on ? 2.3 : 1.9} />
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
