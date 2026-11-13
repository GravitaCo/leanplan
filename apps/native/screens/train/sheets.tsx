/**
 * Train's smaller sheets, as on the web: Add something (screens/train/AddSomethingSheet.tsx), Log a
 * session (LogSessionSheet.tsx) and Support (SupportSheet.tsx).
 */
import { useState } from 'react'
import { Linking, Text, View } from 'react-native'
import { useStore } from '@/store/store'
import type { Effort, Modality, WorkoutType } from '@/core/types'
import { SESSIONS, WORKOUTS } from '@/core/data/workouts'
import { setCount } from '@/core/domain/guided'
import { shortTitle } from '@/core/domain/week'
import { aboutLine, routineEstMins, slotsOf as routineSlots } from '@/core/domain/routines'
import { CARDIO_OPTIONS } from '@/core/data/constants'
import { DEFAULT_MINS, EFFORTS, MODALITIES, MODALITY_LABEL } from '@/core/data/modalities'
import { quietNumbers } from '@/data/consent'
import { ONBOARDING_ENABLED } from '@/data/onboardingFlag'
import { RED_FLAG, SUPPORT_LINES } from '@/copy/train'
import { Chip, Chips, List } from '../../lib/ui/kit'
import { NavBtn, SettingRow, Sheet, Toggle } from '../../lib/ui/primitives'
import { num, tx, useTokens } from '../../lib/theme'
import { Foot, Lbl } from '../../lib/ui/text'
import { FRow } from '../../lib/ui/fields'
import { toPoint } from './nav'
import { FSelect, LIST_GAP, Li, LiText } from './pendingN1'

/** "Add something": a quick log of any movement, a different workout for today only, or the library. Nothing here changes the plan. */
export function AddSomethingSheet({ planned, onLog, onWorkout, onLibrary, onClose }: {
  planned?: string[]
  onLog: () => void
  onWorkout: (w: string) => void
  onLibrary: () => void
  onClose: () => void
}) {
  const t = useTokens()
  const others = SESSIONS.filter((s): s is WorkoutType => s !== 'Rest' && !planned?.includes(s))
  const all = useStore((s) => s.data.routines)
  const training = useStore((s) => s.data.profile.training)
  const mine = (all || []).filter((r) => !r.archived && !planned?.includes(r.id))
  return (
    <Sheet title="Add something" onClose={onClose}>
      <List icons style={LIST_GAP}>
        <SettingRow icon="plus" color={t.activity} label="Log a session" sub="A walk, yoga, pilates, anything" onPress={onLog} right={<></>} />
      </List>
      <Lbl>Do a different workout today</Lbl>
      <List style={LIST_GAP}>
        {others.map((w) => (
          <Li key={w} onPress={() => onWorkout(w)}>
            <LiText t={shortTitle(w)} s={w === 'Cardio' ? WORKOUTS.Cardio.ex[0].t : `${WORKOUTS[w].ex.length} exercises · ${setCount(WORKOUTS[w].ex)}`} />
          </Li>
        ))}
      </List>
      {mine.length > 0 && (
        <>
          <Lbl>Your workouts</Lbl>
          <List style={LIST_GAP}>
            {mine.map((r) => (
              <Li key={r.id} onPress={() => onWorkout(r.id)}>
                <LiText t={r.name} s={[MODALITY_LABEL[r.modality], `${routineSlots(r).length} ${routineSlots(r).length === 1 ? 'exercise' : 'exercises'}`, aboutLine(routineEstMins(r, all, training, ONBOARDING_ENABLED))].filter(Boolean).join(' · ')} />
              </Li>
            ))}
          </List>
        </>
      )}
      <Foot style={{ paddingTop: 7, paddingHorizontal: 4, paddingBottom: 12 }}>This only changes today. To change your week or build your own workouts, go to Plan.</Foot>
      <List icons style={LIST_GAP}>
        <SettingRow icon="book" color={t.tint} label="Exercise library" sub="How to do each move, easier and harder options" onPress={onLibrary} right={<></>} />
      </List>
    </Sheet>
  )
}

/** Quick log of any movement (workout plan P2): the kind, minutes and, optionally, a name, effort and (for cardio) distance. */
export function LogSessionSheet({ onClose, preset }: { onClose: () => void; preset?: { modality: Modality; cardioKey?: string } }) {
  const t = useTokens()
  const addSession = useStore((s) => s.addSession)
  const [modality, setModality] = useState<Modality>(preset?.modality ?? 'yoga')
  const [cardioKey, setCardioKey] = useState(preset?.cardioKey ?? 'Brisk walk')
  const [name, setName] = useState('')
  const [mins, setMins] = useState('')
  const [km, setKm] = useState('')
  const [effort, setEffort] = useState<Effort | null>(null)

  const save = () => {
    const m = parseFloat(mins)
    const d = parseFloat(km)
    addSession({
      modality,
      title: name.trim() || (modality === 'cardio' ? cardioKey : MODALITY_LABEL[modality]),
      ...(Number.isFinite(m) ? { mins: Math.max(0, m) } : {}),
      ...(effort ? { effort } : {}),
      ...(modality === 'cardio' ? { cardio: { key: cardioKey, ...(Number.isFinite(d) && d > 0 ? { km: d } : {}) } } : {}),
    })
    onClose()
  }

  return (
    <Sheet title="Log a session" onClose={onClose} right={<NavBtn bold title="Save" onPress={save} />}>
      <Lbl>What did you do?</Lbl>
      <View accessibilityLabel="Kind of session" style={{ marginBottom: 14 }}><Chips>
        {MODALITIES.map((k) => <Chip key={k} title={MODALITY_LABEL[k]} on={modality === k} onPress={() => setModality(k)} />)}
      </Chips></View>
      <List style={LIST_GAP}>
        {modality === 'cardio' && <FRow label="Type" right={<FSelect title="Type" value={cardioKey} options={CARDIO_OPTIONS} onChange={setCardioKey} />} />}
        <FRow label="Name" value={name} placeholder={modality === 'cardio' ? cardioKey : MODALITY_LABEL[modality]} onChangeText={setName} />
        <FRow label="Minutes" keyboardType="number-pad" value={mins} placeholder={String(DEFAULT_MINS[modality])} onChangeText={setMins} />
        {modality === 'cardio' && <FRow label="Distance (km)" keyboardType="decimal-pad" value={km} placeholder="Optional" onChangeText={(v) => setKm(toPoint(v))} />}
      </List>
      <Lbl>How did it feel? <Text style={{ color: t.label2 }}>Optional</Text></Lbl>
      <View accessibilityLabel="Effort"><Chips>
        {EFFORTS.map(([k, label]) => <Chip key={k} title={label} on={effort === k} onPress={() => setEffort(effort === k ? null : k)} />)}
      </Chips></View>
      <Foot style={{ paddingTop: 12, paddingHorizontal: 4 }}>This sits alongside anything else you've logged today. Every kind of movement counts. {RED_FLAG}</Foot>
    </Sheet>
  )
}

/** A quiet way to support from the load note (workout plan §0.5). General wellness only. */
export function SupportSheet({ onClose }: { onClose: () => void }) {
  const t = useTokens()
  const gentle = useStore((s) => quietNumbers(s.data))
  const setPrefs = useStore((s) => s.setPrefs)
  return (
    <Sheet title="Support" onClose={onClose} left={null} right={<NavBtn bold title="Done" onPress={onClose} />}>
      <Text style={[tx(17, 400), { lineHeight: 24, color: t.label, marginTop: 4, marginHorizontal: 4, marginBottom: 14 }]}>
        Finding it hard to ease off is more common than you might think, and talking to someone can help.
      </Text>
      <List style={LIST_GAP}>
        {SUPPORT_LINES.map(([name, number, note]) => (
          <Li key={name} label={`${name}, ${number}. ${note}`} onPress={() => { Linking.openURL('tel:' + number.replace(/\s/g, '')).catch(() => {}) }}>
            <LiText t={name} s={note} />
            <Text style={[tx(17, 400), num, { color: t.tint }]}>{number}</Text>
          </Li>
        ))}
      </List>
      <Foot style={{ paddingTop: 7, paddingHorizontal: 4, paddingBottom: 14 }}>In an emergency, call 999.</Foot>
      <List style={LIST_GAP}>
        <Li><LiText t="Gentle mode" s="Hides calorie numbers and body weight" /><Toggle on={gentle} label="Gentle mode" onChange={() => setPrefs({ gentle: !gentle })} /></Li>
      </List>
    </Sheet>
  )
}
