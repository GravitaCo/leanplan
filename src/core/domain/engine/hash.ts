/**
 * Seeded, deterministic helpers for the training engine (§3.1: the same inputs, logs and seed
 * always give the same plan). No Math.random, no clock.
 */

/** FNV-1a with a final avalanche, so nearby strings land far apart. */
export function hash32(s: string, basis = 0x811c9dc5): number {
  let h = basis >>> 0
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0 }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0
  h ^= h >>> 16
  return h >>> 0
}

/** A number in [0, 1) from a string: the tie-break between equally good choices. */
export const unit = (s: string): number => hash32(s) / 4294967296

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * A version-4-shaped UUID derived from the seed, so generated plans and workouts pass the id repair
 * in persistence.ts (which replaces anything that isn't a UUID) and the server's uuid columns, and
 * the same seed always gives the same ids. A seed that already is a UUID is the plan's own id.
 */
export function seededUuid(seed: string, part: string): string {
  if (part === 'plan' && UUID_RE.test(seed)) return seed.toLowerCase()
  const hex = [0, 1, 2, 3].map((i) => hash32(`${seed}|${part}|${i}`, (0x811c9dc5 ^ Math.imul(i + 1, 0x9e3779b9)) >>> 0).toString(16).padStart(8, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${'89ab'[parseInt(hex[16], 16) & 3]}${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

/** A stable string for any JSON-able value, keys sorted (the default seed, and test signatures). */
export function stableKey(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(stableKey).join(',') + ']'
  if (v && typeof v === 'object') return '{' + Object.keys(v as object).sort().filter((k) => (v as Record<string, unknown>)[k] !== undefined).map((k) => JSON.stringify(k) + ':' + stableKey((v as Record<string, unknown>)[k])).join(',') + '}'
  return JSON.stringify(v)
}
