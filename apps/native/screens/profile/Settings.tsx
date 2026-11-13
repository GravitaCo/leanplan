/**
 * Profile's wellbeing groups (WELLBEING_ENABLED only, as on the web):
 * - "What do you want Tilo for?" and "How often Tilo asks" (board B1), from
 *   src/screens/profile/PillarsSettings.tsx.
 * - Notifications' Mind reminder rows, the back-off notices, the supplement names row and "Your
 *   times" (board B11), from NotificationsSettings.tsx.
 * Push is stream N12: until it lands pushReady() (./n12) is false, so every reminder switch shows the
 * web's no-push state and nothing here switches a reminder on or off on the account.
 */
import { View } from 'react-native'
import type { NotifyKind, Pillar } from '@/core/types'
import { useStore } from '@/store/store'
import { NOTIFY_KINDS, PILLARS } from '@/core/domain/checkin'
import { backoffDismissed } from '@/data/deviceOnly'
import { isHHMM, kindTimes, usualTimes } from '../../../../supabase/functions/_shared/reminders'
import { healthLoggingAllowed } from '@/data/consent'
import { FRow } from '../../lib/ui/fields'
import { TimeField } from '../../lib/ui/pickers'
import { PILLARS_COPY as PC } from '@/copy/pillars'
import { NOTIFY_COPY as NC, backoffLine } from '@/copy/notify'
import { atRiskRoute, offAfter, pillarsOnList } from '@/screens/profile/profileModel'
import { tx, useTokens, type Tokens } from '../../lib/theme'
import { Foot, Lbl } from '../../lib/ui/text'
import { Banner, Btn, LinkBtn, List } from '../../lib/ui/kit'
import { Row, Seg, SettingRow, Toggle } from '../../lib/ui/primitives'
import type { IconName } from '../../lib/ui/icons'
import { pushReady } from './n12'

const PILLAR_ICON: Record<Pillar, [IconName, keyof Tokens]> = {
  mind: ['smile', 'mindFill'], food: ['fork', 'foodFill'], move: ['dumbbell', 'moveFill'],
}

/** B1: three pillar switches (the last one on can't move: B1.9), the foot, B1.16's two links, the asks Seg. */
export function PillarsSettings({ onDisplay, onSupport }: { onDisplay: () => void; onSupport: () => void }) {
  const t = useTokens()
  const mind = useStore((s) => s.data.profile.mind)
  const gentle = useStore((s) => s.data.profile.gentle)
  const outcomes = useStore((s) => s.data.profile.outcomes)
  const setMindPrefs = useStore((s) => s.setMindPrefs)
  const on = pillarsOnList(mind)
  const foodOff = !on.includes('food')
  return (
    <View accessibilityLabel={PC.heading}>
      <Lbl>{PC.heading}</Lbl>
      <List icons>
        {PILLARS.map((p) => {
          const isOn = on.includes(p)
          const last = isOn && on.length === 1
          return (
            <SettingRow key={p} soft icon={PILLAR_ICON[p][0]} color={t[PILLAR_ICON[p][1]] as string} label={PC.rows[p].label} sub={last ? PC.lastOn : PC.rows[p].sub}
              right={<Toggle label={PC.rows[p].label} on={isOn} disabled={last} onChange={() => { setMindPrefs({ off: offAfter(useStore.getState().data.profile.mind, p) }) }} />} />
          )
        })}
      </List>
      <Foot>{foodOff && on.length > 1 ? PC.foodOff : PC.foot}</Foot>
      {foodOff && atRiskRoute({ gentle, outcomes }) && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', paddingTop: 7, paddingHorizontal: 16 }}>
          <Foot style={{ paddingTop: 0, paddingHorizontal: 0 }}>{PC.hard.lead}</Foot>
          <LinkBtn title={PC.hard.display} onPress={onDisplay} style={[tx(13, 400, 1.38), { color: t.tint, paddingTop: 0, paddingHorizontal: 0, paddingVertical: 0 }]} />
          <Foot style={{ paddingTop: 0, paddingHorizontal: 0 }}>{PC.hard.mid}</Foot>
          <LinkBtn title={PC.hard.support} onPress={onSupport} style={[tx(13, 400, 1.38), { color: t.tint, paddingTop: 0, paddingHorizontal: 0, paddingVertical: 0 }]} />
          <Foot style={{ paddingTop: 0, paddingHorizontal: 0 }}>{PC.hard.end}</Foot>
        </View>
      )}
      <Lbl>{PC.asksHeading}</Lbl>
      <List style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
        <Seg<'usual' | 'fewer'> options={[['usual', PC.asks.usual], ['fewer', PC.asks.fewer]]} value={mind?.asks ?? 'usual'} onChange={(v) => { setMindPrefs({ asks: v }) }} />
      </List>
      <Foot>{PC.asksFoot}</Foot>
    </View>
  )
}

const NOTIFY_ICON: Record<NotifyKind, IconName> = { checkin: 'bell', 'wind-down': 'moon', plan: 'list' }

/** B11.2 to B11.7: Check-in, Wind-down and Plan check-in, above Supplement reminders. Disabled until N12. */
export function MindReminderRows() {
  const t = useTokens()
  const mind = useStore((s) => s.data.profile.mind)
  const at = kindTimes(mind)
  return (
    <>
      {NOTIFY_KINDS.map((k) => {
        const on = mind?.notify?.[k] === true
        return (
          <Row key={k} wrapSub square={{ icon: NOTIFY_ICON[k], fill: t.mindFill, soft: true }} title={NC.rows[k].label} sub={NC.rows[k].sub}
            value={on && k !== 'plan' ? at[k] : undefined}
            right={<Toggle label={NC.rows[k].aria} on={on} disabled={!pushReady()} onChange={() => undefined /* N12 wires the reminders */} />} />
        )
      })}
    </>
  )
}

/** B11b's names switch, under Supplement reminders while they're on (SUPP_NAMES_ENABLED). */
export function SuppNamesRow() {
  const on = useStore((s) => s.data.profile.mind?.lockNames === true)
  const setMindPrefs = useStore((s) => s.setMindPrefs)
  return <Row nested title={NC.names} right={<Toggle label={NC.names} on={on} onChange={() => { setMindPrefs({ lockNames: !on }) }} />} />
}

/** B11.9 to B11.12: "Your times" and the foot. */
export function YourTimes() {
  const data = useStore((s) => s.data)
  const setMindPrefs = useStore((s) => s.setMindPrefs)
  const times = usualTimes(data.profile.mind)
  // health data: not editable while health logging is off
  const allowed = healthLoggingAllowed(data)
  const save = (k: 'wakeAt' | 'windDownAt', v: string) => {
    if (v === '') setMindPrefs({ [k]: null })
    else if (isHHMM(v)) setMindPrefs({ [k]: v })
  }
  return (
    <>
      <Lbl>{NC.timesHeading}</Lbl>
      <List>
        <FRow label={NC.wakeAt} right={<TimeField muted label={NC.wakeAt} value={times.wakeAt} disabled={!allowed} onChange={(v) => save('wakeAt', v)} />} />
        <FRow label={NC.windDownAt} right={<TimeField muted label={NC.windDownAt} value={times.windDownAt} disabled={!allowed} onChange={(v) => save('windDownAt', v)} />} />
      </List>
      <Foot>{NC.foot}</Foot>
    </>
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
    <View style={{ gap: 8, marginBottom: 8 }}>
      {kinds.map((k) => (
        <Banner key={k} icon="info" iconColor={t.mindInk} title={backoffLine(k)} onDismiss={() => dismissBackoff(k)}>
          <View style={{ marginTop: 10 }}><Btn kind="gray" small title={NC.backToUsual} onPress={() => backToUsual(k)} /></View>
        </Banner>
      ))}
    </View>
  )
}
