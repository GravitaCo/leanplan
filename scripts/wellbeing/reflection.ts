/* WP11: the weekly reflection card on the Mind page (boards B4, B5.16). Run from
   scripts/test-wellbeing.ts; returns the number of failures. */
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { mindCopyIssues } from '@/core/domain/engine/why'
import { shiftDay, todayStr } from '@/core/domain/date'
import { weekOf } from '@/core/domain/insights'
import { observation, REFLECTION_LATER, REFLECTION_NOT_ENOUGH, weekReflection, type WeekReflection } from '@/core/domain/mind'
import { freshForAccount } from '@/data/persistence'
import { LOCAL_USER } from '@/data/supabase'
import { REFLECTION } from '@/screens/mind/copy'
import { ReflectionCardView, reflectionFor, reflectionSpan } from '@/screens/mind/ReflectionCard'
import type { CheckIn, DayLog, SleepBand } from '@/core/types'

const day = (checkin?: CheckIn): DayLog => ({ foods: [], supps: {}, weight: null, workout: null, ...(checkin ? { checkin } : {}) } as DayLog)
const ci = (d: string, energy: number, band?: SleepBand, skills: ('reset' | 'unload')[] = []): CheckIn => ({
  mood: 4, sleep: 2, stress: 2, energy, hunger: 3, t: d + 'T08:30:00.000Z',
  ...(band ? { night: { source: 'self', band, t: d + 'T08:30:00.000Z' } } : {}),
  ...(skills.length ? { skills: skills.map((id, i) => ({ id, at: d + `T1${i}:00:00.000Z` })) } : {}),
} as CheckIn)

/**
 * The B4 state B week ending `today` (a Saturday in the deck): 5 check-ins this week, mostly 6 to 7
 * hours, Reset twice and Unload once, and over the 14 days long nights with energy OK or Good and
 * shorter ones Low, so one observation shows. A day 30 days back puts the person past week 2.
 */
function richWeek(today: string): Record<string, DayLog> {
  const days: Record<string, DayLog> = {}
  const mon = weekOf(today)[0]
  const thisWeek: [number, number, SleepBand, ('reset' | 'unload')[]][] = [[0, 1, '6-7', ['reset']], [1, 1, '6-7', []], [2, 3, '7-8', ['reset', 'unload']], [3, 1, '6-7', []], [4, 3, '7-8', []]]
  for (const [i, e, b, s] of thisWeek) { const d = shiftDay(mon, i); if (d <= today) days[d] = day(ci(d, e, b, s)) }
  for (let n = 1; n <= 7; n++) { const d = shiftDay(mon, -n); days[d] = day(ci(d, n % 2 ? 3 : 1, n % 2 ? '8+' : '5-6')) }
  days[shiftDay(today, -30)] = day()
  return days
}

export function reflectionSuite(): number {
  let bad = 0
  const ok = (name: string, pass: boolean, detail?: unknown) => {
    if (!pass) bad++
    console.log(pass ? 'PASS' : 'FAIL', 'wellbeing reflection:', name, pass || detail === undefined ? '' : JSON.stringify(detail))
  }

  /* ---------- the date span (B4.2, B4.8) ---------- */
  ok('span "21–27 Sept"', reflectionSpan('2026-09-21', '2026-09-27') === '21–27 Sept', reflectionSpan('2026-09-21', '2026-09-27'))
  ok('span "5–11 Oct"', reflectionSpan('2026-10-05', '2026-10-11') === '5–11 Oct')
  ok('span across a month end "28 Sept – 4 Oct"', reflectionSpan('2026-09-28', '2026-10-04') === '28 Sept – 4 Oct', reflectionSpan('2026-09-28', '2026-10-04'))

  /* ---------- copy ---------- */
  const strings = Object.values(REFLECTION)
  ok('B5.16 and B4.15 verbatim', REFLECTION.title === 'Your week' && REFLECTION.seeWeek === 'See your whole week')
  ok('the card’s own strings pass mindCopyIssues, no em dashes', strings.every((s) => !mindCopyIssues(s).length && !s.includes('—')))

  const html = (r: WeekReflection, link = true) => renderToString(createElement(ReflectionCardView, { r, onWeek: link ? () => {} : undefined }))
  const text = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'")
  const noFoodWeight = (h: string) => !/\b(Food|Weight|kcal|weigh-ins?|Logged on)\b/.test(text(h))

  /* ---------- state A: under 8 data points (B4.3, B4.4, B4.7) ---------- */
  const a: WeekReflection = { days: weekOf('2026-09-24'), checkins: 3, sleep: 'not-enough', skills: {}, plansReviewed: 0, observation: null }
  const ha = html(a)
  const at = (s: string) => ha.indexOf(s)
  ok('state A: label and span, 3 check-ins, Sleep not enough, the later line, the link, in order',
    at('>Your week<') >= 0 && at('21–27 Sept') > at('>Your week<') && at('3 check-ins this week') > at('21–27 Sept') && at(REFLECTION_NOT_ENOUGH) > at('3 check-ins')
    && at(REFLECTION_LATER) > at(REFLECTION_NOT_ENOUGH) && at('See your whole week') > at(REFLECTION_LATER), text(ha))
  ok('state A: Skills and Plans left out, no band strip, no observation', !ha.includes('>Skills<') && !ha.includes('>Plans<') && !ha.includes('mind-bands') && !ha.includes('mind-obs'))
  ok('state A: never "of 7", no food or weight lines', !/\d+ of 7\b/.test(text(ha)) && noFoodWeight(ha))
  ok('the card heading isn’t repeated inside the card (B5.16)', (ha.match(/Your week/g) || []).length === 2) // the label and the section's aria-label
  ok('no link when it has nowhere to go (Food off, C1)', !html(a, false).includes('See your whole week'))
  const one = html({ ...a, checkins: 1 })
  ok('one check-in reads "1 check-in this week"', one.includes('1 check-in this week'))
  const none = html({ ...a, checkins: 0 })
  ok('no check-ins: the count line is left out (never "0 check-ins")', !/0 check-ins/.test(none) && none.includes(REFLECTION_NOT_ENOUGH))

  /* ---------- state B: with one observation (B4.9 to B4.12, B4.16 to B4.18) ---------- */
  const today = '2026-10-10'
  const days = richWeek(today)
  const r = weekReflection(days, weekOf(today)[0], { today, plans: [{ id: 'p1', when: 'w', then: 't', created: '2026-09-01', reviews: [{ d: '2026-10-07', r: 'worked' }, { d: '2026-09-30', r: 'mixed' }] }] })
  const obs = observation(days, today)
  ok('fixture: the core gives state B', !!r && !!obs && r.checkins === 5 && r.sleep === '6-7' && r.plansReviewed === 1, r)
  if (r && obs) {
    const hb = html(r)
    const b = (s: string) => hb.indexOf(s)
    ok('state B: 5 check-ins, Mostly 6 to 7 hours, Reset twice, Unload once, 1 plan reviewed, the link, then the observation',
      b('5 check-ins this week') > 0 && b('Mostly 6 to 7 hours') > b('5 check-ins') && b('Reset twice, Unload once') > b('Mostly 6 to 7') && b('1 plan reviewed') > b('Reset twice')
      && b('See your whole week') > b('1 plan reviewed') && b(obs.heading) > b('See your whole week'), text(hb))
    ok('state B: the observation is observation()’s own heading, line and sub (not hardcoded)',
      obs.heading === 'Something in your answers' && hb.includes(obs.text) && b(obs.sub) > b(obs.text) && obs.sub === 'Just a pattern in your own answers, not a rule.')
    ok('state B: the later line is replaced by the observation', !hb.includes(REFLECTION_LATER))
    const strip = hb.match(/<div class="mind-bands" aria-hidden="true">(.*?)<\/div>/)
    ok('the band strip: aria-hidden, five segments, only 6–7 filled, labels under', !!strip && (strip[1].match(/class="mind-band( on)?"/g) || []).length === 5
      && (strip[1].match(/mind-band on/g) || []).length === 1 && /mind-band"><\/span><span class="mind-band"><\/span><span class="mind-band on">/.test(strip[1])
      && ['Under 5', '5–6', '6–7', '7–8', '8+'].every((l) => strip[1].includes(`>${l}<`)), strip?.[1])
    ok('state B: never "of 7", no food or weight lines, no score or ring', !/\d+ of 7\b/.test(text(hb)) && noFoodWeight(hb) && !/ring|score|%/.test(text(hb)))
  }

  /* ---------- from the store's state: Mind off, the first two weeks, Food off ---------- */
  const now = todayStr()
  const base = freshForAccount(LOCAL_USER)
  const st = (d: Record<string, DayLog>, off?: ('mind' | 'food' | 'move')[]) => ({ data: { ...base, days: d, profile: { ...base.profile, ...(off ? { mind: { off } } : {}) } } })
  const settled = richWeek(now)
  const shown = reflectionFor(st(settled), now)
  ok('from the store: this week, past week 2, with the link', !!shown && shown.link && shown.r.days[0] === weekOf(now)[0] && shown.r.days.length === 7, shown)
  ok('Mind off: nothing at all', reflectionFor(st(settled, ['mind']), now) === null)
  const foodOff = reflectionFor(st(settled, ['food']), now)
  ok('Food off: the card stays, the link goes (C1)', !!foodOff && !foodOff.link)
  const early: Record<string, DayLog> = { [shiftDay(now, -5)]: day(ci(shiftDay(now, -5), 2)), [now]: day(ci(now, 2)) }
  ok('the first two weeks: held back (asks.ts, plan section 7.3)', reflectionFor(st(early), now) === null)
  ok('the card mounts in the Mind page with no props', /<ReflectionCard \/>/.test(readFileSync('src/screens/mind/MindPage.tsx', 'utf8')))
  return bad
}
