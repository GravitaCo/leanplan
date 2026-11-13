/** Shared state for the faked phone modules (scripts/test-reminders.ts). */
export const fake = {
  perm: 'undetermined' as 'undetermined' | 'granted' | 'denied',
  asked: 0,
  unregistered: 0,
  env: 'production' as 'production' | 'development',
  tokenFails: false,
  requests: [] as { method: string; path: string; body: string }[],
  reset() { this.perm = 'undetermined'; this.asked = 0; this.unregistered = 0; this.env = 'production'; this.tokenFails = false; this.requests.length = 0 },
}
const status = () => ({ granted: fake.perm === 'granted', status: fake.perm, canAskAgain: fake.perm === 'undetermined', ios: { status: fake.perm === 'granted' ? 2 : fake.perm === 'denied' ? 1 : 0 } })
export const notifications = {
  getPermissionsAsync: async () => status(),
  requestPermissionsAsync: async () => { if (fake.perm === 'undetermined') { fake.asked++; fake.perm = 'granted' } return status() },
  getDevicePushTokenAsync: async () => { if (fake.tokenFails) throw new Error('offline'); return { type: 'ios', data: 'AB'.repeat(32) } },
  unregisterForNotificationsAsync: async () => { fake.unregistered++ },
}
// the store's network: every request recorded; writes answered 201, reads empty
;(globalThis as any).fetch = async (url: string, o: RequestInit = {}) => {
  const path = String(url).split('/rest/v1')[1] ?? String(url)
  fake.requests.push({ method: o.method || 'GET', path, body: typeof o.body === 'string' ? o.body : '' })
  return new Response(o.method && o.method !== 'GET' ? null : '[]', { status: o.method && o.method !== 'GET' ? 201 : 200 })
}
