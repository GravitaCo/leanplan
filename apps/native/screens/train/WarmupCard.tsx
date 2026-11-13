/**
 * "First: Warm-up · N min", then "Then" over the exercises (web: screens/train/WarmupCard.tsx,
 * board ob3-5). `extra` adds a line (the lighter sets on the first lift).
 */
import { Text, View } from 'react-native'
import { warmupLine, type WarmupBlock } from '@/core/domain/warmup'
import { warmupNote } from '@/copy/train'
import { font, num, tx, useTokens } from '../../lib/theme'

export function WarmupCard({ block, extra }: { block: WarmupBlock; extra?: string }) {
  const t = useTokens()
  const h = (s: string) => <Text accessibilityRole="header" style={[font(500), { marginBottom: 6, paddingHorizontal: 4, fontSize: 13, color: t.label2 }]}>{s}</Text>
  return (
    <>
      {h('First')}
      <View accessibilityLabel={`Warm-up, ${block.mins} minutes`} style={{ backgroundColor: t.card, borderRadius: 22, overflow: 'hidden', marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: t.sep }}>
          <View style={{ width: 44, height: 52, borderRadius: 10, backgroundColor: t.tintSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[tx(13, 600), num, { color: t.tint }]}>{block.mins} min</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[tx(16, 600), { color: t.label }]}>Warm-up</Text>
            <Text style={[tx(13, 400), { lineHeight: 18, color: t.label2 }]}>{warmupLine(block)}</Text>
          </View>
        </View>
        <Text style={[font(400), { paddingTop: 10, paddingBottom: 12, paddingHorizontal: 14, fontSize: 13, lineHeight: 18, color: t.label2 }]}>{warmupNote(block)}{extra ? ' ' + extra : ''}</Text>
      </View>
      {h('Then')}
    </>
  )
}
