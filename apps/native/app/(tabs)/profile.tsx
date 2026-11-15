// Profile (N10): the avatar beside every title opens it. As on the web (App.tsx: tab 'profile'), it
// takes the place of the current tab with the tab bar still shown and no tab selected; it isn't in
// the bar's own list (lib/ui/TabBar.tsx). The tab layout's gate covers it like every tab.
import { ProfileScreen } from '../../screens/profile'
export default function Screen() { return <ProfileScreen /> }
