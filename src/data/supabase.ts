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

/** Thin REST wrappers around PostgREST, authorised with the current session token. */
function sbFetch(path: string, opts: RequestInit = {}): Promise<Response> {
  opts.headers = {
    apikey: SB_KEY,
    Authorization: 'Bearer ' + getToken(),
    ...(opts.headers || {}),
  }
  return fetch(SB_REST + path, opts)
}

export async function sbGet<T = unknown>(path: string): Promise<T> {
  const r = await sbFetch(path, {})
  if (!r.ok) throw new Error('GET ' + path + ' -> ' + r.status)
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
  if (!r.ok) throw new Error('UPSERT ' + table + ' -> ' + r.status)
}

export async function sbDelete(table: string, filter: string): Promise<void> {
  const r = await sbFetch('/' + table + '?' + filter, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  })
  if (!r.ok && r.status !== 404) throw new Error('DELETE ' + table + ' -> ' + r.status)
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function uuid(prefix = ''): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : prefix + Date.now() + Math.random().toString(16).slice(2)
}
