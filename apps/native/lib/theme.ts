/**
 * Studio tokens on native: the web's theme.css values (generated into tokens.generated.ts), light
 * or dark from the device's appearance setting, as on web. Geist is bundled with the app.
 */
import { useColorScheme, type TextStyle } from 'react-native'
import { dark, light, type Tokens } from './tokens.generated'

export type { Tokens }
export function useTokens(): Tokens {
  return useColorScheme() === 'dark' ? dark : light
}

/** Geist by weight (the bundled static faces; the web uses the variable font). */
export const GEIST = {
  400: 'Geist_400Regular',
  500: 'Geist_500Medium',
  600: 'Geist_600SemiBold',
  700: 'Geist_700Bold',
} as const

export const font = (w: keyof typeof GEIST = 400): TextStyle => ({ fontFamily: GEIST[w] })
/** `.num`: tabular figures, no letter spacing */
export const num: TextStyle = { fontVariant: ['tabular-nums'], letterSpacing: 0 }

/**
 * Text as the web sets it: `body` is 17/1.3 with -0.01em tracking, inherited by everything that
 * doesn't set its own (`.num` and `.eyebrow` set 0). `lh` is a line height in pt or, under 4, a
 * multiple of the size, as in CSS.
 */
export function tx(size: number, w: keyof typeof GEIST = 400, lh: number = 1.3, track: number = -0.01): TextStyle {
  return { fontFamily: GEIST[w], fontSize: size, lineHeight: lh < 4 ? Math.round(size * lh * 10) / 10 : lh, letterSpacing: track * size }
}
