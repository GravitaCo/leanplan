/**
 * Text styles for Profile's group headings, small print and muted lines: the web's `.lbl`, `.foot`,
 * `.sub` and `.prose` as TextStyles over the theme's tokens and `tx`. Not components: they style
 * React Native's Text in the screen files.
 * TODO(N1-followup): replace with N1's text presets when they land (request item 9).
 */
import type { TextStyle } from 'react-native'
import { tx, type Tokens } from '../../lib/theme'

/** `.lbl`: 13 pt 500, --label2, padding 18 4 8 */
export const lbl = (t: Tokens): TextStyle => ({ ...tx(13, 500), color: t.label2, paddingTop: 18, paddingHorizontal: 4, paddingBottom: 8 })
/** `.foot`: 13 pt, --label2, line height 1.38, padding 7 16 0 */
export const foot = (t: Tokens): TextStyle => ({ ...tx(13, 400, 1.38), color: t.label2, paddingTop: 7, paddingHorizontal: 16 })
/** `.sub` (15 pt, --label2); `.prose` sets 1.45 line height */
export const sub = (t: Tokens): TextStyle => ({ ...tx(15, 400, 1.45), color: t.label2 })
/** a 13 pt `.sub` note under a control (`style={{ fontSize: 13, marginTop: 8 }}` on the web) */
export const note = (t: Tokens): TextStyle => ({ ...tx(13, 400, 1.38), color: t.label2, marginTop: 8 })
/** `.cs-t` and `.cs-lead`: a bare sheet's title and lead */
export const sheetTitle = (t: Tokens): TextStyle => ({ ...tx(22, 600, 28), color: t.label })
export const sheetLead = (t: Tokens): TextStyle => ({ ...tx(16, 400, 1.45), color: t.label2 })
