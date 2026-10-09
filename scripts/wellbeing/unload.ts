/* WP13: Unload (board B8). Run from scripts/test-wellbeing.ts; returns the number of failures.
   The sheet's rules (when Done is off, the earlier-note lines), its copy, and the save through the
   real store: device only, signedIn not authed (works offline), the skill logged without text. */
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { COPY_ALLOWED, mindCopyIssues } from '@/core/domain/engine/why'
import { todayStr } from '@/core/domain/date'
import { useStore } from '@/store/store'
import { freshForAccount } from '@/data/persistence'
import { LOCAL_USER } from '@/data/supabase'
import { UNLOAD_MAX_NOTES, UNLOAD_MAX_PAIRS, UNLOAD_NOTE_MAX_CHARS } from '@/data/deviceOnly'
import { SHARED, UNLOAD } from '@/screens/mind/copy'
import { UnloadSheet, deleteUnload, noteDay, noteLines, saveUnload, unloadBlocked } from '@/screens/mind/UnloadSheet'

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

const SENTINEL = 'SENTINEL-UNLOAD-WP13'

export function unloadSuite(): number {
  let bad = 0
  const ok = (name: string, pass: boolean, detail?: unknown) => {
    if (!pass) bad++
    console.log(pass ? 'PASS' : 'FAIL', 'wellbeing unload:', name, pass || detail === undefined ? '' : JSON.stringify(detail))
  }

  /* ---------- copy ---------- */
  const strings = Object.values(UNLOAD)
  const issues = strings.map((s) => [s, mindCopyIssues(s)] as const).filter(([, i]) => i.length)
  ok('every Unload string passes mindCopyIssues', !issues.length, issues)
  ok('no em dashes', strings.every((s) => !s.includes('—')))
  ok('B8.11 verbatim, and it is the exact COPY_ALLOWED entry', UNLOAD.local === "Your notes stay on this device only. They aren't synced or sent anywhere, so if you remove Tali or clear this device's data, they're gone." && COPY_ALLOWED.has(UNLOAD.local))
  ok('B8.12 is its lead, link and full stop', UNLOAD.notReadLead + UNLOAD.notReadLink + '.' === UNLOAD.notRead && UNLOAD.notRead === "Tali doesn't read your notes. If you're struggling, support is here.")
  ok('B8.13, B8.14 and S.1 verbatim', UNLOAD.notCrisis === "Tali isn't a crisis service. In an emergency, call 999." && UNLOAD.saved === 'Saved on this device' && SHARED.support === 'Need support now?')

  /* ---------- when Done is off ---------- */
  const yes = { signedIn: true, ownerAsk: false, healthAllowed: true, owner: true }
  const pair = (mind: string, next = '') => ({ mind, next })
  ok('nothing written: empty', unloadBlocked({ pairs: [pair(''), pair('  ', ' ')], ok: ' ' }, yes, 0) === 'empty')
  ok('a next step with an empty "On my mind" is enough', unloadBlocked({ pairs: [pair('', 'Ring the garage')] }, yes, 0) === null)
  ok('the "went OK" line alone is enough', unloadBlocked({ pairs: [pair('')], ok: 'Lunch outside' }, yes, 0) === null)
  ok('not now: signed out, owner question, no owner, health off', (['signedIn', 'ownerAsk', 'owner', 'healthAllowed'] as const).every((k) =>
    unloadBlocked({ pairs: [pair('x')] }, { ...yes, [k]: k === 'ownerAsk' }, 0) === 'not-now'))
  ok('too long past the cap, fine at it', unloadBlocked({ pairs: [pair('a'.repeat(UNLOAD_NOTE_MAX_CHARS + 1))] }, yes, 0) === 'too-long'
    && unloadBlocked({ pairs: [pair('a'.repeat(UNLOAD_NOTE_MAX_CHARS - 1), 'b')] }, yes, 0) === null)
  ok('full at the note cap', unloadBlocked({ pairs: [pair('x')] }, yes, UNLOAD_MAX_NOTES) === 'full' && unloadBlocked({ pairs: [pair('x')] }, yes, UNLOAD_MAX_NOTES - 1) === null)
  ok('too many pairs past the pair cap', unloadBlocked({ pairs: Array.from({ length: UNLOAD_MAX_PAIRS + 1 }, () => pair('x')) }, yes, 0) === 'too-many-pairs')

  /* ---------- earlier notes ---------- */
  ok('the board sample line', noteLines({ pairs: [{ mind: 'Sort the boiler service', next: 'call on Thursday' }] }).join() === 'Sort the boiler service. Next step: call on Thursday')
  ok('a next step on its own, a thought on its own, the went-OK line last', JSON.stringify(noteLines({ pairs: [{ mind: '', next: 'Ring the garage' }, { mind: 'Work is a lot' }, { mind: 'Is it Friday?', next: 'Plan it' }], ok: 'Lunch outside' }))
    === JSON.stringify(['Next step: Ring the garage', 'Work is a lot', 'Is it Friday? Next step: Plan it', 'Lunch outside']))
  ok('"Tuesday 6 October"', noteDay('2026-10-06T19:30:00.000Z') === 'Tuesday 6 October', noteDay('2026-10-06T19:30:00.000Z'))

  /* ---------- the source ---------- */
  const src = readFileSync('src/screens/mind/UnloadSheet.tsx', 'utf8')
  ok('UnloadSheet has no console, fetch or storage call', !/console\.|fetch\(|localStorage|sessionStorage|indexedDB/.test(src))
  ok('it reads the session through selectNotesContext and never authed', src.includes('selectNotesContext') && !/\bauthed\b/.test(src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')))

  /* ---------- save through the store: device only, offline, skill logged ---------- */
  const g = globalThis as { localStorage?: Storage; fetch?: typeof fetch }
  const realStorage = g.localStorage
  const realFetch = g.fetch
  g.localStorage = memoryStorage()
  let fetches = 0
  g.fetch = (async () => { fetches++; return new Response('{}') }) as typeof fetch
  try {
    const today = todayStr()
    // signed in with sync paused (offline): signedIn true, authed false
    useStore.setState({ data: freshForAccount(LOCAL_USER), cur: today, signedIn: true, authed: false, syncPaused: true, ownerAsk: null, tab: 'mind', mindOpen: null, toast: null })
    useStore.getState().grantConsent('health')
    useStore.getState().setCheckin({ mood: 2, sleep: 1, stress: 2, energy: 1, hunger: 2, t: today + 'T08:10:00.000Z' })
    fetches = 0

    // a server render reads the store's first state (signed out), so this checks the layout only
    const empty = renderToString(createElement(UnloadSheet, { onClose: () => {} })).replace(/&#x27;/g, "'")
    const at = (s: string) => empty.indexOf(s)
    ok('the sheet: lead, one pair, Add another, went OK, the three feet in order, then the support row', at(UNLOAD.lead) > 0 && at('>On my mind<') > at(UNLOAD.lead)
      && at('>Next step<') > at('>On my mind<') && at(UNLOAD.addAnother) > at('>Next step<') && at(UNLOAD.wentOk) > at(UNLOAD.addAnother)
      && at("Your notes stay on this device only.") > at(UNLOAD.wentOk) && at(UNLOAD.notReadLink) > at("Your notes stay on this device only.")
      && at("Tali isn't a crisis service.") > at(UNLOAD.notReadLink) && at(SHARED.support) > at("Tali isn't a crisis service."))
    ok('empty and signed out: Done is off, and no Earlier notes row', /<button class="navbtn b" disabled="">Done<\/button>/.test(empty) && !empty.includes(UNLOAD.earlier))
    ok('no count, no character limit shown', !/\d+\s*(notes?|characters?)\b/i.test(empty.replace(/<[^>]+>/g, ' ')))

    const r = saveUnload({ pairs: [{ mind: '', next: 'Ring the garage ' + SENTINEL }, { mind: 'Work is a lot' }], ok: '' })
    const st = useStore.getState()
    const notes = st.data.deviceOnly?.unload?.notes ?? []
    ok('Done saves offline (signedIn, not authed)', r.ok && r.stored && notes.length === 1, r)
    ok('the toast says "Saved on this device"', st.toast === UNLOAD.saved, st.toast)
    ok('a pair with an empty "On my mind" is kept', JSON.stringify(notes[0]?.pairs) === JSON.stringify([{ mind: '', next: 'Ring the garage ' + SENTINEL }, { mind: 'Work is a lot' }]))
    const c = st.data.days[today]?.checkin
    ok('logSkill: today has an unload use, mood and the rest kept', !!c?.skills?.some((s) => s.id === 'unload') && c.mood === 2 && c.sleep === 1 && c.energy === 1)
    ok('the skill use is the id and the time only', JSON.stringify(c?.skills).includes('"unload"') && Object.keys(c!.skills!.find((s) => s.id === 'unload')!).sort().join() === 'at,id')
    const stored = g.localStorage!.getItem('leanplan.v1') ?? ''
    const parsed = JSON.parse(stored)
    ok('on the device the note sits under deviceOnly only', stored.includes(SENTINEL) && !JSON.stringify({ ...parsed, deviceOnly: undefined }).includes(SENTINEL))
    ok('no request on save', fetches === 0, fetches)

    // Delete (B8.16)
    ok('Delete removes it on this device', deleteUnload(notes[0].id) && !useStore.getState().data.deviceOnly?.unload && !(g.localStorage!.getItem('leanplan.v1') ?? '').includes(SENTINEL))

    // refused while signed out: nothing saved, no toast, no skill
    useStore.setState({ signedIn: false, toast: null })
    const skillsBefore = useStore.getState().data.days[today]?.checkin?.skills?.length
    const refused = saveUnload({ pairs: [{ mind: 'x' }] })
    ok('signed out: refused (not-now), nothing saved or logged', !refused.ok && refused.reason === 'not-now' && !useStore.getState().data.deviceOnly?.unload
      && useStore.getState().toast === null && useStore.getState().data.days[today]?.checkin?.skills?.length === skillsBefore)
  } catch (e) {
    ok('unload suite ran', false, String(e))
  } finally {
    g.localStorage = realStorage
    g.fetch = realFetch
  }
  return bad
}
