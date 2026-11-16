/**
 * Onboarding 9's once-only asks on Today (boards ob9-3 and ob9-4), never a push: Sometimes at day
 * 14, "Would you like your food range on Today?"; Yes at the week-4 look-back, "Would a calorie
 * range help?". Closing counts as the second answer (kept on Food; or rested for 12 weeks), so
 * it's never asked twice in a row. Profile › Health check answers undoes a yes in one tap.
 */
import { useStore } from '@/store/store'
import { BareSheet } from '@/ui/primitives'
import { FOOD9 } from '../onboarding/copyApp'

export function FoodAskSheet({ ask, onClose }: { ask: 'today' | 'range'; onClose: () => void }) {
  const answer = useStore((s) => s.answerFoodOptIn)
  const c = ask === 'today' ? FOOD9.todayAsk : FOOD9.rangeAsk
  const pick = (yes: boolean) => {
    if (ask === 'today') answer({ ask, value: yes ? 'today' : 'food' })
    else answer({ ask, value: yes ? 'shown' : 'not-now' })
    onClose()
  }
  return (
    <BareSheet label={c.t} onClose={() => pick(false)} className="consent">
      <div className="ift-k">{c.k}</div>
      <h2 className="cs-t f9-ask">{c.t}</h2>
      <div className="cs-lead">{c.s}</div>
      <button className="btn ob-btn" onClick={() => pick(true)}>{c.yes}</button>
      <button className="btn gray f9-no" onClick={() => pick(false)}>{c.no}</button>
    </BareSheet>
  )
}
