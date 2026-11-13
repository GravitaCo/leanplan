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
