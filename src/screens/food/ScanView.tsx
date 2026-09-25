/**
 * Scan a pack's barcode: live camera, a photo of the barcode (the most reliable path on iOS), or
 * the number typed in. A valid code is looked up on the device first (a food saved from an
 * earlier scan opens at once, offline too), then on Open Food Facts; anything else goes to
 * "Create a food" with the barcode filled in. Logging never waits on the network.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '@/store/store'
import type { Food, MealSlot } from '@/core/types'
import { FOODS } from '@/core/data/foods'
import { draftFromOff, findByBarcode, normalizeBarcode, type ScanDraft } from '@/core/domain/barcode'
import { lookupProduct } from '@/data/products'
import { Sheet, BackButton } from '@/ui/primitives'
import { Icon } from '@/ui/icons'
import { decodePhoto, getDecoder, type Decoder, type Hit } from './barcodeDecoder'

export type ScanOutcome =
  | { kind: 'local'; food: Food; custom: boolean }
  | { kind: 'found'; draft: ScanDraft }
  | { kind: 'missing'; barcode: string; offline: boolean }

type Camera = 'starting' | 'on' | 'denied' | 'none' | 'noscan'

const CAMERA_NOTE: Record<Exclude<Camera, 'starting' | 'on'>, string> = {
  denied: 'Tali can’t use the camera. That’s fine: take a photo of the barcode, or type the number below.',
  none: 'No camera is available here. Take a photo of the barcode, or type the number below.',
  noscan: 'The scanner needs a connection the first time it opens. Type the number below, or try again later.',
}

const SCAN_EVERY_MS = 180

export function ScanView({ onBack, onClose, animate, onResult }: {
  meal: MealSlot; setMeal: (m: MealSlot) => void; onBack?: () => void; onClose: () => void; animate: boolean
  onResult: (r: ScanOutcome) => void
}) {
  const customFoods = useStore((s) => s.data.customFoods)
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
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }

  /** A code from any path: validate, then local, then Open Food Facts. */
  const handle = async (raw: string, format?: string) => {
    if (doneRef.current) return
    const norm = normalizeBarcode(raw, format)
    if (!norm) { setMsg('That number doesn’t look right: the last digit doesn’t check out. Try again, or check the digits under the barcode.'); return }
    doneRef.current = true
    stopCamera()
    const local = findByBarcode(all, norm.code) ?? (norm.alt ? findByBarcode(all, norm.alt) : undefined)
    if (local) { onResult({ kind: 'local', food: local, custom: !!local.id }); return }
    setBusy(norm.code)
    const ctl = new AbortController()
    lookupRef.current = ctl
    const res = await lookupProduct(norm, { signal: ctl.signal })
    if (!aliveRef.current) return
    if (res.status === 'found') onResult({ kind: 'found', draft: draftFromOff(res.code, res.product, all.map((f) => f.n)) })
    else onResult({ kind: 'missing', barcode: norm.code, offline: res.status === 'offline' })
  }
  const firstValid = (hits: Hit[]) => hits.find((h) => normalizeBarcode(h.raw, h.format))

  // camera + decoder: started on open, every track stopped on close, unmount or a hit
  useEffect(() => {
    aliveRef.current = true
    let timer = 0
    let decoder: Decoder | null = null
    const loop = async () => {
      const v = videoRef.current
      if (!aliveRef.current || doneRef.current || !decoder) return
      if (v && v.readyState >= 2 && v.videoWidth > 0) {
        try {
          const hit = firstValid(await decoder.detect(v))
          if (hit && aliveRef.current) { void handle(hit.raw, hit.format); return }
        } catch { /* a frame that can't be read: keep going */ }
      }
      timer = window.setTimeout(loop, SCAN_EVERY_MS)
    }
    ;(async () => {
      if (!navigator.mediaDevices?.getUserMedia) { setCamera('none'); getDecoder().catch(() => {}); return }
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      } catch (e) {
        const name = (e as { name?: string })?.name
        if (aliveRef.current) setCamera(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'none')
        getDecoder().catch(() => {}) // warm up for "Take a photo"
        return
      }
      if (!aliveRef.current || doneRef.current) { stream.getTracks().forEach((t) => t.stop()); return }
      streamRef.current = stream
      const v = videoRef.current
      if (v) { v.srcObject = stream; v.play().catch(() => {}) }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      else setMsg('No barcode found in that photo. Try again closer, in good light, with the whole barcode in view, or type the number.')
    } catch {
      if (!aliveRef.current) return
      setBusy(null)
      setMsg('That photo couldn’t be read. Try another, or type the number below.')
    }
  }

  const submitTyped = () => { if (typed.trim()) { setMsg(null); void handle(typed) } }

  if (busy && busy !== 'photo') {
    return (
      <Sheet title="Scan barcode" onClose={onClose} animate={animate} left={onBack ? <BackButton onClick={onBack} /> : undefined}>
        <div className="empty" role="status">Looking up <span className="num">{busy}</span>…<br />If it’s not found you can enter it from the label.</div>
      </Sheet>
    )
  }

  const live = camera === 'starting' || camera === 'on'
  return (
    <Sheet title="Scan barcode" onClose={onClose} animate={animate} left={onBack ? <BackButton onClick={onBack} /> : undefined}>
      {live ? (
        <div className="scanbox">
          <video ref={videoRef} playsInline muted autoPlay aria-label="Camera view" />
          <div className="scanframe" aria-hidden="true" />
        </div>
      ) : (
        <div className="note" role="status"><Icon name="info" size={17} /><span>{CAMERA_NOTE[camera]}</span></div>
      )}
      {live && <div className="foot" style={{ textAlign: 'center' }} role="status">{camera === 'starting' ? 'Starting the camera…' : 'Hold the barcode inside the frame.'}</div>}
      {msg && <div className="note" role="alert"><Icon name="info" size={17} /><span>{msg}</span></div>}

      <div className="list icons" style={{ marginTop: 14 }}>
        <label className="li" style={{ cursor: 'pointer' }}>
          <span className="ico" style={{ background: 'var(--tint)' }}><Icon name="camera" size={18} /></span>
          <div className="m"><div className="t">{busy === 'photo' ? 'Reading the photo…' : 'Take a photo'}</div><div className="s">Of the barcode, close up</div></div>
          <input type="file" accept="image/*" capture="environment" className="vh" aria-label="Take a photo of the barcode"
            onChange={(e) => { void onPhoto(e.target.files?.[0]); e.target.value = '' }} />
        </label>
      </div>

      <div className="lbl">Or type the number</div>
      <div className="list">
        <div className="frow">
          <label htmlFor="bc_num">Barcode</label>
          <input id="bc_num" type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" placeholder="13 digits under the bars" value={typed}
            onChange={(e) => setTyped(e.target.value.replace(/[^\d]/g, '').slice(0, 14))} onKeyDown={(e) => { if (e.key === 'Enter') submitTyped() }} enterKeyHint="search" />
        </div>
      </div>
      <div className="stack"><button className="btn tinted" disabled={typed.length < 8} onClick={submitTyped}>Look up</button></div>
      <div className="foot">Values come from Open Food Facts, a shared database. You’ll check them against your pack before saving.</div>
    </Sheet>
  )
}
