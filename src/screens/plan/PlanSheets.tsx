import { useState } from 'react'
import { useStore } from '@/store/store'
import type { IfThenPlan } from '@/core/types'
import { plansDue } from '@/core/domain/insights'
import { BareSheet, Sheet } from '@/ui/primitives'
import { IF_THEN } from '../onboarding/copyApp'

/** "When I get home from work", or a plan made from a cue (ob5-4) as it was written: "After lunch". */
export const whenLine = (when: string) => (/^after\b/i.test(when) ? when.charAt(0).toUpperCase() + when.slice(1) : `When ${when}`)

export const PLAN_OUTCOME: Record<IfThenPlan['reviews'][number]['r'], string> = { worked: 'Worked', mixed: 'Mixed', no: "Didn't work" }

/**
 * Mind plans (board B9, deck B9.15 and B9.17; plan `kind: 'mind'`). Every string here is linted with
 * mindCopyIssues by scripts/wellbeing/one-thing.ts. Shown only with WELLBEING_ENABLED: a Mind plan
 * is only made from the day's one thing, and Plan groups by kind only with the flag on.
 */
export const MIND_PLAN = {
  /** the Plan group name (board B9, approved for now by Benn, 8 Oct 2026) */
  group: 'Mind plans',
  /** B9.15, under the fields */
  savedUnder: 'Saved under Mind plans on Plan',
  /** B9.17, the toast after saving */
  saved: 'Plan saved. Tali will check in on it next week.',
  /** B9.14's empty field, as drawn */
  optional: 'Optional',
} as const

/**
 * Plan's if–then groups: with the wellbeing flag on, Mind plans get their own group; every other
 * plan (and every plan with the flag off) stays under "If–then plans", in saved order.
 */
export function planGroups(plans: readonly IfThenPlan[], wellbeing: boolean): { ifThen: IfThenPlan[]; mind: IfThenPlan[] } {
  if (!wellbeing) return { ifThen: [...plans], mind: [] }
  return { ifThen: plans.filter((p) => p.kind !== 'mind'), mind: plans.filter((p) => p.kind === 'mind') }
}

/**
 * Create or edit an if–then plan (implementation intention + optional coping plan). `prefill` and
 * `kind` make a new plan from the day's one thing (B9.10 to B9.17): the fields start filled (nothing
 * is saved for you), the B9.15 line shows, and saving says B9.17.
 */
export function PlanEditSheet({ id, prefill, kind, onClose }: { id?: string; prefill?: { when: string; then: string }; kind?: 'mind'; onClose: () => void }) {
  const plan = useStore((s) => (id ? s.data.profile.plans?.find((p) => p.id === id) : undefined))
  const savePlan = useStore((s) => s.savePlan)
  const deletePlan = useStore((s) => s.deletePlan)
  const showToast = useStore((s) => s.showToast)
  const [when, setWhen] = useState(plan?.when ?? prefill?.when ?? '')
  const [then, setThen] = useState(plan?.then ?? prefill?.then ?? '')
  const [cope, setCope] = useState(plan?.cope ?? '')
  // a new Mind plan; editing one keeps its kind in the store. Its When and I'll fields have no
  // placeholder: the food examples brought food timing into a Mind flow (mental-performance
  // close-out, change 5), and Mind examples wait for Benn
  const mind = !plan && kind === 'mind'
  const save = () => {
    if (!when.trim() || !then.trim()) { showToast("Fill in when and what you'll do"); return }
    // a Mind plan is refused while health data is off (the store says why); the sheet stays open
    const ok = mind
      ? savePlan({ when: when.trim(), then: then.trim(), cope: cope.trim(), kind: 'mind' }, { toast: MIND_PLAN.saved })
      : savePlan({ id: plan?.id, when: when.trim(), then: then.trim(), cope: cope.trim() })
    if (ok) onClose()
  }
  return (
    <Sheet title={plan ? 'Edit plan' : 'New plan'} onClose={onClose} right={<button className="navbtn b" onClick={save}>Save</button>}>
      <label className="lbl" htmlFor="pl_when" style={{ display: 'block' }}>When…</label>
      <input id="pl_when" className="sheet-input" value={when} placeholder={mind ? undefined : 'I get home from work hungry'} onChange={(e) => setWhen(e.target.value)} />
      <label className="lbl" htmlFor="pl_then" style={{ display: 'block' }}>I'll…</label>
      <input id="pl_then" className="sheet-input" value={then} placeholder={mind ? undefined : 'have a yoghurt before I start cooking'} onChange={(e) => setThen(e.target.value)} />
      <label className="lbl" htmlFor="pl_cope" style={{ display: 'block' }}>If something gets in the way…</label>
      <input id="pl_cope" className="sheet-input" value={cope} placeholder={mind ? MIND_PLAN.optional : 'keep protein bars in my bag'} onChange={(e) => setCope(e.target.value)} />
      {mind && <div className="foot">{MIND_PLAN.savedUnder}</div>}
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
          <div style={{ fontWeight: 600 }}>{whenLine(pl.when)}</div>
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

/**
 * ob5-4: once on Today after the first workout, "Plan when you'll do it". Saved as an ordinary
 * if-then plan ("after my morning coffee" → "do my workout"), so the weekly check-in and the Plan
 * tab carry it as they do any other. Save or Not now: never offered again (onDone).
 */
export function FirstPlanSheet({ onDone }: { onDone: () => void }) {
  const savePlan = useStore((s) => s.savePlan)
  const [after, setAfter] = useState('')
  const [then, setThen] = useState<string>(IF_THEN.thenValue)
  const ok = !!after.trim() && !!then.trim()
  const save = () => { if (!ok) return; savePlan({ when: `after ${after.trim()}`, then: then.trim() }); onDone() }
  return (
    <BareSheet label={IF_THEN.title} onClose={onDone}>
      <div className="ift">
        <div className="ift-k">{IF_THEN.k}</div>
        <h2 className="ift-h">{IF_THEN.title}</h2>
        <div className="ift-lead">{IF_THEN.lead}</div>
        <div className="ift-card">
          <label htmlFor="ift_after">{IF_THEN.after}</label>
          <input id="ift_after" value={after} placeholder={IF_THEN.placeholder} maxLength={80} onChange={(e) => setAfter(e.target.value)} />
          <label htmlFor="ift_then" className="l2">{IF_THEN.then}</label>
          <input id="ift_then" value={then} maxLength={80} onChange={(e) => setThen(e.target.value)} />
        </div>
        <div className="ift-cues" role="group" aria-label="Cues">
          {IF_THEN.cues.map((c) => <button key={c} className={after === c ? 'on' : ''} aria-pressed={after === c} onClick={() => setAfter(c)}>After {c}</button>)}
        </div>
        <button className="btn ob-btn" disabled={!ok} onClick={save}>{IF_THEN.save}</button>
        <button className="linkbtn ob-alt" onClick={onDone}>{IF_THEN.later}</button>
      </div>
    </BareSheet>
  )
}
