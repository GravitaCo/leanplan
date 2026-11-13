/**
 * Reminders on the phone through the shared store (native-build-plan N12; the store-level part of
 * e2e-under-age's reminder cases and e2e-wellbeing's wp17-notify-on, which need N10's screens for
 * the rest). The store runs unchanged, with src/data/push.native.ts as Metro picks it, and the
 * phone's modules (expo-notifications, expo-application, MMKV, React Native) faked here.
 *   (apps/native) npm run test:reminders
 * Bundled by esbuild with *.native.ts first, as Metro resolves them.
 */
import './fakes/setup'
import { fake } from './fakes/state'
import { useStore } from '@/store/store'
import { freshForAccount } from '@/data/persistence'
import { setSession } from '@/data/supabase'
import { todayStr } from '@/core/domain/date'
import { checkPushToken, unsubscribePush } from '../lib/platform/push'
import { toFront } from './fakes/react-native'

let failed = 0
let passed = 0
const check = (name: string, ok: boolean, detail?: unknown) => {
  if (ok) passed++
  else { failed++; console.error('FAIL', name, detail === undefined ? '' : JSON.stringify(detail)) }
}
const until = async (cond: () => boolean, ms = 3000) => {
  const t = Date.now()
  while (!cond() && Date.now() - t < ms) await new Promise((r) => setTimeout(r, 5))
  return cond()
}

const UID = '11111111-2222-3333-4444-555555555555'
const TOKEN = 'ab'.repeat(32)
const st = () => useStore.getState()
const pushWrites = () => fake.requests.filter((r) => r.path.startsWith('/push_subscriptions') && r.method !== 'GET')

/** The permission changes in Settings and the app comes back to the front, so the push adapter's
 *  copy is read again (pushPermission is synchronous, as the browser's). */
async function setPerm(p: typeof fake.perm) {
  fake.perm = p
  toFront()
  await new Promise((r) => setTimeout(r, 10))
}

function reset(o: { reminders?: boolean; age?: number } = {}) {
  fake.reset()
  setSession('jwt', UID)
  const data = freshForAccount(UID)
  data.profile.age = o.age ?? 34
  data.profile.notificationsEnabled = !!o.reminders
  useStore.setState({ data, cur: todayStr(), signedIn: true, authed: true, ownerAsk: null, underAge: null, tab: 'today' })
  st().grantConsent('health')
}

async function main() {
  check('no browser Notification global: the store asks through the push adapter', typeof (globalThis as Record<string, unknown>).Notification === 'undefined')

  /* ---------- wp17-notify-on: turning a reminder on asks in the tap, then registers this phone ---------- */
  reset()
  await setPerm('undetermined')
  const r = await st().setMindReminder('checkin', true)
  check('turning one on asks the system once and saves the setting', r === true && fake.asked === 1 && st().data.profile.mind?.notify?.checkin === true)
  check('this phone is registered: one row, the token, platform apns, no Web Push keys',
    await until(() => pushWrites().length === 1) && (() => {
      const w = pushWrites()[0]
      const b = JSON.parse(w.body)
      return w.method === 'POST' && w.path === '/push_subscriptions?on_conflict=user_id,endpoint' && b.user_id === UID && b.endpoint === TOKEN && b.platform === 'apns' && b.p256dh === null && b.auth_key === null
    })(), pushWrites())
  check('nothing left pending once registered', await until(() => !st().data._meta?.pushPending))

  reset()
  await setPerm('denied')
  check('permission refused in Settings: "denied", nothing saved, nothing registered',
    (await st().setMindReminder('checkin', true)) === 'denied' && !st().data.profile.mind?.notify?.checkin && pushWrites().length === 0)

  reset()
  await setPerm('granted')
  fake.env = 'development'
  await st().setMindReminder('plan', true)
  check('a development build registers for the sandbox gateway', await until(() => pushWrites().length === 1) && JSON.parse(pushWrites()[0].body).platform === 'apns-sandbox')
  fake.env = 'production'

  /* ---------- e2e-under-age: the stop ends this phone's registration; "typed wrong" brings it back ---------- */
  reset({ reminders: true })
  await setPerm('granted')
  await st().setMindReminder('checkin', true)
  await until(() => pushWrites().length === 1)
  fake.requests.length = 0
  st().raiseUnderAge('profile')
  check('the stop: this phone unregistered and its row deleted (this token, this account)',
    await until(() => fake.unregistered === 1 && pushWrites().some((w) => w.method === 'DELETE'))
    && pushWrites()[0].path === `/push_subscriptions?endpoint=eq.${TOKEN}&user_id=eq.${UID}`, pushWrites())
  check('held on this phone; the setting and the profile unchanged',
    st().data._meta?.pushHeld === true && st().data.profile.notificationsEnabled === true && st().data.profile.age === 34)
  fake.requests.length = 0
  st().underAgeMistake()
  check('"I typed my age wrong": registered again without asking, as it was',
    await until(() => pushWrites().some((w) => w.method === 'POST')) && fake.asked === 0 && !st().data._meta?.pushHeld && st().data.profile.notificationsEnabled === true)

  /* ---------- a restore that can't happen turns reminders off (and only then) ---------- */
  reset({ reminders: true })
  await setPerm('granted')
  await st().setMindReminder('checkin', true)
  await until(() => pushWrites().length === 1)
  st().raiseUnderAge('profile')
  await until(() => st().data._meta?.pushHeld === true && fake.unregistered === 1)
  await setPerm('denied') // turned off in Settings while the stop showed
  st().underAgeMistake()
  check('permission gone meanwhile: supplement reminders switch off so Profile says what\'s true',
    await until(() => st().data.profile.notificationsEnabled === false) && !st().data._meta?.pushHeld && fake.asked === 0)

  /* ---------- N3's audit: a restore with permission never switches reminders off ---------- */
  reset({ reminders: true })
  await setPerm('granted')
  await st().setMindReminder('checkin', true)
  await until(() => pushWrites().length === 1)
  st().raiseUnderAge('profile')
  await until(() => st().data._meta?.pushHeld === true)
  fake.tokenFails = true // Apple unreachable for the token
  st().underAgeMistake()
  await until(() => !st().data._meta?.pushHeld)
  await new Promise((r) => setTimeout(r, 50))
  check('no token right now (offline): reminders turn off as on the web (resubscribe failed), never silently on',
    st().data.profile.notificationsEnabled === false)
  fake.tokenFails = false

  /* ---------- turning the last reminder off ends the registration ---------- */
  reset()
  await setPerm('granted')
  await st().setMindReminder('wind-down', true)
  await until(() => pushWrites().length === 1)
  fake.requests.length = 0
  await st().setMindReminder('wind-down', false)
  check('the last reminder off: this phone unregistered and its row deleted',
    await until(() => pushWrites().some((w) => w.method === 'DELETE')) && fake.unregistered === 1)

  /* ---------- security-data finding 1: a row that can't be deleted now is released later ---------- */
  reset()
  await setPerm('granted')
  await st().setMindReminder('checkin', true)
  await until(() => pushWrites().length === 1)
  fake.requests.length = 0
  setSession(null, null) // the session already gone (an account switch, or signed out offline)
  await unsubscribePush()
  check('no session: unregistered, nothing sent, kept to release', fake.unregistered === 1 && pushWrites().length === 0)
  setSession('jwt-other', '99999999-2222-3333-4444-555555555555')
  await checkPushToken()
  check('another account signs in: the first account\'s row is not touched from its session', pushWrites().length === 0)
  setSession('jwt', UID)
  await checkPushToken()
  check('its own account signs in again: the row is deleted then (this token, this account)',
    pushWrites().length === 1 && pushWrites()[0].method === 'DELETE' && pushWrites()[0].path === `/push_subscriptions?endpoint=eq.${TOKEN}&user_id=eq.${UID}`, pushWrites())
  fake.requests.length = 0
  await checkPushToken()
  check('released once only', pushWrites().length === 0)

  /* ---------- security-data finding 2: a registered phone saves its row again at each launch ---------- */
  reset()
  await setPerm('granted')
  await st().setMindReminder('checkin', true)
  await until(() => pushWrites().length === 1)
  fake.requests.length = 0
  await checkPushToken()
  check('launch: the row is saved again (idempotent), so one the function removed comes back',
    pushWrites().length === 1 && pushWrites()[0].method === 'POST' && JSON.parse(pushWrites()[0].body).endpoint === TOKEN)
  fake.requests.length = 0
  await setPerm('denied')
  await checkPushToken()
  check('launch with permission turned off: nothing saved', pushWrites().length === 0)
  await unsubscribePush()

  console.log(`reminders through the store: ${passed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) })
