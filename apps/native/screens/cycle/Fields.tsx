/**
 * The day's answers, as boards C2 and D3 draw them: "Menstrual flow" (5 up), "Pain" (3 up, the
 * soreness scale's words) and "Anything else?" chips. Every answer is optional; tapping a picked
 * one clears it. Used by the check-in's Cycle group and by "Log a day".
 */
import { View } from 'react-native'
import type { CycleChip, CycleDay, CycleFlow, CyclePain } from '@/core/domain/cycle'
import { Scale } from '../../lib/ui/controls'
import { Chip, Chips } from '../../lib/ui/kit'
import { Lbl } from '../../lib/ui/text'
import { CHIP_LABELS, CY, FLOW_LABELS, PAIN_LABELS } from './text'

export function CycleFields({ value, onChange }: { value: CycleDay; onChange: (v: CycleDay) => void }) {
  const toggleChip = (c: CycleChip) => {
    const has = value.chips?.includes(c)
    const chips = has ? value.chips!.filter((x) => x !== c) : [...(value.chips ?? []), c]
    onChange({ ...value, chips: chips.length ? chips : undefined })
  }
  return (
    <View>
      <Lbl>{CY.checkin.flow}</Lbl>
      <Scale<CycleFlow> tall label={CY.checkin.flow} items={FLOW_LABELS.map(([key, text]) => ({ key, text }))} value={value.flow}
        onPick={(f) => onChange({ ...value, flow: value.flow === f ? undefined : f })} />
      <Lbl>{CY.checkin.pain}</Lbl>
      <Scale<CyclePain> tall cols={3} label={CY.checkin.pain} items={PAIN_LABELS.map((text, i) => ({ key: (i + 1) as CyclePain, text }))} value={value.pain}
        onPick={(p) => onChange({ ...value, pain: value.pain === p ? undefined : p })} />
      <Lbl>{CY.checkin.chips}</Lbl>
      <Chips>
        {CHIP_LABELS.map(([k, l]) => <Chip key={k} title={l} on={!!value.chips?.includes(k)} onPress={() => toggleChip(k)} />)}
      </Chips>
    </View>
  )
}
