/** Export / import the full app state as a JSON safety copy. */
import type { PersistedState } from './persistence'
import { todayStr } from '@/core/domain/date'

export function exportBackup(state: PersistedState): void {
  const blob = new Blob([JSON.stringify(state)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'tend-backup-' + todayStr() + '.json'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function readBackup(file: File): Promise<PersistedState> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => {
      try {
        const s = JSON.parse(String(r.result))
        if (s && s.days && typeof s.days === 'object') resolve(s as PersistedState)
        else reject(new Error('invalid'))
      } catch {
        reject(new Error('unreadable'))
      }
    }
    r.onerror = () => reject(new Error('unreadable'))
    r.readAsText(file)
  })
}
