/* WP7: Summary on a hard day and the one prompt slot (board B2, B9). The asks rules themselves are
   tested in core.ts; this covers Summary's due list, the weight sub-line (R5), the Mind card's
   states and the copy lint. Run from scripts/test-wellbeing.ts; returns the number of failures. */
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import type { CheckIn, DayLog, IfThenPlan } from '@/core/types'
import { THINGS } from '@/core/data/skills'
import { pickAsks } from '@/core/domain/asks'
import { thingOptions } from '@/core/domain/mind'
import { mindCopyIssues } from '@/core/domain/engine/why'
import { MindCard, type MindCardProps } from '@/screens/today/MindCard'
import { checkedIn, checkinTime, lastWeighIn, makePlanOffered, pillarsOn, summaryDue, weighInSub } from '@/screens/today/summary'
import { summaryCopy } from '@/screens/today/summaryCopy'

const ON = pillarsOn(undefined)
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()

export function summarySuite(): number {
  const checks: [string, boolean, string?][] = []
  const ok = (n: string, v: boolean, info?: string) => checks.push([n, v, info])

  /* ---------- pillars and the due list (C1) ---------- */
  ok('all pillars on by default', ON.mind && ON.food && ON.move)
  const foodOff = pillarsOn(['food'])
  ok('Food off', !foodOff.food && foodOff.mind && foodOff.move)
  const all = { checkin: false, thing: true, planReview: true, banner: 'burn' as const, foodAsk: true, pregnancyReask: true, quickCheck: true, ifThen: true }
  ok('due list, all on', summaryDue(all, ON).join() === 'plan-review,thing,if-then-offer,burn-note,food-ask,pregnancy-reask,quick-check', summaryDue(all, ON).join())
  ok('Food off drops the food asks and the range note', summaryDue(all, foodOff).join() === 'plan-review,thing,if-then-offer,pregnancy-reask', summaryDue(all, foodOff).join())
  ok('Mind off drops the check-in prompt and the one thing', summaryDue({ checkin: true, thing: true }, pillarsOn(['mind'])).length === 0)
  ok('banners map to their asks', summaryDue({ banner: 'missed' }, ON).join() === 'welcome-back' && summaryDue({ banner: 'suggest' }, ON).join() === 'activity')

  /* ---------- the one prompt slot ---------- */
  const hardPick = pickAsks(summaryDue(all, ON), { hard: true, lowMood: true, daysUsing: 60 })
  ok('hard day: the one thing is the single ask', hardPick.show.join() === 'thing', hardPick.show.join())
  ok('hard day: plan review, quick check and food asks are held, never shown', ['plan-review', 'quick-check', 'food-ask', 'pregnancy-reask', 'burn-note'].every((id) => hardPick.held.some((h) => h.id === id)))
  const hardOk = pickAsks(summaryDue(all, ON), { hard: true, daysUsing: 60 })
  ok('hard day with mood OK: the plan review still waits (Benn, 9 Oct)', hardOk.show.join() === 'thing', hardOk.show.join())
  const ordinary = pickAsks(summaryDue({ thing: true, planReview: true, banner: 'missed', quickCheck: true }, ON), { daysUsing: 60 })
  ok('ordinary day: the banners show within the budget', ordinary.show.join() === 'plan-review,thing,welcome-back,quick-check', ordinary.show.join())
  const fewer = pickAsks(summaryDue({ thing: true, planReview: true }, ON), { asks: 'fewer', daysUsing: 60 })
  ok('Fewer prompts: the plan review takes the one ask, the chips wait', fewer.show.join() === 'plan-review', fewer.show.join())
  const activity = pickAsks(summaryDue({ thing: true, banner: 'suggest' }, ON), { hard: true, daysUsing: 60 })
  ok('a held activity suggestion is not shown (so never marked seen)', !activity.show.includes('activity'))

  /* ---------- the weekly review card and "Keep the weekly reminder?" (close-out change 1) ---------- */
  ok('review and review-keep join the due list', summaryDue({ planReview: true, review: true, reviewKeep: true, thing: true }, ON).join() === 'plan-review,review,thing,review-keep'
    && summaryDue({ review: true, reviewKeep: true }, pillarsOn(['mind'])).join() === 'review,review-keep')
  const rv = { thing: true, review: true, reviewKeep: true, banner: 'missed' as const }
  const rvOrd = pickAsks(summaryDue(rv, ON), { daysUsing: 60 })
  ok('ordinary day: the review card, the one thing and the keep ask all show', rvOrd.show.join() === 'review,thing,review-keep,welcome-back', rvOrd.show.join())
  const rvHard = pickAsks(summaryDue(rv, ON), { hard: true, daysUsing: 60 })
  ok('hard day: the review card and the keep ask are held', rvHard.show.join() === 'thing' && rvHard.held.some((h) => h.id === 'review' && h.reason === 'hard-day') && rvHard.held.some((h) => h.id === 'review-keep' && h.reason === 'hard-day'), JSON.stringify(rvHard))
  const rvLow = pickAsks(summaryDue(rv, ON), { lowMood: true, daysUsing: 60 })
  ok('Low or Rough mood day: the review card waits (it carries the plan check-in)', !rvLow.show.includes('review') && rvLow.held.some((h) => h.id === 'review' && h.reason === 'low-mood'), JSON.stringify(rvLow))
  const rvSign = pickAsks(summaryDue({ ...rv, signpost: true, checkin: false }, ON), { signpostToday: true, daysUsing: 60 })
  ok('signpost day: the signpost is the only ask, the review card and the keep ask wait', rvSign.show.join() === 'signpost' && ['review', 'review-keep'].every((id) => rvSign.held.some((h) => h.id === id && h.reason === 'signpost')), rvSign.show.join())
  const rvEarly = pickAsks(summaryDue({ review: true, reviewKeep: true }, ON), { daysUsing: 3 })
  ok('first two weeks: both keep their own schedule', rvEarly.show.join() === 'review,review-keep', rvEarly.show.join())
  const rvFewer = pickAsks(summaryDue({ review: true, reviewKeep: true, thing: true }, ON), { asks: 'fewer', daysUsing: 60 })
  ok('Fewer prompts: the review card is not budgeted (it waits to be opened); the keep ask counts', rvFewer.show.join() === 'review,thing' && rvFewer.held.some((h) => h.id === 'review-keep' && h.reason === 'budget'), rvFewer.show.join())

  /* ---------- one-thing chips: no food chip on a hard day ---------- */
  const hardThings = thingOptions({ hard: true, skillsAvailable: false }).map((t) => t.key)
  ok('hard day, sub-flag off: Get outside only', hardThings.join() === 'outside-10', hardThings.join())
  ok('hard day, sub-flag on: Reset and Get outside', thingOptions({ hard: true, skillsAvailable: true }).map((t) => t.key).join() === 'reset-2,outside-10')

  /* ---------- check-in ---------- */
  const c = (x: Partial<CheckIn>): CheckIn => ({ mood: 0, hunger: 0, ...x })
  ok('a thing alone is not a check-in', !checkedIn(c({ thing: { key: 'outside-10' } })) && checkedIn(c({ mood: 2 })) && !checkedIn(null))
  ok('check-in time is HH:MM', /^\d\d:\d\d$/.test(checkinTime('2026-10-08T07:40:00.000Z') || ''), String(checkinTime('2026-10-08T07:40:00.000Z')))
  ok('no time, no line', checkinTime(undefined) === null && checkinTime('nope') === null)

  /* ---------- weight on a hard day (R5) ---------- */
  ok('weighed today', weighInSub('2026-10-08', '2026-10-08') === 'Today')
  ok('1 to 6 days: Last weigh-in', weighInSub('2026-10-07', '2026-10-08') === 'Last weigh-in' && weighInSub('2026-10-02', '2026-10-08') === 'Last weigh-in')
  const old = weighInSub('2026-10-01', '2026-10-08')
  ok('7 days or more: with the date', /^Last weigh-in, 1 Sept?$|^Last weigh-in, 1 Oct$/.test(old), old)
  ok('no weigh-in', weighInSub(null, '2026-10-08') === 'Whenever it suits you')
  const day = (weight: number | null): DayLog => ({ foods: [], supps: {}, weight, workout: null })
  const lw = lastWeighIn({ '2026-09-01': day(83), '2026-10-05': day(81.8), '2026-10-06': day(null), '2026-10-09': day(80) }, '2026-10-08')
  ok('last weigh-in on or before the day', lw?.d === '2026-10-05' && lw.kg === 81.8, JSON.stringify(lw))

  /* ---------- the Mind card (render) ---------- */
  const base: MindCardProps = {
    checkin: c({ mood: 2, sleep: 1, stress: 2, energy: 1, hunger: 2, t: '2026-10-08T07:40:00.000Z' }), isToday: true, hard: true, thingSlot: true,
    options: thingOptions({ hard: true, skillsAvailable: true }), onOpen: () => {}, onCheckIn: () => {}, onMakePlan: () => {}, day: '2026-10-08',
  }
  const r = (p: Partial<MindCardProps>) => text(renderToString(createElement(MindCard, { ...base, ...p })))
  const hardCard = r({})
  ok('hard day: Feeling low, the lighter line, the lead and two chips', hardCard.includes('Feeling low') && hardCard.includes('A lighter day is still a good day.') &&
    hardCard.includes("One thing for today, if you'd like:") && hardCard.includes('2-minute Reset') && hardCard.includes('Get outside for 10 minutes') && !hardCard.includes('Lunch'), hardCard)
  ok('hard day: Checked in at', /Checked in at \d\d:\d\d/.test(hardCard))
  ok('held slot: no chips, the lighter line stays', !r({ thingSlot: false }).includes('One thing') && r({ thingSlot: false }).includes('A lighter day'))
  const before = r({ checkin: null })
  ok('before the check-in: the ask and Check in, no chips', before.includes('How are you today?') && before.includes('Mood, sleep, stress and energy · 20 seconds') && before.includes('Check in') && !before.includes('One thing'), before)
  const picked = r({ checkin: { ...base.checkin!, thing: { key: 'outside-10' } } })
  ok('picked: Today, Done, Change', picked.includes('Today: Get outside for 10 minutes') && picked.includes('Done') && picked.includes('Change') && !picked.includes('One thing'), picked)
  const done = r({ checkin: { ...base.checkin!, thing: { key: 'outside-10', done: '2026-10-08T12:00:00.000Z' } } })
  ok('done: the tick line and Make it a plan (every thing has a prefill since 10 Oct)', done.includes('Got outside') && done.includes('Make it a plan') && !done.includes('Change'), done)
  // close-out change 5: "Make it a plan" only with an approved prefill, and not once today's Mind plan is saved
  const doneLunch = (plans?: IfThenPlan[]) => r({ hard: false, checkin: { ...base.checkin!, thing: { key: 'outside-lunch', done: '2026-10-08T12:00:00.000Z' } }, plans })
  const mp = (created: string, kind?: 'mind'): IfThenPlan => ({ id: 'x' + created, when: 'w', then: 't', created, reviews: [], ...(kind ? { kind } : {}) })
  ok('done with a prefill: Make it a plan', doneLunch().includes('Got outside at lunch') && doneLunch().includes('Make it a plan'), doneLunch())
  ok('a Mind plan saved today hides Make it a plan', !doneLunch([mp('2026-10-08', 'mind')]).includes('Make it a plan'))
  ok("yesterday's Mind plan or today's If-then plan doesn't hide it", doneLunch([mp('2026-10-07', 'mind'), mp('2026-10-08')]).includes('Make it a plan'))
  ok('makePlanOffered: all five things (Benn, 10 Oct 2026), Wind down only while a wind-down time is set',
    THINGS.every((t) => !!t.plan) && THINGS.every((t) => makePlanOffered(t, [], '2026-10-08', { windDownAt: '22:30' })) && !makePlanOffered(undefined, [], '2026-10-08')
    && THINGS.filter((t) => t.key !== 'wind-down-from').every((t) => makePlanOffered(t, [], '2026-10-08')) && !makePlanOffered(THINGS.find((t) => t.key === 'wind-down-from'), [], '2026-10-08'))
  ok('makePlanOffered: still hidden once a Mind plan was saved today, for every thing', THINGS.every((t) => !makePlanOffered(t, [mp('2026-10-08', 'mind')], '2026-10-08', { windDownAt: '22:30' })))
  const ordinaryCard = r({ hard: false, checkin: c({ mood: 4, t: '2026-10-10T07:40:00.000Z' }) })
  ok('ordinary day: no lighter line', !ordinaryCard.includes('A lighter day') && ordinaryCard.includes('Feeling good'), ordinaryCard)
  ok('past day: no chips, no lighter line', !r({ isToday: false }).includes('One thing') && !r({ isToday: false }).includes('A lighter day'))

  /* ---------- copy ---------- */
  const lint = summaryCopy().flatMap((s) => mindCopyIssues(s).map((i) => `${s}: ${i}`))
  ok('Summary strings pass mindCopyIssues', lint.length === 0, lint.join(' | '))
  ok('no em dashes', summaryCopy().every((s) => !s.includes('—')))

  let bad = 0
  for (const [n, v, info] of checks) { if (!v) bad++; console.log(v ? 'PASS' : 'FAIL', 'wellbeing summary: ' + n + (v || !info ? '' : ` (${info})`)) }
  return bad
}
