/**
 * Account deletion (onboarding plan §8; launch blocker). The server side is the
 * `delete-account` Edge Function: it deletes every row the account owns and then the login.
 * This side refuses without a connection (nothing is queued: deleting later, silently, would
 * surprise), calls the function, and only after it confirms wipes this device and signs out.
 * Any failure leaves the device's data exactly as it was. No React, no DOM beyond fetch,
 * Storage and the injected sign-out.
 */
import { SB_URL, SB_KEY, getToken, hasSession, supabase } from './supabase'
import { withTimeout } from './timeout'

export const DELETE_FUNCTION = 'delete-account'
export const DELETE_TIMEOUT_MS = 20_000
/** The body the function requires, so a stray POST can't delete an account. */
export const DELETE_CONFIRM = 'delete my account'

export type DeleteResult =
  /** the account and its data are gone; this device is wiped and signed out */
  | { status: 'ok' }
  /** no connection: nothing was sent */
  | { status: 'offline' }
  /** no live session on this device (e.g. opened offline): sign in again first */
  | { status: 'no-session' }
  /** a sync is still running; try again in a moment */
  | { status: 'busy' }
  /** online, but the function couldn't be reached (not deployed, or its host is down) */
  | { status: 'unavailable' }
  /** the server refused or failed; nothing on this device was changed */
  | { status: 'error' }

/**
 * Draft copy for the confirm UI (PENDING Benn's design approval; nothing renders it yet).
 * The data layer returns a status; the UI chooses the words.
 */
export const DELETE_MESSAGES: Record<Exclude<DeleteResult['status'], 'ok'>, string> = {
  offline: 'Deleting your account needs a connection. Nothing has been deleted.',
  'no-session': 'Sign in again to delete your account. Nothing has been deleted.',
  busy: 'Tali is still syncing. Try again in a moment. Nothing has been deleted.',
  unavailable: 'Couldn’t reach Tali just now. Nothing has been deleted. Try again later.',
  error: 'Something went wrong, so nothing has been deleted. Try again later.',
}

/** The device keys that hold a person's data or session: the log, every tali.* setting, and
 *  Supabase's saved session (sb-<project>-auth-token and its code verifier). */
export function isPersonalKey(k: string): boolean {
  return k === 'leanplan.v1' || k.startsWith('tali.') || k.startsWith('sb-')
}

/** Remove every personal key from a Storage. Returns the keys removed. */
export function wipeStorage(storage: Pick<Storage, 'length' | 'key' | 'removeItem'> | null): string[] {
  if (!storage) return []
  const keys: string[] = []
  try {
    for (let i = 0; i < storage.length; i++) { const k = storage.key(i); if (k && isPersonalKey(k)) keys.push(k) }
    keys.forEach((k) => storage.removeItem(k))
  } catch { /* storage blocked: nothing we can reach */ }
  return keys
}

/**
 * Wipe this device: localStorage and sessionStorage personal keys. The service worker's cache
 * holds only the app shell (no user data: public/sw.js), so it stays and the sign-in screen
 * still opens offline.
 */
export function wipeDevice(): void {
  try { wipeStorage(typeof localStorage === 'undefined' ? null : localStorage) } catch { /* blocked */ }
  try { wipeStorage(typeof sessionStorage === 'undefined' ? null : sessionStorage) } catch { /* blocked */ }
}

export interface DeleteDeps {
  online: () => boolean
  hasSession: () => boolean
  /** POST to the function; resolves with the HTTP status and parsed body, or rejects on no connection */
  call: () => Promise<{ status: number; body: unknown }>
  wipe: () => void
  signOut: () => Promise<void>
}

async function callFunction(): Promise<{ status: number; body: unknown }> {
  const res = await fetch(SB_URL + '/functions/v1/' + DELETE_FUNCTION, {
    method: 'POST',
    headers: { apikey: SB_KEY, Authorization: 'Bearer ' + getToken(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirm: DELETE_CONFIRM }),
    signal: AbortSignal.timeout(DELETE_TIMEOUT_MS),
  })
  return { status: res.status, body: await res.json().catch(() => null) }
}

export const defaultDeleteDeps: DeleteDeps = {
  online: () => typeof navigator === 'undefined' || navigator.onLine !== false,
  hasSession,
  call: callFunction,
  wipe: wipeDevice,
  // local only: the server session died with the login; never wait long for it
  signOut: () => withTimeout(supabase.auth.signOut({ scope: 'local' }).then(() => {}, () => {}), 3000, undefined),
}

/**
 * Delete the signed-in account. The device is wiped and signed out only after the function
 * says the account is gone ({ ok: true }); on anything else it is left untouched. Safe to call
 * again after a lost reply: the function treats an account that's already gone as done.
 */
export async function deleteAccount(deps: DeleteDeps = defaultDeleteDeps): Promise<DeleteResult> {
  if (!deps.online()) return { status: 'offline' }
  if (!deps.hasSession()) return { status: 'no-session' }
  let res: { status: number; body: unknown }
  try {
    res = await deps.call()
  } catch {
    // a timeout or dropped connection: the server may or may not have finished, so the device
    // keeps everything and the person can try again (a repeat is safe)
    return deps.online() ? { status: 'unavailable' } : { status: 'offline' }
  }
  const ok = res.status === 200 && !!res.body && typeof res.body === 'object' && (res.body as { ok?: unknown }).ok === true
  if (!ok) {
    if (res.status === 401) return { status: 'no-session' }
    if (res.status === 404) return { status: 'unavailable' } // not deployed (the gateway's 404)
    return { status: 'error' }
  }
  deps.wipe()
  await deps.signOut()
  // a sign-out can re-save a session that was mid-refresh: wipe once more after it
  deps.wipe()
  return { status: 'ok' }
}
