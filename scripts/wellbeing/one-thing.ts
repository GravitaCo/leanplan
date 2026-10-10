/* WP14: the one thing (board B9) and Mind plans. The chips per day type, the skill a chip opens,
   "Make it a plan" (the prefilled plan sheet, B9.10 to B9.15), Plan's "Mind plans" group and the
   copy lint. The store side (savePlan with a kind, health off) is in store.ts. Run from
   scripts/test-wellbeing.ts; returns the number of failures. */
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import type { IfThenPlan } from '@/core/types'
import { readFileSync } from 'node:fs'
import { resetTicksThing, thingByKey, thingPlan, THINGS } from '@/core/data/skills'
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

  /* ---------- a Reset thing's "Today:" line opens Reset, only with MIND_REVIEWED (Benn, 10 Oct 2026) ---------- */
  const reset = thingByKey('reset-before-session')!
  ok('a Reset thing\'s Today line opens Reset when reviewed', thingView(reset, true) === 'reset' && thingView(thingByKey('reset-2')!, true) === 'reset')
  ok('a Reset thing\'s Today line opens nothing without the sub-flag', thingView(reset, false) === null)
  ok('things without a screen open nothing', ['outside-lunch', 'outside-10', 'lunch-somewhere', 'wind-down-from'].every((k) => thingView(thingByKey(k)!, true) === null))
  {
    const src = readFileSync('src/screens/today/MindCard.tsx', 'utf8')
    const pickBody = (src.match(/const pick = \(t: Thing\) => \{([^}]*)\}/) || [])[1] ?? 'missing'
    ok('picking a chip never navigates (only pickThing)', pickBody.trim() === 'pickThing(t.key)' && /onClick=\{\(\) => pick\(t\)\}/.test(src), pickBody)
    ok('the Today line is the existing pressable row pattern, with a chevron', /className="wb-today press" \{\.\.\.pressable\(\(\) => openMind\(opens\)\)\}/.test(src) && /<Chevron \/><\/div>/.test(src))
  }
  ok('a finished Reset ticks a Reset thing, and only one not yet done', resetTicksThing({ key: 'reset-2' }) && resetTicksThing({ key: 'reset-before-session' })
    && !resetTicksThing({ key: 'reset-2', done: '2026-10-10T09:00:00.000Z' }) && !resetTicksThing({ key: 'outside-lunch' }) && !resetTicksThing({ key: 'wind-down-from' }) && !resetTicksThing(undefined) && !resetTicksThing({ key: 'nope' }))
  {
    const src = readFileSync('src/screens/mind/ResetScreen.tsx', 'utf8')
    const fin = (src.match(/const finish = \(\) => \{([\s\S]*?)\n  \}/) || [])[1] ?? ''
    ok('only the finish path calls doneThing (a stop changes nothing)', /resetTicksThing\([\s\S]*?checkin\?\.thing\)\) doneThing\(\)/.test(fin) && (src.match(/doneThing\(\)/g) || []).length === 1, fin)
  }

  /* ---------- Make it a plan (B9.10 to B9.15) ---------- */
  const outside = thingByKey('outside-lunch')!
  ok('Get outside at lunch carries the B9.11 / B9.13 prefill', outside.plan?.when === 'after lunch' && outside.plan?.then === 'get outside for 10 minutes')
  ok('the prefill reads "After lunch" on Plan', whenLine(outside.plan!.when) === 'After lunch')
  const sheet = renderToString(createElement(ThingPlanSheet, { thing: outside, onClose: () => {} }))
  ok('sheet: New plan, prefilled, never saved for you', /New plan/.test(sheet) && /value="after lunch"/.test(sheet) && /value="get outside for 10 minutes"/.test(sheet), text(sheet))
  ok('sheet: the coping field is empty with "Optional"', /id="pl_cope"[^>]*value=""/.test(sheet) && /placeholder="Optional"/.test(sheet))
  ok('sheet: B9.15 group line, then the B9.16 foot', text(sheet).includes(`${MIND_PLAN.savedUnder} Specific beats ambitious.`), text(sheet))
  // Benn's approved wording (10 Oct 2026) for the other four
  const pf = (k: string, w?: string) => thingPlan(thingByKey(k), { windDownAt: w })
  ok('prefills: reset-2, reset-before-session, wind-down-from, outside-10, lunch-somewhere',
    JSON.stringify(pf('reset-2')) === JSON.stringify({ when: 'I need a breather', then: 'do a 2-minute Reset' })
    && JSON.stringify(pf('reset-before-session')) === JSON.stringify({ when: "I'm getting ready to train", then: 'do a 2-minute Reset' })
    && JSON.stringify(pf('wind-down-from', '22:30')) === JSON.stringify({ when: 'it gets to 22:30', then: 'start winding down' })
    && JSON.stringify(pf('outside-10')) === JSON.stringify({ when: 'after lunch', then: 'get outside for 10 minutes' })
    && JSON.stringify(pf('outside-lunch')) === JSON.stringify({ when: 'after lunch', then: 'get outside for 10 minutes' })
    && JSON.stringify(pf('lunch-somewhere')) === JSON.stringify({ when: "it's lunchtime", then: 'have lunch somewhere I like' }))
  ok('wind-down: the time is filled in at tap time; with no time set there is no prefill', thingByKey('wind-down-from')!.plan!.when === 'it gets to {time}'
    && pf('wind-down-from', '21:45')!.when === 'it gets to 21:45' && pf('wind-down-from') === undefined)
  ok('whenLine: "When I need a breather, I\'ll ..." and "After lunch, I\'ll ..."', whenLine(pf('reset-2')!.when) === 'When I need a breather' && whenLine(pf('outside-10')!.when) === 'After lunch'
    && whenLine(pf('reset-before-session')!.when) === "When I'm getting ready to train" && whenLine(pf('wind-down-from', '22:30')!.when) === 'When it gets to 22:30' && whenLine(pf('lunch-somewhere')!.when) === "When it's lunchtime")
  const empty = renderToString(createElement(ThingPlanSheet, { thing: thingByKey('lunch-somewhere')!, onClose: () => {} }))
  ok('lunch-somewhere opens prefilled, as a Mind plan', /value="it&#x27;s lunchtime"/.test(empty) && /value="have lunch somewhere I like"/.test(empty) && text(empty).includes(MIND_PLAN.savedUnder), text(empty))
  // close-out change 5: no food examples in a Mind plan's When and I'll fields
  const noPh = (html: string, id: string) => !new RegExp(`<input[^>]*id="${id}"[^>]*placeholder=`).test(html) && !new RegExp(`<input[^>]*placeholder=[^>]*id="${id}"`).test(html)
  ok("Mind plan sheet: no placeholder for When or I'll (no food examples)", noPh(empty, 'pl_when') && noPh(empty, 'pl_then') && noPh(sheet, 'pl_when') && noPh(sheet, 'pl_then')
    && !/yoghurt|hungry|protein bars/.test(empty + sheet), empty)
  const ordinary = renderToString(createElement(PlanEditSheet, { onClose: () => {} }))
  ok('an ordinary New plan is unchanged (no group line, old placeholders)', !text(ordinary).includes(MIND_PLAN.savedUnder) && /keep protein bars in my bag/.test(ordinary)
    && /placeholder="I get home from work hungry"/.test(ordinary) && /placeholder="have a yoghurt before I start cooking"/.test(ordinary))

  /* ---------- Plan's groups ---------- */
  const pl = (id: string, kind?: 'mind'): IfThenPlan => ({ id, when: 'after lunch', then: 'x', created: '2026-10-10', reviews: [], ...(kind ? { kind } : {}) })
  const plans = [pl('a'), pl('b', 'mind'), pl('c')]
  const on = planGroups(plans, true)
  ok('flag on: Mind plans in their own group, the rest keep If–then', on.mind.map((p) => p.id).join() === 'b' && on.ifThen.map((p) => p.id).join() === 'a,c')
  const off = planGroups(plans, false)
  ok('flag off: every plan under If–then, in order, no Mind group', off.ifThen.map((p) => p.id).join() === 'a,b,c' && off.mind.length === 0)

  /* ---------- copy ---------- */
  const copy = [...Object.values(MIND_PLAN), ...THINGS.flatMap((t) => (t.plan ? [t.plan.when, t.plan.then] : [])),
    ...THINGS.map((t) => thingPlan(t, { windDownAt: '22:30' })!).flatMap((p) => [p.when, p.then, `${whenLine(p.when)}, I'll ${p.then}`])]
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
