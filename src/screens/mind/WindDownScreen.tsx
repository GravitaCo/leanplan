import { useState, type ReactNode } from 'react'
import { useStore } from '@/store/store'
import { healthDeclined } from '@/data/consent'
import { isHHMM } from '@/core/domain/checkin'
import { routineChoices, routineItems, routineSub, routineToSave, skillById, DEFAULT_ROUTINE, type WindDownItem } from '@/core/data/skills'
import type { SkillId } from '@/core/types'
import { BackButton, Sheet, Toggle, TitleRow } from '@/ui/primitives'
import { Chevron, Icon, type IconName } from '@/ui/icons'
import { MIND, SHARED, WIND_DOWN } from './copy'
import { SupportSheet } from './SupportSheet'

const MIND_ICO = { background: 'var(--mind-fill)', color: 'var(--mind-ink)' }

/** A routine step's icon square, in mind tokens (B12). */
const StepIcon = ({ item }: { item: WindDownItem }) => (
  <span className="ico" style={MIND_ICO}><Icon name={item.icon as IconName} size={18} /></span>
)

/**
 * Wind down (board B12, canvas wp-b12-light and wp-b12-dark; approved by Benn, 10 Oct 2026): a
 * pushed card screen in mind tokens, like Reset (B7), with Back "Mind", the title and the Profile
 * avatar, and no tab bar. "Your routine" lists the steps the person picked (the default until they
 * change it), with the wind-down time on the right when one is set. Unload and Reset open their
 * own screens; the other steps are things to do, not screens. "Change your routine" opens the
 * sheet. Reached only when MIND_REVIEWED is on (MindPage). Copy: copy.ts WIND_DOWN.
 */
export function WindDownScreen({ onBack, onSkill, children }: {
  onBack: () => void
  /** a routine step with a skill screen (Unload, Reset) */
  onSkill: (id: Extract<SkillId, 'reset' | 'unload'>) => void
  children?: ReactNode
}) {
  const mind = useStore((s) => s.data.profile.mind)
  const declined = useStore((s) => healthDeclined(s.data))
  const openProfile = useStore((s) => s.openProfile)
  return (
    <WindDownView windDownAt={mind?.windDownAt} routine={mind?.routine} onBack={onBack} onSkill={onSkill}
      // the routine is health data: with health data declined it can't be saved, so the row goes
      // to Profile's health section, as the Mind page's check-in does
      onHealth={declined ? () => openProfile('health') : undefined}>
      {children}
    </WindDownView>
  )
}

/**
 * The screen from plain props (no store reads), so `npm test` can render it on the server.
 * `onHealth` set: "Change your routine" goes there instead of opening the sheet.
 */
export function WindDownView({ windDownAt, routine, onBack, onSkill, onHealth, children }: {
  windDownAt: string | undefined
  routine: string[] | undefined
  onBack: () => void
  onSkill: (id: Extract<SkillId, 'reset' | 'unload'>) => void
  onHealth?: () => void
  children?: ReactNode
}) {
  const [sheet, setSheet] = useState<'routine' | 'support' | null>(null)
  const time = isHHMM(windDownAt) ? windDownAt : undefined
  const steps = routineItems(routine)
  const skill = skillById('wind-down')!
  const change = () => (onHealth ? onHealth() : setSheet('routine'))

  return (
    <div className="screen mind-pushed wind-down">
      <div className="pv-back"><BackButton label={MIND.title} onClick={onBack} /></div>
      <TitleRow title={skill.name} />
      <div className="wd-main">
        <div className="wd-sub">{skill.sub}</div>
        <div className="lbl wd-lbl"><span>{WIND_DOWN.routine}</span>{time && <span className="num">{WIND_DOWN.from(time)}</span>}</div>
        <div className="list icons wd-steps">
          {steps.map((i) => {
            const body = (
              <>
                <StepIcon item={i} />
                <span className="m"><span className="t">{i.name}</span><span className="s">{routineSub(i)}</span></span>
              </>
            )
            return i.skill === 'reset' || i.skill === 'unload'
              ? <button key={i.key} className="li" onClick={() => onSkill(i.skill as 'reset' | 'unload')}>{body}<Chevron /></button>
              : <div key={i.key} className="li">{body}</div>
          })}
          <button className="li act wd-change" onClick={change}><Icon name="sliders" size={20} /><span>{WIND_DOWN.change}</span></button>
        </div>
        <div className="foot">{WIND_DOWN.anyOrder}</div>
        <div className="foot">{WIND_DOWN.gp}</div>
        <div className="list">
          <button className="li" onClick={() => setSheet('support')}>
            <span className="m"><span className="t">{SHARED.support}</span></span>
            <Chevron />
          </button>
        </div>
        <div className="foot wd-wellness">{SHARED.wellness}</div>
      </div>
      {sheet === 'routine' && <RoutineSheet time={time} stored={routine} onClose={() => setSheet(null)} />}
      {sheet === 'support' && <SupportSheet onClose={() => setSheet(null)} />}
      {children}
    </div>
  )
}

/**
 * "Your routine" (B12's sheet): a toggle per step, Cancel and Done. Done saves the picks to
 * `profile.mind.routine` (health data: setMindPrefs refuses it without a current health yes), keys
 * only; Cancel leaves it as it was. Under the list, the wind-down time line, or "Set a wind-down
 * time" (to Profile › Notifications) when none is set, never a default.
 */
export function RoutineSheet({ time, stored, onClose }: { time: string | undefined; stored: string[] | undefined; onClose: () => void }) {
  const setMindPrefs = useStore((s) => s.setMindPrefs)
  const openProfile = useStore((s) => s.openProfile)
  const [picked, setPicked] = useState<string[]>(() => [...(stored ?? DEFAULT_ROUTINE)])
  const flip = (k: string) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]))
  const done = () => {
    const next = routineToSave(picked, stored)
    const same = stored ? JSON.stringify(next) === JSON.stringify(stored) : JSON.stringify(next) === JSON.stringify(DEFAULT_ROUTINE)
    if (!same) setMindPrefs({ routine: next })
    onClose()
  }
  return (
    <Sheet title={WIND_DOWN.sheetTitle} onClose={onClose} right={<button className="navbtn b" onClick={done}>Done</button>}>
      <div className="wd-lead">{WIND_DOWN.sheetLead}</div>
      <div className="list icons wd-pick">
        {routineChoices().map((i) => (
          <div key={i.key} className="li">
            <StepIcon item={i} />
            <span className="m"><span className="t">{i.name}</span></span>
            <Toggle label={i.name} on={picked.includes(i.key)} onChange={() => flip(i.key)} />
          </div>
        ))}
      </div>
      {time
        ? <div className="foot wd-time">{WIND_DOWN.timeLine(time)}</div>
        : (
          <div className="list wd-set">
            <button className="li act" onClick={() => { onClose(); openProfile('notifications') }}>
              <span className="m">{WIND_DOWN.setTime}</span><Chevron />
            </button>
          </div>
        )}
    </Sheet>
  )
}
