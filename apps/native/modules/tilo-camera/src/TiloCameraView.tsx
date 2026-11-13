/**
 * The camera preview (ios/TiloCameraView.swift). Without the native module (web, Expo Go, Android
 * for now) it renders an empty view and reports `onMountError` with 'none', so the screen shows the
 * web's "No camera is available here" note.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, type ComponentType, type Ref } from 'react'
import { View, type ViewProps } from 'react-native'
import { requireNativeView } from 'expo'
import TiloCamera from './TiloCameraModule'
import type { NativeBarcode } from './mapping'

export type CameraMode = 'barcode' | 'label' | 'off'
export interface TakenPhoto { uri: string; width: number; height: number }
type NativeEvent<T> = { nativeEvent: T }

export interface TiloCameraViewProps extends ViewProps {
  active?: boolean
  mode?: CameraMode
  /** core labelQuality QUALITY_EDGE and QUALITY_LIMITS.clip, and how often to measure (ms) */
  qualityEdge?: number
  clip?: number
  qualityIntervalMs?: number
  onReady?: () => void
  onMountError?: (reason: 'denied' | 'none') => void
  onBarcode?: (b: NativeBarcode) => void
  onQuality?: (q: Record<string, unknown>) => void
}

export interface TiloCameraViewRef { takePhoto: () => Promise<TakenPhoto> }

type NativeProps = Omit<TiloCameraViewProps, 'onReady' | 'onMountError' | 'onBarcode' | 'onQuality'> & {
  ref?: Ref<TiloCameraViewRef>
  onReady?: () => void
  onMountError?: (e: NativeEvent<{ reason: string }>) => void
  onBarcode?: (e: NativeEvent<NativeBarcode>) => void
  onQuality?: (e: NativeEvent<Record<string, unknown>>) => void
}

const Native: ComponentType<NativeProps> | null = TiloCamera ? requireNativeView<NativeProps>('TiloCamera') : null

export const TiloCameraView = forwardRef<TiloCameraViewRef, TiloCameraViewProps>(function TiloCameraView(
  { onReady, onMountError, onBarcode, onQuality, ...rest }, ref,
) {
  const inner = useRef<TiloCameraViewRef | null>(null)
  useImperativeHandle(ref, () => ({
    takePhoto: () => (inner.current ? inner.current.takePhoto() : Promise.reject(new Error('no camera'))),
  }), [])
  useEffect(() => { if (!Native) onMountError?.('none') }, []) // eslint-disable-line react-hooks/exhaustive-deps
  if (!Native) return <View {...rest} />
  return (
    <Native {...rest} ref={inner}
      onReady={onReady}
      onMountError={(e) => onMountError?.(e.nativeEvent.reason === 'denied' ? 'denied' : 'none')}
      onBarcode={onBarcode ? (e) => onBarcode(e.nativeEvent) : undefined}
      onQuality={onQuality ? (e) => onQuality(e.nativeEvent) : undefined} />
  )
})
