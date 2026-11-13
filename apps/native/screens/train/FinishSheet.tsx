/**
 * The end of a guided session (web: screens/train/FinishSheet.tsx): what was logged ("Not today"
 * in grey for anything skipped), an optional effort and an optional note. Finish saves them; Back
 * returns to the workout.
 */
import { useState } from 'react'
import { Text, TextInput, View } from 'react-native'
import type { Effort } from '@/core/types'
import { EFFORTS } from '@/core/data/modalities'
import { ChoiceGrid } from './AdjustSheet'
import { Btn, List } from '../../lib/ui/kit'
import { BareSheet, NavBtn } from '../../lib/ui/primitives'
import { font, num, tx, useTokens } from '../../lib/theme'
import { Sub } from '../../lib/ui/text'
import { FRow } from '../../lib/ui/fields'
import { LIST_GAP, Li, Stack } from './pendingN1'

export function FinishSheet({ title, mins, gentle, rows, effort0, note0, onFinish, onBack }: {
  title: string
  /** minutes to prefill (earlier minutes plus this stint on today; the saved value on another day) */
  mins?: number
  /** hides the minutes in the heading line */
  gentle?: boolean
  rows: { name: string; line: string; none: boolean }[]
  effort0?: Effort
  note0?: string
  onFinish: (effort: Effort | null, note: string, mins: number | undefined) => void
  onBack: () => void
}) {
  const t = useTokens()
  const [effort, setEffort] = useState<Effort | null>(effort0 ?? null)
  const [note, setNote] = useState(note0 ?? '')
  const [m, setM] = useState(mins != null ? String(mins) : '')
  const typed = parseFloat(m)
  const minsOut = Number.isFinite(typed) && typed > 0 ? Math.min(240, typed) : undefined
  return (
    <BareSheet label={`${title}, done`} onClose={onBack}>
      <View style={{ alignSelf: 'flex-start', marginBottom: 4 }}><NavBtn title="Back to workout" onPress={onBack} /></View>
      <Text accessibilityRole="header" style={[tx(28, 600), { lineHeight: 32, letterSpacing: -0.56, marginTop: 4, color: t.label }]}>{title}, done.</Text>
      <Sub style={{ marginTop: 2, marginBottom: 14 }}>{[minsOut != null && !gentle ? `${Math.round(minsOut)} min` : '', `${rows.length} ${rows.length === 1 ? 'exercise' : 'exercises'}`].filter(Boolean).join(' · ')}</Sub>
      <List style={LIST_GAP}>
        {rows.map((r, i) => (
          <Li key={i}>
            <Text numberOfLines={1} style={[font(400), { flex: 1, fontSize: 17, color: t.label }]}>{r.name}</Text>
            <Text style={[tx(17, 400), num, { color: r.none ? t.label3 : t.label2 }]}>{r.line}</Text>
          </Li>
        ))}
      </List>
      <Text style={[tx(13, 500), { color: t.label2, paddingTop: 18, paddingBottom: 8, paddingHorizontal: 4 }]}>How did it feel overall? <Text style={{ color: t.label3 }}>Optional</Text></Text>
      <ChoiceGrid options={EFFORTS} value={effort} onPick={(k) => setEffort(effort === k ? null : k)} cols={4} label="Effort" />
      <List style={{ marginBottom: 8, marginTop: 14 }}>
        <FRow label="Minutes" keyboardType="number-pad" value={m} placeholder="Optional" onChangeText={setM} />
      </List>
      <TextInput accessibilityLabel="Note" value={note} placeholder="Add a note" placeholderTextColor={t.label3} maxLength={500} onChangeText={setNote}
        style={[font(400), { backgroundColor: t.elev, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, fontSize: 17, color: t.label, marginTop: 6 }]} />
      <Stack><Btn title="Finish" onPress={() => onFinish(effort, note.trim(), minsOut)} /></Stack>
    </BareSheet>
  )
}
