/**
 * Studio tokens on native: the web's theme.css values (generated into tokens.generated.ts), light
 * or dark from the device's appearance setting, as on web. Geist is bundled with the app.
 */
import { useColorScheme, type TextStyle } from 'react-native'
import { Geist_200ExtraLight, Geist_300Light, Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold } from '@expo-google-fonts/geist'
import { dark, light, type Tokens } from './tokens.generated'

export type { Tokens }
export function useTokens(): Tokens {
  return useColorScheme() === 'dark' ? dark : light
}

/** Every bundled Geist face, for `useFonts(FONTS)` at the root: the one list of what ships. */
export const FONTS = { Geist_200ExtraLight, Geist_300Light, Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold }

/** Geist by weight (the bundled static faces; the web uses the variable font). */
export const GEIST = {
  200: 'Geist_200ExtraLight',
  300: 'Geist_300Light',
  400: 'Geist_400Regular',
  500: 'Geist_500Medium',
  600: 'Geist_600SemiBold',
  700: 'Geist_700Bold',
} as const

export const font = (w: keyof typeof GEIST = 400): TextStyle => ({ fontFamily: GEIST[w] })
/** `.num`: tabular figures, no letter spacing */
export const num: TextStyle = { fontVariant: ['tabular-nums'], letterSpacing: 0 }

/**
 * Text as the web sets it. `lh` is a line height in pt or, under 4, a multiple of the size, as in CSS.
 * Tracking: `body`'s -0.01em resolves once, at 17 px, so everything that inherits it is tracked a
 * fixed -0.17 pt whatever its size (the default here). Text inside a web `<button>` is reset to 0
 * by the browser: pass `BTN`. A class that sets its own em value (`.ltitle` -0.025em) passes it.
 */
export function tx(size: number, w: keyof typeof GEIST = 400, lh: number = 1.3, track?: number): TextStyle {
  return { fontFamily: GEIST[w], fontSize: size, lineHeight: lh < 4 ? Math.round(size * lh * 10) / 10 : lh, letterSpacing: track === undefined ? BODY_TRACK : track * size }
}
/** body's -0.01em at 17 px, inherited as a length */
export const BODY_TRACK = -0.17
/** the tracking of text inside a web `<button>` (the browser's own button style resets it) */
export const BTN = 0
