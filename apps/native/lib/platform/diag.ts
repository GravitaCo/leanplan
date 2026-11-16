/**
 * Internal test builds only (EXPO_PUBLIC_DIAG=1, set on the `spike` EAS profile, never on
 * production): keeps the last few sync warnings the shared store writes with console.warn
 * ("sync failed: …", "sync: some records were rejected: …") and the label reader's failures
 * ("label read failed: <outcome> <HTTP status> <error name>", N6) so a long press on the connection
 * pill can show them on the phone, where no console is visible. Messages only, never record
 * contents beyond what the store already logs; kept in memory, never stored or sent.
 */
export const DIAG = process.env.EXPO_PUBLIC_DIAG === '1'

const MAX = 5
const lines: string[] = []

function text(a: unknown): string {
  if (a instanceof Error) {
    const where = (a.stack ?? '').split('\n').slice(1, 5).map((l) => l.trim()).join(' | ')
    return `${a.name}: ${a.message}${where ? ` [${where}]` : ''}`
  }
  if (typeof a === 'string') return a
  try { return JSON.stringify(a)?.slice(0, 300) ?? String(a) } catch { return String(a) }
}

/** Wraps console.warn once; only sync and label-read messages are kept. */
export function installDiag(): void {
  if (!DIAG) return
  const warn = console.warn.bind(console)
  console.warn = (...args: unknown[]) => {
    const first = typeof args[0] === 'string' ? args[0] : ''
    if (first.startsWith('sync') || first.startsWith('label read failed')) {
      const at = new Date().toTimeString().slice(0, 8)
      lines.push(`${at} ${args.map(text).join(' ')}`.slice(0, 900))
      if (lines.length > MAX) lines.shift()
    }
    warn(...args)
  }
}

export const diagLines = (): string[] => [...lines]
