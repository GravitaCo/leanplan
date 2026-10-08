/* WP4: the store's wellbeing actions (Mind prefs, skills, the one thing, Mind plans, Unload through
   deviceOnly, the low-mood marker, the reminder back-off, the asks wiring, Same as yesterday).
   Run from scripts/test-wellbeing.ts; returns the number of failures. The store runs in Node here:
   localStorage is a Map for the suite, and nothing reaches the network (authed stays false). */
import { readFileSync } from 'node:fs'
import type { CheckIn, DayLog, LoggedFood } from '@/core/types'
import { useStore, selectAskCtx, selectNotesContext, ignoredInARow } from '@/store/store'
import { freshForAccount, type PersistedState } from '@/data/persistence'
import { addUnloadNote, deleteUnloadNote, unloadNotes, UNLOAD_MAX_NOTES, type NotifyEvent } from '@/data/deviceOnly'
import { sameAsYesterdayRow } from '@/core/domain/insights'
import { dayTotals } from '@/core/domain/nutrition'
import { pickAsks } from '@/core/domain/asks'
import { todayStr, shiftDay } from '@/core/domain/date'
import { LOCAL_USER } from '@/data/supabase'

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

const day = (checkin: CheckIn | null, foods: LoggedFood[] = []): DayLog => ({ foods, supps: {}, weight: null, workout: null, checkin })

export function storeSuite(): number {
  let bad = 0
  const ok = (name: string, pass: boolean, detail?: unknown) => {
    if (!pass) bad++
    console.log(pass ? 'PASS' : 'FAIL', 'wellbeing store:', name, pass || detail === undefined ? '' : JSON.stringify(detail))
  }
  const g = globalThis as { localStorage?: Storage }
  const realStorage = g.localStorage
  g.localStorage = memoryStorage()
  const today = todayStr()
  /** a fresh signed-in device (offline: authed false) owned by the fake account, health yes given */
  const reset = (health: 'yes' | 'none' | 'no' = 'yes') => {
    useStore.setState({ data: freshForAccount(LOCAL_USER), cur: today, signedIn: true, authed: false, ownerAsk: null, tab: 'today', mindOpen: null })
    if (health !== 'none') useStore.getState().grantConsent('health')
    if (health === 'no') useStore.getState().withdrawConsent('health')
  }
  const st = () => useStore.getState()
  const data = () => st().data
  const settingsDirty = () => !!data()._meta?.settings?.dirty
  const clearDirty = () => useStore.setState((s) => { const m = s.data._meta!; m.settings = { u: m.settings?.u ?? '', dirty: false }; m.days = {} })

  try {
    /* ---------- setMindPrefs ---------- */
    reset()
    useStore.setState((s) => { s.data.profile.gentle = true })
    ok('setMindPrefs saves and stamps the touched paths', st().setMindPrefs({ off: ['food'], asks: 'fewer' })
      && data().profile.mind?.asks === 'fewer' && data().profile.mind?.off?.join() === 'food'
      && !!data().profile.answeredAt?.['mind.off'] && !!data().profile.answeredAt?.['mind.asks'] && !data().profile.answeredAt?.['mind.wakeAt'] && settingsDirty())
    ok('it never touches gentle mode', data().profile.gentle === true)
    const before = JSON.stringify(data().profile)
    ok('switching off the last pillar is refused, nothing saved', st().setMindPrefs({ off: ['food', 'mind', 'move'] }) === false && JSON.stringify(data().profile) === before)
    ok('a malformed time is refused, never saved as a removal', st().setMindPrefs({ windDownAt: '22:30' }) && st().setMindPrefs({ windDownAt: '25:99' }) === false && data().profile.mind?.windDownAt === '22:30')
    ok('null removes a key', st().setMindPrefs({ windDownAt: null }) && data().profile.mind?.windDownAt === undefined && !!data().profile.answeredAt?.['mind.windDownAt'])
    ok('an empty off list switches every pillar back on', st().setMindPrefs({ off: [] }) && data().profile.mind?.off === undefined)
    st().setMindPrefs({ notify: { checkin: true } })
    st().setMindPrefs({ notify: { plan: true } })
    ok('notify merges into what is there', data().profile.mind?.notify?.checkin === true && data().profile.mind?.notify?.plan === true)
    ok('turning a reminder on records the device time zone', typeof data().profile.mind?.tz === 'string' && !!data().profile.answeredAt?.['mind.tz'])
    st().setMindPrefs({ notify: { plan: undefined } })
    ok('a kind set to undefined is removed', data().profile.mind?.notify?.plan === undefined && data().profile.mind?.notify?.checkin === true)
    reset('no')
    ok('wake and wind-down times are not kept while health is off', st().setMindPrefs({ wakeAt: '07:00', asks: 'fewer' }) && data().profile.mind?.wakeAt === undefined && data().profile.mind?.asks === 'fewer')

    /* ---------- skills and the one thing ---------- */
    reset()
    st().setCheckin({ mood: 2, hunger: 3, sleep: 1, note: 'tired' })
    ok('logSkill after a check-in keeps mood', st().logSkill('reset') && data().days[today].checkin?.mood === 2 && data().days[today].checkin?.note === 'tired' && data().days[today].checkin?.skills?.[0].id === 'reset')
    st().logSkill('unload')
    ok('a second skill adds to the list', data().days[today].checkin?.skills?.map((x) => x.id).join() === 'reset,unload')
    ok('an unknown skill is refused', st().logSkill('nap' as never) === false)
    ok('the skill marks the day for sync', !!data()._meta?.days[today]?.dirty)
    useStore.setState({ cur: shiftDay(today, -3) })
    st().logSkill('reset')
    ok('a skill is logged on today, whichever day Summary shows', !data().days[shiftDay(today, -3)]?.checkin && data().days[today].checkin?.skills?.length === 3)
    useStore.setState({ cur: today })
    ok('pickThing with an unknown key is refused', st().pickThing('eat-less') === false && !data().days[today].checkin?.thing)
    ok('pickThing then doneThing sets done', st().pickThing('outside-lunch') && st().doneThing() && data().days[today].checkin?.thing?.key === 'outside-lunch' && !!data().days[today].checkin?.thing?.done && data().days[today].checkin?.mood === 2)
    ok('picking again replaces it, without done', st().pickThing('reset-2') && data().days[today].checkin?.thing?.key === 'reset-2' && !data().days[today].checkin?.thing?.done)
    st().clearThing()
    ok('clearThing removes it and keeps the rest', !data().days[today].checkin?.thing && data().days[today].checkin?.mood === 2)
    reset()
    st().pickThing('outside-10')
    st().clearThing()
    ok('a check-in holding only a thing becomes null when it is cleared', data().days[today].checkin === null)
    ok('doneThing with nothing picked does nothing', st().doneThing() === false)
    reset('no')
    ok('skills and things are refused while health is off', st().logSkill('reset') === false && st().pickThing('outside-10') === false && !data().days[today]?.checkin)

    /* ---------- Mind plans ---------- */
    reset()
    ok('savePlan with a kind', st().savePlan({ when: 'If I wake at 3', then: 'I get up for ten minutes', kind: 'mind' }) && data().profile.plans?.[0].kind === 'mind')
    const pid = data().profile.plans![0].id
    st().savePlan({ id: pid, when: 'If I wake at 4', then: 'I get up for ten minutes' })
    ok('editing keeps the kind', data().profile.plans?.[0].kind === 'mind' && data().profile.plans?.[0].when === 'If I wake at 4')
    st().savePlan({ when: 'If it rains', then: 'I walk indoors' })
    ok('a plan without a kind stays untyped', data().profile.plans?.[1].kind === undefined)
    reset('no')
    ok('a Mind plan is refused while health is off; others save', st().savePlan({ when: 'a', then: 'b', kind: 'mind' }) === false && st().savePlan({ when: 'a', then: 'b' }) && data().profile.plans?.length === 1)

    /* ---------- Unload through deviceOnly ---------- */
    reset()
    clearDirty()
    const ctx = selectNotesContext(st())
    ok('notes context: signedIn (not authed), no owner question, health answered yes', ctx.signedIn && !ctx.ownerAsk && ctx.healthAllowed)
    const r1 = st().writeNotes((s, c) => addUnloadNote(s, { pairs: [{ mind: 'SENTINEL-UNLOAD', next: 'list it' }] }, c))
    ok('a note saves offline (authed false) and stays readable after the write', r1.result.ok && r1.stored && (r1.result.ok ? r1.result.note.pairs[0].mind === 'SENTINEL-UNLOAD' : false) && unloadNotes(data(), ctx).length === 1)
    ok('a note write marks nothing for sync', !settingsDirty() && !Object.keys(data()._meta?.days ?? {}).length)
    ok('it is kept on the device', (g.localStorage!.getItem('leanplan.v1') || '').includes('SENTINEL-UNLOAD'))
    const id = r1.result.ok ? r1.result.note.id : ''
    ok('delete through writeNotes', st().writeNotes((s, c) => deleteUnloadNote(s, id, c)).result === true && !unloadNotes(data(), ctx).length)
    useStore.setState((s) => {
      s.data.deviceOnly = { unload: { owner: LOCAL_USER, notes: Array.from({ length: UNLOAD_MAX_NOTES }, (_, i) => ({ id: 'n' + i, at: new Date(Date.parse('2026-10-01T08:00:00Z') + i * 60000).toISOString(), pairs: [{ mind: 'x' }] })) } }
    })
    const full = st().writeNotes((s, c) => addUnloadNote(s, { pairs: [{ mind: 'one more' }] }, c))
    ok('saveUnload past the cap refuses, never prunes', !full.result.ok && full.result.reason === 'full' && unloadNotes(data(), ctx).length === UNLOAD_MAX_NOTES)
    useStore.setState({ ownerAsk: { uid: 'someone', email: null } })
    ok('no notes while an owner question is pending', !st().writeNotes((s, c) => addUnloadNote(s, { pairs: [{ mind: 'a' }] }, c)).result.ok)
    useStore.setState({ ownerAsk: null, signedIn: false })
    ok('none while signed out', !st().writeNotes((s, c) => addUnloadNote(s, { pairs: [{ mind: 'a' }] }, c)).result.ok)
    reset('none')
    ok('none before health consent is answered', !selectNotesContext(st()).healthAllowed && !st().writeNotes((s, c) => addUnloadNote(s, { pairs: [{ mind: 'a' }] }, c)).result.ok)

    /* ---------- low-mood marker and the sleep disclosure: device only ---------- */
    reset()
    clearDirty()
    ok('markLowMoodShown stores today, device only', st().markLowMoodShown() && data().deviceOnly?.lowMoodShown === today && !settingsDirty())
    ok('setSleepMore stores the open state, device only', st().setSleepMore(true) && data().deviceOnly?.ui?.sleepMore === true && st().setSleepMore(false) && !data().deviceOnly?.ui && !settingsDirty())
    const src = data()
    st().markLowMoodShown()
    st().setSleepMore(true)
    ok('device-only writes replace the data reference (a sync in flight drops its copy)', data() !== src)

    /* ---------- reminder back-off ---------- */
    const ev = (kind: string, at: string, e: NotifyEvent['ev']): NotifyEvent => ({ kind, at: `2026-10-0${at}T08:30:00.000Z`, ev: e })
    ok('ignoredInARow: shown, shown, shown is two ignored', ignoredInARow([ev('checkin', '1', 'shown'), ev('checkin', '2', 'shown'), ev('checkin', '3', 'shown')], 'checkin') === 2)
    ok('an open resets the run', ignoredInARow([ev('checkin', '1', 'shown'), ev('checkin', '2', 'shown'), ev('checkin', '2', 'opened'), ev('checkin', '3', 'shown')], 'checkin') === 0)
    ok('a swipe away counts as ignored', ignoredInARow([ev('plan', '1', 'shown'), ev('plan', '1', 'closed'), ev('plan', '2', 'shown'), ev('plan', '2', 'closed')], 'plan') === 2)
    reset()
    st().setMindPrefs({ notify: { checkin: true } })
    clearDirty()
    ok('one ignored reminder does not back off', !st().ingestNotifyLog([ev('checkin', '1', 'shown'), ev('checkin', '2', 'shown')]).length && !data().profile.mind?.halved)
    const halved = st().ingestNotifyLog([ev('checkin', '3', 'shown'), ev('supplements', '1', 'shown'), ev('supplements', '2', 'shown'), ev('supplements', '3', 'shown')])
    ok('two ignored in a row halves the kind, stamped and synced', halved.join() === 'checkin' && !!data().profile.mind?.halved?.checkin && !!data().profile.answeredAt?.['mind.halved'] && settingsDirty())
    ok('supplements never halve', !('supplements' in (data().profile.mind?.halved ?? {})))
    st().backToUsual('checkin')
    ok('Back to usual clears it and restarts the run', !data().profile.mind?.halved && !data().deviceOnly?.notify?.some((e) => e.kind === 'checkin') && !st().ingestNotifyLog([ev('checkin', '4', 'shown')]).length)

    /* ---------- asks wiring ---------- */
    reset()
    const yesterday = shiftDay(today, -1)
    useStore.setState((s) => {
      s.data.days[yesterday] = day({ mood: 4, hunger: 3, sleep: 4, stress: 4, energy: 4 })
      s.data.days[today] = day({ mood: 2, hunger: 2, sleep: 1, stress: 2, energy: 1 })
      s.data.profile.mind = { asks: 'fewer' }
    })
    const ask = selectAskCtx(st(), today)
    ok('selectAskCtx: a hard day, a Low mood, Fewer prompts, no signpost with the sub-flag off', ask.hard === true && ask.lowMood === true && ask.asks === 'fewer' && ask.signpostToday === false && ask.daysUsing === 1)
    const pick = pickAsks(['activity'], ask)
    useStore.setState((s) => { delete s.data.profile.activityShown })
    ok('noteActivityShown never marks a held suggestion', st().noteActivityShown(pick) === false && data().profile.activityShown === undefined)
    ok('and marks one that showed (or with no budget, flag off)', st().noteActivityShown(null) === true && data().profile.activityShown === st().cur)

    /* ---------- Same as yesterday: the tap adds exactly the row's kcal (nutrition R2) ---------- */
    reset()
    const porridge: LoggedFood = { n: 'Porridge, made with milk', grams: 250, k: 200, p: 0, c: 0, f: 0, meal: 'breakfast', src: 'db', how: 'usual' }
    const banana: LoggedFood = { n: 'Banana (1 ~118g)', grams: 118, k: 90, p: 0, c: 0, f: 0, meal: 'breakfast', src: 'db', how: 'usual' }
    useStore.setState((s) => { s.data.days[yesterday] = day(null, [porridge, banana]); s.data.days[today] = day(null, []) })
    const row = sameAsYesterdayRow(data(), today, 'breakfast')
    const k0 = dayTotals(data().days[today]).k
    st().repeatYesterday('breakfast')
    const k1 = dayTotals(data().days[today]).k
    ok('repeatYesterday adds exactly the Summary row kcal (306), not yesterday\'s stored 290', !!row && Math.abs(k1 - k0 - row.kcal) < 1e-9 && Math.round(k1 - k0) === 306, { k0, k1, row: row?.kcal })

    /* ---------- navigation, Support, wipe paths ---------- */
    st().openMind('reset')
    ok('openMind switches to the Mind tab with a view; clearOpen clears it', st().tab === 'mind' && st().mindOpen === 'reset' && (st().clearOpen(), st().mindOpen === null))
    const names = Object.keys(st()).filter((k) => typeof (st() as unknown as Record<string, unknown>)[k] === 'function')
    ok('opening Support has no store action at all', !names.some((n) => /support/i.test(n)), names.filter((n) => /support/i.test(n)))
    const code = readFileSync('src/store/store.ts', 'utf8')
    const block = (start: string, end: string) => { const i = code.indexOf(start); return i < 0 ? '' : code.slice(i, code.indexOf(end, i)) }
    const signOut = block('signOut: async (opts) => {', 'set((st) => { st.signedIn = false; st.authed = false; st.syncPaused = false; st.email = null; st.authNotice = null; st.ownerAsk = null })')
    ok('sign out and remove deletes the reminder log', /if \(opts\?\.remove\) \{[\s\S]*clearNotifyStore\(\)/.test(signOut))
    const resolve = block('resolveOwner: async (choice) => {', 'saveState(next)')
    ok('keep and start fresh both delete the reminder log', /choice === 'cancel'[\s\S]*\n\s*clearNotifyStore\(\)/.test(resolve) && !/if \(choice === '(keep|fresh)'\) clearNotifyStore/.test(resolve))
    ok('notes never go through authed in the store', /signedIn: st\.signedIn, ownerAsk: !!st\.ownerAsk, healthAllowed: healthLoggingAllowed\(st\.data\) && healthConsentAnswered\(st\.data\)/.test(code))
  } catch (e) {
    bad++
    console.log('FAIL', 'wellbeing store: threw', e)
  } finally {
    useStore.setState({ data: freshForAccount(LOCAL_USER) as PersistedState, signedIn: false, authed: false, ownerAsk: null })
    g.localStorage = realStorage
  }
  return bad
}
