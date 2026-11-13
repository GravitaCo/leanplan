/**
 * The 18+ stop the wizard shows, from N2 (lib/account/AgeStop.tsx), as the web's Wizard does
 * (src/screens/onboarding/Wizard.tsx): the wizard's own stop on a first run (board "Age 18+ · 2":
 * Close deletes the new account), and the app's stop in Redo setup (board "Age 18+ · 1": Close and
 * delete opens the account deletion, "I typed my age wrong" goes back to the age question).
 * `ageStop` stays a prop so a test can pass another.
 */
import type { ReactNode } from 'react'
import { Under18, UnderAgeStop } from '../../lib/account/AgeStop'

/** How the wizard asks for the stop: `redo` is Profile's Redo setup (the app's variant). */
export type AgeStopRender = (p: { redo: boolean; onWrong: () => void; onClose: () => void }) => ReactNode

export const ageStop: AgeStopRender = ({ redo, onWrong, onClose }) => redo
  ? <UnderAgeStop source="profile" onWrong={onWrong} />
  : <Under18 onWrong={onWrong} onClose={onClose} />
