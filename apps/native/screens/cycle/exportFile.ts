/**
 * "Export my cycle log" (boards D1, D2, D5): the device-only Cycle log as a JSON file through the
 * system share sheet, as the backup export does (lib/account/backupFile.ts). The person chooses
 * where it goes; the file isn't encrypted (the page says so). The copy in this app's cache is
 * deleted on iOS once the sheet closes, and on the next export or launch otherwise.
 */
import { Platform } from 'react-native'
import { Directory, File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import type { CycleStore } from '@/core/domain/cycle'
import { todayStr } from '@/core/domain/date'
import { nowIso } from '@/data/supabase'

const NAME_RE = /^tilo-cycle-.*\.json$/

export function clearCycleCopies(): void {
  try {
    for (const f of new Directory(Paths.cache).list()) {
      if (f instanceof File && NAME_RE.test(f.name)) { try { f.delete() } catch { /* in use */ } }
    }
  } catch { /* no cache yet */ }
}

/** Resolves false if it couldn't be offered. */
export async function exportCycleFile(log: CycleStore): Promise<boolean> {
  try {
    if (!(await Sharing.isAvailableAsync())) return false
    clearCycleCopies()
    const file = new File(Paths.cache, `tilo-cycle-${todayStr()}.json`)
    file.create({ overwrite: true })
    file.write(JSON.stringify({ app: 'Tilo', kind: 'cycle-log', exportedAt: nowIso(), log }, null, 2))
    try {
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Export' })
    } finally {
      if (Platform.OS === 'ios') { try { file.delete() } catch { /* already gone */ } }
    }
    return true
  } catch {
    return false
  }
}
