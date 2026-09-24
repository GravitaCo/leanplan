import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase config. The publishable (anon) key is public by design — it is safe to ship
 * client-side; row-level security on the database is what protects data. Values can be
 * overridden at build time via Vite env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
 */
export const SB_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://exvblofwiwbvycomxvmj.supabase.co'
export const SB_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_l-XOQOrSJ6sRGEwaRR8rrg_pXukGtET'
export const SB_REST = SB_URL + '/rest/v1'

/** Fallback user id used for local-only mode before the first sign-in. */
export const LOCAL_USER = '00000000-0000-0000-0000-000000000001'

export const supabase: SupabaseClient = createClient(SB_URL, SB_KEY)

let accessToken: string | null = null
let userId: string | null = null

export function setSession(token: string | null, uid: string | null): void {
  accessToken = token
  userId = uid
}

export function getToken(): string {
  return accessToken || SB_KEY
}

export function getUid(): string {
  return userId || LOCAL_USER
}

/** A request the server answered with an error status (as opposed to no connection). */
export class HttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

/** Thin REST wrappers around PostgREST, authorised with the current session token. */
function sbFetch(path: string, opts: RequestInit = {}, token?: string): Promise<Response> {
  opts.headers = {
    apikey: SB_KEY,
    Authorization: 'Bearer ' + (token || getToken()),
    ...(opts.headers || {}),
  }
  return fetch(SB_REST + path, opts)
}

/** `token`: read as a session that isn't applied yet (the owner check before sign-in completes). */
export async function sbGet<T = unknown>(path: string, token?: string): Promise<T> {
  const r = await sbFetch(path, {}, token)
  if (!r.ok) throw new HttpError('GET ' + path + ' -> ' + r.status, r.status)
  return r.json() as Promise<T>
}

export async function sbUpsert(
  table: string,
  rows: unknown[],
  onConflict: string,
): Promise<void> {
  if (!rows.length) return
  const r = await sbFetch('/' + table + '?on_conflict=' + onConflict, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  })
  if (!r.ok) throw new HttpError('UPSERT ' + table + ' -> ' + r.status, r.status)
}

export async function sbDelete(table: string, filter: string): Promise<void> {
  const r = await sbFetch('/' + table + '?' + filter, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  })
  if (!r.ok && r.status !== 404) throw new HttpError('DELETE ' + table + ' -> ' + r.status, r.status)
}

export function nowIso(): string {
  return new Date().toISOString()
}

/** A random v4 UUID. Built from getRandomValues, which every browser has (randomUUID is missing
 *  on older iOS and outside secure contexts), because the server's id columns only take UUIDs. */
export function uuid(): string {
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20)
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
