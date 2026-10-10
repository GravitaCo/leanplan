import { useState } from 'react'
import { useStore, TRAIN_LOG_WALK } from '@/store/store'
import { todayStr } from '@/core/domain/date'
import { skillById } from '@/core/data/skills'
import { BackButton, TitleRow } from '@/ui/primitives'
import { Chevron, Icon } from '@/ui/icons'
import { MIND, OUTSIDE, SHARED } from './copy'
import { SupportSheet } from './SupportSheet'

const MOVE_SQ = { background: 'var(--move-fill)', color: 'var(--move-ink)' }

/**
 * Get outside (board B13, canvas wp-b13-light and wp-b13-dark; approved by Benn, 10 Oct 2026): a
 * pushed card screen in move tokens (it leads into Move, plan §10a), with Back "Mind", the title
 * and the Profile avatar, and no tab bar, like Reset. "Easy walk" Start goes to Train, today, with
 * its "Log a session" sheet set to an Easy walk (Train has no stand-alone walk session to start;
 * the walk is logged there like any session). This screen logs nothing itself.
 * Reached only when MIND_REVIEWED is on (MindPage). Copy: copy.ts OUTSIDE.
 */
export function OutsideScreen({ onBack }: { onBack: () => void }) {
  const openTrain = useStore((s) => s.openTrain)
  const setDate = useStore((s) => s.setDate)
  const [support, setSupport] = useState(false)
  const skill = skillById('outside')!
  return (
    <div className="screen mind-pushed outside">
      <div className="pv-back"><BackButton label={MIND.title} onClick={onBack} /></div>
      <TitleRow title={skill.name} />
      <div className="wd-main">
        <div className="wd-sub">{skill.sub}</div>
        <section className="card go-lead">
          <span className="go-sq lg" style={MOVE_SQ}><Icon name="sun" size={26} /></span>
          <div className="go-text">{OUTSIDE.lead}</div>
        </section>
        <div className="lbl">{OUTSIDE.walkHeading}</div>
        <div className="list">
          <div className="li go-walk">
            <span className="go-sq lg" style={MOVE_SQ}><Icon name="leaf" size={24} /></span>
            <span className="m"><span className="t">{OUTSIDE.walk}</span><span className="s num">{OUTSIDE.walkTime}</span></span>
            <button className="btn sm" onClick={() => { setDate(todayStr()); openTrain(TRAIN_LOG_WALK) }}>{OUTSIDE.start}</button>
          </div>
        </div>
        <div className="foot">{OUTSIDE.walkFoot}</div>
        <div className="list">
          <button className="li" onClick={() => setSupport(true)}>
            <span className="m"><span className="t">{SHARED.support}</span></span>
            <Chevron />
          </button>
        </div>
        <div className="foot wd-wellness">{SHARED.wellness}</div>
      </div>
      {support && <SupportSheet onClose={() => setSupport(false)} />}
    </div>
  )
}
