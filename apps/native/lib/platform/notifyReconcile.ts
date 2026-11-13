/**
 * The reminder delivery log's events on a phone (security-data H3), worked out without a service
 * worker. On the web, public/sw.js records "shown" when a push arrives, "opened" on a tap and
 * "closed" when one is swiped away. iOS doesn't wake the app for a reminder it shows, so here:
 *
 * - shown: when the app is open as it arrives (the foreground listener), or, each time the app
 *   comes back to the front, for a Mind reminder in Notification Centre it hasn't seen yet;
 * - opened: from the tap (the response listener), with a "shown" first if it wasn't seen yet;
 * - closed: a reminder seen in Notification Centre, not opened, and gone at the next look.
 *
 * Only the Mind reminder types are recorded, as on the web (never supplement or review reminders).
 * - with the Notification Service Extension (targets/notify-extension, mental-performance 13 Nov
 *   2026): "shown" for every Mind reminder as it arrives, even with the app closed, read at the
 *   next return (fromExtension), so the back-off counts as the web's does.
 *
 * Without the extension (a build from before it), a reminder swiped away, or replaced by the next
 * one of its type, before the app next comes to the front is never seen: the phone can then
 * under-count ignored reminders, never over-count them.
 * Pure, so scripts/test-platform.mjs runs it in Node.
 */

import { MIND_KINDS, REMINDER_COPY } from '../../../../supabase/functions/_shared/reminders.ts'

/** The Mind reminder types by tag, from the shared rules (supabase/functions/_shared/reminders.ts). */
export const MIND_TAGS: Readonly<Record<string, string>> = Object.fromEntries(MIND_KINDS.map((k) => [REMINDER_COPY[k].tag, k]))
const isMindKind = (k: string): boolean => (MIND_KINDS as readonly string[]).includes(k)

/** How many reminders the "seen" list keeps (as the log's NOTIFY_MAX). */
export const SEEN_MAX = 60

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {})

/** The Mind type a reminder's data names (its `kind`, else its `tag`), or null for any other. */
export function mindKindOf(data: unknown): string | null {
  const d = obj(data)
  if (typeof d.kind === 'string' && isMindKind(d.kind)) return d.kind
  if (typeof d.tag === 'string' && Object.prototype.hasOwnProperty.call(MIND_TAGS, d.tag)) return MIND_TAGS[d.tag]
  return null
}

/** Where a tap on a reminder takes the person: the weekly review reminder opens the review (the
 *  web's ./?review=1); every other reminder opens the app at Today (the web's ./ and ./?n=<kind>). */
export function routeFor(data: unknown): 'review' | 'today' {
  const d = obj(data)
  return d.kind === 'review' || d.tag === 'tali-review' ? 'review' : 'today'
}

/** A reminder in Notification Centre: `key` tells two deliveries apart (a later one with the same
 *  tag replaces the earlier under the same identifier, so the delivery time is part of it). */
export interface Presented { key: string; kind: string; at: number }
/** Each delivery seen: its type, whether it was opened, and when it arrived (ms). */
export type Seen = Record<string, { kind: string; opened?: true; at?: number }>
export interface NotifyEv { kind: string; ev: 'shown' | 'opened' | 'closed'; at: Date }

/** The key for one delivery. */
export const deliveryKey = (id: string, date: number): string => id + '|' + (Number.isFinite(date) ? Math.round(date) : 0)

/** A delivery's key from its data: the reminder function gives each send its own `id`, which the
 *  Notification Service Extension records too, so both sides name a delivery the same way; without
 *  one (an older function), the notification's identifier and date. */
export function keyOf(data: unknown, identifier: string, date: number): string {
  const id = obj(data).id
  return typeof id === 'string' && /^[0-9a-f-]{8,64}$/i.test(id) ? 'id:' + id : deliveryKey(identifier, date)
}

const trim = (seen: Seen): Seen => {
  const keys = Object.keys(seen)
  if (keys.length <= SEEN_MAX) return seen
  const out: Seen = {}
  for (const k of keys.slice(-SEEN_MAX)) out[k] = seen[k]
  return out
}

/** A Mind reminder arrived while the app was open, or was tapped: "shown" once per delivery. */
export function noteShown(seen: Seen, p: Presented): { seen: Seen; events: NotifyEv[] } {
  if (seen[p.key]) return { seen, events: [] }
  return { seen: trim({ ...seen, [p.key]: { kind: p.kind, at: p.at } }), events: [{ kind: p.kind, ev: 'shown', at: new Date(p.at) }] }
}

/** A Mind reminder was tapped: "shown" first if this delivery wasn't seen, then "opened" (once). */
export function noteOpened(seen: Seen, p: Presented, now: Date): { seen: Seen; events: NotifyEv[] } {
  const shown = noteShown(seen, p)
  if (shown.seen[p.key]?.opened) return shown
  return { seen: trim({ ...shown.seen, [p.key]: { ...shown.seen[p.key], kind: p.kind, opened: true } }), events: [...shown.events, { kind: p.kind, ev: 'opened', at: now }] }
}

/**
 * The app came back to the front: `presented` is what's in Notification Centre now (Mind types
 * only). New ones are "shown"; seen ones that are gone without an open are "closed", unless a newer
 * one of the same type arrived after it (seen already, as the extension records every delivery, or
 * new here): that one replaced it under the same tag, and on the web a replacement records no close
 * (the newer one's "shown" already counts the ignored one). Opened ones that are gone are simply
 * forgotten.
 */
export function reconcile(seen: Seen, presented: readonly Presented[], now: Date): { seen: Seen; events: NotifyEv[] } {
  const events: NotifyEv[] = []
  const here = new Set(presented.map((p) => p.key))
  const fresh = new Set(presented.filter((p) => !seen[p.key]).map((p) => p.kind))
  const arrivals = [...Object.values(seen), ...presented].filter((x) => typeof x.at === 'number')
  const replaced = (v: Seen[string]) => fresh.has(v.kind) || (typeof v.at === 'number' && arrivals.some((x) => x.kind === v.kind && (x.at as number) > (v.at as number)))
  const next: Seen = {}
  for (const [k, v] of Object.entries(seen)) {
    if (here.has(k)) next[k] = v
    else if (!v.opened && !replaced(v)) events.push({ kind: v.kind, ev: 'closed', at: now })
  }
  let out = next
  for (const p of [...presented].sort((a, b) => a.at - b.at)) {
    const r = noteShown(out, p)
    out = r.seen
    events.push(...r.events)
  }
  return { seen: out, events }
}

/** Deliveries the Notification Service Extension recorded ({id, kind, at}), as the app's own
 *  sightings, keyed the same way (keyOf); malformed ones dropped. */
export function fromExtension(raw: unknown): Presented[] {
  if (!Array.isArray(raw)) return []
  const out: Presented[] = []
  for (const x of raw) {
    const e = obj(x)
    if (typeof e.kind !== 'string' || !isMindKind(e.kind) || typeof e.at !== 'number' || !Number.isFinite(e.at)) continue
    const key = keyOf({ id: e.id }, '', NaN)
    if (key.startsWith('id:')) out.push({ key, kind: e.kind, at: e.at })
  }
  return out.sort((a, b) => a.at - b.at)
}

/** The seen list from storage; anything malformed reads as empty. */
export function parseSeen(raw: string | undefined): Seen {
  try {
    const v = obj(JSON.parse(raw ?? '{}'))
    const out: Seen = {}
    for (const [k, x] of Object.entries(v)) {
      const e = obj(x)
      if (typeof e.kind !== 'string' || !isMindKind(e.kind)) continue
      out[k] = { kind: e.kind, ...(e.opened === true ? { opened: true as const } : {}), ...(typeof e.at === 'number' && Number.isFinite(e.at) ? { at: e.at } : {}) }
    }
    return out
  } catch { return {} }
}
