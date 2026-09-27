/**
 * The one connection indicator (onboarding plan §7; board ob6-7): a small pill in the header of
 * every tab. Tapping it shows a line underneath; on "Sync problem" it also tries again. Neutral
 * colours only: every state says the person's data is safe.
 */
import { useStore } from '@/store/store'
import { useConnection } from '@/store/hooks'
import type { ConnectionKind, ConnectionState } from '@/core/domain/connection'
import { healthSyncPaused } from '@/data/consent'
import { Icon, type IconName } from './icons'

/** The note beside an online-only feature (plan §7; board ob6-8). */
export const NEEDS_NET = 'Needs a connection. Search works offline.'

const ICON: Record<ConnectionKind, IconName> = {
  'up-to-date': 'check', pending: 'cloudUp', offline: 'cloudOff', 'sign-in': 'person', problem: 'alert',
}

/** The line under the pill (board ob6-7): the state's name in bold, then what it means. */
export function connectionLine(c: ConnectionState): { head: string; body: string } {
  switch (c.kind) {
    case 'up-to-date': return { head: 'Up to date.', body: 'Everything is saved to your account.' }
    case 'pending': return {
      head: 'Saved on this phone, will sync.',
      body: c.pending === 1 ? '1 change is safe on this phone and uploads when you’re back online.'
        : c.pending > 1 ? `${c.pending} changes are safe on this phone and upload when you’re back online.`
        : 'Your changes are safe on this phone and upload when you’re back online.',
    }
    case 'offline': return { head: 'Offline.', body: 'Logging, search, plans and workouts all still work.' }
    case 'sign-in': return { head: 'Sign in to sync.', body: 'Your data is safe on this phone. Sign in again to back it up.' }
    case 'problem': return { head: 'Sync problem.', body: 'Your data is safe on this phone. Tap to try again, or see what happened.' }
  }
}

export function ConnectionPill({ open, onToggle }: { open?: boolean; onToggle?: () => void }) {
  const c = useConnection()
  const runSync = useStore((s) => s.runSync)
  return (
    <button type="button" className={'cpill num' + (c.kind === 'up-to-date' ? ' ok' : '')} data-conn={c.kind}
      aria-expanded={onToggle ? !!open : undefined} aria-label={c.label}
      onClick={() => { if (c.kind === 'problem') runSync(); onToggle?.() }}>
      <Icon name={ICON[c.kind]} size={15} />
      <span>{c.label}</span>
    </button>
  )
}

export function ConnectionLine() {
  const c = useConnection()
  const held = useStore((s) => healthSyncPaused(s.data))
  const l = connectionLine(c)
  // an existing user's "Not now": the state stays "Up to date", and says what's held back (Benn)
  if (c.kind === 'up-to-date' && held) l.body = 'Health data is kept on this phone until you agree.'
  return <div className="cline" role="status"><b>{l.head}</b> {l.body}</div>
}
