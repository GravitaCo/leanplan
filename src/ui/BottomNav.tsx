import type { Tab } from '@/store/store'
import { WELLBEING_ENABLED } from '@/data/wellbeingFlag'
import { Icon, type IconName } from './icons'

type TabDef = { id: Tab; label: string; icon: IconName }

const TABS: TabDef[] = [
  { id: 'today', label: 'Summary', icon: 'heart' },
  { id: 'food', label: 'Food', icon: 'fork' },
  { id: 'train', label: 'Train', icon: 'dumbbell' },
  { id: 'plan', label: 'Plan', icon: 'calendar' },
  { id: 'profile', label: 'Profile', icon: 'person' },
]

/** With WELLBEING_ENABLED on (canvas section 9): Mind is a tab; Profile is the avatar beside every title. */
const TABS_WELLBEING: TabDef[] = [
  { id: 'today', label: 'Summary', icon: 'heart' },
  { id: 'mind', label: 'Mind', icon: 'mind' },
  { id: 'food', label: 'Food', icon: 'fork' },
  { id: 'train', label: 'Train', icon: 'dumbbell' },
  { id: 'plan', label: 'Plan', icon: 'calendar' },
]

/**
 * The tab bar. `mindOff` (the Mind pillar switched off in Profile, profile.mind.off): the Mind tab
 * stays in place so the bar never shifts, faded and aria-disabled, and can't be opened (Benn, 8 Oct).
 */
export function BottomNav({ active, onChange, mindOff = false }: { active: Tab; onChange: (t: Tab) => void; mindOff?: boolean }) {
  return (
    <nav className="tabbar" aria-label="Main">
      <div className="in">
        {(WELLBEING_ENABLED ? TABS_WELLBEING : TABS).map(({ id, label, icon }) => {
          if (id === 'mind' && mindOff) {
            return (
              <button key={id} className="off" aria-disabled="true" aria-label="Mind, switched off in Profile">
                <Icon name={icon} size={25} stroke={1.9} />
                {label}
              </button>
            )
          }
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
