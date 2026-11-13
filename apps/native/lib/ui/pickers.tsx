/**
 * The web's `<input type="time">` and `<input type="date">` on native. iOS shows the system wheels
 * (modules/tilo-pickers: UIDatePicker, wheels style) in a sheet named by the field, Done keeping the
 * pick and Cancel leaving the value as it was. Without the module (web, Expo Go, Android for now)
 * the sheet holds a field to type the value instead. Values are the web's: "HH:mm", "yyyy-MM-dd".
 */
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { DateWheel, formatTime } from '../../modules/tilo-pickers'
import { Input } from './fields'
import { NavBtn, Sheet } from './primitives'
import { num, tx, BTN, useTokens } from '../theme'
import { UI } from '@/copy/ui'

export type PickMode = 'time' | 'date'

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

/** A typed value the web's input would accept: a real time, or a real day within min and max. */
export function validPick(mode: PickMode, v: string, min?: string, max?: string): boolean {
  if (mode === 'time') return TIME.test(v)
  if (!DATE.test(v)) return false
  const [y, m, d] = v.split('-').map(Number)
  const day = new Date(Date.UTC(y, m - 1, d))
  if (day.getUTCMonth() !== m - 1) return false
  return (!min || v >= min) && (!max || v <= max)
}

/**
 * The picker in a sheet titled `label`: the wheels start on `value` (else `start`), Done hands the
 * pick to `onDone` and closes. `min`/`max` bound a date.
 */
export function PickerSheet({ mode, value, start, min, max, label, onDone, onClose }: {
  mode: PickMode; value: string; start?: string; min?: string; max?: string; label: string
  onDone: (v: string) => void; onClose: () => void
}) {
  const [v, setV] = useState(value || start || (mode === 'time' ? '07:00' : min ?? ''))
  const ok = validPick(mode, v, min, max)
  const done = () => { if (ok) { onDone(v); onClose() } }
  return (
    <Sheet title={label} onClose={onClose} right={<NavBtn bold title={UI.done} disabled={!ok} onPress={done} />}>
      {DateWheel ? (
        <View style={{ alignItems: 'center' }}>
          {/* the wheels' own height (216 pt, as UIKit draws them) */}
          <DateWheel mode={mode} value={v} min={min} max={max} onPick={(e) => setV(e.nativeEvent.value)}
            accessibilityLabel={label} style={{ height: 216, alignSelf: 'stretch' }} />
        </View>
      ) : (
        <Input label={label} value={v} onChangeText={setV} keyboardType="numbers-and-punctuation" autoCorrect={false}
          placeholder={mode === 'time' ? 'HH:MM' : 'YYYY-MM-DD'} onSubmitEditing={done} />
      )}
    </Sheet>
  )
}

/**
 * `.frow input[type=time]`: the time in an FRow's `right` (17 pt, tabular, right-aligned), shown
 * as the phone shows times (12 or 24 hour, `formatTime`); a tap
 * opens the wheels. `muted` is `.nf-times` (in --label2); `disabled` is the
 * web's disabled input (at 40%: how WebKit dims it is unconfirmed).
 */
export function TimeField({ value, onChange, label, muted, disabled, start }: {
  value: string; onChange: (v: string) => void; label: string; muted?: boolean; disabled?: boolean
  /** where the wheels start when there's no value yet */
  start?: string
}) {
  const t = useTokens()
  const [open, setOpen] = useState(false)
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityValue={value ? { text: formatTime(value) } : undefined}
        accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={() => setOpen(true)}
        // the rest of the row is the touch area; the time sits at its end either way
        style={({ pressed }) => ({ flex: 1, minWidth: 60, paddingVertical: 11, opacity: disabled ? 0.4 : pressed ? 0.6 : 1 })}>
        <Text style={[tx(17, 400, 1.3, BTN), num, { color: muted ? t.label2 : t.label, textAlign: 'right' }]}>{formatTime(value)}</Text>
      </Pressable>
      {open && <PickerSheet mode="time" value={value} start={start} label={label} onDone={onChange} onClose={() => setOpen(false)} />}
    </>
  )
}
