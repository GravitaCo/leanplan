/* B12 Wind down, B13 Get outside and B11b "Show supplement names in reminders" (boards approved by
   Benn, 10 Oct 2026). Run from scripts/test-wellbeing.ts; returns the number of failures. Covers the
   routine's validation and health-data handling, the names setting in the data model, the payload
   rule (a name only with lockNames === true), the service worker, the copy and the screens. */
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import type { Profile } from '@/core/types'
import { validMindPrefs, validRoutine, MAX_ROUTINE_ITEMS, MIND_HEALTH_KEYS } from '@/core/domain/checkin'
import { MERGED_FIELDS } from '@/core/domain/profileMerge'
import { DEFAULT_ROUTINE, WIND_DOWN_ITEMS, routineChoices, routineItems, routineSub, routineToSave, skillsWithScreen } from '@/core/data/skills'
import { mindCopyIssues } from '@/core/domain/engine/why'
import { HEALTH_FIELDS, clearHealthData, healthDataSummary, withoutHealth } from '@/data/consent'
import { ensureMeta, freshForAccount, stateFromBackup } from '@/data/persistence'
import { LOCAL_USER } from '@/data/supabase'
import { useStore } from '@/store/store'
import { todayStr } from '@/core/domain/date'
import { OUTSIDE, WIND_DOWN, mindPageCopy } from '@/screens/mind/copy'
import { RoutineSheet, WindDownView } from '@/screens/mind/WindDownScreen'
import { OutsideScreen } from '@/screens/mind/OutsideScreen'
import { MindPageView } from '@/screens/mind/MindPage'
import { NOTIFY_COPY, notifyStrings } from '@/screens/profile/notifyCopy'
import { REMINDER_COPY, SUPP_NAMED, SUPP_NAME_MAX, suppPayload } from '../../supabase/functions/_shared/reminders'

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

const T = '2026-10-10T09:00:00.000Z'

export function windDownSuite(): number {
  let bad = 0
  const ok = (name: string, pass: boolean, detail?: unknown) => {
    if (!pass) bad++
    console.log(pass ? 'PASS' : 'FAIL', 'wellbeing B12/B13/B11b:', name, pass || detail === undefined ? '' : JSON.stringify(detail))
  }

  /* ---------- the routine: validation by shape (validRoutine, validMindPrefs) ---------- */
  ok('validRoutine keeps key-shaped strings in order, drops text, numbers and repeats',
    JSON.stringify(validRoutine(['reset', 'Dim the lights', 3, 'reset', null, 'dim-lights', { k: 1 }, 'a'.repeat(41)])) === '["reset","dim-lights"]')
  ok('validRoutine keeps a key this version doesn\'t know (a later version\'s step)', JSON.stringify(validRoutine(['dim-lights', 'warm-bath'])) === '["dim-lights","warm-bath"]')
  ok('validRoutine: an empty list is kept (nothing picked), anything not a list is dropped',
    JSON.stringify(validRoutine([])) === '[]' && validRoutine('reset') === undefined && validRoutine({ 0: 'reset' }) === undefined && validRoutine(null) === undefined)
  ok('validRoutine caps the list', validRoutine(Array.from({ length: 40 }, (_, i) => 'step-' + i))!.length === MAX_ROUTINE_ITEMS)
  ok('validMindPrefs keeps a routine and an empty one', JSON.stringify(validMindPrefs({ routine: ['reset', 'BAD KEY'] })) === '{"routine":["reset"]}'
    && JSON.stringify(validMindPrefs({ routine: [] })) === '{"routine":[]}')
  ok('validMindPrefs drops a routine that isn\'t a list', validMindPrefs({ routine: 'dim-lights; drop table' }) === undefined)
  ok('validMindPrefs: lockNames kept only as a boolean', validMindPrefs({ lockNames: true })?.lockNames === true && validMindPrefs({ lockNames: false })?.lockNames === false
    && validMindPrefs({ lockNames: 'yes' }) === undefined && validMindPrefs({ lockNames: 1 }) === undefined)
  ok('validMindPrefs still keeps a setting this version doesn\'t know', (validMindPrefs({ later: { a: 1 } }) as Record<string, unknown> | undefined)?.later !== undefined)

  /* ---------- the fixed list, the default and the save ---------- */
  ok('the fixed list: Dim the lights, Caffeine earlier, Unload, Reset, Floor stretches; keys are key-shaped and unique',
    WIND_DOWN_ITEMS.map((i) => i.key).join() === 'dim-lights,caffeine-earlier,unload,reset,floor-stretches'
    && WIND_DOWN_ITEMS.every((i) => validRoutine([i.key])?.length === 1) && new Set(WIND_DOWN_ITEMS.map((i) => i.key)).size === WIND_DOWN_ITEMS.length)
  ok('the default is the B12 sheet: every step on but Floor stretches', DEFAULT_ROUTINE.join() === 'dim-lights,caffeine-earlier,unload,reset')
  ok('Floor stretches isn\'t offered until its template and length exist (the board\'s [min])', !routineChoices().some((i) => i.key === 'floor-stretches')
    && !routineItems(['floor-stretches', 'reset']).some((i) => i.key === 'floor-stretches'))
  ok('no routine saved shows the default; an empty one shows nothing', routineItems(undefined).map((i) => i.key).join() === DEFAULT_ROUTINE.join() && routineItems([]).length === 0)
  ok('the screen lists steps in list order and skips unknown keys', routineItems(['reset', 'warm-bath', 'dim-lights']).map((i) => i.key).join() === 'dim-lights,reset')
  ok('a save keeps unknown keys and a stored step the sheet doesn\'t offer',
    JSON.stringify(routineToSave(['reset', 'dim-lights'], ['warm-bath', 'floor-stretches', 'unload'])) === '["dim-lights","reset","floor-stretches","warm-bath"]')
  ok('a save from the default adds nothing it wasn\'t given', JSON.stringify(routineToSave(['unload'], undefined)) === '["unload"]')
  ok('Unload and Reset rows borrow the skills\' own subs', routineSub(WIND_DOWN_ITEMS[2]) === "Write what's on your mind, and one next step for each"
    && routineSub(WIND_DOWN_ITEMS[3]) === 'A few slow breaths, with long breaths out · 1 to 5 min')

  /* ---------- health data: the routine is cleared like windDownAt; lockNames is a preference ---------- */
  ok('MIND_HEALTH_KEYS and HEALTH_FIELDS include the routine, not lockNames', (MIND_HEALTH_KEYS as readonly string[]).includes('routine') && !(MIND_HEALTH_KEYS as readonly string[]).includes('lockNames')
    && (HEALTH_FIELDS as readonly string[]).includes('profile.mind.routine') && !(HEALTH_FIELDS as readonly string[]).some((f) => f.includes('lockNames')))
  ok('MERGED_FIELDS merges both', (MERGED_FIELDS as readonly string[]).includes('mind.routine') && (MERGED_FIELDS as readonly string[]).includes('mind.lockNames'))
  const s = stateFromBackup({ days: {} } as never)
  s.profile.mind = { windDownAt: '22:30', routine: ['dim-lights', 'reset'], lockNames: true, asks: 'fewer' }
  const sum = healthDataSummary(s)
  ok('healthDataSummary counts the routine apart from the times', sum.mindRoutine === 1 && sum.mindTimes === 1, sum)
  const meta = ensureMeta(s, false)
  meta.settings.dirty = false
  const changed = clearHealthData(s, meta)
  const m = s.profile.mind!
  ok('clearHealthData clears the routine with the wind-down time, keeps lockNames and asks, marks the settings to sync',
    changed && m.routine === undefined && m.windDownAt === undefined && m.lockNames === true && m.asks === 'fewer' && meta.settings.dirty)
  const st0 = s.profile.answeredAt || {}
  ok('the cleared routine is stamped so an older copy can\'t bring it back; lockNames is not', !!st0['mind.routine'] && !st0['mind.lockNames'])
  ok('nothing left to count after', healthDataSummary(s).mindRoutine === 0)
  const empty = stateFromBackup({ days: {} } as never)
  empty.profile.mind = { routine: [] }
  ok('an empty routine counts too, and is cleared', healthDataSummary(empty).mindRoutine === 1 && clearHealthData(empty, ensureMeta(empty, false)) && empty.profile.mind?.routine === undefined)
  const patch = withoutHealth({ mind: { routine: ['reset'], lockNames: true, tz: 'Europe/London' } } as Partial<Profile>)
  ok('withoutHealth strips the routine and keeps lockNames', JSON.stringify(patch.mind) === '{"lockNames":true,"tz":"Europe/London"}', patch.mind)

  /* ---------- the store: setMindPrefs ---------- */
  const g = globalThis as { localStorage?: Storage }
  const realStorage = g.localStorage
  g.localStorage = memoryStorage()
  const today = todayStr()
  const reset = (health: 'yes' | 'withdrawn') => {
    useStore.setState({ data: freshForAccount(LOCAL_USER), cur: today, signedIn: true, authed: false, ownerAsk: null, tab: 'mind', mindOpen: null })
    useStore.getState().grantConsent('health')
    if (health === 'withdrawn') useStore.getState().withdrawConsent('health')
  }
  const store = () => useStore.getState()
  try {
    reset('yes')
    ok('setMindPrefs saves a routine (keys) and stamps mind.routine', store().setMindPrefs({ routine: ['reset', 'dim-lights'] })
      && store().data.profile.mind?.routine?.join() === 'reset,dim-lights' && !!store().data.profile.answeredAt?.['mind.routine'])
    ok('setMindPrefs refuses a routine with text in it, whole', store().setMindPrefs({ routine: ['reset', 'Dim the lights'] }) === false && store().data.profile.mind?.routine?.join() === 'reset,dim-lights')
    ok('an empty routine (nothing picked) saves', store().setMindPrefs({ routine: [] }) && JSON.stringify(store().data.profile.mind?.routine) === '[]')
    reset('withdrawn')
    ok('without a health yes the routine isn\'t kept', store().setMindPrefs({ routine: ['reset'] }) === false && store().data.profile.mind?.routine === undefined)
    ok('lockNames saves without a health yes (a preference)', store().setMindPrefs({ lockNames: true }) && store().data.profile.mind?.lockNames === true && !!store().data.profile.answeredAt?.['mind.lockNames'])
    ok('lockNames: a non-boolean is refused', store().setMindPrefs({ lockNames: 'yes' as unknown as boolean }) === false && store().data.profile.mind?.lockNames === true)
    {
      // L2: turning names off syncs straight away (not after the debounce); turning them on does not
      const real = store().runSync
      let runs = 0
      useStore.setState({ runSync: async () => { runs++ } })
      store().setMindPrefs({ lockNames: true })
      const onRuns = runs
      const offSaved = store().setMindPrefs({ lockNames: false })
      ok('L2: turning names off saves locally and runs the settings sync at once; turning on waits for the debounce',
        offSaved && store().data.profile.mind?.lockNames === false && onRuns === 0 && runs === 1)
      useStore.setState({ runSync: real })
      store().setMindPrefs({ lockNames: true })
    }
    reset('yes')
    store().setMindPrefs({ routine: ['unload'], lockNames: true })
    store().withdrawConsent('health')
    ok('withdrawing health consent clears the routine and keeps lockNames', store().data.profile.mind?.routine === undefined && store().data.profile.mind?.lockNames === true)
  } catch (e) {
    ok('store part ran', false, String(e))
  }

  /* ---------- the payload rule (supabase/functions/_shared/reminders.ts) ---------- */
  const supps = [{ name: 'Vitamin D', time: '08:00' }, { name: '  Magnesium\n glycinate ', time: '08:00' }, { name: 'Iron', time: '20:00' }, { name: 'Vitamin D', time: '08:00' }]
  const generic = JSON.stringify({ ...REMINDER_COPY.supp, icon: '/icon-192.png' })
  // the setting's own answered stamp, as stampFields writes it (security-data L1)
  const ST = { 'mind.lockNames': '2026-10-01T08:00:00.000Z' }
  const noName = (p: unknown) => !/Vitamin|Magnesium|Iron/.test(JSON.stringify(p))
  ok('no setting, setting off, or anything but true: the generic payload, with no name anywhere in it',
    [suppPayload(), suppPayload(undefined, supps, '08:00'), suppPayload({}, supps, '08:00'), suppPayload({ lockNames: false }, supps, '08:00'),
      suppPayload({ lockNames: 'true' }, supps, '08:00'), suppPayload({ lockNames: 1 }, supps, '08:00'), suppPayload(null, supps, '08:00')]
      .every((p) => JSON.stringify(p) === generic && noName(p)))
  // with the setting off the supplements aren't even read
  const trap = [new Proxy({}, { get: () => { throw new Error('read') } })]
  let read = false
  try { suppPayload({ lockNames: false }, trap, '08:00') } catch { read = true }
  ok('with the setting off the supplements are never read', !read)
  const on = suppPayload({ lockNames: true }, supps, '08:00', ST)
  ok('L1: lockNames true with no stamp (a pre-B11b app re-uploaded the profile) or a bad stamp: generic',
    [suppPayload({ lockNames: true }, supps, '08:00'), suppPayload({ lockNames: true }, supps, '08:00', {}), suppPayload({ lockNames: true }, supps, '08:00', null),
      suppPayload({ lockNames: true }, supps, '08:00', { 'mind.routine': ST['mind.lockNames'] }), suppPayload({ lockNames: true }, supps, '08:00', { 'mind.lockNames': 1 })]
      .every((p) => JSON.stringify(p) === generic && noName(p)))
  ok('setting on: "Supplement reminder" with the names due at that time, once each, tag tali-supp-named',
    on.title === 'Supplement reminder' && on.body === 'Vitamin D, Magnesium glycinate' && on.tag === SUPP_NAMED.tag && on.tag === 'tali-supp-named', on)
  ok('setting on: a supplement due at another time is never named', !on.body.includes('Iron'))
  ok('setting on: long names are cut; no usable name falls back to the generic text',
    suppPayload({ lockNames: true }, [{ name: 'x'.repeat(200), time: '08:00' }], '08:00', ST).body.length === SUPP_NAME_MAX
    && JSON.stringify(suppPayload({ lockNames: true }, [{ name: '   ', time: '08:00' }, { time: '08:00' }], '08:00', ST)) === generic
    && JSON.stringify(suppPayload({ lockNames: true }, supps, 'later', ST)) === generic)
  const fn = readFileSync('supabase/functions/send-supplement-reminders/index.next.ts', 'utf8')
  const live = readFileSync('supabase/functions/send-supplement-reminders/index.ts', 'utf8')
  ok('the function passes the person\'s Mind settings to suppPayload and never reads a name itself',
    /const payload = suppPayload\(profile\?\.mind, profile\?\.supplements, local\.time, profile\?\.answeredAt\);/.test(fn) && /send\(sub, payload\)/.test(fn) && !/\.name\b/.test(fn))
  ok('the deployed index.ts is untouched by B11b (still generic, no names setting)', !/lockNames|tali-supp-named/.test(live))

  /* ---------- the service worker: a name only for the named tag ---------- */
  const shown: { title: string; body: string; tag: string }[] = []
  const handlers: Record<string, (e: unknown) => void> = {}
  const self = {
    addEventListener: (t: string, f: (e: unknown) => void) => { handlers[t] = f },
    registration: { showNotification: (title: string, o: { body: string; tag: string }) => { shown.push({ title, body: o.body, tag: o.tag }); return Promise.resolve() } },
    location: { href: 'https://app.tali.fit/sw.js', origin: 'https://app.tali.fit' },
    clients: { claim: () => Promise.resolve() },
  }
  try {
    runInNewContext(readFileSync('public/sw.js', 'utf8'), { self, indexedDB: undefined, URL, Promise, console })
    const push = (payload: unknown) => handlers.push({ data: { json: () => payload }, waitUntil: () => {} })
    push(suppPayload({ lockNames: true }, supps, '08:00', ST))
    push(suppPayload({ lockNames: false }, supps, '08:00'))
    push({ title: 'Vitamin D', body: 'Vitamin D', tag: 'supp-123' })
    push({ title: 'x', body: 'Vitamin D', tag: 'tali-supp' })
    push({ title: 'x', body: '   ', tag: 'tali-supp-named' })
    ok('sw.js: the named payload shows "Supplement reminder" and the names, under tali-supp', shown[0]?.title === 'Supplement reminder' && shown[0].body === 'Vitamin D, Magnesium glycinate' && shown[0].tag === 'tali-supp', shown[0])
    ok('sw.js: every other supplement push shows only "Time for your supplements"', shown.slice(1).every((n) => n.title === 'Time for your supplements' && n.body === 'Time for your supplements' && n.tag === 'tali-supp'), shown.slice(1))
  } catch (e) {
    ok('sw.js ran in a sandbox', false, String(e))
  }

  /* ---------- copy (new-copy-b11b-b13.md, FINAL) ---------- */
  ok('B11b toggle and foot verbatim', NOTIFY_COPY.names === 'Show supplement names in reminders'
    && NOTIFY_COPY.namesFoot === 'With this off, reminders just say “Time for your supplements”. With it on, they name the supplement, and anyone who can see your screen may read it, even when it\'s locked.')
  ok('B12 lines verbatim (FINAL)', WIND_DOWN.gp === "If sleep has been hard going for a while, or it's making everyday life hard, it's worth talking to a GP."
    && WIND_DOWN.timeLine('22:30') === 'Your wind-down time is 22:30. You can change it in Profile, under Notifications.' && WIND_DOWN.setTime === 'Set a wind-down time'
    && WIND_DOWN.anyOrder === 'Do as much or as little as you like, in any order.' && WIND_DOWN.sheetLead === "Pick what you'd like in your evening. Change it any time."
    && WIND_DOWN_ITEMS[1].sub === 'An afternoon cut-off for coffee, tea, cola and energy drinks' && WIND_DOWN_ITEMS[0].sub === 'Softer light for the rest of the evening')
  ok('B13 lines verbatim (FINAL)', OUTSIDE.lead === 'Some time outdoors, in whatever way suits you: an easy walk, somewhere green to sit, or a few minutes in daylight.'
    && OUTSIDE.walkHeading === "If you'd like a walk" && OUTSIDE.walkFoot === "Walk at a relaxed pace, one where you could chat in full sentences. Stop whenever you've had enough.")
  const all = [...mindPageCopy(), ...notifyStrings(), ...WIND_DOWN_ITEMS.flatMap((i) => [i.name, routineSub(i)]), SUPP_NAMED.title]
  const issues = all.map((x) => [x, mindCopyIssues(x)] as const).filter(([, i]) => i.length)
  ok('every new string passes mindCopyIssues', !issues.length, issues)
  ok('no em dashes', all.every((x) => !x.includes('—')))
  ok('no mood or sleep word in the supplement reminder', !/mood|sleep|tired|stress/i.test(SUPP_NAMED.title + REMINDER_COPY.supp.body))

  /* ---------- the screens ---------- */
  try {
    reset('yes')
    const noop = () => {}
    // renderToString escapes apostrophes: compare against the escaped form
    const esc = (x: string) => x.replace(/'/g, '&#x27;')
    let html = renderToString(createElement(WindDownView, { windDownAt: '22:30', routine: undefined, onBack: noop, onSkill: noop }))
    const at = (x: string) => html.indexOf(esc(x))
    ok('Wind down: Back "Mind", the title, the sub, "Your routine" and "From 22:30"', at('>Mind<') > 0 && at('>Wind down<') > at('>Mind<') && at('Your own routine for the evening') > 0 && at('>Your routine<') > 0 && at('>From 22:30<') > at('>Your routine<'))
    ok('Wind down: the default steps in order, then Change your routine', at('>Dim the lights<') < at('>Caffeine earlier in the day<') && at('>Caffeine earlier in the day<') < at('>Unload<') && at('>Unload<') < at('>Reset<') && at('>Reset<') < at('>Change your routine<') && !html.includes('Floor stretches'))
    ok('Wind down: the foot lines, support and the wellness line, mind tokens only', at(WIND_DOWN.anyOrder) > at('>Change your routine<') && at('worth talking to a GP') > at(WIND_DOWN.anyOrder) && at('Need support now?') > at('worth talking to a GP') && at('Not a treatment for any condition.') > at('Need support now?')
      && html.includes('var(--mind-fill)') && !html.includes('--move'))

    html = renderToString(createElement(WindDownView, { windDownAt: undefined, routine: ['reset'], onBack: noop, onSkill: noop }))
    ok('Wind down with no time: no "From", and only the picked steps', !html.includes('From ') && html.includes('>Reset<') && !html.includes('Dim the lights'))
    const sheetOn = renderToString(createElement(RoutineSheet, { time: '22:30', stored: undefined, onClose: noop }))
    const sheetOff = renderToString(createElement(RoutineSheet, { time: undefined, stored: ['reset'], onClose: noop }))
    ok('the sheet: Cancel, Your routine, Done, the lead, a switch per step, the time line', /Cancel/.test(sheetOn) && sheetOn.includes('>Done<')
      && (sheetOn.match(/role="switch"/g) || []).length === 4 && sheetOn.includes(esc(WIND_DOWN.sheetLead)) && sheetOn.includes(WIND_DOWN.timeLine('22:30')) && !sheetOn.includes(WIND_DOWN.setTime))
    ok('the sheet with no time: "Set a wind-down time", never a default', sheetOff.includes(WIND_DOWN.setTime) && !sheetOff.includes('22:30'))
    ok('the sheet shows the default picks, or the stored ones', (sheetOn.match(/aria-checked="true"/g) || []).length === 4 && (sheetOff.match(/aria-checked="true"/g) || []).length === 1)
    const out = renderToString(createElement(OutsideScreen, { onBack: noop }))
    const o = (x: string) => out.indexOf(esc(x))
    ok('Get outside: Back "Mind", title, sub, lead card, the walk row with Start, the foot, support, wellness', o('>Mind<') > 0 && o('>Get outside<') > o('>Mind<') && o('Daylight, and a walk if you like') > 0
      && o(OUTSIDE.lead) > 0 && o(OUTSIDE.walkHeading) > o(OUTSIDE.lead) && o('>Easy walk<') > o(OUTSIDE.walkHeading) && o('>10–20 min<') > 0 && o('>Start<') > o('>Easy walk<')
      && o(OUTSIDE.walkFoot) > o('>Start<') && o('Need support now?') > o(OUTSIDE.walkFoot) && o('Not a treatment for any condition.') > 0)
    ok('Get outside: move tokens, no mind or tint fills', out.includes('var(--move-fill)') && out.includes('var(--move-ink)') && !out.includes('--mind'))
    const page = renderToString(createElement(MindPageView, { today: '2026-10-08', checkin: null, skillsOn: true, onCheckin: noop, onSupport: noop, onSkill: noop, onPlans: noop }))
    const p = (x: string) => page.indexOf(x)
    ok('the Mind page lists Reset, Wind down, Unload, Get outside (MIND_REVIEWED)', skillsWithScreen().map((x) => x.id).join() === 'reset,wind-down,unload,outside'
      && p('>Reset<') < p('>Wind down<') && p('>Wind down<') < p('>Unload<') && p('>Unload<') < p('>Get outside<'))
  } catch (e) {
    ok('screens rendered', false, String(e))
  } finally {
    g.localStorage = realStorage
  }

  /* ---------- wiring: flags, Profile, the Mind page ---------- */
  const prof = readFileSync('src/screens/ProfileScreen.tsx', 'utf8')
  ok('Profile mounts the names row and its foot only with SUPP_NAMES_ENABLED (DPIA 8.8), under Supplement reminders',
    /SUPP_NAMES_ENABLED && pr\.notificationsEnabled && <SuppNamesRow \/>/.test(prof) && /SUPP_NAMES_ENABLED && pr\.notificationsEnabled && <SuppNamesFoot \/>/.test(prof)
    && prof.indexOf('<SuppNamesRow />') > prof.indexOf('label="Supplement reminders"') && prof.indexOf('<SuppNamesRow />') < prof.indexOf('label="Weekly review reminder"'))
  const mp = readFileSync('src/screens/mind/MindPage.tsx', 'utf8')
  ok('the skill screens open only from the Skills list (MIND_REVIEWED) or a reviewed one-thing hand-off', /skillsOn=\{MIND_REVIEWED\}/.test(mp) && /if \(MIND_REVIEWED\) setViews\(\[mindOpen\]\)/.test(mp))
  return bad
}
