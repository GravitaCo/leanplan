import { useState } from 'react'
import type { MindPrefs, Pillar, Profile } from '@/core/types'
import { PILLARS } from '@/core/domain/checkin'
import { wellbeingRouted } from '@/core/domain/onboarding'
import { useStore } from '@/store/store'
import { Seg, SettingRow, Toggle } from '@/ui/primitives'
import type { IconName } from '@/ui/icons'
import { SupportSheet } from '../mind/SupportSheet'
import { PILLARS_COPY as C } from './pillarsCopy'

const ICON: Record<Pillar, [IconName, string]> = {
  mind: ['smile', 'var(--mind-fill)'],
  food: ['fork', 'var(--food-fill)'],
  move: ['dumbbell', 'var(--move-fill)'],
}

/** Someone the at-risk route (B1.16) is for: Gentle display on, or wellbeing routing from onboarding. */
export const atRiskRoute = (p: Pick<Profile, 'gentle' | 'outcomes'>): boolean => !!p.gentle || wellbeingRouted(p.outcomes?.wellbeing)

/** The pillars still on, in board order. Absent `off` means all on. */
export const pillarsOn = (m: MindPrefs | undefined): Pillar[] => PILLARS.filter((p) => !m?.off?.includes(p))

/** `off` after flipping one pillar; null (the key removed) when all are on again. */
export function offAfter(m: MindPrefs | undefined, p: Pillar): Pillar[] | null {
  const off = new Set(m?.off ?? [])
  if (off.has(p)) off.delete(p); else off.add(p)
  const next = PILLARS.filter((x) => off.has(x))
  return next.length ? next : null
}

export interface PillarsViewProps {
  mind: MindPrefs | undefined
  /** Gentle display on or wellbeing routing (atRiskRoute) */
  atRisk: boolean
  onToggle: (p: Pillar) => void
  onAsks: (v: 'usual' | 'fewer') => void
  onDisplay: () => void
  onSupport: () => void
}

/**
 * Board B1, store-free (tests render it). Three pillar switches; the last one on is disabled with
 * B1.9 (the store refuses all-off too). With Food off its foot is B1.14 (option C1: Food leaves
 * Today), unless only one pillar is left on (B1.8, as drawn); for someone in gentle mode or wellbeing routing, B1.16 follows, so switching Food off is
 * never the only way out: Gentle display and support, each one tap. Then the asks Seg and B1.13.
 */
export function PillarsSettingsView({ mind, atRisk, onToggle, onAsks, onDisplay, onSupport }: PillarsViewProps) {
  const on = pillarsOn(mind)
  const foodOff = !on.includes('food')
  return (
    <section className="pillars" aria-label={C.heading}>
      <div className="lbl">{C.heading}</div>
      <div className="list icons">
        {PILLARS.map((p) => {
          const isOn = on.includes(p)
          const last = isOn && on.length === 1
          return (
            <SettingRow key={p} icon={ICON[p][0]} color={ICON[p][1]} soft label={C.rows[p].label} sub={last ? C.lastOn : C.rows[p].sub}
              right={<Toggle label={C.rows[p].label} on={isOn} disabled={last} onChange={() => onToggle(p)} />} />
          )
        })}
      </div>
      {/* B1.14 replaces B1.8 while Food is off, except with one pillar left on: board wp-b1-more's
          "only Move on" frame keeps B1.8, which says why that switch can't move */}
      <div className="foot">{foodOff && on.length > 1 ? C.foodOff : C.foot}</div>
      {foodOff && atRisk && (
        <div className="foot pillars-hard">
          {C.hard.lead}<button type="button" className="linkbtn inl" onClick={onDisplay}>{C.hard.display}</button>{C.hard.mid}
          <button type="button" className="linkbtn inl" onClick={onSupport}>{C.hard.support}</button>{C.hard.end}
        </div>
      )}
      <div className="lbl">{C.asksHeading}</div>
      <div className="list pillars-asks" style={{ padding: '12px 16px' }}>
        <Seg<'usual' | 'fewer'> options={[['usual', C.asks.usual], ['fewer', C.asks.fewer]]} value={mind?.asks ?? 'usual'} onChange={onAsks} />
      </div>
      <div className="foot">{C.asksFoot}</div>
    </section>
  )
}

/**
 * Profile's pillars and asks group (WP9), between "You and your goal" and "Tracking". Writes go
 * through setMindPrefs, which stamps each `mind.*` path for sync and refuses all-off; it never
 * touches Gentle display or foodMode, so Food off and on again keeps gentle as it was (MP rule 5).
 * With Mind off, Support stays in Profile › Health data (an accepted limit, board annotation).
 * Rendered only with WELLBEING_ENABLED (ProfileScreen).
 */
export function PillarsSettings({ onDisplay }: { onDisplay: () => void }) {
  const mind = useStore((s) => s.data.profile.mind)
  const gentle = useStore((s) => s.data.profile.gentle)
  const outcomes = useStore((s) => s.data.profile.outcomes)
  const setMindPrefs = useStore((s) => s.setMindPrefs)
  const [support, setSupport] = useState(false)
  return (
    <>
      <PillarsSettingsView mind={mind} atRisk={atRiskRoute({ gentle, outcomes })}
        onToggle={(p) => { setMindPrefs({ off: offAfter(useStore.getState().data.profile.mind, p) }) }}
        onAsks={(v) => { setMindPrefs({ asks: v }) }}
        onDisplay={onDisplay} onSupport={() => setSupport(true)} />
      {support && <SupportSheet onClose={() => setSupport(false)} />}
    </>
  )
}
