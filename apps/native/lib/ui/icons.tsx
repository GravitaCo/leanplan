/**
 * Line icons, the same 24 px geometry as src/ui/icons.tsx (copied for the spike's tab bar and
 * Summary). N1 moves the geometry into one shared data file both apps draw from, so they can't drift.
 */
import type { ReactNode } from 'react'
import Svg, { Circle, Path, Rect } from 'react-native-svg'

const P = (d: string) => <Path d={d} />
const PATHS = {
  heart: P('M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z'),
  fork: P('M7 3v7a2 2 0 0 0 2 2v9M11 3v7a2 2 0 0 1-2 2M9 3v6M17 21V3c-2 1.5-3 4-3 7v4h3'),
  dumbbell: P('M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11'),
  calendar: <><Rect x="3.5" y="5" width="17" height="15.5" rx="3" /><Path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  person: <><Circle cx="12" cy="8.5" r="3.8" /><Path d="M4.5 20.5c1.2-3.8 4-5.8 7.5-5.8s6.3 2 7.5 5.8" /></>,
  smile: <><Circle cx="12" cy="12" r="8.5" /><Path d="M8.5 14c.9 1.3 2.1 2 3.5 2s2.6-.7 3.5-2M9 9.5h.01M15 9.5h.01" /></>,
  mind: <><Circle cx="12" cy="12" r="9" /><Path d="M8.5 14.5c1 1.2 2.1 1.8 3.5 1.8s2.5-.6 3.5-1.8M9 9.5h.01M15 9.5h.01" /></>,
  checkc: <><Circle cx="12" cy="12" r="8.5" /><Path d="M8 12.3l2.7 2.7L16 9.6" /></>,
  plus: P('M12 5v14M5 12h14'),
  leaf: <><Path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15" /><Path d="M5 19l7-7" /></>,
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 20, stroke = 2, color }: { name: IconName; size?: number; stroke?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {PATHS[name]}
    </Svg>
  )
}
