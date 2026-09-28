/**
 * The one connection indicator (onboarding plan §7): what the header says about where the
 * person's data is. Pure: derived from store state, never from the network directly.
 */

export type ConnectionKind = 'up-to-date' | 'pending' | 'offline' | 'sign-in' | 'problem' | 'phone-only'

export interface ConnectionState {
  kind: ConnectionKind
  /** changes on this phone not yet on the server (records, deletes and consent acts) */
  pending: number
}

export interface ConnectionInput {
  /** a signed-in account is open on this device (live session or paused offline) */
  signedIn: boolean
  /** a real session is applied, so sync can run */
  authed: boolean
  /** the account opened without a live session (offline launch); sync waits for it */
  syncPaused: boolean
  /** waiting on the user to say whose data is on this device */
  ownerAsk: boolean
  /** the device says it has a connection (navigator.onLine) */
  online: boolean
  /** the sync loop's last status */
  sync: 'idle' | 'syncing' | 'synced' | 'offline' | 'error'
  /** unsynced changes (unsyncedCount) */
  pending: number
  /** no yes to health data ("Not now", a withdrawal, not asked yet): the log stays on this phone */
  phoneOnly?: boolean
}

/**
 * - Not signed in, or the account's data held back while asking whose it is: "Sign in to sync".
 * - No yes to health data: the log stays on this phone whatever the connection: "On this phone only".
 * - No connection (the device says so, or the last sync found none): "Offline".
 * - The last sync failed while online and signed in: "Sync problem".
 * - Anything still to upload, a sync under way, or a paused session waiting to resume: "Saved on
 *   this phone, will sync (n)".
 * - Otherwise: "Up to date".
 */
export function connectionState(x: ConnectionInput): ConnectionState {
  const pending = Math.max(0, Math.floor(x.pending) || 0)
  const kind: ConnectionKind =
    !x.signedIn || x.ownerAsk ? 'sign-in'
    : x.phoneOnly ? 'phone-only'
    : !x.online || x.sync === 'offline' ? 'offline'
    : x.authed && x.sync === 'error' ? 'problem'
    : pending > 0 || x.sync === 'syncing' || !x.authed || x.syncPaused ? 'pending'
    : 'up-to-date'
  return { kind, pending }
}

/** The indicator's words, from the plan (§7). */
export function connectionLabel(c: ConnectionState): string {
  switch (c.kind) {
    case 'up-to-date': return 'Up to date'
    case 'pending': return c.pending > 0 ? `Saved on this phone, will sync (${c.pending})` : 'Saved on this phone, will sync'
    case 'offline': return 'Offline'
    case 'sign-in': return 'Sign in to sync'
    case 'problem': return 'Sync problem'
    case 'phone-only': return 'On this phone only'
  }
}
