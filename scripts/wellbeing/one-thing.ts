/* WP14: the one thing (board B9) and Mind plans. The chips per day type, the skill a chip opens,
   "Make it a plan" (the prefilled plan sheet, B9.10 to B9.15), Plan's "Mind plans" group and the
   copy lint. The store side (savePlan with a kind, health off) is in store.ts. Run from
   scripts/test-wellbeing.ts; returns the number of failures. */
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import type { IfThenPlan } from '@/core/types'
import { thingByKey, THINGS } from '@/core/data/skills'
import { thingOptions, type ThingCtx } from '@/core/domain/mind'
import { mindCopyIssues } from '@/core/domain/engine/why'
import { MIND_PLAN, PlanEditSheet, planGroups, whenLine } from '@/screens/plan/PlanSheets'
import { ThingPlanSheet } from '@/screens/today/ThingPlanSheet'
import { thingView } from '@/screens/today/MindCard'

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()

export function oneThingSuite(): number {
  const checks: [string, boolean, string?][] = []
  const ok = (n: string, v: boolean, info?: string) => checks.push([n, v, info])

  /* ---------- chips (D1 on ordinary days, Mind-led on hard days) ---------- */
  const keys = (c: Partial<ThingCtx>) => thingOptions({ skillsAvailable: false, ...c }).map((t) => t.key).join()
  ok('ordinary day, session, reviewed: one per pillar', keys({ sessionToday: true, skillsAvailable: true }) === 'reset-before-session,lunch-somewhere,outside-lunch', keys({ sessionToday: true, skillsAvailable: true }))
  ok('ordinary day, sub-flag off: Wind down instead of Reset', keys({ sessionToday: true, windDownAt: '22:30' }) === 'wind-down-from,lunch-somewhere,outside-lunch')
  ok('ordinary day, sub-flag off, no wind-down time: no Mind chip', keys({ sessionToday: true }) === 'lunch-somewhere,outside-lunch')
  ok('gentle mode: no food chip', !keys({ gentle: true, windDownAt: '22:30' }).includes('lunch-somewhere'))
  ok('wellbeing routing: no food chip', !keys({ wellbeingRouting: true, windDownAt: '22:30' }).includes('lunch-somewhere'))
  ok('hard day: Mind-led, no food chip', keys({ hard: true, skillsAvailable: true }) === 'reset-2,outside-10')
  ok('Food off: no food chip; Move off: no move chip', keys({ off: ['food'], windDownAt: '22:30' }) === 'wind-down-from,outside-lunch' && keys({ off: ['move'], windDownAt: '22:30' }) === 'wind-down-from,lunch-somewhere')
  ok('Mind off: no chips at all', keys({ off: ['mind'], windDownAt: '22:30' }) === '')

  /* ---------- a chip with a skill opens it, only with MIND_REVIEWED ---------- */
  const reset = thingByKey('reset-before-session')!
  ok('Reset chip opens Reset when reviewed', thingView(reset, true) === 'reset' && thingView(thingByKey('reset-2')!, true) === 'reset')
  ok('Reset chip opens nothing without the sub-flag', thingView(reset, false) === null)
  ok('chips without a screen open nothing', ['outside-lunch', 'outside-10', 'lunch-somewhere', 'wind-down-from'].every((k) => thingView(thingByKey(k)!, true) === null))

  /* ---------- Make it a plan (B9.10 to B9.15) ---------- */
  const outside = thingByKey('outside-lunch')!
  ok('Get outside at lunch carries the B9.11 / B9.13 prefill', outside.plan?.when === 'after lunch' && outside.plan?.then === 'get outside for 10 minutes')
  ok('the prefill reads "After lunch" on Plan', whenLine(outside.plan!.when) === 'After lunch')
  const sheet = renderToString(createElement(ThingPlanSheet, { thing: outside, onClose: () => {} }))
  ok('sheet: New plan, prefilled, never saved for you', /New plan/.test(sheet) && /value="after lunch"/.test(sheet) && /value="get outside for 10 minutes"/.test(sheet), text(sheet))
  ok('sheet: the coping field is empty with "Optional"', /id="pl_cope"[^>]*value=""/.test(sheet) && /placeholder="Optional"/.test(sheet))
  ok('sheet: B9.15 group line, then the B9.16 foot', text(sheet).includes(`${MIND_PLAN.savedUnder} Specific beats ambitious.`), text(sheet))
  const empty = renderToString(createElement(ThingPlanSheet, { thing: thingByKey('lunch-somewhere')!, onClose: () => {} }))
  ok('a thing with no prefill opens empty, still as a Mind plan', /id="pl_when"[^>]*value=""/.test(empty) && text(empty).includes(MIND_PLAN.savedUnder))
  const ordinary = renderToString(createElement(PlanEditSheet, { onClose: () => {} }))
  ok('an ordinary New plan is unchanged (no group line, old placeholder)', !text(ordinary).includes(MIND_PLAN.savedUnder) && /keep protein bars in my bag/.test(ordinary))

  /* ---------- Plan's groups ---------- */
  const pl = (id: string, kind?: 'mind'): IfThenPlan => ({ id, when: 'after lunch', then: 'x', created: '2026-10-10', reviews: [], ...(kind ? { kind } : {}) })
  const plans = [pl('a'), pl('b', 'mind'), pl('c')]
  const on = planGroups(plans, true)
  ok('flag on: Mind plans in their own group, the rest keep If–then', on.mind.map((p) => p.id).join() === 'b' && on.ifThen.map((p) => p.id).join() === 'a,c')
  const off = planGroups(plans, false)
  ok('flag off: every plan under If–then, in order, no Mind group', off.ifThen.map((p) => p.id).join() === 'a,b,c' && off.mind.length === 0)

  /* ---------- copy ---------- */
  const copy = [...Object.values(MIND_PLAN), ...THINGS.flatMap((t) => (t.plan ? [t.plan.when, t.plan.then] : []))]
  const issues = copy.flatMap((s) => mindCopyIssues(s).map((i) => `${s}: ${i}`))
  ok('Mind plan copy passes mindCopyIssues', issues.length === 0, issues.join('; '))
  ok('no em dashes', copy.every((s) => !s.includes('—')))
  ok('B9.17 toast verbatim', MIND_PLAN.saved === 'Plan saved. Tali will check in on it next week.')

  let bad = 0
  for (const [n, v, info] of checks) {
    if (!v) bad++
    console.log(v ? 'PASS' : 'FAIL', 'wellbeing one thing:', n, v || !info ? '' : info)
  }
  return bad
}
