/**
 * Build or edit one of your own workouts (web: screens/train/RoutineBuilderSheet.tsx, plan §4.3):
 * a name, exercises from the library with their sets and reps, in any order. Notes about order or
 * length are suggestions and never stop a save. Exported for Plan (stream N8), which opens it.
 */
import { useState } from 'react'
import { Text, TextInput, View } from 'react-native'
import { useStore } from '@/store/store'
import type { Routine, RoutineSlot } from '@/core/types'
import { EXERCISE_BY_ID } from '@/core/data/exercises'
import { aboutMins, builderNotes, estMins, normaliseRx, slotsOf, warmupMinsForKey } from '@/core/domain/routines'
import { ONBOARDING_ENABLED } from '@/data/onboardingFlag'
import { LibrarySheet } from './LibrarySheet'
import { Btn, List } from '../../lib/ui/kit'
import { NavBtn, SettingRow, Sheet, XBtn as RemoveBtn } from '../../lib/ui/primitives'
import { font, tx, useTokens } from '../../lib/theme'
import { Foot, GrpH } from '../../lib/ui/text'
import { FRow } from '../../lib/ui/fields'
import { Stack, XBtn } from './ui'

export interface BuilderStart {
  /** editing a saved workout */
  routine?: Routine
  /** or starting from a built-in ("Customise") */
  name?: string
  slots?: RoutineSlot[]
  baseId?: string
}

export function RoutineBuilderSheet({ start, onSaved, onClose }: { start: BuilderStart; onSaved: (id: string) => void; onClose: () => void }) {
  const t = useTokens()
  const saveRoutine = useStore((s) => s.saveRoutine)
  const archiveRoutine = useStore((s) => s.archiveRoutine)
  const routines = useStore((s) => s.data.routines)
  const training = useStore((s) => s.data.profile.training)
  const r = start.routine
  const [name, setName] = useState(r?.name ?? start.name ?? '')
  const [slots, setSlots] = useState<RoutineSlot[]>(() => (r ? slotsOf(r) : start.slots ?? []).map((x) => ({ ...x })))
  const [picking, setPicking] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  const move = (i: number, d: -1 | 1) => setSlots((p) => { const n = [...p]; const j = i + d; if (j < 0 || j >= n.length) return p; [n[i], n[j]] = [n[j], n[i]]; return n })
  // read what's typed the way a save will store it ("3x10" is 3 × 10)
  const normalised = slots.map((s) => ({ ...s, rx: normaliseRx(s.rx) }))
  const notes = builderNotes(normalised, { warmup: ONBOARDING_ENABLED })

  const save = () => {
    const id = saveRoutine({ id: r?.id, name, slots, ...(start.baseId ? { baseId: start.baseId } : {}) })
    if (id) onSaved(id)
  }

  if (picking) {
    return <LibrarySheet onPick={(id) => { setSlots((p) => [...p, { exId: id }]); setPicking(false) }} onClose={() => setPicking(false)} />
  }
  return (
    <Sheet title={r ? 'Edit workout' : 'New workout'} onClose={onClose} tall right={<NavBtn bold title="Save" onPress={save} disabled={!slots.length} />}>
      <List style={{ marginBottom: 8 }}>
        <FRow label="Name" value={name} placeholder="My workout" maxLength={120} onChangeText={setName} />
      </List>

      <GrpH>{`Exercises${slots.length ? ` · about ${aboutMins(estMins(normalised, { warmup: ONBOARDING_ENABLED, mins: r ? warmupMinsForKey(r.id, routines, training) : undefined }))} min` : ''}`}</GrpH>
      {slots.length > 0 && (
        <List style={{ marginBottom: 8 }}>
          {slots.map((s, i) => {
            const x = EXERCISE_BY_ID[s.exId]
            const nm = x?.n ?? 'exercise'
            return (
              // `.li` with a field under the name, so not lib/ui's Row (its sub is text)
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingVertical: 10, paddingHorizontal: 16 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={[tx(17, 400), { color: t.label }]}>{x?.n ?? 'Exercise not in this version of Tilo'}</Text>
                  <TextInput value={s.rx ?? ''} placeholder={x?.defaultRx ?? 'Sets and reps'} placeholderTextColor={t.label3} accessibilityLabel={`Sets and reps for ${x?.n ?? 'this exercise'}`}
                    onChangeText={(v) => setSlots((p) => p.map((y, j) => (j === i ? { ...y, rx: v || undefined } : y)))}
                    style={[font(400), { marginTop: 6, fontSize: 15, color: t.label, backgroundColor: t.fill, borderRadius: 10, paddingVertical: 7, paddingHorizontal: 10 }]} />
                </View>
                <View style={{ flexDirection: 'row', gap: 6, marginLeft: 8 }}>
                  <XBtn icon="chevL" rotate={90} label={`Move ${nm} up`} disabled={i === 0} onPress={() => move(i, -1)} />
                  <XBtn icon="chevR" rotate={90} label={`Move ${nm} down`} disabled={i === slots.length - 1} onPress={() => move(i, 1)} />
                  <RemoveBtn label={`Remove ${nm}`} onPress={() => setSlots((p) => p.filter((_, j) => j !== i))} />
                </View>
              </View>
            )
          })}
        </List>
      )}
      <List style={{ marginBottom: 8, marginTop: slots.length ? 8 : 0 }}>
        <SettingRow icon="plus" color={t.tint} label="Add an exercise" onPress={() => setPicking(true)} right={<></>} />
      </List>
      {notes.map((n) => <Foot key={n} style={{ paddingTop: 8, paddingHorizontal: 4 }}>{n}</Foot>)}
      {notes.length > 0 && <Foot style={{ paddingTop: 8, paddingHorizontal: 4 }}>These are suggestions. Save whenever you're happy with it.</Foot>}

      {r && (
        <Stack style={{ marginTop: 18 }}>
          {confirmRemove
            ? <Btn kind="danger" title="Remove this workout" onPress={() => { archiveRoutine(r.id); onClose() }} />
            : <Btn kind="gray" title="Remove workout" onPress={() => setConfirmRemove(true)} />}
          {confirmRemove && <Foot style={{ paddingTop: 6, paddingHorizontal: 4 }}>Anything you've already logged stays in your history.</Foot>}
        </Stack>
      )}
    </Sheet>
  )
}
