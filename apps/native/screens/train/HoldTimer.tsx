/**
 * A timer for a hold with no clip on screen (web: screens/train/HoldTimer.tsx). It runs on the
 * device clock, so it works offline, and writes the seconds into the set when stopped. Per-side
 * holds with a timed target say "Switch sides" once the first side has had its time.
 */
import { useEffect, useState } from 'react'
import { AccessibilityInfo, Text, View } from 'react-native'
import { holdAt, holdLabel, holdTarget } from '@/core/domain/library'
import { RED_FLAG } from '@/copy/train'
import { Btn } from '../../lib/ui/kit'
import { Sheet } from '../../lib/ui/primitives'
import { font, num, useTokens } from '../../lib/theme'
import { Foot, Stack } from './pendingN1'

export function HoldTimer({ name, rx, perSide, onDone, onClose }: {
  name: string
  rx: string
  perSide?: boolean
  onDone: (sec: number) => void
  onClose: () => void
}) {
  const t = useTokens()
  const target = holdTarget(rx)
  const [start, setStart] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (start == null) return
    const i = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(i)
  }, [start])

  const h = holdAt(start == null ? 0 : (now - start) / 1000, target, perSide)
  const goal = target ? (target.lo === target.hi ? `${target.lo} sec` : `${target.lo}–${target.hi} sec`) : null
  // spoken when it changes, as the web's aria-live (accessibilityLiveRegion is Android only)
  const label = start == null ? '' : holdLabel(h, target, perSide)
  useEffect(() => { if (label) AccessibilityInfo.announceForAccessibility(label) }, [label])
  const stop = () => { if (start != null && h.logSec > 0) onDone(h.logSec); onClose() }

  return (
    <Sheet title={name} onClose={onClose}>
      <View style={{ alignItems: 'center', paddingTop: 18, paddingBottom: 22 }}>
        <Text accessibilityLiveRegion="polite" style={[font(600), { fontSize: 17, minHeight: 22, color: t.label2 }]}>{start == null ? 'Ready when you are' : holdLabel(h, target, perSide)}</Text>
        <Text accessibilityRole="timer" accessibilityLabel={`${h.sec} seconds`} style={[font(600), num, { fontSize: 72, lineHeight: 80, marginVertical: 6, color: t.label }]}>
          {h.sec}<Text style={[font(600), { fontSize: 22, color: t.label2 }]}> sec</Text>
        </Text>
        {goal && <Text style={[font(400), { fontSize: 15, lineHeight: 20, color: t.label2, textAlign: 'center' }]}>Aim for {goal}{perSide ? ' each side' : ''}. Stop sooner if your form slips or anything hurts.</Text>}
      </View>
      <Stack>
        {start == null
          ? <Btn title="Start" onPress={() => { setStart(Date.now()); setNow(Date.now()) }} />
          : <Btn title="Stop and save" kind="tinted" onPress={stop} />}
      </Stack>
      <Foot style={{ paddingTop: 12, paddingHorizontal: 4 }}>Breathe steadily throughout. {RED_FLAG}</Foot>
    </Sheet>
  )
}
