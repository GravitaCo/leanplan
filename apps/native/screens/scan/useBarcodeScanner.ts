/**
 * The barcode scan screen's behaviour with no UI, for the scan screen to draw once N1's kit lands:
 * the camera permission, the platform's own barcode reads (expo-camera: AVFoundation on iOS, ML Kit
 * on Android, in place of the web's JS decoder), the typed number, and the lookup (src/data/scanLookup.ts).
 *
 * Matches the web's ScanView: the camera is asked for when the screen opens; a live read counts
 * once the same valid number is read twice running (core confirmLiveRead); a bad check digit says
 * so and keeps scanning; once a code is valid the camera stops and nothing else is read.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCameraPermissions, type BarcodeScanningResult, type CameraViewProps } from 'expo-camera'
import { useStore } from '@/store/store'
import { FOODS } from '@/core/data/foods'
import { confirmLiveRead, normalizeBarcode } from '@/core/domain/barcode'
import { lookupProduct } from '@/data/products'
import { lookupShared, SHARED_PRODUCTS_ENABLED } from '@/data/sharedProducts'
import { NATIVE_FORMATS, typedDigits, webFormat } from './barcode'
import { resolveBarcode, type ScanOutcome } from '@/data/scanLookup'

/** The web's camera states, less 'noscan' (the web decoder's first-load download; none here). */
export type ScanCamera = 'starting' | 'on' | 'denied' | 'none'

/** Why a message shows under the camera (the web's copy keys: ScanView `setMsg`). */
export type ScanMessage = 'bad-check'

export interface BarcodeScanner {
  camera: ScanCamera
  /** the camera may be shown (permission granted); `camera` says whether it has started */
  granted: boolean
  /** a valid code being looked up, for "Looking up <code>…" */
  busy: string | null
  message: ScanMessage | null
  typed: string
  setTyped: (v: string) => void
  /** Look up is enabled from 8 digits, as on web */
  canSubmit: boolean
  submitTyped: () => void
  /** spread onto <CameraView /> */
  cameraProps: Pick<CameraViewProps, 'facing' | 'active' | 'barcodeScannerSettings' | 'onBarcodeScanned' | 'onCameraReady' | 'onMountError'>
}

export function useBarcodeScanner(onResult: (r: ScanOutcome) => void): BarcodeScanner {
  const customFoods = useStore((s) => s.data.customFoods)
  const linkBarcode = useStore((s) => s.linkBarcode)
  const all = useMemo(() => FOODS.concat(customFoods || []), [customFoods])
  const [permission, requestPermission] = useCameraPermissions()
  const aliveRef = useRef(true)
  const doneRef = useRef(false)
  const seenRef = useRef<{ code: string; n: number } | null>(null)
  const lookupRef = useRef<AbortController | null>(null)
  const [camera, setCamera] = useState<ScanCamera>('starting')
  const [scanning, setScanning] = useState(true)
  const [typed, setTypedRaw] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<ScanMessage | null>(null)

  useEffect(() => {
    aliveRef.current = true
    return () => { aliveRef.current = false; lookupRef.current?.abort() }
  }, [])

  // asked for when the screen opens, as the web's getUserMedia is; a no shows the note
  const granted = !!permission?.granted
  const canAsk = !!permission?.canAskAgain
  useEffect(() => {
    if (!permission || granted) return
    if (!canAsk) { setCamera('denied'); return }
    void requestPermission().then((p) => { if (aliveRef.current && !p.granted) setCamera('denied') })
  }, [permission, granted, canAsk, requestPermission])

  const handle = useCallback((raw: string, format?: string) => {
    if (doneRef.current) return
    const ctl = new AbortController()
    const r = resolveBarcode(raw, format, {
      all, customFoods: customFoods || [], linkBarcode, sharedEnabled: SHARED_PRODUCTS_ENABLED, lookupShared, lookupProduct,
      signal: ctl.signal, alive: () => aliveRef.current,
    })
    if (r.kind === 'invalid') { setMessage('bad-check'); return }
    doneRef.current = true
    setScanning(false)
    if (r.kind === 'done') { onResult(r.outcome); return }
    lookupRef.current = ctl
    setBusy(r.code)
    void r.result.then((o) => { if (o && aliveRef.current) onResult(o) })
  }, [all, customFoods, linkBarcode, onResult])

  const onBarcodeScanned = useCallback((s: BarcodeScanningResult) => {
    if (!aliveRef.current || doneRef.current) return
    const format = webFormat(s.type, s.data)
    // only a valid number counts, and only the same one twice running (a partial read can pass its check digit)
    const norm = normalizeBarcode(s.data, format)
    if (!norm) return
    const c = confirmLiveRead(seenRef.current, norm.code)
    seenRef.current = c.state
    if (c.confirmed) handle(s.data, format)
  }, [handle])

  const submitTyped = useCallback(() => {
    if (!typed.trim()) return
    setMessage(null)
    handle(typed)
  }, [typed, handle])

  return {
    camera,
    granted,
    busy,
    message,
    typed,
    setTyped: (v) => setTypedRaw(typedDigits(v)),
    canSubmit: typed.length >= 8,
    submitTyped,
    cameraProps: {
      facing: 'back',
      active: scanning,
      barcodeScannerSettings: { barcodeTypes: NATIVE_FORMATS },
      onBarcodeScanned: scanning ? onBarcodeScanned : undefined,
      onCameraReady: () => { if (aliveRef.current) setCamera('on') },
      onMountError: () => { if (aliveRef.current) setCamera('none') },
    },
  }
}
