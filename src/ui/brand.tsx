/** Tali brand mark (Tali-App.svg), inlined so it renders offline. */

const MARK = 'M62.63 55.36q-.03-.825-.03-1.65C62.6 24.2 86.61.19 116.12.19l.03 20c-18.52 0-33.56 15.04-33.56 33.52 0 .34 0 .69.02 1.03l-19.99.61ZM55.42 55.42h-20V20H0V0h55.42zM119.06 31.57h20v23.84h-20z'

/** The mark with no frame, for in-app use: plum on light surfaces, white on dark (--mark). */
export function TaliMark({ width = 120 }: { width?: number }) {
  return (
    <svg className="tali-mark" width={width} height={(width * 55.42) / 139.06} viewBox="0 0 139.06 55.42" role="img" aria-label="Tali">
      <path fill="currentColor" d={MARK} />
    </svg>
  )
}
