/**
 * Profile's own sheets, from src/screens/ProfileScreen.tsx (Hand portions, Sign out, Import's
 * confirm) and review/WeeklyReview.tsx (the review day, board ml-d1). Same words, same store actions.
 */
import { useState } from 'react'
import { Text, View } from 'react-native'
import type { HandPortion } from '@/core/types'
import { useStore } from '@/store/store'
import { fmtDate } from '@/core/domain/date'
import { HANDS, handGrams } from '@/core/domain/estimate'
import { consentLetsSync, hasExistingData } from '@/data/consent'
import { backupSummary, unsyncedCount, type PersistedState } from '@/data/persistence'
import { IMPORT, PROFILE as P, SIGN_OUT } from '@/copy/profile'
import { dayName } from '@/screens/review/reviewModel'
import { tx, useTokens } from '../../lib/theme'
import { Sub } from '../../lib/ui/text'
import { Btn, Chip, Chips } from '../../lib/ui/kit'
import { NavBtn, Sheet } from '../../lib/ui/primitives'
import { PROSE } from './text'
import { exportBackup } from './n2'
import { pushReady } from './n12'

/** Weigh one of each once; after that "a palm" is a measurement, not a guess. */
export function HandsSheet({ onClose }: { onClose: () => void }) {
  const profile = useStore((s) => s.data.profile)
  const setPrefs = useStore((s) => s.setPrefs)
  const showToast = useStore((s) => s.showToast)
  const types = Object.keys(HANDS) as HandPortion[]
  const [vals] = useState<Record<HandPortion, string>>(
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
      {/* TODO(N1-followup) item 1, `.frow` number fields in a List: one per HANDS type (label, hint, grams, P.hands.unit), editing `vals` (src/screens/ProfileScreen.tsx HandsSheet) */}
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
        <Sub style={[PROSE, { marginBottom: 10 }]}>{phoneOnly ? SIGN_OUT.phoneOnly : SIGN_OUT.keeps}</Sub>
        {!phoneOnly && unsynced > 0 && <Sub style={[PROSE, { marginBottom: 10 }]}>{SIGN_OUT.unsynced(unsynced)}</Sub>}
      </View>
      <View style={{ gap: 8, marginTop: 6 }}>
        <Btn kind="tinted" disabled={!!busy} title={busy === 'keep' ? SIGN_OUT.signingOut : SIGN_OUT.go} onPress={() => void go(false)} />
        {phoneOnly && <Btn kind="gray" disabled={!!busy} title={SIGN_OUT.exportCopy} onPress={() => exportBackup(data)} />}
        <Btn kind="danger" disabled={!!busy} onPress={() => void go(true)}
          title={busy === 'remove' ? SIGN_OUT.signingOut : sure && phoneOnly ? SIGN_OUT.removeDelete : sure && unsynced > 0 ? SIGN_OUT.removeLose(unsynced) : SIGN_OUT.remove} />
      </View>
    </Sheet>
  )
}

/** Confirm step before a backup replaces data: say what's in it and what changes. */
export function ImportSheet({ backup, onClose, onImport }: { backup: PersistedState; onClose: () => void; onImport: () => void }) {
  const b = backupSummary(backup)
  const n = (x: number, one: string, many: string) => x + ' ' + (x === 1 ? one : many)
  const span = b.first && b.last ? (b.first === b.last ? ' (' + fmtDate(b.first).full + ')' : ' (' + fmtDate(b.first).full + ' to ' + fmtDate(b.last).full + ')') : ''
  return (
    <Sheet title={IMPORT.title} onClose={onClose}>
      <View style={{ paddingHorizontal: 4, paddingBottom: 2 }}>
        <Sub style={[PROSE, { marginBottom: 10 }]}>{IMPORT.has(n(b.days, 'day', 'days'), span, n(b.foods, 'saved food', 'saved foods'), n(b.recipes, 'recipe', 'recipes'), n(b.workouts, 'workout', 'workouts'))}</Sub>
        <Sub style={[PROSE, { marginBottom: 10 }]}>{IMPORT.replaces(b.days ? (b.days === 1 ? ', that day' : ', those ' + b.days + ' days') : '', !!(b.foods || b.recipes), !!b.workouts)}</Sub>
      </View>
      <View style={{ marginTop: 6 }}><Btn kind="tinted" title={IMPORT.go} onPress={onImport} /></View>
    </Sheet>
  )
}

/** ml-d1: the review day, and the opt-in reminder (off unless the person says "Remind me"). */
export function ReviewDaySheet({ onClose }: { onClose: () => void }) {
  const t = useTokens()
  const day = useStore((s) => s.data.profile.reviewDay ?? 0)
  const push = useStore((s) => s.data.profile.reviewPush)
  const time = useStore((s) => s.data.profile.reviewPushTime ?? '09:00')
  const setPrefs = useStore((s) => s.setPrefs)
  const setReviewPush = useStore((s) => s.setReviewPush)
  const showToast = useStore((s) => s.showToast)
  const remind = async () => {
    // push is stream N12: until it lands, the phone answers as a browser without push does
    const ok = pushReady() && await setReviewPush(true)
    showToast(ok ? P.notify.weeklyOn : P.notify.weeklyFailed)
  }
  const h3 = [tx(17, 600), { color: t.label }]
  const d = [tx(13, 400, 1.4), { color: t.label2 }]
  // the review sheet's words are N4's (review/WeeklyReview.tsx); they move to src/copy with Today's review
  return (
    <Sheet title="Your weekly review" onClose={onClose} left={null} right={<NavBtn title="Done" bold onPress={onClose} />}>
      <View style={{ gap: 16 }}>
        <Text style={[tx(16, 400, 1.45), { color: t.label2 }]}>A two-minute look back at your week, with everything side by side.</Text>
        {/* TODO(N1-followup): the decorative `.lp-chipsrow` (Sleep, Stress, Mood, Hunger, Movement, Food, Weight), N4's review sheet piece */}
        <View style={{ gap: 10 }}>
          <Text accessibilityRole="header" style={h3}>Which day suits you?</Text>
          {/* TODO(N1-followup): the `.lp-days` day picker (seven round radios, M to S, labels Monday to Sunday) setting setPrefs({ reviewDay }), N4's review sheet piece */}
          <Text style={d}>It’ll be waiting on Summary from {dayName(day)} morning. No pressure to open it that day.</Text>
        </View>
        <View style={{ gap: 10 }}>
          <Text accessibilityRole="header" style={h3}>Want a reminder for your weekly review?</Text>
          <Text style={d}>One note on {dayName(day)}, nothing else.</Text>
          {push
            ? <Chips><Chip title="Reminder on" on onPress={() => undefined} /><Chip title="Turn it off" onPress={() => { if (pushReady()) void setReviewPush(false) }} /></Chips>
            : <View style={{ gap: 8 }}>
                <Btn small title="Remind me" onPress={() => void remind()} />
                <Btn small kind="gray" title="No thanks" onPress={() => { if (push === undefined) setPrefs({ reviewPush: false }); onClose() }} />
              </View>}
          <Text style={d}>Once a week on {dayName(day)} at {time} UK time. It only says “Your week is ready”, nothing from your log. Turn it off any time in Profile.</Text>
        </View>
      </View>
    </Sheet>
  )
}
