/** Tilo brand mark (docs/brand/Logo.svg), inlined so it renders offline. */

const MARK = 'M123.57.33c-17.27,0-31.27,14-31.27,31.27s14,31.27,31.27,31.27,31.27-14,31.27-31.27S140.85.33,123.57.33ZM123.57,45.88c-7.87,0-14.27-6.4-14.27-14.27s6.4-14.27,14.27-14.27,14.27,6.4,14.27,14.27-6.4,14.27-14.27,14.27ZM65.63,28.52V.33h-17v28.19c0,18.59,15.13,33.72,33.72,33.72h9.95v-17h-9.95c-9.22,0-16.72-7.5-16.72-16.72ZM9.95,0H0v17h9.95c9.22,0,16.72,7.5,16.72,16.72v28.19h17v-28.19C43.67,15.13,28.54,0,9.95,0Z'

/** The mark with no frame, for in-app use: plum on light surfaces, white on dark (--mark). */
export function TaliMark({ width = 120 }: { width?: number }) {
  return (
    <svg className="tali-mark" width={width} height={(width * 62.88) / 154.85} viewBox="0 0 154.85 62.88" role="img" aria-label="Tilo">
      <path fill="currentColor" d={MARK} />
    </svg>
  )
}
