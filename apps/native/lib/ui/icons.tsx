/**
 * Line icons drawn from the web's own geometry (src/ui/iconData.ts), so the two apps can't drift.
 *
 * `size` is the size the icon is drawn at. On the web, `svg.i { width: 20px }` in theme.css wins
 * over an icon's size attribute, so most web icons render at 20 px whatever size they ask for; a
 * few contexts set their own (`.cpill` 15, `.ico` 18, `svg.chev` 14). Native call sites pass the
 * size the web actually renders (checked by scripts/e2e-gallery-parity.cjs), not the attribute.
 */
import Svg, { Circle, Path, Rect } from 'react-native-svg'
import { ICONS, type IconName, type IconShape } from '@/ui/iconData'

export type { IconName }

function shape(s: IconShape, i: number) {
  switch (s[0]) {
    case 'path': return <Path key={i} d={s[1]} />
    case 'circle': return <Circle key={i} cx={s[1]} cy={s[2]} r={s[3]} />
    case 'rect': return <Rect key={i} x={s[1]} y={s[2]} width={s[3]} height={s[4]} rx={s[5]} />
  }
}

/** All icon names, in the shared file's order (the gallery draws every one). */
export const ICON_NAMES = Object.keys(ICONS) as IconName[]

export function Icon({ name, size = 20, stroke = 2, color, fill = false }: { name: IconName; size?: number; stroke?: number; color: string; fill?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? color : 'none'} stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {ICONS[name].map(shape)}
    </Svg>
  )
}

/** The trailing disclosure chevron on tappable rows (`svg.chev`: 14 px, --label3, stroke 2.6). */
export function Chevron({ color, rotate = 0 }: { color: string; rotate?: number }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"
      style={rotate ? { transform: [{ rotate: `${rotate}deg` }] } : undefined}
      accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {ICONS.chevR.map(shape)}
    </Svg>
  )
}
