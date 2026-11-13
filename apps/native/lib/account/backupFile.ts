/**
 * Export and import of the JSON safety copy on a phone (src/data/backup.ts on the web, which
 * downloads and uploads through the browser). Export writes the same file, under the same name
 * (`tali-backup-<date>.json`, the same JSON as the web's), to this app's cache and opens the
 * system share sheet, where the person saves it to Files or sends it on. Import opens the system
 * document picker and reads the file the same way the web's readBackup does. Nothing leaves the
 * phone unless the person chooses where it goes.
 */
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import * as DocumentPicker from 'expo-document-picker'
import type { PersistedState } from '@/data/persistence'
import { todayStr } from '@/core/domain/date'
import { parseBackup } from './backupParse'

export const backupName = () => 'tali-backup-' + todayStr() + '.json'

/** Writes the copy and opens the share sheet. Resolves false if it couldn't be offered. */
export async function exportBackup(state: PersistedState): Promise<boolean> {
  try {
    if (!(await Sharing.isAvailableAsync())) return false
    const file = new File(Paths.cache, backupName())
    file.create({ overwrite: true })
    file.write(JSON.stringify(state))
    try {
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Export' })
    } finally {
      // the share sheet has its own copy by now: the cache keeps no health data behind
      try { file.delete() } catch { /* already gone */ }
    }
    return true
  } catch {
    return false
  }
}

/** Picks a backup file. Resolves null if the person cancelled; rejects if it isn't a backup. */
export async function pickBackup(): Promise<PersistedState | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'public.json', 'text/plain'], copyToCacheDirectory: true, multiple: false })
  if (res.canceled || !res.assets?.[0]) return null
  const file = new File(res.assets[0].uri)
  let text: string
  try { text = await file.text() } catch { throw new Error('unreadable') } finally { try { file.delete() } catch { /* not ours to delete */ } }
  return parseBackup(text)
}
