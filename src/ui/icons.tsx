/** Line icons, stroked with currentColor on a 24px grid (SF Symbols weight). */
import type { ReactNode } from 'react'

const PATHS = {
  heart: <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" />,
  fork: <path d="M7 3v7a2 2 0 0 0 2 2v9M11 3v7a2 2 0 0 1-2 2M9 3v6M17 21V3c-2 1.5-3 4-3 7v4h3" />,
  dumbbell: <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  person: <><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20.5c1.2-3.8 4-5.8 7.5-5.8s6.3 2 7.5 5.8" /></>,
  scale: <><rect x="3.5" y="3.5" width="17" height="17" rx="4" /><path d="M8.2 10a5.2 5.2 0 0 1 7.6 0L12 13.5z" /></>,
  pill: <><path d="M10.5 20.5a4.95 4.95 0 0 1-7-7l6-6a4.95 4.95 0 0 1 7 7z" /><path d="M8.5 10.5l5 5" /></>,
  smile: <><circle cx="12" cy="12" r="8.5" /><path d="M8.5 14c.9 1.3 2.1 2 3.5 2s2.6-.7 3.5-2M9 9.5h.01M15 9.5h.01" /></>,
  // the Mind tab (canvas section 9, nav-mindtab-*): the smile as drawn on the approved board
  mind: <><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5c1 1.2 2.1 1.8 3.5 1.8s2.5-.6 3.5-1.8M9 9.5h.01M15 9.5h.01" /></>,
  check: <path d="M5 12.5l4.2 4.2L19 7" />,
  checkc: <><circle cx="12" cy="12" r="8.5" /><path d="M8 12.3l2.7 2.7L16 9.6" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  chevR: <path d="M9 5l7 7-7 7" />,
  chevL: <path d="M15 5l-7 7 7 7" />,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.3-4.3" /></>,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  play: <path d="M8 5.5v13l10.5-6.5z" />,
  pause: <path d="M8.5 5.5v13M15.5 5.5v13" />,
  target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r=".8" /></>,
  /** a level line with one rise and fall: "Keep it steady" (board ml-c1) */
  steady: <path d="M3 12h4l2-4 3 8 2-4h7" />,
  /** a weight (boards ml-a1, ml-a3) */
  weight: <><path d="M5 20h14l-2-12H7z" /><path d="M9.5 8a2.5 2.5 0 0 1 5 0" /></>,
  /** a line going up: "Something in your data" (ml-a1) */
  trend: <path d="M4 18l5-6 4 3 7-9" />,
  /** a clock turning back: the weekly review card on Summary (ml-e3) */
  review: <><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" /><path d="M3.5 4.5v4h4" /><path d="M12 8v4.5l3 1.8" /></>,
  bolt: <path d="M13 3L5 13.5h6L10 21l8-10.5h-6z" />,
  book: <><path d="M5 5.5a2 2 0 0 1 2-2h11.5v14H7a2 2 0 0 0-2 2z" /><path d="M5 19.5a2 2 0 0 0 2 2h11.5v-4" /></>,
  hand: <path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V12M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v8a7 7 0 0 1-7 7h-.5a6 6 0 0 1-4.9-2.5L2.8 15a1.6 1.6 0 0 1 2.5-2L8 15.5" />,
  leaf: <><path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15" /><path d="M5 19l7-7" /></>,
  bulb: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />,
  bell: <><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></>,
  key: <><circle cx="8" cy="15" r="4" /><path d="M11 12l8-8M16 7l2 2" /></>,
  cloud: <path d="M7 18.5a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.4 1.6 3.8 3.8 0 0 1-.3 7.4z" />,
  cloudUp: <><path d="M7 18h10a4 4 0 0 0 .6-8A6 6 0 0 0 6.2 9.4 4.3 4.3 0 0 0 7 18z" /><path d="M12 15v-5M9.5 12.5 12 10l2.5 2.5" /></>,
  cloudOff: <><path d="M7 18h10a4 4 0 0 0 .6-8A6 6 0 0 0 6.2 9.4 4.3 4.3 0 0 0 7 18z" /><path d="M4 4l16 16" /></>,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5v.5" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" /></>,
  barcode: <><path d="M3.5 7.5v-2a2 2 0 0 1 2-2h2M16.5 3.5h2a2 2 0 0 1 2 2v2M20.5 16.5v2a2 2 0 0 1-2 2h-2M7.5 20.5h-2a2 2 0 0 1-2-2v-2" /><path d="M8 8v8M11 8v8M13.5 8v8M16 8v8" /></>,
  camera: <><path d="M3.5 9a2 2 0 0 1 2-2h2.2l1.6-2.5h5.4L16.3 7h2.2a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" /><circle cx="12" cy="13" r="3.6" /></>,
  sliders: <><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></>,
  mail: <><rect x="3.5" y="5.5" width="17" height="13" rx="3" /><path d="M4.5 7.5l7.5 5.5 7.5-5.5" /></>,
  thumbUp: <path d="M7.5 10.5v9.5M7.5 10.5l3.6-6.3a1.9 1.9 0 0 1 3.5 1.3l-.8 4.1h4.6a2 2 0 0 1 2 2.4l-1.3 6.4a2 2 0 0 1-2 1.6H7.5M7.5 10.5h-3v9.5h3" />,
  thumbDown: <path d="M16.5 13.5V4M16.5 13.5l-3.6 6.3a1.9 1.9 0 0 1-3.5-1.3l.8-4.1H5.6a2 2 0 0 1-2-2.4l1.3-6.4a2 2 0 0 1 2-1.6h9.6M16.5 13.5h3V4h-3" />,
  // Mind skills (wellbeing board B5): plain glyphs, no lotus, figure or sparkles
  wind: <path d="M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7" />,
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  pen: <path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" />,
  // a list (Profile › Notifications: the plan check-in, wellbeing board B11)
  list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof PATHS

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
      {PATHS[name]}
    </svg>
  )
}

/** The trailing disclosure chevron used on tappable rows and cards. */
export function Chevron({ rotate = 0 }: { rotate?: number }) {
  return (
    <svg className="i chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={rotate ? { transform: `rotate(${rotate}deg)`, transition: 'transform .2s' } : { transition: 'transform .2s' }}>
      {PATHS.chevR}
    </svg>
  )
}
