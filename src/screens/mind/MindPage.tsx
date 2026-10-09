import { useEffect, useState, type ReactNode } from 'react'
import { useStore, type MindView } from '@/store/store'
import { MIND_REVIEWED } from '@/data/wellbeingFlag'
import { healthDeclined } from '@/data/consent'
import { DAY_NAME, parseYmd, todayStr } from '@/core/domain/date'
import { ENERGY, HUNGER, MOODS, SLEEP, SORE, STRESS } from '@/core/domain/insights'
import { skillsWithScreen } from '@/core/data/skills'
import type { CheckIn } from '@/core/types'
import { PageHeader } from '@/ui/primitives'
import { Chevron, Icon, type IconName } from '@/ui/icons'
import { CheckinSheet } from '../today/CheckinSheet'
import { MIND, SHARED } from './copy'
import { SupportSheet } from './SupportSheet'
import { ReflectionCard } from './ReflectionCard'
import { ResetScreen } from './ResetScreen'
import { UnloadSheet } from './UnloadSheet'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** "Thursday 8 October" (deck B5.3). */
export function mindEyebrow(ymd: string): string {
  const d = parseYmd(ymd)
  return `${DAY_NAME[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/**
 * Today's answers as label and value pairs, in the B5 order: the four short pairs (Mood, Sleep,
 * Stress, Energy), then Hunger and Soreness. Only answered questions show (B5.5: hunger and
 * soreness only if answered; an unanswered one of the four is left out rather than shown blank).
 */
export function checkinPairs(c: CheckIn | null | undefined): [string, string][] {
  if (!c) return []
  const rows: [string, number | undefined, readonly string[]][] = [
    [MIND.mood, c.mood, MOODS], [MIND.sleep, c.sleep, SLEEP], [MIND.stress, c.stress, STRESS],
    [MIND.energy, c.energy, ENERGY], [MIND.hunger, c.hunger, HUNGER], [MIND.sore, c.sore, SORE],
  ]
  return rows.filter(([, v, labels]) => !!v && !!labels[v - 1]).map(([k, v, labels]) => [k, labels[v! - 1]])
}

/**
 * The Mind tab root (wellbeing board B5 as a tab: Benn, 8 Oct 2026; navigation board "Mind · tab
 * root"). Large title and the Profile avatar (WP5's PageHeader), no back button. Top to bottom:
 * today's check-in, the support row directly under it (above the fold at 390×844), the skills with
 * a screen (only while MIND_REVIEWED is on), "Your week" (WP11), the if-then plans row and the
 * wellness line. Shown only behind WELLBEING_ENABLED (the tab itself).
 */
export function MindPage() {
  const today = todayStr()
  const checkin = useStore((s) => s.data.days[today]?.checkin)
  const declined = useStore((s) => healthDeclined(s.data))
  const cur = useStore((s) => s.cur)
  const setDate = useStore((s) => s.setDate)
  const setTab = useStore((s) => s.setTab)
  const openProfile = useStore((s) => s.openProfile)
  const mindOpen = useStore((s) => s.mindOpen)
  const clearOpen = useStore((s) => s.clearOpen)
  const [sheet, setSheet] = useState<'checkin' | 'support' | null>(null)
  const [view, setView] = useState<MindView | null>(null)

  // a one-thing chip with a skill opens its view on arrival (openMind); only once the skill screens are reviewed
  useEffect(() => {
    if (!mindOpen) return
    if (MIND_REVIEWED) setView(mindOpen)
    clearOpen()
  }, [mindOpen, clearOpen])

  // the check-in sheet edits the selected day, so the Mind page's "Today" moves it to today first;
  // with health data declined it goes to Profile's health section, as the Summary card does
  const openCheckin = () => {
    if (declined) { openProfile('health'); return }
    if (cur !== today) setDate(today)
    setSheet('checkin')
  }

  if (view === 'reset') return <ResetScreen onBack={() => setView(null)} />

  return (
    <MindPageView today={today} checkin={checkin} skillsOn={MIND_REVIEWED}
      onCheckin={openCheckin} onSupport={() => setSheet('support')} onSkill={(id) => setView(id)} onPlans={() => setTab('plan')}>
      {sheet === 'checkin' && <CheckinSheet onClose={() => setSheet(null)} />}
      {sheet === 'support' && <SupportSheet onClose={() => setSheet(null)} />}
      {view === 'unload' && <UnloadSheet onClose={() => setView(null)} />}
    </MindPageView>
  )
}

/**
 * The page itself, from plain props (no store), so `npm test` can render it on the server.
 * `children` are the sheets the page has open.
 */
export function MindPageView({ today, checkin, skillsOn, onCheckin, onSupport, onSkill, onPlans, children }: {
  today: string; checkin: CheckIn | null | undefined; skillsOn: boolean
  onCheckin: () => void; onSupport: () => void; onSkill: (view: MindView) => void; onPlans: () => void
  children?: ReactNode
}) {
  const pairs = checkinPairs(checkin)
  const skills = skillsOn ? skillsWithScreen() : []
  return (
    <div className="screen mind">
      <PageHeader eyebrow={mindEyebrow(today)} title={MIND.title} pill={false} />

      <div className="lbl mind-lbl-first">{MIND.today}</div>
      {pairs.length ? (
        <section className="card mind-today" aria-label="Today's check-in">
          <div className="mind-g2">
            {pairs.map(([k, v]) => <div key={k}><div className="k">{k}</div><div className="v">{v}</div></div>)}
          </div>
          <button className="btn gray sm" onClick={onCheckin}>{MIND.update}</button>
        </section>
      ) : (
        <section className="card mind-today" aria-label="Today's check-in">
          <div>
            <div className="mind-ask">{MIND.askTitle}</div>
            <div className="mind-ask-sub">{MIND.askSub}</div>
          </div>
          <button className="btn sm" onClick={onCheckin}>{MIND.checkIn}</button>
        </section>
      )}

      <div className="list">
        <button className="li" onClick={onSupport}>
          <span className="m"><span className="t">{SHARED.support}</span></span>
          <Chevron />
        </button>
      </div>

      {skills.length > 0 && (
        <>
          <div className="lbl">{MIND.skills}</div>
          <div className="list icons mind-skills">
            {skills.map((sk) => (
              <button key={sk.id} className="li" onClick={() => onSkill(sk.id === 'unload' ? 'unload' : 'reset')}>
                <span className="ico" style={{ background: `var(--${sk.pillar}-fill)`, color: `var(--${sk.pillar}-ink)` }}><Icon name={sk.icon as IconName} size={18} /></span>
                <span className="m"><span className="t">{sk.name}</span><span className="s">{sk.sub}</span></span>
                <Chevron />
              </button>
            ))}
          </div>
        </>
      )}

      <ReflectionCard />

      <div className="list mind-plans">
        <button className="li" onClick={onPlans}>
          <span className="m"><span className="t">{MIND.plans}</span></span>
          <span className="tr">{MIND.plansWhere}</span>
          <Chevron />
        </button>
      </div>

      <div className="foot mind-wellness">{SHARED.wellness}</div>
      {children}
    </div>
  )
}
