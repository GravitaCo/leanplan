/**
 * The web's `<input type="time">` and `<input type="date">` on native. On iOS a tap opens what
 * Safari opens: the system pop-up, a calendar for a date and a time pop-up for a time, anchored to
 * the field (modules/tilo-pickers' compact UIDatePicker, lying invisibly over the field the app
 * draws, as the web lays a transparent input over its label). Elsewhere (Android until its project
 * starts, the web gallery, a build without the module) a sheet named by the field holds a field to
 * type the value, Done keeping it. Values are the web's: "HH:mm", "yyyy-MM-dd".
 */
import { useState, type ReactNode } from 'react'
import { Platform, Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { DatePickerNative, formatTime } from '../../modules/tilo-pickers'
import { UI } from '@/copy/ui'
import { Input } from './fields'
import { NavBtn, Sheet } from './primitives'
import { num, tx, BTN, useTokens } from '../theme'

export type PickMode = 'time' | 'date'

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

/** The system pop-up is used: iOS with the module built in. */
const SYSTEM = Platform.OS === 'ios' && DatePickerNative != null

/** A value the web's input would accept: a real time, or a real day within min and max. */
export function validPick(mode: PickMode, v: string, min?: string, max?: string): boolean {
  if (mode === 'time') return TIME.test(v)
  if (!DATE.test(v)) return false
  const [y, m, d] = v.split('-').map(Number)
  const day = new Date(Date.UTC(y, m - 1, d))
  if (day.getUTCMonth() !== m - 1) return false
  return (!min || v >= min) && (!max || v <= max)
}

/**
 * The fallback away from iOS: a sheet titled `label` with a field to type the value, starting on
 * `value` (else `start`, else 07:00 or today within min and max); Done keeps a valid value.
 */
export function PickerSheet({ mode, value, start, min, max, label, onDone, onClose }: {
  mode: PickMode; value: string; start?: string; min?: string; max?: string; label: string
  onDone: (v: string) => void; onClose: () => void
}) {
  const [v, setV] = useState(() => {
    if (mode === 'time') return value || start || '07:00'
    const d = new Date(), today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const v0 = value || start || today
    return min && v0 < min ? min : max && v0 > max ? max : v0
  })
  const ok = validPick(mode, v, min, max)
  const done = () => { if (ok) { onDone(v); onClose() } }
  return (
    <Sheet title={label} onClose={onClose} right={<NavBtn bold title={UI.done} disabled={!ok} onPress={done} />}>
      <Input label={label} value={v} onChangeText={setV} keyboardType="numbers-and-punctuation" autoCorrect={false}
        placeholder={mode === 'time' ? 'HH:MM' : 'YYYY-MM-DD'} onSubmitEditing={done} />
    </Sheet>
  )
}

/**
 * A time or date input over a field the caller draws (`children`: words, a chip, a button's look;
 * nothing tappable inside). The whole of `style`'s box is the touch area. `label` is the input's
 * name (the web's aria-label or `<label for>`); `shown` is what VoiceOver reads as its value off
 * iOS (on iOS the system picker says it).
 */
export function DateInput({ mode, value, onChange, label, shown, min, max, start, disabled, style, children }: {
  mode: PickMode; value: string; onChange: (v: string) => void; label: string; shown?: string
  min?: string; max?: string; start?: string; disabled?: boolean; style?: StyleProp<ViewStyle>; children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  if (SYSTEM && DatePickerNative) return (
    <View style={[{ opacity: disabled ? 0.4 : 1 }, style]}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{children}</View>
      <DatePickerNative mode={mode} value={value} start={start} min={min} max={max} label={label} enabled={!disabled}
        onPick={(e) => { const v = e.nativeEvent.value; if (v !== value && validPick(mode, v, min, max)) onChange(v) }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
    </View>
  )
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityValue={shown ? { text: shown } : undefined}
        accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={() => setOpen(true)}
        style={({ pressed }) => [{ opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }, style]}>
        {children}
      </Pressable>
      {open && <PickerSheet mode={mode} value={value} start={start} min={min} max={max} label={label} onDone={onChange} onClose={() => setOpen(false)} />}
    </>
  )
}

/**
 * `.frow input[type=time]`: the time in an FRow's `right` (17 pt, tabular, right-aligned), shown
 * as the phone shows times (12 or 24 hour, `formatTime`). `muted` is `.nf-times` (in --label2);
 * `disabled` is the web's disabled input (at 40%: how WebKit dims it is a device check).
 */
export function TimeField({ value, onChange, label, muted, disabled, start }: {
  value: string; onChange: (v: string) => void; label: string; muted?: boolean; disabled?: boolean
  /** where the picker starts when there's no value yet */
  start?: string
}) {
  const t = useTokens()
  const shown = value ? formatTime(value) : ''
  return (
    // the rest of the row is the touch area; the time sits at its end either way
    <DateInput mode="time" value={value} onChange={onChange} label={label} shown={shown} start={start} disabled={disabled}
      style={{ flex: 1, minWidth: 60, paddingVertical: 11 }}>
      <Text style={[tx(17, 400, 1.3, BTN), num, { color: muted ? t.label2 : t.label, textAlign: 'right' }]}>{shown}</Text>
    </DateInput>
  )
}
