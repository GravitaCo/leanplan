/**
 * Hooks for screens still awaiting design approval (onboarding plan §7, §8). Nothing renders
 * them yet; they're the seams the approved UI plugs into.
 */
import { useCallback } from 'react'
import { useStore, selectConnection } from './store'
import { connectionLabel, type ConnectionState } from '@/core/domain/connection'
import { hasConsent, type ConsentType } from '@/data/consent'
import { DELETE_MESSAGES, type DeleteResult } from '@/data/account'

/** The header's connection indicator: its state and the plan's words for it. */
export function useConnection(): ConnectionState & { label: string } {
  const signedIn = useStore((s) => s.signedIn)
  const authed = useStore((s) => s.authed)
  const syncPaused = useStore((s) => s.syncPaused)
  const ownerAsk = useStore((s) => s.ownerAsk)
  const online = useStore((s) => s.online)
  const sync = useStore((s) => s.sync)
  const data = useStore((s) => s.data)
  const c = selectConnection({ signedIn, authed, syncPaused, ownerAsk, online, sync, data })
  return { ...c, label: connectionLabel(c) }
}

/** One consent type's current answer, and the actions for its screen. */
export function useConsent(type: ConsentType): { granted: boolean; grant: () => void; withdraw: () => void } {
  const granted = useStore((s) => hasConsent(s.data, type))
  const grant = useStore((s) => s.grantConsent)
  const withdraw = useStore((s) => s.withdrawConsent)
  return { granted, grant: useCallback(() => grant(type), [grant, type]), withdraw: useCallback(() => withdraw(type), [withdraw, type]) }
}

/**
 * The account-deletion confirm step. `canDelete` is false offline or without a live session, with
 * `reason` saying why (show it in place of the button). `run` resolves with the result and a
 * message for anything but success; on success the app is already on the sign-in screen.
 */
export function useAccountDeletion(): {
  canDelete: boolean
  reason: string | null
  deleting: boolean
  run: () => Promise<{ result: DeleteResult; message: string | null }>
} {
  const online = useStore((s) => s.online)
  const authed = useStore((s) => s.authed)
  const deleting = useStore((s) => s.deletingAccount)
  const del = useStore((s) => s.deleteAccount)
  const reason = !online ? DELETE_MESSAGES.offline : !authed ? DELETE_MESSAGES['no-session'] : null
  const run = useCallback(async () => {
    const result = await del()
    return { result, message: result.status === 'ok' ? null : DELETE_MESSAGES[result.status] }
  }, [del])
  return { canDelete: !reason && !deleting, reason, deleting, run }
}
