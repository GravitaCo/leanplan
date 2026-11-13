/**
 * Profile's text styles that N1's Lbl, Foot and Sub don't cover on their own, as TextStyles passed
 * to them (or to Text): `.prose`'s line height on a `.sub`, the 13 pt `.sub` notes under a control,
 * and a bare sheet's `.cs-t` title and `.cs-lead`.
 * TODO(N1-followup) P1b: `.note` and the sheet title presets, when N1 adds them.
 */
import type { TextStyle } from 'react-native'
import { tx, type Tokens } from '../../lib/theme'

/** `.prose` on a `.sub`: 15 pt at 1.45 */
export const PROSE: TextStyle = tx(15, 400, 1.45)
/** a 13 pt `.sub` under a control (`style={{ fontSize: 13, marginTop: 8 }}` on the web) */
export const NOTE: TextStyle = { ...tx(13, 400, 1.38), marginTop: 8 }
/** a `.foot` laid flat inside a section (`style={{ padding: '10px 0 0' }}` on the web) */
export const FLAT_FOOT: TextStyle = { paddingHorizontal: 0, paddingTop: 10 }
/** `.cs-t` and `.cs-lead`: a bare sheet's title and lead */
export const sheetTitle = (t: Tokens): TextStyle => ({ ...tx(22, 600, 28), color: t.label })
export const sheetLead = (t: Tokens): TextStyle => ({ ...tx(16, 400, 1.45), color: t.label2 })
