/**
 * A device check for clipped label endings ("Add fooc" on Benn's iPhone): each sample is drawn on a
 * tinted box sized to its words, WITHOUT GLYPH_ROOM, in three ways of naming the same face. Beside
 * it: the box's width (onLayout) and the width iOS laid the words out at (onTextLayout). A line wider
 * than its box, or a cut last letter, shows which way of naming the font goes wrong. Gallery only.
 */
import { useState } from 'react'
import { Text, View, type TextStyle } from 'react-native'
import { GEIST, tx, useTokens } from './theme'

const SAMPLES: [string, number][] = [['Add food', 16], ['Start', 14], ['This week', 17], ['Check in', 15]]
const WAYS: [string, TextStyle][] = [
  ['alias', { fontFamily: GEIST[600] }],
  ['postscript', { fontFamily: 'Geist-SemiBold' }],
  ['family+weight', { fontFamily: 'Geist', fontWeight: '600' }],
]

function Sample({ text, size, way }: { text: string; size: number; way: TextStyle }) {
  const t = useTokens()
  const [box, setBox] = useState<number | null>(null)
  const [line, setLine] = useState<number | null>(null)
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
      <View style={{ backgroundColor: t.tintSoft }}>
        <Text onLayout={(e) => setBox(e.nativeEvent.layout.width)} onTextLayout={(e) => setLine(e.nativeEvent.lines[0]?.width ?? null)}
          style={[{ fontSize: size, lineHeight: Math.round(size * 1.3), letterSpacing: 0, color: t.label }, way]}>{text}</Text>
      </View>
      <Text style={[tx(12), { color: line != null && box != null && line > box + 0.01 ? t.red : t.label2 }]}>
        {`box ${box?.toFixed(2) ?? '…'} · line ${line?.toFixed(2) ?? '…'}`}
      </Text>
    </View>
  )
}

export function TextFit() {
  const t = useTokens()
  return (
    <View style={{ gap: 12 }}>
      {WAYS.map(([name, way]) => (
        <View key={name}>
          <Text style={[tx(13, 500), { color: t.label2 }]}>{name}</Text>
          {SAMPLES.map(([s, size]) => <Sample key={s} text={s} size={size} way={way} />)}
        </View>
      ))}
    </View>
  )
}
