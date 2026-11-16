/**
 * Scan a pack's barcode: live camera, a photo of the barcode (the most reliable path on iOS), or
 * the number typed in. A valid code is looked up on the device first (a food saved from an
 * earlier scan opens at once, offline too), then on Tilo's shared product list (when it's on),
 * then on Open Food Facts; anything else goes to "Create a food" with the barcode filled in.
 * Logging never waits on the network.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '@/store/store'
import type { MealSlot } from '@/core/types'
import { FOODS } from '@/core/data/foods'
import { confirmLiveRead, normalizeBarcode } from '@/core/domain/barcode'
import { lookupProduct } from '@/data/products'
import { lookupShared, SHARED_PRODUCTS_ENABLED } from '@/data/sharedProducts'
import { resolveBarcode, type ScanOutcome } from '@/data/scanLookup'
import { Sheet, BackButton } from '@/ui/primitives'
import { Icon } from '@/ui/icons'
import { decodePhoto, getDecoder, type Decoder, type Hit } from './barcodeDecoder'
import { startRearCamera, stopCamera as stopStream } from './camera'
import { SCAN, SCAN_CAMERA_NOTE, SCAN_TITLE } from '@/copy/scan'

export type { ScanOutcome }

type Camera = 'starting' | 'on' | 'denied' | 'none' | 'noscan'

const CAMERA_NOTE: Record<Exclude<Camera, 'starting' | 'on'>, string> = SCAN_CAMERA_NOTE

const SCAN_EVERY_MS = 180

export function ScanView({ onBack, onClose, animate, onResult }: {
  meal: MealSlot; setMeal: (m: MealSlot) => void; onBack?: () => void; onClose: () => void; animate: boolean
  onResult: (r: ScanOutcome) => void
}) {
  const customFoods = useStore((s) => s.data.customFoods)
  const linkBarcode = useStore((s) => s.linkBarcode)
  const all = useMemo(() => FOODS.concat(customFoods || []), [customFoods])
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const aliveRef = useRef(true)
  const doneRef = useRef(false)
  const lookupRef = useRef<AbortController | null>(null)
  const [camera, setCamera] = useState<Camera>('starting')
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const stopCamera = () => {
    stopStream(streamRef.current, videoRef.current)
    streamRef.current = null
  }

  /** A code from any path: validate, then the device, the shared list and Open Food Facts
   *  (src/data/scanLookup.ts, shared with the native app). */
  const handle = async (raw: string, format?: string) => {
    if (doneRef.current) return
    const ctl = new AbortController()
    const r = resolveBarcode(raw, format, {
      all, customFoods: customFoods || [], linkBarcode, sharedEnabled: SHARED_PRODUCTS_ENABLED, lookupShared, lookupProduct,
      signal: ctl.signal, alive: () => aliveRef.current,
    })
    if (r.kind === 'invalid') { setMsg(SCAN.badCheck); return }
    doneRef.current = true
    stopCamera()
    if (r.kind === 'done') { onResult(r.outcome); return }
    lookupRef.current = ctl
    setBusy(r.code)
    const outcome = await r.result
    if (outcome) onResult(outcome)
  }
  const firstValid = (hits: Hit[]) => hits.find((h) => normalizeBarcode(h.raw, h.format))

  // camera + decoder: started on open, every track stopped on close, unmount or a hit
  useEffect(() => {
    aliveRef.current = true
    let timer = 0
    let decoder: Decoder | null = null
    let seen: { code: string; n: number } | null = null
    const loop = async () => {
      const v = videoRef.current
      if (!aliveRef.current || doneRef.current || !decoder) return
      if (v && v.readyState >= 2 && v.videoWidth > 0) {
        try {
          const hit = firstValid(await decoder.detect(v))
          // the same number in two frames running before it counts (a partial read can pass its check digit)
          const norm = hit ? normalizeBarcode(hit.raw, hit.format) : null
          const r = confirmLiveRead(seen, norm?.code ?? null)
          seen = r.state
          if (hit && r.confirmed && aliveRef.current) { void handle(hit.raw, hit.format); return }
        } catch { /* a frame that can't be read: keep going */ }
      }
      timer = window.setTimeout(loop, SCAN_EVERY_MS)
    }
    ;(async () => {
      const cam = await startRearCamera(videoRef.current, () => aliveRef.current && !doneRef.current)
      if (!cam) return
      if ('fail' in cam) {
        if (aliveRef.current) setCamera(cam.fail)
        getDecoder().catch(() => {}) // warm up for "Take a photo"
        return
      }
      streamRef.current = cam.stream
      try {
        decoder = await getDecoder()
      } catch {
        stopCamera()
        if (aliveRef.current) setCamera('noscan')
        return
      }
      if (!aliveRef.current) return
      setCamera('on')
      void loop()
    })()
    return () => {
      aliveRef.current = false
      window.clearTimeout(timer)
      lookupRef.current?.abort()
      stopCamera()
    }
  }, [])

  const onPhoto = async (file: File | undefined) => {
    if (!file) return
    setMsg(null)
    setBusy('photo')
    try {
      const hit = firstValid(await decodePhoto(file))
      if (!aliveRef.current) return
      setBusy(null)
      if (hit) void handle(hit.raw, hit.format)
      else setMsg(SCAN.noBarcode)
    } catch {
      if (!aliveRef.current) return
      setBusy(null)
      setMsg(SCAN.photoUnreadable)
    }
  }

  const submitTyped = () => { if (typed.trim()) { setMsg(null); void handle(typed) } }

  if (busy && busy !== 'photo') {
    return (
      <Sheet title={SCAN_TITLE} onClose={onClose} animate={animate} left={onBack ? <BackButton onClick={onBack} /> : undefined}>
        <div className="empty" role="status">{SCAN.lookingUp} <span className="num">{busy}</span>…<br />{SCAN.lookingUpAfter}</div>
      </Sheet>
    )
  }

  const live = camera === 'starting' || camera === 'on'
  return (
    <Sheet title={SCAN_TITLE} onClose={onClose} animate={animate} left={onBack ? <BackButton onClick={onBack} /> : undefined}>
      {live ? (
        <div className="scanbox">
          <video ref={videoRef} playsInline muted autoPlay aria-label="Camera view" />
          <div className="scanframe" aria-hidden="true" />
        </div>
      ) : (
        <div className="note" role="status"><Icon name="info" size={17} /><span>{CAMERA_NOTE[camera]}</span></div>
      )}
      {live && <div className="foot" style={{ textAlign: 'center' }} role="status">{camera === 'starting' ? SCAN.starting : SCAN.hold}</div>}
      {msg && <div className="note" role="alert"><Icon name="info" size={17} /><span>{msg}</span></div>}

      <div className="list icons" style={{ marginTop: 14 }}>
        <label className="li" style={{ cursor: 'pointer' }}>
          <span className="ico" style={{ background: 'var(--tint)' }}><Icon name="camera" size={18} /></span>
          <div className="m"><div className="t">{busy === 'photo' ? SCAN.readingPhoto : SCAN.takePhoto}</div><div className="s">{SCAN.photoSub}</div></div>
          <input type="file" accept="image/*" className="vh" aria-label={SCAN.photoAria}
            onChange={(e) => { void onPhoto(e.target.files?.[0]); e.target.value = '' }} />
        </label>
      </div>

      <div className="lbl">{SCAN.orType}</div>
      <div className="list">
        <div className="frow">
          <label htmlFor="bc_num">{SCAN.barcode}</label>
          <input id="bc_num" type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" placeholder={SCAN.placeholder} value={typed}
            onChange={(e) => setTyped(e.target.value.replace(/[^\d]/g, '').slice(0, 14))} onKeyDown={(e) => { if (e.key === 'Enter') submitTyped() }} enterKeyHint="search" />
        </div>
      </div>
      <div className="stack"><button className="btn tinted" disabled={typed.length < 8} onClick={submitTyped}>{SCAN.lookUp}</button></div>
      <div className="foot">{SCAN.source}</div>
    </Sheet>
  )
}
