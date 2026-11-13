/**
 * The date and time wheels (ios/TiloPickersModule.swift): UIDatePicker in its wheels style, as iOS
 * shows a web page's time or date input. Values are the web's: "HH:mm" and "yyyy-MM-dd".
 * `DateWheel` is null where the module isn't built in (web, Expo Go, Android for now): callers fall
 * back to typing the value.
 */
import type { ComponentType } from 'react'
import type { ViewProps } from 'react-native'
import { requireNativeView } from 'expo'
import TiloPickers from './src/TiloPickersModule'

export interface DateWheelProps extends ViewProps {
  mode: 'time' | 'date'
  value: string
  min?: string
  max?: string
  minuteInterval?: number
  onPick: (e: { nativeEvent: { value: string } }) => void
}

export const DateWheel: ComponentType<DateWheelProps> | null = TiloPickers ? requireNativeView<DateWheelProps>('TiloPickers') : null

/**
 * "HH:mm" as the phone shows a time: its 12 or 24 hour setting on iOS (DateFormatter), the locale's
 * two-digit form elsewhere (as a browser's time input shows it). Empty stays empty.
 */
export function formatTime(hhmm: string): string {
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return hhmm
  if (TiloPickers) return TiloPickers.formatTime(hhmm)
  const [h, m] = hhmm.split(':').map(Number)
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}
