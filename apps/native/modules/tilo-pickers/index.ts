/**
 * The web's form controls as iOS Safari presents them (ios/TiloPickersModule.swift). Each native
 * view lies invisibly over text the app draws, and a tap opens the system's own pop-up:
 * `DatePickerNative` (UIDatePicker, compact: a calendar for a date, a time pop-up for a time) and
 * `MenuNative` (a UIMenu of the options, as Safari opens a select). Values are the web's: "HH:mm"
 * and "yyyy-MM-dd". Both are null where the module isn't built in (web, Expo Go, Android): callers
 * fall back to a sheet.
 */
import type { ComponentType } from 'react'
import type { ViewProps } from 'react-native'
import { requireNativeView } from 'expo'
import TiloPickers from './src/TiloPickersModule'

export interface DatePickerNativeProps extends ViewProps {
  mode: 'time' | 'date'
  value: string
  min?: string
  max?: string
  minuteInterval?: number
  /** the field's name, for VoiceOver */
  label: string
  enabled?: boolean
  onPick: (e: { nativeEvent: { value: string } }) => void
}

export interface MenuNativeProps extends ViewProps {
  options: string[]
  selected: number
  /** the field's name, for VoiceOver (the chosen option is its value) */
  label: string
  enabled?: boolean
  onPick: (e: { nativeEvent: { index: number } }) => void
}

export const DatePickerNative: ComponentType<DatePickerNativeProps> | null = TiloPickers ? requireNativeView<DatePickerNativeProps>('TiloPickers', 'TiloDatePicker') : null
export const MenuNative: ComponentType<MenuNativeProps> | null = TiloPickers ? requireNativeView<MenuNativeProps>('TiloPickers', 'TiloMenu') : null

/**
 * "HH:mm" as the phone shows a time: its 12 or 24 hour setting on iOS (DateFormatter), the locale's
 * two-digit form elsewhere (as a browser's time input shows it). Anything else is returned as is.
 */
export function formatTime(hhmm: string): string {
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return hhmm
  if (TiloPickers) return TiloPickers.formatTime(hhmm)
  const [h, m] = hhmm.split(':').map(Number)
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}
