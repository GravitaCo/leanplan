/**
 * Native twin of backup.ts (picked by Metro for iOS and Android; the web build never sees it): the
 * same JSON safety copy and the same names, so the shared store (downloadBeforeWithdrawal) and the
 * screens call one API. Export writes `tali-backup-<date>.json` and opens the system share sheet;
 * import reads a file the system document picker returned (apps/native/lib/account/backupFile.ts).
 */
import type { PersistedState } from './persistence'
import { exportBackupFile } from '../../apps/native/lib/account/backupFile'
import { parseBackup } from '../../apps/native/lib/account/backupParse'

/** Opens the share sheet with the copy; the person chooses where it goes. */
export function exportBackup(state: PersistedState): void {
  void exportBackupFile(state)
}

/** Reads a picked file (anything with `text()`, as a browser File or an expo-file-system File). */
export async function readBackup(file: { text: () => Promise<string> }): Promise<PersistedState> {
  let text: string
  try { text = await file.text() } catch { throw new Error('unreadable') }
  return parseBackup(text)
}
