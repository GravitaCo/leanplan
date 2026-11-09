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
