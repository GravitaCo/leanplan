/** Line icons, stroked with currentColor on a 24px grid (SF Symbols weight). The geometry is
 *  shared with the native app (iconData.ts); this file only draws it for the web. */
import { ICONS, type IconName, type IconShape } from './iconData'

export type { IconName }

function shape(s: IconShape, i: number) {
  switch (s[0]) {
    case 'path': return <path key={i} d={s[1]} />
    case 'circle': return <circle key={i} cx={s[1]} cy={s[2]} r={s[3]} />
    case 'rect': return <rect key={i} x={s[1]} y={s[2]} width={s[3]} height={s[4]} rx={s[5]} />
  }
}
const draw = (name: IconName) => ICONS[name].map(shape)

export function Icon({ name, size = 20, stroke = 2 }: { name: IconName; size?: number; stroke?: number }) {
  return (
    <svg
      className="i"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {draw(name)}
    </svg>
  )
}

/** The trailing disclosure chevron used on tappable rows and cards. */
export function Chevron({ rotate = 0 }: { rotate?: number }) {
  return (
    <svg className="i chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={rotate ? { transform: `rotate(${rotate}deg)`, transition: 'transform .2s' } : { transition: 'transform .2s' }}>
      {draw('chevR')}
    </svg>
  )
}
