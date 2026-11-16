/**
 * "Your week" on the Mind page, without React or DOM: what it shows for the store's state, and the
 * span label. Shared by the web card (ReflectionCard.tsx) and the native one.
 */
import { selectAskCtx, type StoreState } from '@/store/store'
import { weekOf } from '@/core/domain/insights'
import { pickAsks } from '@/core/domain/asks'
import { weekReflection, type WeekReflection } from '@/core/domain/mind'

/** "21–27 Sept", or "28 Sept – 4 Oct" across a month end (as Summary's "This week" span). */
export function reflectionSpan(a: string, b: string): string {
  const d = (x: string, o: Intl.DateTimeFormatOptions) => new Date(x + 'T12:00').toLocaleDateString('en-GB', o)
  return d(a, { month: 'short' }) === d(b, { month: 'short' })
    ? `${d(a, { day: 'numeric' })}–${d(b, { day: 'numeric', month: 'short' })}`
    : `${d(a, { day: 'numeric', month: 'short' })} – ${d(b, { day: 'numeric', month: 'short' })}`
}

/**
 * What the Mind page's "Your week" shows, from the store's state: this calendar week, Monday to
 * Sunday, counted up to today. Null with the Mind pillar off (weekReflection), and while the asks
 * rules hold the reflection back (the first two weeks, and a low-mood signpost day:
 * core/domain/asks). `link` is false with Food off (C1).
 */
export function reflectionFor(st: Pick<StoreState, 'data'>, today: string): { r: WeekReflection; link: boolean } | null {
  if (!pickAsks(['reflection'], selectAskCtx(st, today)).show.includes('reflection')) return null
  const off = st.data.profile.mind?.off
  const r = weekReflection(st.data.days, weekOf(today)[0], { today, off, plans: st.data.profile.plans })
  return r ? { r, link: !off?.includes('food') } : null
}
