/** Line icons, stroked with currentColor — matches the Tali visual weight. */
import type { SVGProps } from 'react'

const base = (props: SVGProps<SVGSVGElement>) => ({
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
})

export const IcoHome = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10.5z" />
    <polyline points="9,21 9,13 15,13 15,21" />
  </svg>
)

export const IcoFood = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 3v6a2 2 0 0 0 2 2 2 2 0 0 0 2-2V3" />
    <path d="M6 3v18" />
    <path d="M19 14V3a4 4 0 0 0-2 4v5a2 2 0 0 0 2 2zm0 0v7" />
  </svg>
)

export const IcoDumbbell = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="2" y="8.5" width="3" height="7" rx="1" />
    <rect x="19" y="8.5" width="3" height="7" rx="1" />
    <rect x="5" y="10" width="2.4" height="4" rx="1" />
    <rect x="16.6" y="10" width="2.4" height="4" rx="1" />
    <line x1="7.4" y1="12" x2="16.6" y2="12" />
  </svg>
)

export const IcoCalendar = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <line x1="8" y1="8" x2="16" y2="8" />
    <line x1="8" y1="12" x2="16" y2="12" />
    <line x1="8" y1="16" x2="13" y2="16" />
  </svg>
)

export const IcoProfile = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="12" cy="7" r="4" />
    <path d="M4 21v-1a8 8 0 0 1 16 0v1" />
  </svg>
)

export const IcoCheck = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

export const IcoPlus = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

export const IcoChevronLeft = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

export const IcoChevronRight = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

export const IcoPlay = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none" />
  </svg>
)
