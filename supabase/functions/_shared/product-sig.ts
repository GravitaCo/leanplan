/**
 * Signing a label read for the shared product list. `ai-read-label` signs (barcode, parsed values,
 * time) with PRODUCT_SIGNING_KEY; `submit-product` checks the signature before anything reaches
 * the database, so only values the label reader produced can be shared. The signature covers no
 * user id. Web Crypto only (Deno, Node 22 and browsers), no imports beyond shared-product.ts.
 *
 * The key is a random secret of at least 32 characters, set on both functions
 * (`supabase secrets set PRODUCT_SIGNING_KEY=…`); it never leaves them.
 */
import { canonicalShare, tokenFresh, type SharedValues, type ShareToken } from './shared-product.ts'

export const MIN_KEY_LENGTH = 32

const enc = new TextEncoder()

const b64url = (b: ArrayBuffer): string => {
  let s = ''
  for (const x of new Uint8Array(b)) s += String.fromCharCode(x)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const fromB64url = (s: string): ArrayBuffer => {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4))
  const out = new ArrayBuffer(b.length)
  const view = new Uint8Array(out)
  for (let i = 0; i < b.length; i++) view[i] = b.charCodeAt(i)
  return out
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  if (secret.length < MIN_KEY_LENGTH) throw new Error('signing key too short')
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

/** Sign a read's values for this barcode (GTIN-14) at `iat` (Unix seconds). */
export async function signShare(secret: string, barcode: string, values: SharedValues, iat: number): Promise<ShareToken> {
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(canonicalShare(barcode, values, iat)))
  return { barcode, values, iat, sig: b64url(sig) }
}

/** Whether a token carries a valid signature and is fresh. Constant-time (crypto.subtle.verify). */
export async function verifyShare(secret: string, t: ShareToken, nowS: number): Promise<boolean> {
  if (!tokenFresh(t.iat, nowS)) return false
  let sig: ArrayBuffer
  try { sig = fromB64url(t.sig) } catch { return false }
  if (sig.byteLength !== 32) return false
  return crypto.subtle.verify('HMAC', await hmacKey(secret), sig, enc.encode(canonicalShare(t.barcode, t.values, t.iat)))
}

/** The signature's SHA-256 (hex): what the database keeps to refuse a replay. Reveals nothing
 *  about the read or the reader. */
export async function sigHash(sig: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', enc.encode(sig))
  return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, '0')).join('')
}
