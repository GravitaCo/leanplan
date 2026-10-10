import { useState } from 'react'
import { Sheet } from '@/ui/primitives'
import { NATIONS, type UkNation } from '@/core/data/signposts'
import { SUPPORT } from '../onboarding/copyApp'
import { Opts } from '../onboarding/Opts'
import { supportList, type SupportRow } from '../profile/supportRows'
import { SUPPORT_MIND } from './copy'

/**
 * Support and helplines in the Mind context (wellbeing board B6 frame 1): Samaritans and Shout
 * first, then the NHS lines, Beat and 999, with the not-a-crisis-service line and the private foot.
 * Opened from "Need support now?" anywhere (Mind page, later the check-in, skills and the low-mood
 * note). Its foot says opening it is private, so it must stay pure UI: no store, no persisted
 * field, no network, no count against the day's asks (scripts/wellbeing/mind-page.ts checks it).
 * The nation is this sheet's own state, forgotten on close, as on Profile's sheet
 * (profile/AccountData.tsx), whose layout (ob9-7) this reuses. It starts with no nation (register
 * item 44): "Showing services for the whole UK" and only services that run in all four nations (the
 * GP, not NHS 111, which doesn't run in Northern Ireland); "Choose" picks a nation and brings its NHS
 * route. Never red. While no nation is picked the button reads "Choose" and a footnote under the
 * list says choosing one adds local NHS services; after a pick it reads "Change" (Benn, 10 Oct 2026).
 */
export function SupportSheet({ onClose }: { onClose: () => void }) {
  const [nation, setNation] = useState<UkNation | null>(null)
  const [picking, setPicking] = useState(false)
  const name = nation ? NATIONS.find(([k]) => k === nation)![1] : SUPPORT_MIND.anyNation
  return (
    <Sheet title={SUPPORT.title} onClose={onClose} left={null} right={<button className="navbtn b" onClick={onClose}>Done</button>}>
      <div className="sp-sheet">
        <div className="sp-lead">{SUPPORT.lead}</div>
        {picking
          ? <Opts label="Nation" opts={NATIONS} value={nation ?? undefined} onPick={(k) => { setNation(k); setPicking(false) }} />
          : <div className="sp-nation"><span>{SUPPORT.showing(name)}</span><button className="linkbtn" onClick={() => setPicking(true)}>{nation ? SUPPORT.change : SUPPORT.choose}</button></div>}
        <SupportRows list={supportList(nation, { context: 'mind' })} />
        {!nation && <div className="sp-foot">{SUPPORT.chooseNation}</div>}
        <div className="sp-foot">{SUPPORT_MIND.notCrisis}</div>
        <div className="sp-foot">{SUPPORT_MIND.foot}</div>
      </div>
    </Sheet>
  )
}

/**
 * The rows, in onboarding/Signposts' markup (`.wz-sp`), plus a text row: Shout opens a new message
 * (`sms:`) instead of a call. A row with a web link keeps the number as its own link.
 */
function SupportRows({ list }: { list: SupportRow[] }) {
  return (
    <div className="wz-group">
      {list.map((s) => {
        const text = <span className="m"><span className="t">{s.name}</span><span className="s">{s.desc}</span>
          {s.web && <a className="wz-sp-web" href={s.web} target="_blank" rel="noopener noreferrer">{s.webLabel ?? 'Webchat and email'}</a>}</span>
        if (s.sms) {
          return <a key={s.name} className="wz-sp" href={s.sms} aria-label={`${s.name}: text ${s.num}`}>{text}<span className="n num">{s.num}</span></a>
        }
        if (s.tel && s.web) {
          return (
            <div key={s.name} className="wz-sp">{text}
              <a className="n num" href={'tel:' + s.tel.replace(/\s/g, '')} aria-label={`${s.name}: call ${s.num}`}>{s.num}</a>
            </div>
          )
        }
        return s.tel
          ? <a key={s.name} className="wz-sp" href={'tel:' + s.tel.replace(/\s/g, '')} aria-label={`${s.name}: call ${s.num}`}>{text}<span className="n num">{s.num}</span></a>
          : <div key={s.name} className="wz-sp">{text}{s.num && <span className="n num">{s.num}</span>}</div>
      })}
    </div>
  )
}
