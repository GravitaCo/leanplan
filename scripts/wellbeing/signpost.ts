/* WP15: the low-mood signpost on Summary (board B6 frame 2). lowMoodDue itself is tested in core.ts;
   this covers the signpost in Summary's due list and the asks budget (the only ask that day), the
   banner's text by nation, its buttons, its colours (never red) and the copy lint. Run from
   scripts/test-wellbeing.ts; returns the number of failures. */
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { pickAsks } from '@/core/domain/asks'
import { lowMoodDue, lowMoodLine } from '@/core/domain/mind'
import { mindCopyIssues } from '@/core/domain/engine/why'
import type { CheckIn, DayLog } from '@/core/types'
import { LowMoodBanner } from '@/screens/today/LowMoodBanner'
import { LOW_MOOD } from '@/screens/mind/copy'
import { pillarsOn, summaryDue } from '@/screens/today/summary'

const ON = pillarsOn(undefined)
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
const noop = () => {}

export function signpostSuite(): number {
  const checks: [string, boolean, string?][] = []
  const ok = (n: string, v: boolean, info?: string) => checks.push([n, v, info])

  /* ---------- the due list and the asks budget ---------- */
  const all = { signpost: true, checkin: false, thing: true, planReview: true, banner: 'missed' as const, foodAsk: true, quickCheck: true, ifThen: true }
  ok('signpost leads the due list', summaryDue(all, ON)[0] === 'signpost', summaryDue(all, ON).join())
  ok('Mind off: no signpost', !summaryDue(all, pillarsOn(['mind'])).includes('signpost'))
  ok('no signpost unless due', !summaryDue({ ...all, signpost: false }, ON).includes('signpost'))
  for (const ctx of [{ daysUsing: 60 }, { daysUsing: 3 }, { daysUsing: 60, hard: true, lowMood: true }, { daysUsing: 60, asks: 'fewer' as const }]) {
    const pick = pickAsks(summaryDue(all, ON), { ...ctx, signpostToday: true })
    ok('signpost day: the only ask, no chips (' + JSON.stringify(ctx) + ')', pick.show.join() === 'signpost', pick.show.join())
    ok('signpost day: everything else held, never shown', ['thing', 'plan-review', 'welcome-back', 'food-ask', 'quick-check', 'if-then-offer'].every((id) => pick.held.some((h) => h.id === id && h.reason === 'signpost')))
  }
  const before = pickAsks(summaryDue({ signpost: true, checkin: true }, ON), { signpostToday: true, daysUsing: 5 })
  ok('before the check-in the prompt stays beside the signpost', before.show.join() === 'signpost,checkin', before.show.join())
  const not = pickAsks(summaryDue({ ...all, signpost: false }, ON), { daysUsing: 60 })
  ok('no signpost day: the usual asks', !not.show.includes('signpost') && not.show.includes('thing'))

  /* ---------- once a month: lowMoodDue with the local date stored ---------- */
  const today = '2026-10-08'
  const shift = (d: string, n: number) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10) }
  const days: Record<string, DayLog> = {}
  ;[2, 1, 2, 3, 2, 1, 2].forEach((m, i) => { const d = shift(today, -(i * 2 + 1)); days[d] = { foods: [], supps: {}, weight: null, workout: null, checkin: { mood: m, hunger: 3 } as CheckIn } })
  ok('low-mood fortnight: due', lowMoodDue(days, today))
  ok('shown today: not due again today', !lowMoodDue(days, today, today))
  const later = Object.fromEntries(Object.entries(days).map(([d, v]) => [shift(d, 29), v]))
  ok('within 30 days of showing: not due, even with low moods', !lowMoodDue(later, shift(today, 29), today))
  const after = Object.fromEntries(Object.entries(days).map(([d, v]) => [shift(d, 30), v]))
  ok('30 days after: due again', lowMoodDue(after, shift(today, 30), today))

  /* ---------- the banner ---------- */
  const render = (nation?: Parameters<typeof LowMoodBanner>[0]['nation']) => renderToString(createElement(LowMoodBanner, { nation, onSupport: noop, onDismiss: noop }))
  const en = render()
  ok('England line (B6.9)', text(en).includes('Things seem to have been hard for a while. Talking to your GP or calling NHS 111 can help, and Samaritans are there any time on 116 123.'), text(en))
  ok('Wales as England', text(render('wales')).includes(lowMoodLine('england')))
  const ni = text(render('northern-ireland'))
  ok('Northern Ireland line (B6.10), no NHS 111', ni.includes('Things seem to have been hard for a while. Talking to your GP can help, and Samaritans are there any time on 116 123.') && !ni.includes('NHS 111'), ni)
  ok('Scotland line (B6.11)', text(render('scotland')).includes('Things seem to have been hard for a while. Talking to your GP or calling NHS 24 on 111 can help, and Samaritans are there any time on 116 123.'))
  ok('"See support" button (B6.12)', /<button[^>]*class="btn gray sm"[^>]*>See support<\/button>/.test(en), en)
  ok('Dismiss (B6.13) is labelled', /<button[^>]*class="x"[^>]*aria-label="Dismiss"/.test(en) || /aria-label="Dismiss"[^>]*class="x"/.test(en), en)
  ok('a note, not an alert', en.includes('role="note"') && !en.includes('role="alert"'))
  ok('never red, never a warning', !/red|warn|danger/i.test(en))
  ok('no B6.14 line', !en.includes('ask for less'))
  const css = readFileSync('src/styles/mind.css', 'utf8')
  const wp15 = css.slice(css.indexOf('WP15')).replace(/\/\*[\s\S]*?\*\//g, '')
  ok('mind-coloured square', /\.lm-sq[^}]*background: var\(--mind-fill\)[^}]*color: var\(--mind-ink\)/.test(wp15))
  ok('Dismiss target is 44 px', /\.lm-banner \.x \{[^}]*width: 44px; height: 44px/.test(wp15))
  ok('"See support" target is 44 px', /\.btn\.sm \{[^}]*height: 44px/.test(wp15))
  ok('no red in the WP15 styles', !/--red|danger|warn/.test(wp15))

  /* ---------- copy ---------- */
  const strings = [...Object.values(LOW_MOOD), ...(['england', 'scotland', 'wales', 'northern-ireland'] as const).map(lowMoodLine)]
  const issues = strings.map((s) => [s, mindCopyIssues(s)] as const).filter(([, i]) => i.length)
  ok('every signpost string passes mindCopyIssues', issues.length === 0, JSON.stringify(issues))
  ok('no em dashes', strings.every((s) => !s.includes('—')))

  let bad = 0
  for (const [n, v, info] of checks) {
    if (!v) bad++
    console.log(v ? 'PASS' : 'FAIL', 'wp15:', n, !v && info ? '· ' + info : '')
  }
  return bad
}
