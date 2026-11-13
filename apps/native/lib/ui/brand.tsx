/** The Tilo mark (src/ui/brand.tsx, docs/brand/Logo.svg), drawn from the web's own path. */
import Svg, { Path } from 'react-native-svg'
import { useTokens } from '../theme'

const MARK = 'M123.57.33c-17.27,0-31.27,14-31.27,31.27s14,31.27,31.27,31.27,31.27-14,31.27-31.27S140.85.33,123.57.33ZM123.57,45.88c-7.87,0-14.27-6.4-14.27-14.27s6.4-14.27,14.27-14.27,14.27,6.4,14.27,14.27-6.4,14.27-14.27,14.27ZM65.63,28.52V.33h-17v28.19c0,18.59,15.13,33.72,33.72,33.72h9.95v-17h-9.95c-9.22,0-16.72-7.5-16.72-16.72ZM9.95,0H0v17h9.95c9.22,0,16.72,7.5,16.72,16.72v28.19h17v-28.19C43.67,15.13,28.54,0,9.95,0Z'

/** The mark with no frame, for in-app use: plum on light surfaces, white on dark (--mark). */
/** `color`: the mark on a coloured ground (the app icon's white, the brand mauve); default --mark. */
export function TaliMark({ width = 120, color }: { width?: number; color?: string }) {
  const t = useTokens()
  return (
    <Svg width={width} height={(width * 62.88) / 154.85} viewBox="0 0 154.85 62.88" accessible accessibilityRole="image" accessibilityLabel="Tilo">
      <Path fill={color ?? t.mark} d={MARK} />
    </Svg>
  )
}
