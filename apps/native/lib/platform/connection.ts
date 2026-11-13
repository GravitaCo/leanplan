/**
 * The browser's connection signals on the phone: `navigator.onLine` and the window's 'online' and
 * 'offline' events, fed from NetInfo by install.ts. Pure (no React Native), so it is unit-tested in
 * Node (scripts/test-platform.mjs).
 *
 * One difference from a plain event target, on purpose: the first NetInfo report arrives a moment
 * after launch, before the store has added its listeners (initAuth adds them only after restoring the
 * session, up to 4 s). In a browser that can't happen, since navigator.onLine is known from the start.
 * So an 'online' or 'offline' event that reached no listener is kept until the connection next
 * changes, and handed once to each listener added for it in that time, if the connection is still in
 * that state: as if each had known the state from the start, as it would in a browser. Without this, a launch with
 * no connection left the store's `online` true and the connection pill never said "Offline".
 */

type Listener = (e: { type: string }) => void
type Wrapped = Listener & { __orig?: Listener }

const CONNECTION_EVENTS = ['online', 'offline']

/** NetInfo's state as navigator.onLine: on a network, as a browser counts it. Unknown counts as
 *  online, as a browser would; reachability (a test request) is never asked for. */
export function onlineFrom(s: { isConnected: boolean | null }): boolean {
  return s.isConnected !== false
}

export function connectionEvents(start = true, defer: (fn: () => void) => void = queueMicrotask) {
  let online = start
  const listeners = new Map<string, Set<Wrapped>>()
  /** connection events that reached no listener, kept for the first one added */
  const missed = new Set<string>()

  const dispatchEvent = (e: { type: string }): boolean => {
    const set = listeners.get(e.type)
    if (!set?.size) {
      if (CONNECTION_EVENTS.includes(e.type)) { CONNECTION_EVENTS.forEach((t) => missed.delete(t)); missed.add(e.type) }
      return true
    }
    for (const l of [...set]) l(e)
    return true
  }

  const addEventListener = (type: string, fn: Listener, opts?: { once?: boolean } | boolean): void => {
    const once = typeof opts === 'object' && !!opts?.once
    const set = listeners.get(type) ?? new Set<Wrapped>()
    const wrapped: Wrapped = once ? (e) => { set.delete(wrapped); fn(e) } : fn
    wrapped.__orig = fn
    set.add(wrapped)
    listeners.set(type, set)
    // a connection change this listener came too late for, still true: hand it over (async, as an
    // event would arrive), once to this listener
    if (missed.has(type) && (type === 'online') === online) {
      defer(() => { if (set.has(wrapped) && missed.has(type) && (type === 'online') === online) wrapped({ type }) })
    }
  }

  const removeEventListener = (type: string, fn: Listener): void => {
    const set = listeners.get(type)
    if (set) for (const l of set) if (l === fn || l.__orig === fn) set.delete(l)
  }

  /** NetInfo's report: changes navigator.onLine and sends 'online' or 'offline' when it changed. */
  const setOnline = (next: boolean): void => {
    if (next === online) return
    online = next
    missed.clear() // a real change: listeners hear it now, older missed ones are stale
    dispatchEvent({ type: next ? 'online' : 'offline' })
  }

  return { addEventListener, removeEventListener, dispatchEvent, setOnline, online: () => online }
}
