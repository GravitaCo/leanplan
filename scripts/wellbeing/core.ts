/* WP3: the pure core (asks, mind, sleep, pacer, skills, Same as yesterday, copy lint). Run from
   scripts/test-wellbeing.ts; returns the number of failures. */
import type { AppState, CheckIn, DayLog, IfThenPlan, LoggedFood, SleepBand } from '@/core/types'
import { askBudget, pickAsks, mayMarkSeen, daysUsing, ASK_IDS, type AskId } from '@/core/domain/asks'
import { hardDay, observation, weekReflection, reflectionLines, thingOptions, lowMoodDue, lowMoodLine, mindCopy, recentCheckins, OBS_ENERGY, REFLECTION_NOT_ENOUGH, type ThingCtx } from '@/core/domain/mind'
import { nightFor, bandLabel, bandOfMinutes, bandWords } from '@/core/domain/sleep'
import { pacerAt, runMs, breathMs, fmtLeft } from '@/core/domain/pacer'
import { RESET_PATTERN, RESET_LENGTHS, SKILLS, THINGS, skillsCopy, skillsWithScreen, thingByKey, thingText } from '@/core/data/skills'
import { BANNED_COPY, COPY_ALLOWED, WELLBEING_BANNED, copyIssues, mindCopyIssues } from '@/core/domain/engine/why'
import { entriesToRepeat, sameAsYesterdayRow } from '@/core/domain/insights'
import { dayTotals } from '@/core/domain/nutrition'
import { shiftDay } from '@/core/domain/date'

const day = (checkin: CheckIn | null, foods: LoggedFood[] = []): DayLog => ({ foods, supps: {}, weight: null, workout: null, checkin })
const ci = (x: Partial<CheckIn>): CheckIn => ({ mood: 0, hunger: 0, ...x })
const T = '2026-10-08T07:10:00.000Z'
const night = (band: SleepBand) => ({ source: 'self' as const, band, t: T })

export function coreSuite(): number {
  let bad = 0
  const checks: [string, boolean, string?][] = []
  const ok = (n: string, v: boolean, info?: string) => checks.push([n, v, info])

  /* ---------- askBudget ---------- */
  ok('budget: usual 3', askBudget({}) === 3 && askBudget({ asks: 'usual' }) === 3)
  ok('budget: Fewer prompts 1', askBudget({ asks: 'fewer' }) === 1)
  ok('budget: hard day 1', askBudget({ hard: true }) === 1)
  ok('budget: signpost day 1', askBudget({ signpostToday: true }) === 1)

  /* ---------- pickAsks ---------- */
  const settled = { daysUsing: 60 }
  const ord = pickAsks(['welcome-back', 'thing', 'plan-review', 'activity', 'burn-note'], settled)
  ok('order: time-sensitive, then thing, then the rest; budget 3', ord.show.join() === 'plan-review,thing,welcome-back', ord.show.join())
  ok('over budget is held as budget, never shown', ord.held.every((h) => h.reason === 'budget') && ord.held.length === 2)
  const hard = pickAsks(['thing', 'welcome-back', 'activity', 'food-ask', 'quick-check', 'pregnancy-reask'], { ...settled, hard: true })
  ok('hard day: the one thing is the single ask', hard.show.join() === 'thing', hard.show.join())
  ok('hard day: non-safety banners wait', ['welcome-back', 'activity'].every((id) => hard.held.some((h) => h.id === id && h.reason === 'hard-day')))
  ok('hard day: food asks deferred (held, not dropped)', ['food-ask', 'quick-check', 'pregnancy-reask'].every((id) => hard.held.some((h) => h.id === id && h.reason === 'hard-day')))
  ok('hard day: a held activity suggestion may not be marked seen', !mayMarkSeen(hard, 'activity'))
  const hardReview = pickAsks(['thing', 'plan-review'], { ...settled, hard: true })
  ok('hard day, mood OK: plan review takes the one ask and hides the chips', hardReview.show.join() === 'plan-review' && hardReview.held.some((h) => h.id === 'thing'))
  const low = pickAsks(['thing', 'plan-review', 'if-then-offer'], { ...settled, hard: true, lowMood: true })
  ok('Low or Rough mood: plan review deferred, never marked seen', low.show.join() === 'thing' && low.held.some((h) => h.id === 'plan-review' && h.reason === 'low-mood') && !mayMarkSeen(low, 'plan-review'))
  const fewer = pickAsks(['thing', 'welcome-back'], { ...settled, asks: 'fewer' })
  ok('Fewer prompts: one ask', fewer.show.join() === 'thing')
  const sign = pickAsks(['signpost', 'thing', 'plan-review', 'welcome-back'], { ...settled, signpostToday: true })
  ok('signpost day: the signpost is the only ask, no chips', sign.show.join() === 'signpost' && sign.held.some((h) => h.id === 'thing' && h.reason === 'signpost'))
  ok('Support is never an ask', !ASK_IDS.some((id) => /support/i.test(id)) && pickAsks(['support' as AskId, 'thing'], settled).show.join() === 'thing')
  const early = pickAsks(['checkin', 'thing', 'plan-review', 'welcome-back', 'reflection', 'food-ask'], { daysUsing: 5 })
  ok('weeks 1 and 2: only the check-in prompt and the one thing (food asks keep their own schedule)', early.show.join() === 'thing,checkin,food-ask', early.show.join())
  ok('weeks 1 and 2: plans and the reflection wait', ['plan-review', 'reflection'].every((id) => early.held.some((h) => h.id === id && h.reason === 'early-weeks')))
  const wk3 = pickAsks(['thing', 'plan-review', 'reflection'], { daysUsing: 14 })
  ok('week 3: plans and the reflection join', wk3.show.includes('plan-review') && wk3.show.includes('reflection'))
  ok('daysUsing counts from the first logged day', daysUsing(['2026-10-01', '2026-10-05'], '2026-10-08') === 7 && daysUsing([], '2026-10-08') === 0)

  /* ---------- hardDay ---------- */
  ok('hard day: mood Low alone', hardDay(ci({ mood: 2 }), []) && hardDay(ci({ mood: 1 }), []))
  ok('not hard: mood Okay with one low signal', !hardDay(ci({ mood: 3, sleep: 1 }), []))
  ok('hard day: two worst-step signals (sample Thu 8 Oct)', hardDay(ci({ mood: 3, sleep: 1, energy: 1, stress: 2 }), []))
  ok('no check-in is never a hard day', !hardDay(null, []))
  const rdays: Record<string, DayLog> = { '2026-10-07': day(ci({ mood: 3 })) }
  ok('recentCheckins: the 14 days before today, newest first', recentCheckins(rdays, '2026-10-08').length === 14 && recentCheckins(rdays, '2026-10-08')[0]?.mood === 3)

  /* ---------- sleep ---------- */
  ok('nightFor: the self band, with the own rating kept', nightFor(ci({ sleep: 1, night: { source: 'self', band: '5-6', t: T } }))?.band === '5-6' && nightFor(ci({ sleep: 1, night: { source: 'self', band: '5-6', t: T } }))?.rating === 1)
  const dev = nightFor(ci({ sleep: 3, night: { source: 'healthkit', asleepMin: 452, t: T } }))
  ok('nightFor: a device duration wins, rating kept', dev?.band === '7-8' && dev.asleepMin === 452 && dev.rating === 3)
  ok('nightFor: nothing without a night', nightFor(ci({ sleep: 2 })) === null && nightFor(null) === null)
  ok('bands: labels and words', bandLabel('lt5') === 'Under 5' && bandLabel('6-7') === '6–7' && bandWords('6-7') === '6 to 7 hours' && bandOfMinutes(420) === '7-8' && bandOfMinutes(419) === '6-7')

  /* ---------- weekly reflection (week 7, 5 to 11 Oct) ---------- */
  const W = '2026-10-05'
  const wk: Record<string, DayLog> = {
    '2026-10-05': day(ci({ mood: 4, night: night('6-7'), skills: [{ id: 'reset', at: T }] })),
    '2026-10-06': day(ci({ mood: 4, night: night('6-7') })),
    '2026-10-08': day(ci({ mood: 2, night: night('5-6'), skills: [{ id: 'reset', at: T }, { id: 'unload', at: T }] })),
    '2026-10-09': day(ci({ mood: 3, night: night('6-7') })),
    '2026-10-11': day(ci({ mood: 4, night: night('6-7') })),
  }
  const plans: IfThenPlan[] = [{ id: 'p', when: 'after lunch', then: 'walk', created: '2026-09-01', reviews: [{ d: '2026-10-07', r: 'worked' }, { d: '2026-09-30', r: 'mixed' }] }]
  const r = weekReflection(wk, W, { today: '2026-10-11', plans })!
  const lines = reflectionLines(r)
  const text = lines.map((l) => `${l.label ?? ''}: ${l.value}`).join(' | ')
  ok('reflection: plain counts (B4.9 to B4.12)', text === ': 5 check-ins this week | Sleep: Mostly 6 to 7 hours | Skills: Reset twice, Unload once | Plans: 1 plan reviewed', text)
  ok('reflection: never "of 7"', !/of 7/.test(text))
  const thin = weekReflection({ '2026-09-21': day(ci({ mood: 3 })), '2026-09-22': day(ci({ mood: 3, night: night('6-7') })), '2026-09-24': day(ci({ mood: 4 })) }, '2026-09-21', { today: '2026-09-27' })!
  const tl = reflectionLines(thin)
  ok('reflection: under 3 nights reads "Not enough answers yet"; empty skills and plans left out', tl.length === 2 && tl[0].value === '3 check-ins this week' && tl[1].value === REFLECTION_NOT_ENOUGH, JSON.stringify(tl))
  ok('reflection: days after today not counted', weekReflection(wk, W, { today: '2026-10-08' })!.checkins === 3)
  ok('reflection: nothing with Mind off', weekReflection(wk, W, { today: '2026-10-11', off: ['mind'] }) === null)
  ok('reflection: Food off still reflects', !!weekReflection(wk, W, { today: '2026-10-11', off: ['food'] }))

  /* ---------- observation ---------- */
  const obsDays = (longOk: number, longLow: number, shortOk: number, shortLow: number): Record<string, DayLog> => {
    const out: Record<string, DayLog> = {}
    const spec = [
      ...Array(longOk).fill(['7-8', 3]), ...Array(longLow).fill(['8+', 1]),
      ...Array(shortOk).fill(['6-7', 2]), ...Array(shortLow).fill(['5-6', 1]),
    ] as [SleepBand, number][]
    spec.forEach(([band, energy], i) => { out[shiftDay('2026-10-11', -i)] = day(ci({ mood: 3, energy, night: night(band) })) })
    return out
  }
  const o = observation(obsDays(4, 0, 1, 3), '2026-10-11')
  ok('observation: 8 pairs, 4 a side, long nights better: B4.17 text', o?.text === OBS_ENERGY && OBS_ENERGY === 'Over the last two weeks, on nights over 7 hours you more often rated energy OK or Good.')
  ok('observation: 7 pairs give none', observation(obsDays(4, 0, 1, 2), '2026-10-11') === null)
  ok('observation: 2 on one side gives none', observation(obsDays(2, 0, 2, 4), '2026-10-11') === null)
  ok('observation: positive side only (short nights better gives none)', observation(obsDays(1, 3, 4, 0), '2026-10-11') === null)
  ok('observation: older than 14 days ignored', observation(obsDays(4, 0, 1, 3), '2026-10-30') === null)
  ok('observation: in the reflection', weekReflection(obsDays(4, 0, 1, 3), W, { today: '2026-10-11' })!.observation?.text === OBS_ENERGY)

  /* ---------- one thing ---------- */
  const base: ThingCtx = { hard: false, skillsAvailable: true, sessionToday: true }
  const keys = (c: Partial<ThingCtx>) => thingOptions({ ...base, ...c }).map((t) => t.key).join()
  ok('ordinary day: one per pillar (D1)', keys({}) === 'reset-before-session,lunch-somewhere,outside-lunch')
  ok('ordinary day, no session: Wind down from the set time', keys({ sessionToday: false, windDownAt: '22:30' }) === 'wind-down-from,lunch-somewhere,outside-lunch')
  ok('ordinary day, no session or time: no Mind chip', keys({ sessionToday: false }) === 'lunch-somewhere,outside-lunch')
  ok('hard day: Mind-led, no food chip (D2)', keys({ hard: true }) === 'reset-2,outside-10')
  ok('gentle: no food chip', keys({ gentle: true }) === 'reset-before-session,outside-lunch')
  ok('wellbeing routing: no food chip', keys({ wellbeingRouting: true }) === 'reset-before-session,outside-lunch')
  ok('sub-flag off: no skill-opening chips', keys({ skillsAvailable: false, hard: true }) === 'outside-10' && keys({ skillsAvailable: false }) === 'lunch-somewhere,outside-lunch')
  ok('a switched-off pillar disappears', keys({ off: ['food'] }) === 'reset-before-session,outside-lunch' && keys({ off: ['move'], hard: true }) === 'reset-2')
  ok('Mind off: no chips', keys({ off: ['mind'] }) === '' && keys({ off: ['mind'], hard: true }) === '')
  ok('only Reset things open a skill, and only skills with a screen', THINGS.every((t) => !t.skill || SKILLS.find((s) => s.id === t.skill)?.screen))
  ok('Wind down and Get outside have no screen yet', skillsWithScreen().map((s) => s.id).join() === 'reset,unload')
  ok('thing text fills the time', thingText(thingByKey('wind-down-from')!.label, { windDownAt: '22:30' }) === 'Wind down from 22:30' && thingByKey('nope') === undefined)
  ok('thing keys are unique and key-shaped', new Set(THINGS.map((t) => t.key)).size === THINGS.length && THINGS.every((t) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(t.key)))
  ok('Get outside at lunch prefills its plan (B9.11, B9.13)', thingByKey('outside-lunch')?.plan?.when === 'after lunch' && thingByKey('outside-lunch')?.plan?.then === 'get outside for 10 minutes')

  /* ---------- low-mood signpost ---------- */
  const moods = (ms: number[], end = '2026-10-20'): Record<string, DayLog> =>
    Object.fromEntries(ms.map((m, i) => [shiftDay(end, -i), day(ci({ mood: m }))]))
  ok('low mood: 4 answers is not enough', !lowMoodDue(moods([2, 1, 2, 2]), '2026-10-20'))
  ok('low mood: 5 answers, most Low or Rough', lowMoodDue(moods([2, 1, 2, 3, 4]), '2026-10-20'))
  ok('low mood: half is not most', !lowMoodDue(moods([2, 1, 3, 4, 2, 4]), '2026-10-20'))
  ok('low mood: not again within 30 days', !lowMoodDue(moods([2, 1, 2, 2, 2]), '2026-10-20', '2026-09-25') && lowMoodDue(moods([2, 1, 2, 2, 2]), '2026-10-20', '2026-09-20'))
  ok('low mood: England and Wales name NHS 111', lowMoodLine('england').includes('calling NHS 111') && lowMoodLine('wales') === lowMoodLine('england'))
  ok('low mood: Scotland names NHS 24 (B6.11)', lowMoodLine('scotland').includes('calling NHS 24 on 111'))
  ok('low mood: Northern Ireland has no NHS 111 (B6.10)', lowMoodLine('northern-ireland') === 'Things seem to have been hard for a while. Talking to your GP can help, and Samaritans are there any time on 116 123.')

  /* ---------- pacer ---------- */
  const P = RESET_PATTERN
  ok('pacer timings flagged as unsourced placeholders', P.placeholder && P.source.startsWith('PENDING'))
  ok('pacer: Reset lengths 1, 2 and 5 minutes', RESET_LENGTHS.join() === '1,2,5')
  const at = (ms: number) => pacerAt(P, ms, 1)
  ok('pacer: words step at the phase edges', at(0).word === 'Breathe in' && at(1999).word === 'Breathe in' && at(2000).word === 'And in again' && at(2999).word === 'And in again' && at(3000).word === 'Breathe out' && at(8999).word === 'Breathe out' && at(9000).word === 'Breathe in')
  ok('pacer: counts up within each phase, whole seconds', at(0).count === 1 && at(999).count === 1 && at(1000).count === 2 && at(2500).count === 1 && at(3000).count === 1 && at(5500).count === 3 && at(8999).count === 6)
  ok('pacer: the sphere fills on the way in and empties on the way out', at(0).scale === 0 && at(2000).scale > 0.7 && Math.abs(at(3000).scale - 1) < 1e-9 && at(6000).scale < 1 && at(8999).scale < 0.01)
  const total = runMs(P, 1)
  ok('pacer: a run is whole breaths', total % breathMs(P) === 0 && total === 63000)
  const end = pacerAt(P, total, 1)
  ok('pacer: ends on a breath out, done', end.done && end.motion === 'out' && end.scale === 0 && end.leftMs === 0 && !pacerAt(P, total - 1, 1).done && pacerAt(P, total - 1, 1).motion === 'out')
  ok('pacer: time left', fmtLeft(at(0).leftMs) === '1:03' && fmtLeft(80000) === '1:20')

  /* ---------- copy lint ---------- */
  const skillHits = skillsCopy().filter((t) => mindCopyIssues(t).length)
  ok('BANNED_COPY and the deck §0 list pass every skills.ts string', !skillHits.length, skillHits.join(' | '))
  const mindHits = mindCopy().filter((t) => mindCopyIssues(t).length)
  ok('and every mind.ts string', !mindHits.length, mindHits.join(' | '))
  ok('new bans: skip, readiness, recovery debt, you should rest', ['Skip today', 'You skipped a day', 'Your readiness', 'Recovery debt', 'You should rest'].every((t) => mindCopyIssues(t).length > 0))
  ok('approved setup copy keeps "skip" (engine and wizard lint unchanged)', !copyIssues('Skip any question you like.').length && BANNED_COPY.every((r) => !WELLBEING_BANNED.includes(r)))
  ok('the B3.17 rope string is allowed, and only as the whole string', COPY_ALLOWED.size === 1 && mindCopyIssues('After a rough night, the shorter version swaps running, skipping and loaded single-leg moves for steadier ones, and keeps cardio at an easy, steady pace.').length === 0 && mindCopyIssues('Try skipping today').length > 0)
  ok('the final B3.17 ("jump rope") passes', mindCopyIssues('After a rough night, the shorter version swaps running, jump rope and loaded single-leg moves for steadier ones, and keeps cardio at an easy, steady pace.').length === 0)
  ok('deck §0 words caught', ['Try this meditation', 'Your sleep score', 'A clinical tool', 'You missed yesterday', "You haven't logged today", 'Screening for low mood'].every((t) => mindCopyIssues(t).length > 0))
  ok('approved lines with near words pass', ['For everyday wellbeing. Not a treatment for any condition.', 'Show supplement names in reminders', 'Lock screen'].every((t) => !mindCopyIssues(t).length))
  ok('BANNED_COPY is still a list of patterns', BANNED_COPY.every((x) => x instanceof RegExp))
  // engine and wizard copy keep BANNED_COPY unchanged; scripts/test-engine.ts and test-wizard.ts lint them

  /* ---------- Same as yesterday (nutrition R1 to R3) ---------- */
  const porridge: LoggedFood = { n: 'Porridge, made with milk', grams: 250, k: 210, p: 0, c: 0, f: 0, meal: 'breakfast', src: 'db', how: 'usual' }
  const banana: LoggedFood = { n: 'Banana (1 ~118g)', grams: 118, k: 95.6, p: 0, c: 0, f: 0, meal: 'breakfast', src: 'db', how: 'usual' }
  const lunch: LoggedFood = { n: 'Apple', grams: 100, k: 50, p: 0, c: 0, f: 0, meal: 'lunch', src: 'quick', how: 'quick' }
  const S = { days: { '2026-10-07': day(null, [porridge, banana, lunch]), '2026-10-08': day(null, []) } } as Pick<AppState, 'days'>
  const row = sameAsYesterdayRow(S, '2026-10-08', 'breakfast')
  ok('row: the deck sample, 306 kcal', row?.sub === 'Porridge, made with milk and Banana (1 ~118g) · 306 kcal', row?.sub)
  const before = dayTotals(S.days['2026-10-08']).k
  const afterDay = day(null, [...S.days['2026-10-08'].foods, ...entriesToRepeat(S, '2026-10-08', 'breakfast').entries])
  ok('R2: the row kcal equals the change in dayTotals after the tap', !!row && Math.abs(dayTotals(afterDay).k - before - row.kcal) < 1e-9 && Math.round(row.kcal) === 306)
  ok('R2: uses today\'s data, not yesterday\'s stored k', Math.abs(row!.kcal - (210 + 95.6)) < 0.11)
  ok('R1: the current meal only', sameAsYesterdayRow(S, '2026-10-08', 'lunch')?.entries.length === 1 && sameAsYesterdayRow(S, '2026-10-08', 'dinner') === null)
  const S2 = { days: { ...S.days, '2026-10-08': day(null, [{ ...banana }]) } } as Pick<AppState, 'days'>
  ok('R1: not when that meal already has something today', sameAsYesterdayRow(S2, '2026-10-08', 'breakfast') === null)
  ok('R3: no kcal in gentle mode', sameAsYesterdayRow(S, '2026-10-08', 'breakfast', { gentle: true })?.sub === 'Porridge, made with milk and Banana (1 ~118g)')
  ok('R3: too long names the first and counts the rest', sameAsYesterdayRow(S, '2026-10-08', 'breakfast', { max: 20 })?.sub === 'Porridge, made with milk and 1 more · 306 kcal')
  const gone: LoggedFood = { n: 'A food no longer in Tali', grams: 100, k: 100, p: 0, c: 0, f: 0, meal: 'breakfast', src: 'db' }
  const fat: LoggedFood = { n: 'Olive oil', grams: 5, k: 45, p: 0, c: 0, f: 5, meal: 'breakfast', src: 'fat', fatFor: gone.n }
  const S3 = { days: { '2026-10-07': day(null, [porridge, gone, fat]) } } as Pick<AppState, 'days'>
  const rep = entriesToRepeat(S3, '2026-10-08', 'breakfast')
  ok('removed foods and their cooking fat are not copied', rep.entries.length === 1 && rep.gone === 1 && sameAsYesterdayRow(S3, '2026-10-08', 'breakfast')?.sub === 'Porridge, made with milk · 210 kcal')

  for (const [n, v, info] of checks) { if (!v) bad++; console.log(v ? 'PASS' : 'FAIL', 'wellbeing core:', n, !v && info ? `(${info})` : '') }
  return bad
}
