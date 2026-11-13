/** Train's small native-only helpers that aren't UI. */
import { createContext } from 'react'

/** What the Train screens hand back to the app shell: the Profile opener for the avatar. */
export const TrainNav = createContext<{ onProfile?: () => void }>({})

/** A comma-decimal keypad types "12,5"; saved data always holds "12.5", as the web's number input does. */
export const toPoint = (v: string) => v.replace(/,/g, '.')
