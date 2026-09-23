/* Tali service worker — bump CACHE on each deploy to refresh clients.
 *
 * Offline-first: the app shell and its hashed assets are cached at install, so Tali opens
 * with no connection after a single visit. Hashed assets are immutable (cache-first); the
 * page itself is network-first with a short timeout, so a weak signal never stalls launch.
 * User data never goes through here: it lives on the device (localStorage) and syncs to
 * Supabase (cross-origin, not cached) when online. */
const CACHE = 'tali-v9'
const SHELL = './'
const NAV_TIMEOUT_MS = 3000

/** The shell plus every same-origin asset it references (scripts, styles, icons, manifest). */
async function precache() {
  const c = await caches.open(CACHE)
  const res = await fetch(SHELL, { cache: 'no-cache' })
  if (!res.ok) return
  const html = await res.clone().text()
  await c.put(SHELL, res)
  const urls = new Set(['manifest.webmanifest'])
  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const u = new URL(m[1], self.location.href)
    if (u.origin === self.location.origin && u.pathname !== '/') urls.add(u.href)
  }
  await Promise.all([...urls].map((u) => c.add(u).catch(() => {})))
}

self.addEventListener('install', (e) => {
  e.waitUntil(precache().catch(() => {}).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : {}
  e.waitUntil(
    self.registration.showNotification(data.title || 'Tali', {
      body: data.body || '',
      tag: data.tag || 'tali-supp',
    }),
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(clients.openWindow('./'))
})

function put(req, res) {
  if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}) }
  return res
}

/** Network with a timeout; the cached shell if the network is slow or down. */
function navigate(req) {
  const net = fetch(req).then((res) => put(SHELL, res))
  const timeout = new Promise((resolve) => setTimeout(resolve, NAV_TIMEOUT_MS))
  return Promise.race([net, timeout])
    .then((res) => res || caches.match(SHELL).then((c) => c || net))
    .catch(() => caches.match(SHELL))
}

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (req.mode === 'navigate') { e.respondWith(navigate(req)); return }
  if (url.pathname.startsWith('/assets/')) {
    // content-hashed: never changes, so the cache is always right
    e.respondWith(caches.match(req).then((c) => c || fetch(req).then((res) => put(req, res))))
    return
  }
  // everything else (icons, manifest): cached copy now, refreshed in the background
  e.respondWith(
    caches.match(req).then((c) => {
      const net = fetch(req).then((res) => put(req, res)).catch(() => c)
      return c || net
    }),
  )
})
