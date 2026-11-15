// Profile (N10): the avatar beside every title opens it. As on the web (App.tsx:
// `{tab === 'profile' && <ProfileScreen />}`), it takes the place of the current tab with the tab bar
// still shown and no tab selected, and it is mounted fresh on every visit: tab screens stay mounted
// once visited, but ProfileScreen reads openProfile(section) and its form values when it mounts.
import { useStore } from '@/store/store'
import { ProfileScreen } from '../../screens/profile'
export default function Screen() {
  const here = useStore((s) => s.tab === 'profile')
  return here ? <ProfileScreen /> : null
}
