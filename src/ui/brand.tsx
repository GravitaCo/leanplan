/** Tali brand mark, drawn from Tali-App.svg (mauve mark on black) so it renders offline. */

/** The app icon: the mark on its black tile, with iOS-style rounded corners (as favicon.svg). */
export function TaliIcon({ size = 88 }: { size?: number }) {
  return (
    <svg className="tali-icon" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Tali">
      <rect className="tile-bg" x="0.5" y="0.5" width="99" height="99" rx="22.4" fill="#000" />
      <g transform="translate(4 2)" fill="none" stroke="var(--brand)" strokeWidth="8" strokeLinecap="butt" strokeLinejoin="round">
        <path d="M34 20V60a16 16 0 0 0 32 0V56a16 16 0 0 0-16-16H18" />
        <path d="M66 56V68a8 8 0 0 0 8 8" />
      </g>
    </svg>
  )
}
