/* Tali service worker — bump CACHE on each deploy to refresh clients.
 *
 * Offline-first: the app shell and its hashed assets are cached at install, so Tali opens
 * with no connection after a single visit. Hashed assets are immutable (cache-first); the
 * page itself is network-first with a short timeout, so a weak signal never stalls launch.
 * User data never goes through here: it lives on the device (localStorage) and syncs to
 * Supabase (cross-origin, not cached) when online. */
const CACHE = 'tali-v10'
const SHELL = './'
const NAV_TIMEOUT_MS = 3000

/** Same-origin assets a page references (scripts, styles, icons, manifest). */
function assetsOf(html) {
  const urls = new Set([new URL('manifest.webmanifest', self.location.href).href])
  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const u = new URL(m[1], self.location.href)
    if (u.origin === self.location.origin && u.pathname !== '/') urls.add(u.href)
  }
  return [...urls]
}

/**
 * Store a shell page only once every asset it needs is cached, so the cached page can never
 * point at files we don't have (which would open to a blank screen offline). Throws if any
 * asset can't be fetched; the previous shell then stays in place.
 */
async function storeShell(res) {
  const c = await caches.open(CACHE)
  const html = await res.clone().text()
  const missing = []
  for (const u of assetsOf(html)) if (!(await c.match(u))) missing.push(u)
  await c.addAll(missing)
  await c.put(SHELL, res)
}

self.addEventListener('install', (e) => {
  // No catch: if the shell or any asset fails to download, the install fails and the
  // current, complete version keeps serving. The browser retries on a later visit.
  e.waitUntil(fetch(SHELL, { cache: 'no-cache' }).then((res) => {
    if (!res.ok) throw new Error('shell ' + res.status)
    return storeShell(res)
  }).then(() => self.skipWaiting()))
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
  const net = fetch(req).then((res) => {
    if (res.ok) storeShell(res.clone()).catch(() => {}) // only if its assets cache too
    return res
  })
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
  // the parked vanilla app has its own worker; never let it replace Tali's cached shell
  if (url.pathname.startsWith('/legacy/')) return
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
