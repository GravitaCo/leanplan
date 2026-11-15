/**
 * The web render of the native app (only for side-by-side checks against the web app): the
 * browser's own download and file picker, as src/data/backup.ts does.
 */
import type { PersistedState } from '@/data/persistence'
import { readBackup } from '@/data/backup'

/** Nothing is kept on the web: the browser downloads the file (src/data/backup.ts). */
export function clearBackupCopies(): void {}

export function pickBackup(): Promise<PersistedState | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.style.display = 'none'
    input.onchange = () => {
      const f = input.files?.[0]
      input.remove()
      if (!f) return resolve(null)
      readBackup(f).then(resolve, reject)
    }
    document.body.appendChild(input)
    input.click()
  })
}
