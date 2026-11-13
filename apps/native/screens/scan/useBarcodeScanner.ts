/**
 * The barcode scan screen's behaviour with no UI, for the scan screen to draw once N1's kit lands:
 * the camera permission, live reads from Tilo's camera (modules/tilo-camera: AVFoundation, in
 * place of the web's JS decoder), a photo of the barcode (Vision, the web's "Take a photo" row),
 * the typed number, and the lookup (src/data/scanLookup.ts, the web's own).
 *
 * Matches the web's ScanView: the camera is asked for when the screen opens; a live read counts
 * once the same valid number is read twice running (core confirmLiveRead); a photo is decoded
 * whole, so its first valid code counts at once; a bad check digit says so and keeps scanning;
 * once a code is valid the camera stops and nothing else is read.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '@/store/store'
import { FOODS } from '@/core/data/foods'
import { confirmLiveRead, normalizeBarcode } from '@/core/domain/barcode'
import { lookupProduct } from '@/data/products'
import { lookupShared, SHARED_PRODUCTS_ENABLED } from '@/data/sharedProducts'
import { resolveBarcode, type ScanOutcome } from '@/data/scanLookup'
import { barcodesInImage, cameraPermission, requestCameraPermission, toHit, type NativeBarcode, type TiloCameraViewProps } from '../../modules/tilo-camera'
import { typedDigits } from './barcode'
import { firstValid } from './firstValid'
import { deleteFile, pickPhotoUri } from './labelPhoto'

/** The web's camera states, less 'noscan' (the web decoder's first-load download; none here). */
export type ScanCamera = 'starting' | 'on' | 'denied' | 'none'

/** Why a message shows under the camera (the web's ScanView `setMsg` lines). */
export type ScanMessage = 'bad-check' | 'no-barcode' | 'photo-unreadable'

export interface BarcodeScanner {
  camera: ScanCamera
  /** a valid code being looked up, for "Looking up <code>…" */
  busy: string | null
  /** "Reading the photo…" in the Take a photo row */
  readingPhoto: boolean
  message: ScanMessage | null
  typed: string
  setTyped: (v: string) => void
  /** Look up is enabled from 8 digits, as on web */
  canSubmit: boolean
  submitTyped: () => void
  /** the Take a photo row */
  scanPhoto: () => void
  /** spread onto <TiloCameraView /> */
  cameraProps: Pick<TiloCameraViewProps, 'mode' | 'active' | 'onReady' | 'onMountError' | 'onBarcode'>
}

export function useBarcodeScanner(onResult: (r: ScanOutcome) => void): BarcodeScanner {
  const customFoods = useStore((s) => s.data.customFoods)
  const linkBarcode = useStore((s) => s.linkBarcode)
  const all = useMemo(() => FOODS.concat(customFoods || []), [customFoods])
  const aliveRef = useRef(true)
  const doneRef = useRef(false)
  const seenRef = useRef<{ code: string; n: number } | null>(null)
  const lookupRef = useRef<AbortController | null>(null)
  const [camera, setCamera] = useState<ScanCamera>('starting')
  const [scanning, setScanning] = useState(true)
  const [typed, setTypedRaw] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [readingPhoto, setReadingPhoto] = useState(false)
  const [message, setMessage] = useState<ScanMessage | null>(null)

  useEffect(() => {
    aliveRef.current = true
    // asked for when the screen opens, as the web's getUserMedia is; a no shows the note
    void (async () => {
      let p = await cameraPermission()
      if (p === 'undetermined') p = await requestCameraPermission()
      if (aliveRef.current && p === 'denied') setCamera('denied')
    })()
    return () => { aliveRef.current = false; lookupRef.current?.abort() }
  }, [])

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

  const onBarcode = useCallback((b: NativeBarcode) => {
    if (!aliveRef.current || doneRef.current) return
    const h = toHit(b)
    // only a valid number counts, and only the same one twice running (a partial read can pass its check digit)
    const norm = normalizeBarcode(h.raw, h.format)
    if (!norm) return
    const c = confirmLiveRead(seenRef.current, norm.code)
    seenRef.current = c.state
    if (c.confirmed) handle(h.raw, h.format)
  }, [handle])

  const scanPhoto = useCallback(() => {
    if (readingPhoto || doneRef.current) return
    setMessage(null)
    void (async () => {
      let uri: string | null = null
      try {
        uri = await pickPhotoUri()
        if (!uri || !aliveRef.current) return
        setReadingPhoto(true)
        const hit = firstValid(await barcodesInImage(uri))
        if (!aliveRef.current) return
        setReadingPhoto(false)
        if (hit) handle(hit.raw, hit.format)
        else setMessage('no-barcode')
      } catch {
        if (!aliveRef.current) return
        setReadingPhoto(false)
        setMessage('photo-unreadable')
      } finally {
        // the photo is only for reading the number: it goes at once
        if (uri) deleteFile(uri)
      }
    })()
  }, [readingPhoto, handle])

  const submitTyped = useCallback(() => {
    if (!typed.trim()) return
    setMessage(null)
    handle(typed)
  }, [typed, handle])

  return {
    camera,
    busy,
    readingPhoto,
    message,
    typed,
    setTyped: (v) => setTypedRaw(typedDigits(v)),
    canSubmit: typed.length >= 8,
    submitTyped,
    scanPhoto,
    cameraProps: {
      mode: 'barcode',
      active: scanning && camera !== 'denied',
      onReady: () => { if (aliveRef.current) setCamera('on') },
      onMountError: (reason) => { if (aliveRef.current) setCamera(reason) },
      onBarcode: scanning ? onBarcode : undefined,
    },
  }
}
