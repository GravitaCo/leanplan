/* WP6: the Mind page (B5), the Support sheet in the Mind context (B6 frame 1), Shout and the icons.
   Run from scripts/test-wellbeing.ts; returns the number of failures. Flags read false here, so the
   Mind page renders without its Skills section (MIND_REVIEWED off), as it does on the flag-on build. */
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { NATIONS, SIGNPOSTS, smsHref, type UkNation } from '@/core/data/signposts'
import { SKILLS, skillsWithScreen } from '@/core/data/skills'
import { mindCopyIssues } from '@/core/domain/engine/why'
import { todayStr } from '@/core/domain/date'
import { useStore } from '@/store/store'
import { freshForAccount } from '@/data/persistence'
import { LOCAL_USER } from '@/data/supabase'
import { supportList } from '@/screens/profile/supportRows'
import { SUPPORT } from '@/screens/onboarding/copyApp'
import { mindPageCopy, SHARED, SUPPORT_MIND, MIND } from '@/screens/mind/copy'
import { SupportSheet } from '@/screens/mind/SupportSheet'
import { SupportSheet as ProfileSupportSheet } from '@/screens/profile/AccountData'
import { MindPageView, checkinPairs, mindEyebrow } from '@/screens/mind/MindPage'
import type { CheckIn } from '@/core/types'

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

const names = (n: UkNation | null, context?: 'mind') => supportList(n, context ? { context } : {}).map((r) => r.name)

export function mindPageSuite(): number {
  let bad = 0
  const ok = (name: string, pass: boolean, detail?: unknown) => {
    if (!pass) bad++
    console.log(pass ? 'PASS' : 'FAIL', 'wellbeing mind page:', name, pass || detail === undefined ? '' : JSON.stringify(detail))
  }

  /* ---------- Shout in signposts.ts ---------- */
  const shout = SIGNPOSTS.shout
  ok('Shout: text SHOUT to 85258, 24 hours, free, checked 7 Oct 2026',
    shout.sms?.to === '85258' && shout.sms.body === 'SHOUT' && shout.hours === '24 hours, every day' && shout.free === true && shout.checkedOn === '2026-10-07' && !shout.phone)
  ok('Shout: an sms: link with the word filled in', smsHref(shout.sms!) === 'sms:85258?&body=SHOUT')

  /* ---------- supportList: the Mind order per nation (B6.5), Profile unchanged ---------- */
  const england = ['Samaritans', 'Shout', 'NHS 111, option 2', 'NHS 111', 'Beat', 'Emergency services']
  ok('Mind order, England', JSON.stringify(names('england', 'mind')) === JSON.stringify(england), names('england', 'mind'))
  ok('Mind order, Wales', JSON.stringify(names('wales', 'mind')) === JSON.stringify(england), names('wales', 'mind'))
  ok('Mind order, Scotland (NHS 24 with its mental health option)', JSON.stringify(names('scotland', 'mind')) === JSON.stringify(['Samaritans', 'Shout', 'NHS 24 (111), mental health option', 'NHS 24 (111)', 'Beat', 'Emergency services']), names('scotland', 'mind'))
  const scMh = supportList('scotland', { context: 'mind' })[2]
  ok('Scotland\'s mental health line: 111, crisis line, 24 hours, never "option 2"', scMh.tel === '111' && scMh.desc === 'Mental health crisis line · 24 hours, every day' && !/option 2/.test(scMh.name), scMh)
  ok('Mind order, Northern Ireland (Lifeline, then the GP, no NHS 111)', JSON.stringify(names('northern-ireland', 'mind')) === JSON.stringify(['Samaritans', 'Shout', 'Lifeline', 'Your GP', 'Beat', 'Emergency services']), names('northern-ireland', 'mind'))
  const lifeline = SIGNPOSTS.lifeline
  ok('Lifeline: 0808 808 8000, Northern Ireland only, 24 hours, free, checked 10 Oct 2026 (nidirect)',
    lifeline.phone === '0808 808 8000' && JSON.stringify(lifeline.nations) === '["northern-ireland"]' && lifeline.hours === '24 hours, every day' && lifeline.free === true && lifeline.checkedOn === '2026-10-10')
  const lifeRow = supportList('northern-ireland', { context: 'mind' }).find((r) => r.name === 'Lifeline')
  ok('the Lifeline row: crisis line, 24 hours, calls', lifeRow?.desc === 'Mental health crisis line · 24 hours, every day' && lifeRow.tel === '0808 808 8000' && lifeRow.num === '0808 808 8000', lifeRow)
  ok('Lifeline only in Northern Ireland, in both sheets', [...(['england', 'scotland', 'wales'] as UkNation[]), null].every((n) => !names(n, 'mind').includes('Lifeline') && !names(n).includes('Lifeline')) && names('northern-ireland').includes('Lifeline'))
  ok('the GP row has no right-hand label in either sheet (no tint text that isn\'t a link)',
    [...NATIONS.map(([n]) => n), null].every((n) => [supportList(n, { context: 'mind' }), supportList(n)].every((l) => l.filter((r) => r.name === 'Your GP').every((r) => !r.num && !r.tel))))
  // register item 44: no nation known, so nothing that doesn't run in all four nations
  ok('Mind order, no nation yet (the GP, no NHS 111 or option 2 line)', JSON.stringify(names(null, 'mind')) === JSON.stringify(['Samaritans', 'Shout', 'Your GP', 'Beat', 'Emergency services']), names(null, 'mind'))
  const anyRows = supportList(null, { context: 'mind' })
  ok('no nation yet: no 111 anywhere, Beat on the UK-wide line nhs.uk gives, 999 and Samaritans kept',
    anyRows.every((r) => !/111/.test(`${r.name} ${r.desc} ${r.num}`)) && anyRows.find((r) => r.name === 'Beat')?.tel === '0808 801 0677'
      && anyRows.find((r) => r.name === 'Emergency services')?.tel === '999' && anyRows.find((r) => r.name === 'Samaritans')?.tel === '116 123', anyRows)
  const niGp = supportList('northern-ireland', { context: 'mind' }).find((r) => r.name === 'Your GP')
  ok('Northern Ireland: the GP row names the GP out-of-hours service, no number, no 111',
    niGp?.desc === SUPPORT_MIND.gpOutOfHours && SUPPORT_MIND.gpOutOfHours === 'Medical help when it isn’t an emergency. Evenings and weekends, call your area’s GP out-of-hours service.' && !niGp.tel && !/111/.test(niGp.desc), niGp)
  ok('England, Wales and Scotland keep 111 once picked', (['england', 'wales', 'scotland'] as UkNation[]).every((n) => supportList(n, { context: 'mind' }).some((r) => r.tel === '111')))
  ok('Profile order, England unchanged (ob9-7)', JSON.stringify(names('england')) === JSON.stringify(['Beat', 'NHS 111, option 2', 'NHS 111', 'Samaritans', 'Emergency services']), names('england'))
  ok('Profile order, whole UK: Beat first, the GP, no 111', JSON.stringify(names(null)) === JSON.stringify(['Beat', 'Your GP', 'Samaritans', 'Emergency services']) && supportList(null).every((r) => !/111/.test(`${r.name} ${r.desc} ${r.num}`)), names(null))
  ok('Profile order, Northern Ireland: Beat, Lifeline, the GP', JSON.stringify(names('northern-ireland')) === JSON.stringify(['Beat', 'Lifeline', 'Your GP', 'Samaritans', 'Emergency services']), names('northern-ireland'))
  ok('Shout only in the Mind context', NATIONS.every(([n]) => !names(n).includes('Shout') && names(n, 'mind').includes('Shout')))
  const row = supportList('england', { context: 'mind' })[1]
  ok('the Shout row keeps "Text SHOUT to 85258" visible and texts, never calls',
    row.desc === 'Text SHOUT to 85258 · 24 hours, every day' && row.num === '85258' && row.sms === 'sms:85258?&body=SHOUT' && !row.tel, row)
  ok('Beat, the NHS lines and 999 keep their numbers in the Mind context', NATIONS.every(([n]) => supportList(n, { context: 'mind' }).every((r) => r.name === 'Shout' || r.name === 'Your GP' ? true : !!r.tel)))

  /* ---------- copy lint ---------- */
  const strings = [...mindPageCopy(), SUPPORT.title, SUPPORT.lead, ...[...NATIONS.map(([n]) => n), null].flatMap((n) => supportList(n, { context: 'mind' }).flatMap((r) => [r.name, r.desc])), SUPPORT.showing(SUPPORT_MIND.anyNation), SUPPORT.choose, SUPPORT.chooseNation]
  const issues = strings.map((s) => [s, mindCopyIssues(s)] as const).filter(([, i]) => i.length)
  ok('every Mind page and Support string passes mindCopyIssues', issues.length === 0, issues)
  ok('no em dashes', strings.every((s) => !s.includes('—')))
  ok('B6.8 foot verbatim', SUPPORT_MIND.foot === 'Opening this page is private. Tali doesn’t record it or tell anyone. Calls to these numbers are free. Texting Shout is free from the main UK networks.')
  ok('S.1 and S.2 verbatim', SHARED.support === 'Need support now?' && SHARED.wellness === 'For everyday wellbeing. Not a treatment for any condition.')

  /* ---------- icons ---------- */
  const icons = readFileSync('src/ui/icons.tsx', 'utf8')
  ok('wind, moon, pen and sun exist, and every skill uses one that does', ['wind', 'moon', 'pen', 'sun'].every((n) => new RegExp(`^\\s+${n}: <`, 'm').test(icons))
    && SKILLS.every((s) => new RegExp(`^\\s+${s.icon}: <`, 'm').test(icons)))
  ok('the Skills list has all four skills (B12, B13 approved)', skillsWithScreen().map((s) => s.id).join() === 'reset,wind-down,unload,outside')

  /* ---------- page helpers ---------- */
  ok('eyebrow reads "Thursday 8 October"', mindEyebrow('2026-10-08') === 'Thursday 8 October', mindEyebrow('2026-10-08'))
  ok('the deck sample pairs: Low, Poor, Some, Low (the four on board B5)',
    JSON.stringify(checkinPairs({ mood: 2, sleep: 1, stress: 2, energy: 1, hunger: 2, sore: 2 })) === JSON.stringify([['Mood', 'Low'], ['Sleep', 'Poor'], ['Stress', 'Some'], ['Energy', 'Low']]))
  ok('unanswered questions are left out', checkinPairs({ mood: 0, hunger: 0, sleep: 3 }).map(([k]) => k).join() === 'Sleep' && checkinPairs(null).length === 0)

  /* ---------- opening Support writes nothing, counts nothing, syncs nothing ---------- */
  const src = readFileSync('src/screens/mind/SupportSheet.tsx', 'utf8')
  const imports = [...src.matchAll(/from '([^']+)'/g)].map((m) => m[1])
  ok('SupportSheet imports no store, data or network module', imports.every((i) => !/^@\/(store|data)\b|supabase|sync|fetch/.test(i)), imports)
  ok('SupportSheet has no storage, fetch or console call', !/localStorage|sessionStorage|indexedDB|fetch\(|navigator\.|console\./.test(src))

  const g = globalThis as { localStorage?: Storage; fetch?: typeof fetch }
  const realStorage = g.localStorage
  const realFetch = g.fetch
  g.localStorage = memoryStorage()
  let fetches = 0
  g.fetch = (async () => { fetches++; return new Response('{}') }) as typeof fetch
  try {
    const today = todayStr()
    useStore.setState({ data: freshForAccount(LOCAL_USER), cur: today, signedIn: true, authed: false, ownerAsk: null, tab: 'mind', mindOpen: null })
    useStore.getState().grantConsent('health')
    useStore.getState().setCheckin({ mood: 2, sleep: 1, stress: 2, energy: 1, hunger: 2, t: today + 'T08:10:00.000Z' })
    const plain = () => JSON.stringify(Object.fromEntries(Object.entries(useStore.getState()).filter(([, v]) => typeof v !== 'function')))
    const storage = () => JSON.stringify(Object.fromEntries(Array.from({ length: g.localStorage!.length }, (_, i) => g.localStorage!.key(i)!).map((k) => [k, g.localStorage!.getItem(k)])))
    const before = { state: plain(), storage: storage() }
    let notified = 0
    const unsub = useStore.subscribe(() => { notified++ })
    const html = renderToString(createElement(SupportSheet, { onClose: () => {} }))
    unsub()
    ok('opening Support changes no store state', plain() === before.state)
    ok('opening Support writes nothing to the device', storage() === before.storage)
    ok('opening Support notifies no store subscriber and makes no request', notified === 0 && fetches === 0, { notified, fetches })
    const at = (s: string) => html.indexOf(s)
    ok('the sheet opens on the whole UK (register item 44): no 111 until a nation is picked', html.includes('Showing services for the whole UK') && !html.includes('111') && html.includes('Your GP'))
    ok('whole UK: the button reads Choose, and the footnote sits under the list', />Choose</.test(html) && !/>Change</.test(html) && html.includes(SUPPORT.chooseNation)
      && at(SUPPORT.chooseNation) > at('Emergency services') && at(SUPPORT.chooseNation) < at(SUPPORT_MIND.notCrisis))
    ok('whole UK: no Lifeline, and the GP row has no "Contact"', !html.includes('Lifeline') && !html.includes('>Contact<'))
    ok('the sheet: Samaritans first, Shout second, 999 last, both feet', at('Samaritans') > 0 && at('Samaritans') < at('Shout') && at('Shout') < at('Your GP') && at('Your GP') < at('Beat') && at('Beat') < at('Emergency services')
      && html.includes('href="sms:85258?&amp;body=SHOUT"') && html.includes('Text SHOUT to 85258') && html.includes(SUPPORT_MIND.notCrisis) && html.includes('Texting Shout is free from the main UK networks.'))
    ok('the sheet is never red', !/--red|class="[^"]*\bdanger\b/.test(html))
    // Profile's sheet (ob9-7) opens on the whole UK too (Benn, 10 Oct 2026)
    const ph = renderToString(createElement(ProfileSupportSheet, { onClose: () => {} }))
    const pat = (x: string) => ph.indexOf(x)
    ok('Profile sheet: opens on the whole UK, Choose, the footnote under the list, Beat first, its own foot, no 111',
      ph.includes('Showing services for the whole UK') && />Choose</.test(ph) && !/>Change</.test(ph) && !ph.includes('111') && !ph.includes('Lifeline') && !ph.includes('>Contact<')
        && pat('Beat') > 0 && pat('Beat') < pat('Your GP') && pat('Your GP') < pat('Samaritans') && pat('Emergency services') < pat(SUPPORT.chooseNation)
        && pat(SUPPORT.chooseNation) < pat(SUPPORT.foot) && ph.includes('tel:08088010677'))

    // the page from plain props (MindPageView: the store is read by MindPage around it)
    const noop = () => {}
    const view = (checkin: CheckIn | null, skillsOn: boolean) => renderToString(createElement(MindPageView, {
      today: '2026-10-08', checkin, skillsOn, onCheckin: noop, onSupport: noop, onSkill: noop, onPlans: noop }))
    const sample = { mood: 2, sleep: 1, stress: 2, energy: 1, hunger: 2 }
    const page = view(sample, false)
    const p = (s: string) => page.indexOf(s)
    const missing = ['>Mind<', '>Thursday 8 October<', '>Low<', '>Poor<', '>Some<', '>Update<'].filter((s) => p(s) < 0)
    ok('the Mind page: eyebrow, title, today’s pairs, Update', missing.length === 0, missing)
    ok('the support row sits directly under the Today card', p('Need support now?') > p('>Update<') && p('Need support now?') < p(MIND.plans))
    ok('no Skills section while MIND_REVIEWED is off', !page.includes('>Skills<') && !page.includes('Reset') && !page.includes('Unload'))
    ok('the if-then plans row and the wellness line', p('If–then plans') > 0 && p('On Plan') > 0 && p(SHARED.wellness) > p('On Plan'))
    ok('no back button on the tab root', !page.includes('pv-back') && !page.includes('navbtn'))
    const reviewed = view(sample, true)
    const r = (s: string) => reviewed.indexOf(s)
    ok('with MIND_REVIEWED: Skills lists Reset, Wind down, Unload, Get outside, under the support row', r('>Skills<') > r('Need support now?') && r('>Reset<') > r('>Skills<')
      && r('>Wind down<') > r('>Reset<') && r('>Unload<') > r('>Wind down<') && r('>Get outside<') > r('>Unload<'))
    const empty = view(null, false)
    ok('before today’s check-in: the ask and "Check in"', empty.includes(MIND.askTitle) && empty.includes('>Check in<') && !empty.includes('>Update<'))
    ok('rendering the page writes nothing', plain() === before.state && storage() === before.storage && fetches === 0)
  } catch (e) {
    ok('mind page suite ran', false, String(e))
  } finally {
    g.localStorage = realStorage
    g.fetch = realFetch
  }
  return bad
}
