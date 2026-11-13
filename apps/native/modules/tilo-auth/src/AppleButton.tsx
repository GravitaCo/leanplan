/**
 * The system Sign in with Apple button (ios/TiloAppleButtonView.swift): "Continue with Apple", black
 * in light mode and white in dark, as Apple's guidelines ask. Renders nothing without the module
 * (web, Android, Expo Go); the screen checks `appleAvailable()` before showing it.
 */
import type { ComponentType } from 'react'
import type { ViewProps } from 'react-native'
import { requireNativeView } from 'expo'
import TiloAuth from './TiloAuthModule'

export interface AppleButtonProps extends ViewProps {
  appearance: 'black' | 'white'
  cornerRadius?: number
  onPress: () => void
}

const Native: ComponentType<AppleButtonProps> | null = TiloAuth ? requireNativeView<AppleButtonProps>('TiloAuth') : null

export function AppleButton(props: AppleButtonProps) {
  return Native ? <Native {...props} /> : null
}
