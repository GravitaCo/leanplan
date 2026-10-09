import { useStore, selectAskCtx, type StoreState } from '@/store/store'
import { todayStr } from '@/core/domain/date'
import { weekOf } from '@/core/domain/insights'
import { pickAsks } from '@/core/domain/asks'
import { REFLECTION_LATER, reflectionLines, weekReflection, type WeekReflection } from '@/core/domain/mind'
import { bandLabel } from '@/core/domain/sleep'
import { SLEEP_BANDS } from '@/core/domain/checkin'
import { MIND, REFLECTION } from './copy'

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

/**
 * "Your week" on the Mind page (boards B4 and B5.16, wp-b4-*). "See your whole week" goes to
 * Summary's "This week" (the maintenance-loop weekly review isn't built).
 */
export function ReflectionCard(): JSX.Element | null {
  const today = todayStr()
  const data = useStore((s) => s.data)
  const setDate = useStore((s) => s.setDate)
  const setTab = useStore((s) => s.setTab)
  const shown = reflectionFor({ data }, today)
  if (!shown) return null
  const onWeek = () => {
    setDate(today)
    setTab('today')
    // Summary's "This week" card sits at the foot of the page
    requestAnimationFrame(() => document.getElementById('sum-week')?.scrollIntoView({ block: 'center' }))
  }
  return <ReflectionCardView r={shown.r} onWeek={shown.link ? onWeek : undefined} />
}

/**
 * The card from plain props (no store), so `npm test` can render it on the server. `onWeek`
 * absent leaves the "See your whole week" link out.
 */
export function ReflectionCardView({ r, onWeek }: { r: WeekReflection; onWeek?: () => void }) {
  const [first, ...rest] = reflectionLines(r)
  // the check-in count is the one line with no label (B4.3, B4.9); the others are label over value
  const count = first && !first.label ? first : null
  const lines = count ? rest : [first, ...rest].filter(Boolean)
  return (
    <>
      <div className="lbl mind-week-h"><span>{REFLECTION.title}</span><span className="num">{reflectionSpan(r.days[0], r.days[6])}</span></div>
      <section className="card mind-week" aria-label={REFLECTION.title}>
        {count && <div className="mind-week-count num">{count.value}</div>}
        {lines.map((l) => (
          <div key={l.label}>
            <div className="mind-week-k">{l.label}</div>
            <div className="mind-week-v">{l.value}</div>
            {l.label === MIND.sleep && r.sleep !== 'not-enough' && (
              <div className="mind-bands" aria-hidden="true">
                {SLEEP_BANDS.map((b) => <span key={b} className={'mind-band' + (b === r.sleep ? ' on' : '')} />)}
                {SLEEP_BANDS.map((b) => <span key={b + 'l'} className="mind-band-l num">{bandLabel(b)}</span>)}
              </div>
            )}
          </div>
        ))}
        {!r.observation && <div className="mind-week-later">{REFLECTION_LATER}</div>}
        {onWeek && <button type="button" className="linkbtn mind-week-link" onClick={onWeek}>{REFLECTION.seeWeek}</button>}
        {r.observation && (
          <div className="mind-obs">
            <span className="mind-obs-sq" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 18l5-6 4 3 7-9" /></svg>
            </span>
            <div>
              <h3 className="mind-obs-h">{r.observation.heading}</h3>
              <div className="mind-obs-t">{r.observation.text}</div>
              <div className="mind-obs-s">{r.observation.sub}</div>
            </div>
          </div>
        )}
      </section>
    </>
  )
}
