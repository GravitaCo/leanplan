/**
 * Studio's value controls on native, ported from theme.css:
 * - Slider (`input[type=range]` with `accent-color: var(--tint)`): Edit entry's portion size, the
 *   portion's grams. Drawn here (no outside library): a 4 pt track, tinted up to the thumb.
 * - Stepper (`.stepper`): − value + on --fill (Portion's "How many").
 * - Scale (`.scale`): a grid of equal buttons (servings, the check-in's answers, feedback).
 * - Select (`select`): the chosen option's words; a tap opens the options as Safari does.
 */
import { useRef, useState, type ReactNode } from 'react'
import { PanResponder, Platform, Pressable, Text, View, type AccessibilityActionEvent, type LayoutChangeEvent } from 'react-native'
import { MenuNative } from '../../modules/tilo-pickers'
import { Icon } from './icons'
import { slop, useSurface } from './kit'
import { Sheet } from './primitives'
import { num, tx, BTN, useTokens } from '../theme'

const THUMB = 28

/** Round to the step from `min`, without float dust (0.25 + 0.05 × 3 = 0.4, not 0.40000000000000002). */
export function snap(v: number, min: number, max: number, step: number): number {
  const n = Math.round((Math.min(max, Math.max(min, v)) - min) / step)
  return Math.min(max, +(min + n * step).toFixed(6))
}

/**
 * `input[type=range]`: 28 pt high; a 4 pt track, the tint up to the thumb and --fill2 after it; a
 * 28 pt white thumb with a soft shadow (as iOS draws the web's range input). A tap on the track
 * jumps there and a drag follows the finger. VoiceOver adjusts it a step at a time, with the web's
 * aria label; `valueText` is what it reads (the value itself otherwise). The web's input sits on a
 * text line, which leaves 5 pt under it (body's 22.1 pt line with the input on its baseline): kept.
 */
export function Slider({ min, max, step = 1, value, onChange, label, valueText, style }: {
  min: number; max: number; step?: number; value: number; onChange: (v: number) => void; label: string
  valueText?: string; style?: object
}) {
  const t = useTokens()
  const [w, setW] = useState(0)
  // the gesture reads the latest props and width through a ref (the responder is made once)
  const live = useRef({ min, max, step, value, onChange, w })
  live.current = { min, max, step, value, onChange, w }
  const startX = useRef(0)
  const at = (x: number) => {
    const { min, max, step, onChange, value, w } = live.current
    const run = Math.max(1, w - THUMB)
    const v = snap(min + ((x - THUMB / 2) / run) * (max - min), min, max, step)
    if (v !== value) onChange(v)
  }
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    // a drag that starts on the slider stays with it, as a native slider keeps its finger
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => { startX.current = e.nativeEvent.locationX; at(startX.current) },
    onPanResponderMove: (_, g) => at(startX.current + g.dx),
  })).current
  const pct = max > min ? (Math.min(max, Math.max(min, value)) - min) / (max - min) : 0
  const x = pct * Math.max(0, w - THUMB)
  const act = (e: AccessibilityActionEvent) => {
    const dir = e.nativeEvent.actionName === 'increment' ? 1 : e.nativeEvent.actionName === 'decrement' ? -1 : 0
    if (dir) { const v = snap(value + dir * step, min, max, step); if (v !== value) onChange(v) }
  }
  return (
    <View {...pan.panHandlers} onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      accessible accessibilityRole="adjustable" accessibilityLabel={label}
      accessibilityValue={valueText != null ? { text: valueText } : { min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]} onAccessibilityAction={act}
      // the 28 pt control reaches 44 pt to touch
      hitSlop={slop(0, THUMB)}
      style={[{ height: THUMB, marginBottom: 5, justifyContent: 'center' }, style]}>
      {/* the parts never take the touch, so locationX is always the slider's own */}
      <View pointerEvents="none" style={{ height: 4, borderRadius: 2, backgroundColor: t.fill2, overflow: 'hidden' }}>
        <View style={{ width: x + THUMB / 2, height: 4, backgroundColor: t.tint }} />
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', left: x, top: 0, width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: '#ffffff',
        boxShadow: '0 0.5px 4px rgba(0, 0, 0, 0.12), 0 6px 13px rgba(0, 0, 0, 0.12)' }} />
    </View>
  )
}

/**
 * `.stepper`: − value + on --fill (radius 9); each button 44 × 34 with a 22 pt sign in --label, the
 * value 600 (17 pt), at least 52 wide, tabular. The buttons carry the web's aria labels.
 */
export function Stepper({ value, onDec, onInc, decLabel, incLabel }: {
  value: ReactNode; onDec: () => void; onInc: () => void; decLabel: string; incLabel: string
}) {
  const t = useTokens()
  const b = (sign: string, label: string, onPress: () => void) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={slop(44, 34)}
      style={({ pressed }) => ({ width: 44, height: 34, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}>
      <Text style={[tx(22, 400, 1.3, BTN), { color: t.label }]}>{sign}</Text>
    </Pressable>
  )
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: t.fill, borderRadius: 9 }}>
      {b('−', decLabel, onDec)}
      <Text style={[tx(17, 600), num, { color: t.label, minWidth: 52, textAlign: 'center' }]}>{value}</Text>
      {b('+', incLabel, onInc)}
    </View>
  )
}

export type ScaleItem<T extends string | number> = { key: T; big?: string; text?: string; label?: string }

/**
 * `.scale`: equal buttons in a grid (5 across, or `cols`), 6 apart; each on --card (--elev in a
 * sheet), radius 10, padding 8 0, centred; `big` is the 17 pt bold first line (tabular), `text` the
 * 13 pt line. The chosen one is the tint with --on-tint words. `tall` is `.ck-scale` (44 pt, the
 * check-in's). `role` "radio" makes the set a radio group (the feedback question); otherwise each
 * button reads as selected or not.
 */
export function Scale<T extends string | number>({ items, value, onPick, cols = 5, tall, role = 'button', label }: {
  items: ScaleItem<T>[]; value: T | undefined; onPick: (v: T) => void; cols?: number; tall?: boolean
  role?: 'button' | 'radio'; label?: string
}) {
  const t = useTokens()
  const bg = useSurface(t)
  const rows: (ScaleItem<T> | null)[][] = []
  for (let i = 0; i < items.length; i += cols) {
    const r: (ScaleItem<T> | null)[] = items.slice(i, i + cols)
    while (r.length < cols) r.push(null)
    rows.push(r)
  }
  return (
    <View accessibilityRole={role === 'radio' ? 'radiogroup' : undefined} accessibilityLabel={label} style={{ gap: 6 }}>
      {rows.map((r, ri) => (
        <View key={ri} style={{ flexDirection: 'row', gap: 6 }}>
          {r.map((it, i) => {
            if (!it) return <View key={'_' + i} style={{ flex: 1 }} />
            const on = it.key === value
            const fg = on ? t.onTint : t.label
            return (
              <Pressable key={String(it.key)} accessibilityRole={role} accessibilityLabel={it.label}
                accessibilityState={role === 'radio' ? { checked: on } : { selected: on }} onPress={() => onPick(it.key)}
                // up to 44 pt high, never sideways: the next button is 6 pt away
                hitSlop={tall ? undefined : slop(0, 16 + (it.big != null ? 20.4 : 0) + (it.text != null ? 15.6 : 0))}
                style={({ pressed }) => ({ flex: 1, minWidth: 0, minHeight: tall ? 44 : undefined, justifyContent: 'center', alignItems: 'center', paddingVertical: 8,
                  borderRadius: 10, backgroundColor: on ? t.tint : bg, opacity: pressed ? 0.7 : 1 })}>
                {it.big != null && <Text style={[tx(17, 700, 1.2, BTN), num, { color: fg, textAlign: 'center' }]}>{it.big}</Text>}
                {it.text != null && <Text style={[tx(13, 400, 1.2, BTN), { color: fg, textAlign: 'center' }]}>{it.text}</Text>}
              </Pressable>
            )
          })}
        </View>
      ))}
    </View>
  )
}

/**
 * `select` (the web's, with `appearance: none`, so no arrow): the chosen option's words. `row` is
 * `.frow select` (no fill, right-aligned, padding 11 0: put it in an FRow's `right`); otherwise the
 * filled field (--fill, radius 10, padding 11 12). On iOS a tap opens the system menu anchored to
 * the field, the chosen option ticked, as Safari opens a select (modules/tilo-pickers' TiloMenu,
 * lying invisibly over the words). Elsewhere (Android for now, the web gallery) a sheet lists the
 * options. The label is the field's, as the web's `<label for>` names it; the option is its value.
 */
export function Select<T extends string>({ value, options, onChange, label, row }: {
  value: T; options: readonly (readonly [T, string])[]; onChange: (v: T) => void; label: string; row?: boolean
}) {
  const t = useTokens()
  const [open, setOpen] = useState(false)
  const shown = options.find(([k]) => k === value)?.[1] ?? value
  const box = row
    ? { flex: 1, minWidth: 0, paddingVertical: 11 }
    : { backgroundColor: t.fill, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 12 }
  const words = <Text numberOfLines={1} style={[tx(17, 400, 1.3, BTN), { color: t.label, textAlign: row ? 'right' : 'left' }]}>{shown}</Text>
  if (Platform.OS === 'ios' && MenuNative) return (
    <View style={box}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{words}</View>
      <MenuNative label={label} options={options.map(([, l]) => l)} selected={options.findIndex(([k]) => k === value)}
        onPick={(e) => { const o = options[e.nativeEvent.index]; if (o && o[0] !== value) onChange(o[0]) }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
    </View>
  )
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityValue={{ text: shown }} onPress={() => setOpen(true)}
        style={({ pressed }) => [box, { opacity: pressed ? 0.6 : 1 }]}>
        {words}
      </Pressable>
      {open && (
        <Sheet title={label} onClose={() => setOpen(false)}>
          <SelectList value={value} options={options} label={label} onPick={(v) => { setOpen(false); if (v !== value) onChange(v) }} />
        </Sheet>
      )}
    </>
  )
}

function SelectList<T extends string>({ value, options, label, onPick }: {
  value: T; options: readonly (readonly [T, string])[]; label: string; onPick: (v: T) => void
}) {
  const t = useTokens()
  const bg = useSurface(t)
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ backgroundColor: bg, borderRadius: t.radiusSm, overflow: 'hidden' }}>
      {options.map(([k, l], i) => {
        const on = k === value
        return (
          <Pressable key={k} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => onPick(k)}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingVertical: 11, paddingHorizontal: 16,
              backgroundColor: pressed ? t.fill : 'transparent', borderTopWidth: i ? 1 : 0, borderTopColor: t.sep })}>
            <Text style={[tx(17, 400, 1.3, BTN), { color: t.label, flex: 1 }]}>{l}</Text>
            {on && <Icon name="check" stroke={2.6} color={t.tint} />}
          </Pressable>
        )
      })}
    </View>
  )
}
