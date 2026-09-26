/**
 * Reads a nutrition-label photo through the `ai-read-label` Edge Function. Never on a launch or
 * save path: the label capture view asks, and anything but a good read (offline, no session, slow,
 * an error, the daily cap) sends the user to type the label in instead. No React, no DOM beyond
 * fetch and localStorage.
 */
import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js'
import { validateLabelRead, type LabelRead } from '@/core/domain/label'
import { getToken, hasSession, supabase } from './supabase'

export const LABEL_TIMEOUT_MS = 20_000
export const LABEL_FUNCTION = 'ai-read-label'

export type LabelReadResult =
  | { status: 'ok'; read: LabelRead }
  /** no connection, or too slow */
  | { status: 'offline' }
  /** not signed in on this device right now (e.g. offline since launch) */
  | { status: 'no-session' }
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
        if (status === 429) return { status: 'limit' }
        if (status === 422) {
          const body = await (error.context as Response).json().catch(() => null)
          return body?.error === 'unreadable' ? { status: 'unreadable' } : { status: 'error' }
        }
        return { status: 'error' }
      }
      if (error instanceof FunctionsFetchError) return { status: 'offline' }
      return { status: 'error' }
    }
    const read = data && typeof data === 'object' && (data as { ok?: unknown }).ok === true ? validateLabelRead((data as { read?: unknown }).read) : null
    return read ? { status: 'ok', read } : { status: 'error' }
  } catch (e) {
    const name = (e as { name?: string })?.name
    return name === 'AbortError' || name === 'TypeError' ? { status: 'offline' } : { status: 'error' }
  } finally {
    clearTimeout(timer)
    opts.signal?.removeEventListener('abort', stop)
  }
}

/* ---------------- consent (per device) ---------------- */

const CONSENT_KEY = 'tali.labelConsent'

/** The user agreed, on this device, to photos being sent to be read. */
export function hasLabelConsent(): boolean {
  try { return localStorage.getItem(CONSENT_KEY) === '1' } catch { return false }
}

export function setLabelConsent(on: boolean): void {
  try { if (on) localStorage.setItem(CONSENT_KEY, '1'); else localStorage.removeItem(CONSENT_KEY) } catch { /* private mode: asked again next time */ }
}
