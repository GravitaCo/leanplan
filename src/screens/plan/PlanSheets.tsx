import { useState } from 'react'
import { useStore } from '@/store/store'
import type { IfThenPlan } from '@/core/types'
import { plansDue } from '@/core/domain/insights'
import { Sheet } from '@/ui/primitives'

export const PLAN_OUTCOME: Record<IfThenPlan['reviews'][number]['r'], string> = { worked: 'Worked', mixed: 'Mixed', no: "Didn't work" }

/** Create or edit an if–then plan (implementation intention + optional coping plan). */
export function PlanEditSheet({ id, onClose }: { id?: string; onClose: () => void }) {
  const plan = useStore((s) => (id ? s.data.profile.plans?.find((p) => p.id === id) : undefined))
  const savePlan = useStore((s) => s.savePlan)
  const deletePlan = useStore((s) => s.deletePlan)
  const showToast = useStore((s) => s.showToast)
  const [when, setWhen] = useState(plan?.when ?? '')
  const [then, setThen] = useState(plan?.then ?? '')
  const [cope, setCope] = useState(plan?.cope ?? '')
  const save = () => {
    if (!when.trim() || !then.trim()) { showToast("Fill in when and what you'll do"); return }
    savePlan({ id: plan?.id, when: when.trim(), then: then.trim(), cope: cope.trim() })
    onClose()
  }
  return (
    <Sheet title={plan ? 'Edit plan' : 'New plan'} onClose={onClose} right={<button className="navbtn b" onClick={save}>Save</button>}>
      <label className="lbl" htmlFor="pl_when" style={{ display: 'block' }}>When…</label>
      <input id="pl_when" className="sheet-input" value={when} placeholder="I get home from work hungry" onChange={(e) => setWhen(e.target.value)} />
      <label className="lbl" htmlFor="pl_then" style={{ display: 'block' }}>I'll…</label>
      <input id="pl_then" className="sheet-input" value={then} placeholder="have a yoghurt before I start cooking" onChange={(e) => setThen(e.target.value)} />
      <label className="lbl" htmlFor="pl_cope" style={{ display: 'block' }}>If something gets in the way…</label>
      <input id="pl_cope" className="sheet-input" value={cope} placeholder="keep protein bars in my bag" onChange={(e) => setCope(e.target.value)} />
      <div className="foot">Specific beats ambitious. A plan you'll actually do is worth more than a perfect one.</div>
      {plan && <div className="stack"><button className="btn danger" onClick={() => { deletePlan(plan.id); onClose() }}>Delete plan</button></div>}
    </Sheet>
  )
}

/** Weekly follow-up — the part that makes if–then plans work. */
export function PlanReviewSheet({ onClose }: { onClose: () => void }) {
  const profile = useStore((s) => s.data.profile)
  const reviewPlans = useStore((s) => s.reviewPlans)
  const [due] = useState(() => plansDue(profile))
  const [out, setOut] = useState<Record<string, IfThenPlan['reviews'][number]['r']>>({})
  const answered = Object.keys(out).length > 0
  const save = () => { if (answered) { reviewPlans(out); onClose() } }
  return (
    <Sheet title="Plan check-in" onClose={onClose} right={<button className="navbtn b" onClick={save} disabled={!answered}>Done</button>}>
      <div className="sub" style={{ padding: '0 4px 12px' }}>
        How did each plan go this week? A plan that isn't working is worth rewriting. It's not a failing on your part.
      </div>
      {due.map((pl) => (
        <div className="card" key={pl.id}>
          <div style={{ fontWeight: 600 }}>When {pl.when}</div>
          <div className="sub" style={{ margin: '2px 0 10px' }}>I'll {pl.then}{pl.cope ? `. If something gets in the way: ${pl.cope}` : ''}</div>
          <div className="chips">
            {(Object.keys(PLAN_OUTCOME) as (keyof typeof PLAN_OUTCOME)[]).map((k) => (
              <button key={k} className={'chip' + (out[pl.id] === k ? ' on' : '')} onClick={() => setOut({ ...out, [pl.id]: k })}>{PLAN_OUTCOME[k]}</button>
            ))}
          </div>
        </div>
      ))}
    </Sheet>
  )
}
