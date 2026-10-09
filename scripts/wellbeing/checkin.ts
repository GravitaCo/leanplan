/* WP10: the check-in's "More about sleep" (board B10) and its feet. Run from
   scripts/test-wellbeing.ts; returns the number of failures. Flags read false here, so the sheet
   itself renders as on the flag-off build; the B10 parts are rendered from CheckinSleep directly. */
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { mindCopyIssues } from '@/core/domain/engine/why'
import { todayStr, shiftDay } from '@/core/domain/date'
import { useStore } from '@/store/store'
import { freshForAccount } from '@/data/persistence'
import { sleepMoreOpen } from '@/data/deviceOnly'
import { LOCAL_USER } from '@/data/supabase'
import { CHECKIN_SLEEP, CheckinFeet, checkinSleepCopy, nightPatch, nightShown, SleepMore, wakePrefill } from '@/screens/today/CheckinSleep'
import type { CheckIn, DayLog } from '@/core/types'

function memoryStorage(): Storage {
  const m = new Map<string, string>()
  return {
    get length() { return m.size },
    clear: () => m.clear(),
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => { m.delete(k) },
    setItem: (k, v) => { m.set(k, String(v)) },
  }
}

export function checkinSuite(): number {
  let bad = 0
  const ok = (name: string, pass: boolean, detail?: unknown) => {
    if (!pass) bad++
    console.log(pass ? 'PASS' : 'FAIL', 'wellbeing check-in:', name, pass || detail === undefined ? '' : JSON.stringify(detail))
  }
  const T = '2026-10-08T08:10:00.000Z'

  /* ---------- copy ---------- */
  const strings = checkinSleepCopy()
  const issues = strings.map((s) => [s, mindCopyIssues(s)] as const).filter(([, i]) => i.length)
  ok('every B10 string passes mindCopyIssues', issues.length === 0, issues)
  ok('no em dashes', strings.every((s) => !s.includes('—')))
  ok('B10.13 verbatim (as approved)', CHECKIN_SLEEP.sheetFoot === "Answer what you like, and leave the rest. There's no right answer. Sleep and stress often show up in hunger and energy, so these help you spot patterns. On a tough day, Tali asks for less and offers lighter options.")
  ok('B10.9 and B10.12 verbatim', CHECKIN_SLEEP.foot === 'A rough idea is plenty. Leave it blank if you like.'
    && strings.includes("Tali doesn't read your notes. If you're struggling, support is here."))
  ok('B10.4, B10.5, B10.8', CHECKIN_SLEEP.more === 'More about sleep' && CHECKIN_SLEEP.howLong === 'Roughly how long?' && CHECKIN_SLEEP.woke === 'Woke up around')

  /* ---------- the night patch ---------- */
  const mood: CheckIn = { mood: 2, hunger: 2, sleep: 1 }
  ok('nothing answered here: no night key, so a saved night stays', JSON.stringify(nightPatch({ ...mood, night: { source: 'self', band: '6-7', t: T } }, { band: '', wakeAt: '07:10', touched: false }, T)) === '{}')
  ok('a band and a time: a self night', JSON.stringify(nightPatch(mood, { band: '6-7', wakeAt: '07:10', touched: true }, T)) === JSON.stringify({ night: { source: 'self', band: '6-7', wakeAt: '07:10', t: T } }))
  ok('a band alone', JSON.stringify(nightPatch(mood, { band: 'lt5', wakeAt: '', touched: true }, T)) === JSON.stringify({ night: { source: 'self', band: 'lt5', t: T } }))
  ok('both cleared removes the night', (() => { const p = nightPatch(mood, { band: '', wakeAt: '', touched: true }, T); return 'night' in p && p.night === undefined })())
  ok('a bad time is never saved', JSON.stringify(nightPatch(mood, { band: '', wakeAt: '7am', touched: true }, T)) === JSON.stringify({ night: undefined }))
  ok('a device night is never overwritten', JSON.stringify(nightPatch({ ...mood, night: { source: 'healthkit', asleepMin: 400, t: T } }, { band: '8+', wakeAt: '', touched: true }, T)) === '{}')
  ok('nightShown reads a self night, never a device one', JSON.stringify(nightShown({ ...mood, night: { source: 'self', band: '5-6', wakeAt: '06:45', t: T } })) === JSON.stringify({ band: '5-6', wakeAt: '06:45' })
    && JSON.stringify(nightShown({ ...mood, night: { source: 'healthkit', band: '5-6', t: T } })) === JSON.stringify({ band: '', wakeAt: '' }) && nightShown(null).band === '')

  /* ---------- the wake-time pre-fill (yesterday only) ---------- */
  const day = '2026-10-08'
  const days: Record<string, DayLog> = {
    [shiftDay(day, -1)]: { foods: [], supps: {}, weight: null, workout: null, checkin: { mood: 3, hunger: 3, night: { source: 'self', wakeAt: '07:10', t: T } } } as DayLog,
    [shiftDay(day, -2)]: { foods: [], supps: {}, weight: null, workout: null, checkin: { mood: 3, hunger: 3, night: { source: 'self', wakeAt: '06:30', t: T } } } as DayLog,
  }
  ok('pre-fill: yesterday’s wake time', wakePrefill(days, day) === '07:10')
  ok('pre-fill: nothing when yesterday has none (never an older day)', wakePrefill(days, shiftDay(day, 2)) === '' && wakePrefill({}, day) === '')

  /* ---------- the parts, rendered ---------- */
  const noop = () => {}
  const closed = renderToString(createElement(SleepMore, { open: false, onToggle: noop, band: '', onBand: noop, wakeAt: '', onWake: noop }))
  ok('closed: the disclosure only, aria-expanded false', closed.includes('aria-expanded="false"') && closed.includes('More about sleep') && !closed.includes('Roughly how long?') && !closed.includes('Woke up around'))
  const open = renderToString(createElement(SleepMore, { open: true, onToggle: noop, band: '6-7', onBand: noop, wakeAt: '07:10', onWake: noop }))
  const pressed = [...open.matchAll(/aria-pressed="true"[^>]*>(?:<b[^>]*>)([^<]+)/g)].map((m) => m[1])
  ok('open: five bands, 6–7 pressed, the time, B10.9', open.includes('aria-expanded="true"') && (open.match(/>hours</g) || []).length === 5
    && JSON.stringify(pressed) === JSON.stringify(['6–7']) && open.includes('value="07:10"') && open.includes(CHECKIN_SLEEP.foot), { pressed })
  const onStyle = (open.match(/aria-pressed="true" style="([^"]*)"/) || [])[1] || ''
  ok('the selected band is the neutral band with a 2 px ring, never the tint or a pillar colour', onStyle.includes('background:var(--band)') && onStyle.includes('inset 0 0 0 2px var(--label)')
    && !/--(tint|mind|food|move)/.test(onStyle), onStyle)
  ok('no 7+ target zone marked: every band button but the picked one looks the same', (open.match(/<button type="button" aria-pressed="false">/g) || []).length === 4)
  const feet = renderToString(createElement(CheckinFeet, { onSupport: noop }))
  ok('feet: B10.12 with "support is here" as a button, then B10.13', /If you(?:&#x27;|')re struggling, <button[^>]*>support is here<\/button>\./.test(feet) && feet.indexOf('support is here') < feet.indexOf('Answer what you like'))

  /* ---------- the sheet's source: flag-gated, flag-off foot unchanged ---------- */
  const src = readFileSync('src/screens/today/CheckinSheet.tsx', 'utf8')
  ok('flag off keeps the old foot', src.includes("Skip anything you like. There's no right answer.") && src.includes('Tali can offer a lighter option for training.'))
  ok('every B10 part sits behind WELLBEING_ENABLED', /WELLBEING_ENABLED && <SleepMore/.test(src) && /WELLBEING_ENABLED\s*\n?\s*\? <CheckinFeet/.test(src) && /WELLBEING_ENABLED \? nightPatch/.test(src))

  /* ---------- through the store: mood kept, the open state device-only ---------- */
  const g = globalThis as { localStorage?: Storage; fetch?: typeof fetch }
  const realStorage = g.localStorage
  const realFetch = g.fetch
  g.localStorage = memoryStorage()
  g.fetch = (async () => new Response('[]')) as typeof fetch
  try {
    const today = todayStr()
    useStore.setState({ data: freshForAccount(LOCAL_USER), cur: today, signedIn: true, authed: false, ownerAsk: null })
    useStore.getState().grantConsent('health')
    useStore.getState().setCheckin({ mood: 2, sleep: 1, stress: 2, energy: 1, hunger: 2, t: T })
    const c0 = useStore.getState().data.days[today].checkin!
    useStore.getState().setCheckin({ mood: 2, sleep: 1, stress: 2, energy: 1, hunger: 2, sore: 0, note: '', t: T, ...nightPatch(c0, { band: '6-7', wakeAt: '07:10', touched: true }, T) })
    const c1 = useStore.getState().data.days[today].checkin!
    ok('save: night { self, 6-7, 07:10 } and mood unchanged', c1.mood === 2 && c1.sleep === 1 && c1.night?.source === 'self' && c1.night.band === '6-7' && c1.night.wakeAt === '07:10', c1)
    useStore.getState().setCheckin({ mood: 3, hunger: 2, t: T, ...nightPatch(c1, { band: '', wakeAt: '', touched: false }, T) })
    ok('a later save that leaves sleep alone keeps the night', useStore.getState().data.days[today].checkin!.night?.band === '6-7' && useStore.getState().data.days[today].checkin!.mood === 3)
    const dirty0 = JSON.stringify(useStore.getState().data._meta)
    useStore.getState().setSleepMore(true)
    const st = useStore.getState().data
    ok('setSleepMore stores the open state on the device', sleepMoreOpen(st) && JSON.parse(g.localStorage!.getItem('leanplan.v1') || '{}').deviceOnly?.ui?.sleepMore === true)
    ok('the open state marks nothing for sync and stays out of the profile', JSON.stringify(st._meta) === dirty0 && !JSON.stringify(st.profile).includes('sleepMore'))
    useStore.getState().setSleepMore(false)
    ok('closing clears it', !sleepMoreOpen(useStore.getState().data))
  } catch (e) {
    ok('check-in suite ran', false, String(e))
  } finally {
    g.localStorage = realStorage
    g.fetch = realFetch
  }
  return bad
}
