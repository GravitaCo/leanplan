import type { PersistedState } from '@/data/persistence'

/** The web's readBackup check (src/data/backup.ts): JSON with a `days` object, or it isn't a backup. */
export function parseBackup(text: string): PersistedState {
  let s: unknown
  try { s = JSON.parse(text) } catch { throw new Error('unreadable') }
  if (s && typeof s === 'object' && (s as { days?: unknown }).days && typeof (s as { days?: unknown }).days === 'object') return s as PersistedState
  throw new Error('invalid')
}
