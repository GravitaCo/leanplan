/* Tali service worker — bump CACHE on each deploy to refresh clients.
 *
 * Offline-first: the app shell and its hashed assets are cached at install, so Tali opens
 * with no connection after a single visit. Hashed assets are immutable (cache-first); the
 * page itself is network-first with a short timeout, so a weak signal never stalls launch.
 * User data never goes through here: it lives on the device (localStorage) and syncs to
 * Supabase (cross-origin, not cached) when online. */
const CACHE = 'tali-v108'
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

/** Lazily loaded assets of the same build (the barcode decoder and its .wasm), listed by the
 *  build in <meta name="tali-lazy">. Not precached; kept once fetched so they work offline. */
function lazyOf(html) {
  const m = html.match(/<meta name="tali-lazy" content="([^"]*)"/)
  return m ? m[1].split(/\s+/).filter(Boolean).map((p) => new URL(p, self.location.href).href) : []
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
  // drop hashed assets from older builds that this shell no longer references
  const keep = new Set([...assetsOf(html), ...lazyOf(html)])
  for (const r of await c.keys()) if (new URL(r.url).pathname.startsWith('/assets/') && !keep.has(r.url)) await c.delete(r)
}

self.addEventListener('install', (e) => {
  // No catch: if the shell or any asset fails to download, the install fails and the
  // current, complete version keeps serving. The browser retries on a later visit.
  e.waitUntil(fetch(SHELL, { cache: 'no-cache' }).then((res) => {
    if (!res.ok || !(res.headers.get('content-type') || '').includes('text/html')) throw new Error('shell ' + res.status)
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

/* Reminder delivery log (security-data H3), for the back-off: the app has no other way to learn
 * that a reminder arrived but wasn't opened. Only the Mind reminder types are recorded (never
 * supplement or review reminders), as {kind, at, ev} with ev shown, opened or closed: no text,
 * nothing from the log. The app reads and empties it on launch (src/data/notifyLog.ts), and
 * deletes it on wipe, sign-out-and-remove and when the device changes hands. */
const NOTIFY_DB = 'tali-notify'
const NOTIFY_STORE = 'events'
const NOTIFY_MAX = 60
/* The only words a Mind reminder shows, whatever the payload says (supabase/functions/_shared/
 * reminders.ts REMINDER_COPY; npm test checks they agree). One tag per type. */
const MIND_COPY = {
  checkin: { title: 'Tali', body: 'How are you today? A quick check-in, if you have a moment.', tag: 'tali-checkin' },
  'wind-down': { title: 'Tali', body: "Your wind-down starts now, if you'd like it.", tag: 'tali-wind-down' },
  plan: { title: 'Tali', body: 'How are your plans going?', tag: 'tali-plan' },
}
const mindKindOf = (tag) => Object.keys(MIND_COPY).find((k) => MIND_COPY[k].tag === tag) || null

function notifyRecord(kind, ev) {
  if (!kind || typeof indexedDB === 'undefined') return Promise.resolve()
  return new Promise((resolve) => {
    let req
    try { req = indexedDB.open(NOTIFY_DB, 1) } catch { resolve(); return }
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(NOTIFY_STORE)) req.result.createObjectStore(NOTIFY_STORE, { autoIncrement: true }) }
    req.onerror = () => resolve()
    req.onblocked = () => resolve()
    req.onsuccess = () => {
      const db = req.result
      try {
        const tx = db.transaction(NOTIFY_STORE, 'readwrite')
        const st = tx.objectStore(NOTIFY_STORE)
        st.add({ kind, at: new Date().toISOString(), ev })
        // the app empties it; if it isn't opened for a long time, keep only the newest
        const c = st.count()
        c.onsuccess = () => {
          let extra = c.result - NOTIFY_MAX
          if (extra <= 0) return
          st.openCursor().onsuccess = (e) => { const cur = e.target.result; if (cur && extra-- > 0) { cur.delete(); cur.continue() } }
        }
        tx.oncomplete = tx.onerror = tx.onabort = () => { db.close(); resolve() }
      } catch { db.close(); resolve() }
    }
  })
}

self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : {}
  const kind = mindKindOf(data.tag)
  if (kind) {
    // a Mind reminder (check-in, wind-down, plan check-in): fixed neutral copy, its own tag; a
    // tap opens ./?n=<kind>
    const c = MIND_COPY[kind]
    e.waitUntil(Promise.all([
      self.registration.showNotification(c.title, { body: c.body, tag: c.tag, data: { url: './?n=' + kind, kind } }),
      notifyRecord(kind, 'shown'),
    ]))
    return
  }
  // A supplement reminder never shows a supplement name on the lock screen (it can reveal
  // medication), even from an older server that still sends one: fixed text, one tag. The one
  // exception is a person who turned on "Show supplement names in reminders" (B11b): only then does
  // the reminder service send the tag tali-supp-named with the names, shown under the same tag.
  // Every other push type must set its own tali-<kind> tag, or it shows as a supplement reminder.
  const named = data.tag === 'tali-supp-named' && typeof data.body === 'string' && data.body.trim() !== ''
  const supp = named || !data.tag || data.tag === 'tali-supp' || String(data.tag).startsWith('tali-supp') || String(data.tag).startsWith('supp-')
  e.waitUntil(
    self.registration.showNotification(named ? 'Supplement reminder' : supp ? 'Time for your supplements' : data.title || 'Tali', {
      body: named ? data.body.slice(0, 400) : supp ? 'Time for your supplements' : data.body || '',
      tag: supp ? 'tali-supp' : data.tag,
      // a later reminder replacing an unread one still sounds (Safari ignores this)
      renotify: supp,
      // where a tap goes: the weekly review reminder opens the review (ml-d2)
      data: { url: data.url || './' },
    }),
  )
})

const mindOf = (n) => { const d = n.data || {}; return d.kind && MIND_COPY[d.kind] ? d.kind : null }

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = (e.notification.data && e.notification.data.url) || './'
  e.waitUntil(Promise.all([clients.openWindow(url), notifyRecord(mindOf(e.notification), 'opened')]))
})

// swiped away without opening: counts towards the back-off (two ignored in a row)
self.addEventListener('notificationclose', (e) => {
  e.waitUntil(notifyRecord(mindOf(e.notification), 'closed'))
})

function put(req, res) {
  if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}) }
  return res
}

/** Network with a timeout; the cached shell if the network is slow or down. */
function navigate(req) {
  const net = fetch(req).then((res) => {
    // only a real page becomes the shell (not e.g. /sw.js opened directly), and only once its assets cache too
    if (res.ok && (res.headers.get('content-type') || '').includes('text/html')) storeShell(res.clone()).catch(() => {})
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
  // demo clips stream with Range requests (Safari needs 206 responses), so leave them to the
  // network; the app shows a "needs a connection" note when a clip can't load offline
  if (url.pathname.startsWith('/videos/')) return
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
