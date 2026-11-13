/**
 * Native twin of backup.ts (picked by Metro for iOS and Android; the web build never sees it): the
 * same JSON safety copy and the same names, so the shared store (downloadBeforeWithdrawal) and the
 * screens call one API. The app registers the file side at startup (apps/native/lib/account/
 * backupFile.ts calls setBackupExporter: a file in the cache and the system share sheet), so shared
 * code never imports the native file modules.
 */
import type { PersistedState } from './persistence'

let exporter: ((state: PersistedState) => Promise<boolean>) | null = null
export function setBackupExporter(fn: (state: PersistedState) => Promise<boolean>): void { exporter = fn }

/** Opens the share sheet with the copy; the person chooses where it goes. */
export function exportBackup(state: PersistedState): void {
  if (exporter) void exporter(state)
}

/** The web's readBackup check, on anything with `text()` (a browser File or an expo-file-system File). */
export async function readBackup(file: { text: () => Promise<string> }): Promise<PersistedState> {
  let text: string
  try { text = await file.text() } catch { throw new Error('unreadable') }
  let s: unknown
  try { s = JSON.parse(text) } catch { throw new Error('unreadable') }
  if (s && typeof s === 'object' && (s as { days?: unknown }).days && typeof (s as { days?: unknown }).days === 'object') return s as PersistedState
  throw new Error('invalid')
}
