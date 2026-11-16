import type { Tab } from '@/store/store'
import { WELLBEING_ENABLED } from '@/data/wellbeingFlag'
import { Icon, type IconName } from './icons'
import { UI } from '@/copy/ui'

type TabDef = { id: Tab; label: string; icon: IconName }

const TABS: TabDef[] = [
  { id: 'today', label: UI.tabs.today, icon: 'heart' },
  { id: 'food', label: UI.tabs.food, icon: 'fork' },
  { id: 'train', label: UI.tabs.train, icon: 'dumbbell' },
  { id: 'plan', label: UI.tabs.plan, icon: 'calendar' },
  { id: 'profile', label: UI.tabs.profile, icon: 'person' },
]

/** With WELLBEING_ENABLED on (canvas section 9): Mind is a tab; Profile is the avatar beside every title. */
const TABS_WELLBEING: TabDef[] = [
  { id: 'today', label: UI.tabs.today, icon: 'heart' },
  { id: 'mind', label: UI.tabs.mind, icon: 'mind' },
  { id: 'food', label: UI.tabs.food, icon: 'fork' },
  { id: 'train', label: UI.tabs.train, icon: 'dumbbell' },
  { id: 'plan', label: UI.tabs.plan, icon: 'calendar' },
]

/**
 * The tab bar. `mindOff` (the Mind pillar switched off in Profile, profile.mind.off): the Mind tab
 * stays in place so the bar never shifts, faded and aria-disabled, and can't be opened (Benn, 8 Oct).
 */
export function BottomNav({ active, onChange, mindOff = false }: { active: Tab; onChange: (t: Tab) => void; mindOff?: boolean }) {
  return (
    <nav className="tabbar" aria-label={UI.main}>
      <div className="in">
        {(WELLBEING_ENABLED ? TABS_WELLBEING : TABS).map(({ id, label, icon }) => {
          if (id === 'mind' && mindOff) {
            return (
              <button key={id} className="off" aria-disabled="true" aria-label={UI.mindOff}>
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
