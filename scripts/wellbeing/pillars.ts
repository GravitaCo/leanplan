/* WP9: Profile's pillars and asks settings (board B1). Run from scripts/test-wellbeing.ts; returns the
   number of failures. The view renders from plain props (PillarsSettingsView); the writes run on the
   real store in Node (localStorage is a Map, authed stays false, so nothing reaches the network). */
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import type { MindPrefs, Pillar } from '@/core/types'
import { mindCopyIssues } from '@/core/domain/engine/why'
import { todayStr } from '@/core/domain/date'
import { useStore } from '@/store/store'
import { freshForAccount } from '@/data/persistence'
import { LOCAL_USER } from '@/data/supabase'
import { PILLARS_COPY as C, pillarsStrings } from '@/screens/profile/pillarsCopy'
import { PillarsSettingsView, atRiskRoute, offAfter, pillarsOn } from '@/screens/profile/PillarsSettings'

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

const B116 = 'Finding food tracking hard? Gentle display hides the numbers, and support is here.'

export function pillarsSuite(): number {
  let bad = 0
  const ok = (name: string, pass: boolean, detail?: unknown) => {
    if (!pass) bad++
    console.log(pass ? 'PASS' : 'FAIL', 'wellbeing pillars:', name, pass || detail === undefined ? '' : JSON.stringify(detail))
  }

  /* ---------- copy: verbatim from the deck, linted ---------- */
  ok('B1.1, B1.8, B1.9, B1.13 and B1.14 verbatim', C.heading === 'What do you want Tali for?'
    && C.foot === "Keep at least one on. One that's off leaves Today and stops its prompts. Nothing is deleted, and you can switch it back any time."
    && C.lastOn === 'At least one stays on'
    && C.asksFoot === "Usual: up to 3 suggestions or prompts a day. Fewer prompts: 1. On a harder day, Tali asks for less either way. Anything you open yourself doesn't count."
    && C.foodOff === "Food is off. Today won't show calories, ranges or food prompts. Your food log is kept.")
  ok('B1.16 reads whole across its two links', pillarsStrings().includes(B116))
  const issues = pillarsStrings().map((s) => [s, mindCopyIssues(s)] as const).filter(([, i]) => i.length)
  ok('every B1 string passes mindCopyIssues', issues.length === 0, issues)
  ok('no em dashes', pillarsStrings().every((s) => !s.includes('—')))

  /* ---------- helpers ---------- */
  ok('absent off: all three on', pillarsOn(undefined).join() === 'mind,food,move')
  ok('offAfter adds and removes in board order; all on again is null',
    offAfter(undefined, 'move')?.join() === 'move' && offAfter({ off: ['move'] }, 'mind')?.join() === 'mind,move' && offAfter({ off: ['food'] }, 'food') === null)
  ok('the at-risk route: gentle, or a wellbeing Yes or Sometimes', atRiskRoute({ gentle: true }) && atRiskRoute({ outcomes: { wellbeing: 'flagged' } })
    && atRiskRoute({ outcomes: { wellbeing: 'sometimes' } }) && !atRiskRoute({ outcomes: { wellbeing: 'clear' } }) && !atRiskRoute({}))

  /* ---------- the view ---------- */
  const noop = () => {}
  const view = (mind: MindPrefs | undefined, atRisk = false) => renderToString(createElement(PillarsSettingsView, { mind, atRisk, onToggle: noop, onAsks: noop, onDisplay: noop, onSupport: noop }))
  const text = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&#x27;/g, "'").replace(/&amp;/g, '&')
  const all = view(undefined)
  const at = (s: string) => all.indexOf(s)
  ok('all on: heading, three rows in order, B1.8, the Seg on Usual, B1.13', at(C.heading) >= 0 && at('>Mind<') < at('>Food<') && at('>Food<') < at('>Move<')
    && text(all).includes(C.foot) && /aria-checked="true" class="on">Usual</.test(all) && text(all).includes(C.asksFoot), all)
  ok('all on: three switches on, none disabled, no B1.9', (all.match(/role="switch" aria-checked="true"/g) || []).length === 3 && !/disabled/.test(all) && !all.includes(C.lastOn))
  const foodOff = text(view({ off: ['food'] }))
  ok('Food off: B1.14 replaces B1.8, no B1.16 for someone not on the at-risk route', foodOff.includes(C.foodOff) && !foodOff.includes(C.foot) && !foodOff.includes(B116))
  const gentle = view({ off: ['food'] }, true)
  ok('Food off in gentle mode or wellbeing routing: B1.16 with two one-tap links', text(gentle).includes(B116)
    && (gentle.match(/<button type="button" class="linkbtn inl">/g) || []).length === 2)
  ok('Food on in gentle mode: no B1.16', !text(view(undefined, true)).includes(B116))
  const onlyMove = view({ off: ['mind', 'food'] })
  ok('only Move on: its switch is disabled with B1.9, the other two off and tappable, foot B1.8 as drawn',
    /aria-checked="true" aria-label="Move" disabled/.test(onlyMove) && (onlyMove.match(/disabled/g) || []).length === 1 && onlyMove.includes(C.lastOn) && text(onlyMove).includes(C.foot) && !text(onlyMove).includes(C.foodOff)
    && /aria-checked="false" aria-label="Mind"/.test(onlyMove) && /aria-checked="false" aria-label="Food"/.test(onlyMove))
  ok('Fewer prompts selected', /aria-checked="true" class="on">Fewer prompts</.test(view({ asks: 'fewer' })))

  /* ---------- writes through setMindPrefs ---------- */
  const g = globalThis as { localStorage?: Storage }
  const realStorage = g.localStorage
  g.localStorage = memoryStorage()
  try {
    const today = todayStr()
    useStore.setState({ data: freshForAccount(LOCAL_USER), cur: today, signedIn: true, authed: false, ownerAsk: null, tab: 'profile', mindOpen: null })
    useStore.getState().grantConsent('health')
    useStore.setState((s) => { s.data.profile.gentle = true; s.data.profile.foodMode = 'sometimes' })
    const st = () => useStore.getState()
    const prof = () => st().data.profile
    const flip = (p: Pillar) => st().setMindPrefs({ off: offAfter(prof().mind, p) })
    ok('Food off saves off: [food] and stamps mind.off', flip('food') && prof().mind?.off?.join() === 'food' && !!prof().answeredAt?.['mind.off'])
    ok('Food off never resets gentle mode or foodMode', prof().gentle === true && prof().foodMode === 'sometimes')
    ok('Food on again: off removed, gentle and foodMode as they were', flip('food') && prof().mind?.off === undefined && prof().gentle === true && prof().foodMode === 'sometimes')
    flip('mind'); flip('food')
    const before = JSON.stringify(prof())
    ok('the last pillar on is refused, nothing saved', flip('move') === false && JSON.stringify(prof()) === before)
    ok('asks Fewer prompts saves and stamps mind.asks', st().setMindPrefs({ asks: 'fewer' }) && prof().mind?.asks === 'fewer' && !!prof().answeredAt?.['mind.asks'])
  } finally {
    g.localStorage = realStorage
  }

  /* ---------- wiring ---------- */
  const profile = readFileSync('src/screens/ProfileScreen.tsx', 'utf8')
  const iGoal = profile.indexOf('<div className="lbl">You and your goal</div>')
  const iPill = profile.indexOf('<PillarsSettings')
  const iTrack = profile.indexOf('<div className="lbl">Tracking</div>')
  ok('Profile mounts it between "You and your goal" and "Tracking", behind WELLBEING_ENABLED',
    iGoal > 0 && iGoal < iPill && iPill < iTrack && /\{WELLBEING_ENABLED && <PillarsSettings /.test(profile))
  const src = readFileSync('src/screens/profile/PillarsSettings.tsx', 'utf8')
  ok('it writes only through setMindPrefs (never setPrefs, gentle or foodMode)', !/setPrefs\b|\.(gentle|foodMode)\s*=[^=]|[{,]\s*(gentle|foodMode)\s*:/.test(src) && /setMindPrefs\(/.test(src))
  ok('"support is here" opens the Mind Support sheet (WP6)', /from '\.\.\/mind\/SupportSheet'/.test(src))
  return bad
}
