/**
 * What the shared-product Edge Functions (submit-product, lookup-product, report-product) have in
 * common: the allowed origins, JSON replies, a size-limited body read, the project's publishable
 * key, the caller check and the in-memory per-caller limit. Nothing here stores or logs who
 * called. Web APIs only, so Deno runs it as is and the tests load it under Node.
 */

export const ORIGINS = [
  /^https:\/\/app\.tali\.fit$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  // local preview on a phone through a tunnel (docs/local-preview.md)
  /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/,
]

export const corsFor = (origin: string | null): Record<string, string> | null =>
  origin && ORIGINS.some((re) => re.test(origin))
    ? {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin',
      }
    : null

export const json = (body: unknown, status: number, cors: Record<string, string> | null) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...(cors ?? {}) } })

/** A bearer JWT's shape (three base64url parts); the signature is checked by the server it's sent to. */
export const BEARER_RE = /^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/

/** The body as text, or null when it's over `max` bytes. */
export async function readLimited(req: Request, max: number): Promise<string | null> {
  if (!req.body) return ''
  const reader = req.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > max) { await reader.cancel().catch(() => {}); return null }
    chunks.push(value)
  }
  const all = new Uint8Array(size)
  let at = 0
  for (const c of chunks) { all.set(c, at); at += c.byteLength }
  return new TextDecoder().decode(all)
}

/** The project's publishable key: the new-style `default` entry, else the legacy anon key. */
export function publishableKey(): string | undefined {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}')
    if (typeof keys?.default === 'string' && keys.default) return keys.default
  } catch { /* not JSON: fall back */ }
  return Deno.env.get('SUPABASE_ANON_KEY') || undefined
}

/**
 * Who is calling: Auth checks the token (signature, expiry, the user exists) and the id comes only
 * from its answer. Fails closed: anything but a clear answer is 'config' (try again later).
 */
export async function verifyCaller(url: string, anon: string, auth: string): Promise<{ sub: string } | 'unauthorized' | 'config'> {
  let res: Response
  try {
    res = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: auth }, signal: AbortSignal.timeout(4000) })
  } catch {
    return 'config'
  }
  if (res.status === 401 || res.status === 403) return 'unauthorized'
  if (!res.ok) return 'config'
  const body = await res.json().catch(() => null) as { id?: unknown } | null
  return typeof body?.id === 'string' && body.id ? { sub: body.id } : 'unauthorized'
}

/**
 * A per-caller limit held in memory only (per function instance): `perMinute` calls a minute and
 * `perHour` an hour. The caller's id stays in memory for at most an hour; it's never logged or
 * stored, and nothing about it reaches the database.
 */
export function rateLimiter(perMinute: number, perHour: number) {
  const seen = new Map<string, number[]>()
  /** Take one call for this caller, or false when they're over the limit. */
  return function take(sub: string, now = Date.now()): boolean {
    const hour = now - 3_600_000
    const times = (seen.get(sub) || []).filter((t) => t > hour)
    if (times.length >= perHour || times.filter((t) => t > now - 60_000).length >= perMinute) {
      seen.set(sub, times)
      return false
    }
    times.push(now)
    seen.set(sub, times)
    // keep the map small: forget callers with nothing in the last hour
    if (seen.size > 5_000) for (const [k, v] of seen) if (!v.some((t) => t > hour)) seen.delete(k)
    return true
  }
}
