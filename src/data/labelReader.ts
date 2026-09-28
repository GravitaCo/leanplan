/**
 * Reads a nutrition-label photo through the `ai-read-label` Edge Function. Never on a launch or
 * save path: the label capture view asks, and anything but a good read (offline, no session, slow,
 * an error, the daily cap) sends the user to type the label in instead. No React, no DOM beyond
 * fetch and localStorage.
 */
import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js'
import { validateLabelRead, type LabelRead } from '@/core/domain/label'
import { getToken, hasSession, supabase } from './supabase'

/**
 * Label photo scanning is off until the ai-read-label function is deployed and smoke-tested
 * (ship-critic). While false, every entry point is hidden. A build with VITE_LABEL_SCAN=1 turns it
 * on, for local previews and the e2e test only.
 */
export const LABEL_SCAN_ENABLED: boolean = false || import.meta.env?.VITE_LABEL_SCAN === '1'

export const LABEL_TIMEOUT_MS = 20_000
export const LABEL_FUNCTION = 'ai-read-label'

export type LabelReadResult =
  | { status: 'ok'; read: LabelRead }
  /** no connection, or too slow */
  | { status: 'offline' }
  /** online, but the function couldn't be reached (not deployed, or its host is down) */
  | { status: 'unavailable' }
  /** not signed in on this device right now (e.g. offline since launch) */
  | { status: 'no-session' }
  /** the server has no yes to label photos for this account yet (e.g. the consent hasn't synced) */
  | { status: 'consent' }
  /** today's allowance used */
  | { status: 'limit' }
  /** the photo had no table the reader could make out */
  | { status: 'unreadable' }
  /** anything else: a server or model error */
  | { status: 'error' }

/**
 * `images`: base64 JPEGs (no data: prefix), each already downscaled to ≤ 1.5 MB. The result is
 * validated here too, so the app never trusts the wire.
 */
export async function readLabel(images: { panel: string; front?: string }, opts: { timeoutMs?: number; signal?: AbortSignal } = {}): Promise<LabelReadResult> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { status: 'offline' }
  if (!hasSession()) return { status: 'no-session' }
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), opts.timeoutMs ?? LABEL_TIMEOUT_MS)
  const stop = () => ctl.abort()
  opts.signal?.addEventListener('abort', stop)
  try {
    const { data, error } = await supabase.functions.invoke(LABEL_FUNCTION, {
      body: images.front ? { panel: images.panel, front: images.front } : { panel: images.panel },
      // the session the app already holds: never wait on a token refresh here
      headers: { Authorization: 'Bearer ' + getToken() },
      signal: ctl.signal,
    })
    if (error) {
      if (error instanceof FunctionsHttpError) {
        const status = (error.context as Response | undefined)?.status
        if (status === 401) return { status: 'no-session' }
        // the function isn't deployed (the gateway's own 404)
        if (status === 404) return { status: 'unavailable' }
        if (status === 429) return { status: 'limit' }
        if (status === 403) {
          const body = await (error.context as Response).clone().json().catch(() => null)
          return body?.error === 'consent' ? { status: 'consent' } : { status: 'error' }
        }
        if (status === 422) {
          const body = await (error.context as Response).json().catch(() => null)
          return body?.error === 'unreadable' ? { status: 'unreadable' } : { status: 'error' }
        }
        return { status: 'error' }
      }
      // a missing function fails its CORS preflight, which looks like no connection: only a
      // timeout or a device that says it's offline is 'offline'
      if (error instanceof FunctionsFetchError) return ctl.signal.aborted || navigator.onLine === false ? { status: 'offline' } : { status: 'unavailable' }
      return { status: 'error' }
    }
    const read = data && typeof data === 'object' && (data as { ok?: unknown }).ok === true ? validateLabelRead((data as { read?: unknown }).read) : null
    return read ? { status: 'ok', read } : { status: 'error' }
  } catch (e) {
    const name = (e as { name?: string })?.name
    if (ctl.signal.aborted || navigator.onLine === false) return { status: 'offline' }
    return name === 'TypeError' ? { status: 'unavailable' } : { status: 'error' }
  } finally {
    clearTimeout(timer)
    opts.signal?.removeEventListener('abort', stop)
  }
}

/* Consent to send label photos is a consent record now ('label-photo', src/data/consent.ts);
   the old device-only flag `tali.labelConsent` is migrated into it on launch. */
