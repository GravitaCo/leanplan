/**
 * Profile's own sheets, from src/screens/ProfileScreen.tsx (Hands, Sign out, Import's confirm) and
 * review/WeeklyReview.tsx (the review day, board ml-d1). Same words, same store actions.
 */
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { HandPortion } from '@/core/types'
import { useStore } from '@/store/store'
import { fmtDate } from '@/core/domain/date'
import { HANDS, handGrams } from '@/core/domain/estimate'
import { consentLetsSync, hasExistingData } from '@/data/consent'
import { backupSummary, unsyncedCount, type PersistedState } from '@/data/persistence'
import { pushSupported } from '@/data/push'
import { DAYS, dayName } from '@/screens/profile/profileLogic'
import { font, num, useTokens } from '../theme'
import { Btn, Input, List, NavBtn, Sheet } from './ui'
import { exportBackup } from './n2'

const prose = (t: ReturnType<typeof useTokens>) => [font(), { fontSize: 15, lineHeight: 22, color: t.label2, marginBottom: 10 }]

/** Weigh one of each once; after that "a palm" is a measurement, not a guess. */
export function HandsSheet({ onClose }: { onClose: () => void }) {
  const t = useTokens()
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
    setPrefs({ hands }); showToast('Hand portions saved'); onClose()
  }
  return (
    <Sheet title="Hand portions" onClose={onClose} right={<NavBtn title="Save" bold onPress={save} />}>
      <Text style={[font(), { fontSize: 15, lineHeight: 21, color: t.label2, paddingHorizontal: 4, paddingBottom: 12 }]}>
        Hands scale with the person, which is why they work. Weigh one of each once and enter it here. After that, "a palm" is a measurement, not a guess.
      </Text>
      <List>
        {types.map((k) => (
          <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingHorizontal: 16 }}>
            <View style={{ minWidth: 96, flex: 1 }}>
              <Text style={[font(), { fontSize: 17, color: t.label }]}>{HANDS[k].label}</Text>
              <Text style={[font(), { fontSize: 13, color: t.label2 }]}>{HANDS[k].hint}</Text>
            </View>
            <Input label={HANDS[k].label} value={vals[k]} keyboardType="number-pad" onChangeText={(v) => setVals({ ...vals, [k]: v })}
              style={[num, { backgroundColor: 'transparent', paddingHorizontal: 0, textAlign: 'right', minWidth: 60 }]} />
            <Text style={[font(), { fontSize: 17, color: t.label2 }]}>g</Text>
          </View>
        ))}
      </List>
    </Sheet>
  )
}

/** Sign out, optionally removing this device's log (shared phones). It stays in the account. */
export function SignOutSheet({ onClose }: { onClose: () => void }) {
  const t = useTokens()
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
    <Sheet title="Sign out" onClose={onClose}>
      <View style={{ paddingHorizontal: 4, paddingBottom: 2 }}>
        {phoneOnly
          ? <Text style={prose(t)}>What you log now is only on this phone: nothing syncs to your account until you agree to Tilo keeping your health data. Signing out keeps it here for when you sign back in. Removing it deletes it from this phone for good, so export a copy first.</Text>
          : <Text style={prose(t)}>Your log stays on this device for when you sign back in. On a shared phone you can remove it instead: it stays in your account.</Text>}
        {!phoneOnly && unsynced > 0 && <Text style={prose(t)}>{unsynced === 1 ? '1 change hasn’t' : unsynced + ' changes haven’t'} synced yet, so removing the log now would lose {unsynced === 1 ? 'it' : 'them'}. Connect first, or export a copy in Back up and restore.</Text>}
      </View>
      <View style={{ gap: 8, marginTop: 6 }}>
        <Btn kind="tinted" disabled={!!busy} title={busy === 'keep' ? 'Signing out…' : 'Sign out'} onPress={() => void go(false)} />
        {phoneOnly && <Btn kind="gray" disabled={!!busy} title="Export a copy" onPress={() => exportBackup(data)} />}
        <Btn kind="danger" disabled={!!busy} onPress={() => void go(true)}
          title={busy === 'remove' ? 'Signing out…' : sure && phoneOnly ? 'Remove anyway and delete your log' : sure && unsynced > 0 ? 'Remove anyway and lose ' + (unsynced === 1 ? '1 change' : unsynced + ' changes') : 'Sign out and remove this device’s log'} />
      </View>
    </Sheet>
  )
}

/** Confirm step before a backup replaces data: say what's in it and what changes. */
export function ImportSheet({ backup, onClose, onImport }: { backup: PersistedState; onClose: () => void; onImport: () => void }) {
  const t = useTokens()
  const b = backupSummary(backup)
  const n = (x: number, one: string, many: string) => x + ' ' + (x === 1 ? one : many)
  const span = b.first && b.last ? (b.first === b.last ? ' (' + fmtDate(b.first).full + ')' : ' (' + fmtDate(b.first).full + ' to ' + fmtDate(b.last).full + ')') : ''
  return (
    <Sheet title="Import backup" onClose={onClose}>
      <View style={{ paddingHorizontal: 4, paddingBottom: 2 }}>
        <Text style={prose(t)}>This backup has {n(b.days, 'day', 'days')}{span}, {n(b.foods, 'saved food', 'saved foods')}, {n(b.recipes, 'recipe', 'recipes')} and {n(b.workouts, 'workout', 'workouts')}.</Text>
        <Text style={prose(t)}>Importing replaces your targets and profile{b.days ? (b.days === 1 ? ', that day' : ', those ' + b.days + ' days') : ''}{b.foods || b.recipes ? ' and any saved food or recipe with the same name' : ''}{b.workouts ? ', and adds its workouts' : ''} on all your devices. Anything else here stays as it is.</Text>
      </View>
      <View style={{ marginTop: 6 }}><Btn kind="tinted" title="Import" onPress={onImport} /></View>
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
    const ok = pushSupported() && await setReviewPush(true)
    showToast(ok ? 'Weekly reminder on' : 'Couldn’t turn the reminder on. Try again when you’re online')
  }
  const h3 = [font(600), { fontSize: 17, color: t.label }]
  const d = [font(), { fontSize: 13, lineHeight: 18, color: t.label2 }]
  const pill = (title: string, on: boolean, onPress?: () => void) => (
    <Pressable accessibilityRole="button" disabled={!onPress} onPress={onPress}
      style={{ borderRadius: 18, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: on ? t.tintSoft : t.fill }}>
      <Text style={[font(600), { fontSize: 15, color: on ? t.tint : t.label }]}>{title}</Text>
    </Pressable>
  )
  const chips = ['Sleep', 'Stress', 'Mood', 'Hunger', 'Movement', 'Food', 'Weight']
  return (
    <Sheet title="Your weekly review" onClose={onClose} left={null} right={<NavBtn title="Done" bold onPress={onClose} />}>
      <View style={{ gap: 16 }}>
        <Text style={[font(), { fontSize: 16, lineHeight: 23, color: t.label2 }]}>A two-minute look back at your week, with everything side by side.</Text>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {chips.map((c) => <Text key={c} style={[font(500), { fontSize: 13, color: t.label2, backgroundColor: t.fill, borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10, overflow: 'hidden' }]}>{c}</Text>)}
        </View>
        <View style={{ gap: 10 }}>
          <Text accessibilityRole="header" style={h3}>Which day suits you?</Text>
          <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {DAYS.map(([nDay, s, full]) => (
              <Pressable key={nDay} accessibilityRole="radio" accessibilityState={{ checked: day === nDay }} accessibilityLabel={full} onPress={() => setPrefs({ reviewDay: nDay })}
                style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: day === nDay ? t.btn : t.fill }}>
                <Text style={[font(600), { fontSize: 15, color: day === nDay ? t.btnInk : t.label }]}>{s}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={d}>It’ll be waiting on Summary from {dayName(day)} morning. No pressure to open it that day.</Text>
        </View>
        <View style={{ gap: 10 }}>
          <Text accessibilityRole="header" style={h3}>Want a reminder for your weekly review?</Text>
          <Text style={d}>One note on {dayName(day)}, nothing else.</Text>
          {push
            ? <View style={{ flexDirection: 'row', gap: 8 }}>{pill('Reminder on', true)}{pill('Turn it off', false, pushSupported() ? () => void setReviewPush(false) : undefined)}</View>
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
