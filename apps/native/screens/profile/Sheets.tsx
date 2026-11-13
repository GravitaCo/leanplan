/**
 * Profile's own sheets, from src/screens/ProfileScreen.tsx (Hand portions, Sign out, Import's
 * confirm). The review-day sheet is N4's (screens/today/WeeklyReview.tsx). Same words, same store actions.
 */
import { useState } from 'react'
import { View } from 'react-native'
import type { HandPortion } from '@/core/types'
import { useStore } from '@/store/store'
import { fmtDate } from '@/core/domain/date'
import { HANDS, handGrams } from '@/core/domain/estimate'
import { consentLetsSync, hasExistingData } from '@/data/consent'
import { backupSummary, unsyncedCount, type PersistedState } from '@/data/persistence'
import { PROFILE as P } from '@/copy/profile'
import { BACKUP, SIGN_OUT } from '@/copy/account'
import { Sub } from '../../lib/ui/text'
import { Btn, List } from '../../lib/ui/kit'
import { FRow } from '../../lib/ui/fields'
import { NavBtn, Sheet } from '../../lib/ui/primitives'
import { PROSE } from './text'
import { exportBackup } from './n2'

/** Weigh one of each once; after that "a palm" is a measurement, not a guess. */
export function HandsSheet({ onClose }: { onClose: () => void }) {
  const profile = useStore((s) => s.data.profile)
  const setPrefs = useStore((s) => s.setPrefs)
  const showToast = useStore((s) => s.showToast)
  const types = Object.keys(HANDS) as HandPortion[]
  const [vals, setVals] = useState<Record<HandPortion, string>>(
    Object.fromEntries(types.map((k) => [k, String(handGrams(profile, k))])) as Record<HandPortion, string>,
  )
  const save = () => {
    const hands: Partial<Record<HandPortion, number>> = { ...profile.hands }
    for (const k of types) { const v = parseFloat(vals[k]); if (v > 0) hands[k] = Math.round(v) }
    setPrefs({ hands }); showToast(P.hands.saved); onClose()
  }
  return (
    <Sheet title={P.hands.title} onClose={onClose} right={<NavBtn title={P.hands.save} bold onPress={save} />}>
      <Sub style={[PROSE, { paddingHorizontal: 4, paddingBottom: 12 }]}>{P.hands.lead}</Sub>
      <List>
        {types.map((k) => (
          <FRow key={k} label={HANDS[k].label} hint={HANDS[k].hint} unit={P.hands.unit} keyboardType="number-pad" value={vals[k]} onChangeText={(v) => setVals({ ...vals, [k]: v })} />
        ))}
      </List>
    </Sheet>
  )
}

/** Sign out, optionally removing this device's log (shared phones). It stays in the account. */
export function SignOutSheet({ onClose }: { onClose: () => void }) {
  const signOut = useStore((s) => s.signOut)
  const data = useStore((s) => s.data)
  const [busy, setBusy] = useState<'keep' | 'remove' | null>(null)
  const [sure, setSure] = useState(false)
  const unsynced = unsyncedCount(data)
  // no yes to health data: the log isn't in the account at all, so removing it deletes the only copy
  const phoneOnly = !consentLetsSync(data) && hasExistingData(data)
  const go = async (remove: boolean) => {
    if (busy) return
    if (remove && (unsynced > 0 || phoneOnly) && !sure) { setSure(true); return } // losing data takes a second tap
    setBusy(remove ? 'remove' : 'keep')
    try { await signOut({ remove }) } finally { setBusy(null) }
  }
  return (
    <Sheet title={SIGN_OUT.title} onClose={onClose}>
      <View style={{ paddingHorizontal: 4, paddingBottom: 2 }}>
        <Sub style={[PROSE, { marginBottom: 10 }]}>{phoneOnly ? SIGN_OUT.phoneOnly : SIGN_OUT.stays}</Sub>
        {!phoneOnly && unsynced > 0 && <Sub style={[PROSE, { marginBottom: 10 }]}>{SIGN_OUT.unsynced(unsynced)}</Sub>}
      </View>
      <View style={{ gap: 8, marginTop: 6 }}>
        <Btn kind="tinted" disabled={!!busy} title={busy === 'keep' ? SIGN_OUT.signingOut : SIGN_OUT.title} onPress={() => void go(false)} />
        {phoneOnly && <Btn kind="gray" disabled={!!busy} title={SIGN_OUT.exportCopy} onPress={() => exportBackup(data)} />}
        <Btn kind="danger" disabled={!!busy} onPress={() => void go(true)}
          title={busy === 'remove' ? SIGN_OUT.signingOut : sure && phoneOnly ? SIGN_OUT.removeSure : sure && unsynced > 0 ? SIGN_OUT.removeLose(unsynced) : SIGN_OUT.remove} />
      </View>
    </Sheet>
  )
}

/** Confirm step before a backup replaces data: say what's in it and what changes. */
export function ImportSheet({ backup, onClose, onImport }: { backup: PersistedState; onClose: () => void; onImport: () => void }) {
  const b = backupSummary(backup)
  const span = b.first && b.last ? (b.first === b.last ? ' (' + fmtDate(b.first).full + ')' : ' (' + fmtDate(b.first).full + ' to ' + fmtDate(b.last).full + ')') : ''
  return (
    <Sheet title={BACKUP.importTitle} onClose={onClose}>
      <View style={{ paddingHorizontal: 4, paddingBottom: 2 }}>
        <Sub style={[PROSE, { marginBottom: 10 }]}>{BACKUP.has(b, span)}</Sub>
        <Sub style={[PROSE, { marginBottom: 10 }]}>{BACKUP.replaces(b)}</Sub>
      </View>
      <View style={{ marginTop: 6 }}><Btn kind="tinted" title={BACKUP.importBtn} onPress={onImport} /></View>
    </Sheet>
  )
}
