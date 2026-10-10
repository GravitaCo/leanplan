import { useStore } from '@/store/store'
import { Icon } from './icons'

/** "Sam Smith" → "SS": the avatar's letters (up to two). */
export function initials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

/**
 * The way into Profile with WELLBEING_ENABLED on (canvas section 9): the `.avatar` beside every
 * title, tab roots and pushed screens alike, never on sheets, the players or Profile itself.
 * A 44 px tap area around the 40 px avatar, top-aligned to the title's first line (`.hdr-row.av`).
 * Soft mauve with a mauve letter (`.avatar.soft`; Benn, 10 Oct 2026).
 */
export function ProfileButton() {
  const name = useStore((s) => s.data.profile.name)
  const setTab = useStore((s) => s.setTab)
  return (
    <button className="pfl" aria-label="Profile" onClick={() => setTab('profile')}>
      <span className="avatar soft">{initials(name || '') || <Icon name="person" />}</span>
    </button>
  )
}
