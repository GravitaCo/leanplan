/**
 * Profile's wellbeing groups (WELLBEING_ENABLED only, as on the web):
 * - "What do you want Tilo for?" and "How often Tilo asks" (board B1), from
 *   src/screens/profile/PillarsSettings.tsx; copy pillarsCopy.ts, helpers profileLogic.ts.
 * - Notifications' Mind reminder rows, the back-off notices, the supplement names row and "Your
 *   times" (board B11), from NotificationsSettings.tsx; copy notifyCopy.ts.
 * Push itself is stream N12. Until it lands, pushReady() (./n12) is false, so every
 * reminder switch shows the web's no-push state (disabled, as in a browser without push) and
 * nothing here switches a reminder off on the account.
 */
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { NotifyKind, Pillar } from '@/core/types'
import { useStore } from '@/store/store'
import { NOTIFY_KINDS, PILLARS } from '@/core/domain/checkin'
import { healthLoggingAllowed } from '@/data/consent'
import { backoffDismissed } from '@/data/deviceOnly'
import { pushReady } from './n12'
import { isHHMM, kindTimes, usualTimes } from '../../../../supabase/functions/_shared/reminders'
import { PILLARS_COPY as PC } from '@/screens/profile/pillarsCopy'
import { NOTIFY_COPY as NC, backoffLine } from '@/screens/profile/notifyCopy'
import { atRiskRoute, offAfter, pillarsOn } from '@/screens/profile/profileLogic'
import { font, num, useTokens } from '../theme'
import { Btn, Foot, Icon, Input, Lbl, List, PlainRow, Seg, SettingRow, Toggle, type IconName } from './ui'
import { SupportSheet } from './Support'

const PILLAR_ICON: Record<Pillar, [IconName, 'mindFill' | 'foodFill' | 'moveFill']> = {
  mind: ['smile', 'mindFill'], food: ['fork', 'foodFill'], move: ['dumbbell', 'moveFill'],
}

/** B1: three pillar switches (the last one on can't move: B1.9), the foot, B1.16's two links, the asks Seg. */
export function PillarsSettings({ onDisplay }: { onDisplay: () => void }) {
  const t = useTokens()
  const mind = useStore((s) => s.data.profile.mind)
  const gentle = useStore((s) => s.data.profile.gentle)
  const outcomes = useStore((s) => s.data.profile.outcomes)
  const setMindPrefs = useStore((s) => s.setMindPrefs)
  const [support, setSupport] = useState(false)
  const on = pillarsOn(mind)
  const foodOff = !on.includes('food')
  const link = (title: string, onPress: () => void) => <Text accessibilityRole="button" onPress={onPress} style={{ color: t.tint }}>{title}</Text>
  return (
    <View accessibilityLabel={PC.heading}>
      <Lbl>{PC.heading}</Lbl>
      <List icons>
        {PILLARS.map((p) => {
          const isOn = on.includes(p)
          const last = isOn && on.length === 1
          return (
            <SettingRow key={p} icon={PILLAR_ICON[p][0]} color={t[PILLAR_ICON[p][1]]} label={PC.rows[p].label} sub={last ? PC.lastOn : PC.rows[p].sub}
              right={<Toggle label={PC.rows[p].label} on={isOn} disabled={last} onChange={() => { setMindPrefs({ off: offAfter(useStore.getState().data.profile.mind, p) }) }} />} />
          )
        })}
      </List>
      <Foot>{foodOff && on.length > 1 ? PC.foodOff : PC.foot}</Foot>
      {foodOff && atRiskRoute({ gentle, outcomes }) && (
        <Foot>{PC.hard.lead}{link(PC.hard.display, onDisplay)}{PC.hard.mid}{link(PC.hard.support, () => setSupport(true))}{PC.hard.end}</Foot>
      )}
      <Lbl>{PC.asksHeading}</Lbl>
      <List style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
        <Seg<'usual' | 'fewer'> options={[['usual', PC.asks.usual], ['fewer', PC.asks.fewer]]} value={mind?.asks ?? 'usual'} onChange={(v) => { setMindPrefs({ asks: v }) }} />
      </List>
      <Foot>{PC.asksFoot}</Foot>
      {support && <SupportSheet context="mind" onClose={() => setSupport(false)} />}
    </View>
  )
}

const NOTIFY_ICON: Record<NotifyKind, IconName> = { checkin: 'bell', 'wind-down': 'moon', plan: 'list' }

/** B11.2 to B11.7: Check-in, Wind-down and Plan check-in, above Supplement reminders. */
export function MindReminderRows() {
  const t = useTokens()
  const mind = useStore((s) => s.data.profile.mind)
  const setMindReminder = useStore((s) => s.setMindReminder)
  const showToast = useStore((s) => s.showToast)
  const at = kindTimes(mind)
  const ready = pushReady()
  const toggle = async (kind: NotifyKind) => {
    const on = mind?.notify?.[kind] !== true
    const r = await setMindReminder(kind, on)
    showToast(r === true ? (on ? 'Reminders on' : 'Reminders off')
      : r === 'consent' ? 'Reminders start once you’ve agreed in Profile, then Privacy.'
      : r === 'denied' ? 'Permission denied'
      : r === 'unsaved' ? (on ? 'Reminders on' : 'Reminders off') + ', but this device couldn’t save the setting. Storage may be full.'
      : 'Not supported in this browser')
  }
  return (
    <>
      {NOTIFY_KINDS.map((k) => {
        const on = mind?.notify?.[k] === true
        return (
          <SettingRow key={k} wrapSub icon={NOTIFY_ICON[k]} color={t.mindFill} label={NC.rows[k].label} sub={NC.rows[k].sub}
            value={on && k !== 'plan' ? at[k] : undefined}
            right={<Toggle label={NC.rows[k].aria} on={on} disabled={!ready} onChange={() => void toggle(k)} />} />
        )
      })}
    </>
  )
}

/** B11b: "Show supplement names in reminders", under Supplement reminders while they're on. */
export function SuppNamesRow() {
  const on = useStore((s) => s.data.profile.mind?.lockNames === true)
  const setMindPrefs = useStore((s) => s.setMindPrefs)
  return <PlainRow title={NC.names} right={<Toggle label={NC.names} on={on} onChange={() => { setMindPrefs({ lockNames: !on }) }} />} />
}

/**
 * B11.9 to B11.12: the usual wake and wind-down times (health data: not editable while health
 * logging is off). A typed HH:MM saves as the web's time field does; N1's Wheel picker replaces the
 * text field.
 */
export function YourTimes() {
  const data = useStore((s) => s.data)
  const setMindPrefs = useStore((s) => s.setMindPrefs)
  const times = usualTimes(data.profile.mind)
  const allowed = healthLoggingAllowed(data)
  const row = (k: 'wakeAt' | 'windDownAt', label: string) => <TimeRow key={k} label={label} value={times[k]} editable={allowed}
    onSave={(v) => { if (v === '') setMindPrefs({ [k]: null }); else if (isHHMM(v)) setMindPrefs({ [k]: v }) }} />
  return (
    <>
      <Lbl>{NC.timesHeading}</Lbl>
      <List>
        {row('wakeAt', NC.wakeAt)}
        {row('windDownAt', NC.windDownAt)}
      </List>
      <Foot>{NC.foot}</Foot>
    </>
  )
}

/** `.frow` with a time: the label, then the value on the right; saved when a full HH:MM is typed. */
function TimeRow({ label, value, editable, onSave }: { label: string; value: string; editable: boolean; onSave: (v: string) => void }) {
  const t = useTokens()
  const [v, setV] = useState(value)
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingHorizontal: 16 }}>
      <Text style={[font(), { fontSize: 17, color: t.label, flex: 1 }]}>{label}</Text>
      <Input label={label} value={v} editable={editable} keyboardType="numbers-and-punctuation" placeholder="HH:MM"
        onChangeText={(x) => { setV(x); if (x === '' || isHHMM(x)) onSave(x) }}
        style={[num, { backgroundColor: 'transparent', paddingHorizontal: 0, textAlign: 'right', width: 80, flex: 0, color: t.label2 }]} />
    </View>
  )
}

/** B11.14 to B11.16: one back-off notice per type sent less often, until closed. */
export function BackoffNotices() {
  const t = useTokens()
  const data = useStore((s) => s.data)
  const backToUsual = useStore((s) => s.backToUsual)
  const dismissBackoff = useStore((s) => s.dismissBackoff)
  const halved = data.profile.mind?.halved
  const kinds = NOTIFY_KINDS.filter((k) => halved?.[k] && data.profile.mind?.notify?.[k] === true && !backoffDismissed(data, k, halved[k]))
  if (!kinds.length) return null
  return (
    <>
      {kinds.map((k) => (
        <View key={k} accessibilityRole="summary" style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: t.card, borderRadius: t.radiusSm, padding: 14, marginBottom: 8 }}>
          <Icon name="info" color={t.mindInk} />
          <View style={{ flex: 1, gap: 10 }}>
            <Text style={[font(), { fontSize: 15, lineHeight: 21, color: t.label }]}>{backoffLine(k)}</Text>
            <Btn kind="gray" small title={NC.backToUsual} onPress={() => backToUsual(k)} />
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={NC.dismiss} onPress={() => dismissBackoff(k)} hitSlop={10}
            style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: t.fill, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="x" size={12} stroke={3} color={t.label2} />
          </Pressable>
        </View>
      ))}
    </>
  )
}
