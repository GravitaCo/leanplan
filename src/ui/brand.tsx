/** Tali brand mark, drawn from Tali-App.svg (mauve mark on black) so it renders offline. */
const MARK =
  'M78.76,32.07l-20.62,57.51h-12.08s20.63-57.51,20.63-57.51h12.06ZM66.18,89.6h12.08s8.51-23.76,8.51-23.76h-12.07s-8.52,23.76-8.52,23.76ZM59.37,32.08h-11.95s-1.21,2.71-1.21,2.71l-.04.07c-3.45,6.18-9.66,9.86-16.62,9.86-.63,0-1.26-.03-1.89-.09l-3.68,10.17,2.69.15c.55.02,1.1.02,1.62.02,5.26,0,9.76-.83,13.77-2.53,8.23-3.49,14.48-12.57,17.32-20.37ZM90.03,32.07c-4.1,0-7.43,3.33-7.43,7.43s3.33,7.43,7.43,7.43,7.43-3.33,7.43-7.43-3.33-7.43-7.43-7.43Z'

/** The app icon: the mark on its black tile, with iOS-style rounded corners. */
export function TaliIcon({ size = 88 }: { size?: number }) {
  return (
    <svg className="tali-icon" width={size} height={size} viewBox="0 0 121.44 121.67" role="img" aria-label="Tali">
      <rect className="tile-bg" x="0.5" y="0.5" width="120.44" height="120.67" rx="27" fill="#000" />
      <path d={MARK} fill="var(--brand)" />
    </svg>
  )
}
