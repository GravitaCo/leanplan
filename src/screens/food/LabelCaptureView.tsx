/**
 * Photograph a pack's nutrition panel (and, optionally, its front for the name), then have it
 * read. Live checks on a small copy of the camera frame say what to change (light, glare, focus)
 * before capture; "Capture anyway" and a photo from the library are always there. The photo is
 * downscaled on the device, sent once to be read, and dropped: it's never stored.
 *
 * Anything but a good read (offline, not signed in, slow, the daily cap, an error) opens the
 * confirm view to type the label in, so this is never a dead end. Loaded only when opened.
 */
import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/store/store'
import { consentLetsSync } from '@/data/consent'
import { FOODS } from '@/core/data/foods'
import type { ScanDraft } from '@/core/domain/barcode'
import { draftFromLabel, emptyLabelDraft } from '@/core/domain/label'
import { measureFrame, qualityIssue, toGray, QUALITY_EDGE, QUALITY_PROMPT, type QualityIssue } from '@/core/domain/labelQuality'
import { readLabel, type LabelReadResult } from '@/data/labelReader'
import { Sheet, BackButton } from '@/ui/primitives'
import { Icon, Chevron } from '@/ui/icons'
import { scaledCanvas, startRearCamera, stopCamera, type CameraFail } from './camera'

/** Long edge of the photo that's sent: enough for small print, well under the 1.5 MB cap. */
const PANEL_EDGE = 1600
/** The front only needs the name, so it's sent smaller (cheaper to read). */
const FRONT_EDGE = 1024
const MAX_BYTES = 1_500_000
const CHECK_EVERY_MS = 350

export const CONSENT = 'Tali doesn’t keep your photo. It’s sent to Anthropic’s AI service to read the numbers, under their data policy. You can check the numbers before anything is saved.'
export const GUIDANCE = 'Find good light. Lay the pack flat. Fill the frame with the nutrition table. Avoid glare and creases.'

type Shot = { blob: Blob; url: string; issue: QualityIssue | null }
type Step = 'consent' | 'panel' | 'front' | 'review' | 'reading'

const FAIL_NOTE: Record<Exclude<LabelReadResult['status'], 'ok'>, string> = {
  offline: 'Couldn’t read the photo without a connection, or it took too long.',
  unavailable: 'Photo reading isn’t available right now.',
  'no-session': 'Sign in again to read photos.',
  consent: 'Couldn’t confirm your OK to read photos yet. Try again in a moment.',
  limit: 'You’ve used today’s photo reads. They reset tomorrow.',
  unreadable: 'The photo couldn’t be read. A flatter, brighter shot often helps.',
  error: 'Couldn’t read the photo right now.',
}

const CAMERA_NOTE: Record<CameraFail, string> = {
  denied: 'Tali can’t use the camera. That’s fine: choose a photo of the label instead.',
  none: 'No camera is available here. Choose a photo of the label instead.',
}

/** A JPEG of `src` at most `edge` px on its long edge and MAX_BYTES in size. */
async function toJpeg(src: CanvasImageSource & { width?: number; height?: number; videoWidth?: number; videoHeight?: number }, edge: number): Promise<{ blob: Blob; issue: QualityIssue | null }> {
  const small = scaledCanvas(src, QUALITY_EDGE)
  const issue = frameIssue(small)
  for (const [max, q] of [[edge, 0.85], [edge, 0.72], [Math.round(edge * 0.8), 0.72]] as const) {
    const c = scaledCanvas(src, max)
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/jpeg', q))
    if (blob && blob.size <= MAX_BYTES) return { blob, issue }
  }
  throw new Error('too large')
}

function frameIssue(c: HTMLCanvasElement): QualityIssue | null {
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  const px = ctx.getImageData(0, 0, c.width, c.height).data
  return qualityIssue(measureFrame(toGray(px, c.width, c.height), c.width, c.height))
}

const base64 = (b: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader()
  r.onload = () => res(String(r.result).replace(/^data:[^,]*,/, ''))
  r.onerror = () => rej(r.error)
  r.readAsDataURL(b)
})

export default function LabelCaptureView({ onBack, onClose, animate, barcode, base, onDone }: {
  onBack?: () => void; onClose: () => void; animate: boolean
  /** a barcode scanned in the same session: saved with the food */
  barcode?: string
  /** the Open Food Facts draft this photo replaces the numbers of */
  base?: ScanDraft
  /** the confirm view's starting point; `notice` when the photo couldn't be read */
  onDone: (draft: ScanDraft, notice?: string) => void
}) {
  const customFoods = useStore((s) => s.data.customFoods)
  const hasConsent = useStore((s) => s.hasConsent)
  const grantConsent = useStore((s) => s.grantConsent)
  const [step, setStep] = useState<Step>(() => (hasConsent('label-photo') ? 'panel' : 'consent'))
  const [panel, setPanel] = useState<Shot | null>(null)
  const [front, setFront] = useState<Shot | null>(null)
  const [camera, setCamera] = useState<'starting' | 'on' | CameraFail>('starting')
  const [issue, setIssue] = useState<QualityIssue | null | undefined>(undefined)
  const [msg, setMsg] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const aliveRef = useRef(true)
  const readRef = useRef<AbortController | null>(null)
  const shotsRef = useRef<Shot[]>([])

  const taken = () => FOODS.concat(customFoods || []).map((f) => f.n)
  const typeInstead = (notice?: string) => onDone(base ? { ...base } : emptyLabelDraft({ barcode, base, taken: taken() }), notice)

  // photos live only in memory while this view is open
  useEffect(() => () => {
    aliveRef.current = false
    readRef.current?.abort()
    shotsRef.current.forEach((s) => URL.revokeObjectURL(s.url))
  }, [])

  // the camera runs only while a capture step is showing; every track stops when it ends
  const live = step === 'panel' || step === 'front'
  useEffect(() => {
    if (!live) return
    let stream: MediaStream | null = null
    let timer = 0
    let on = true
    setCamera('starting')
    setIssue(undefined)
    const check = () => {
      const v = videoRef.current
      if (!on) return
      if (v && v.readyState >= 2 && v.videoWidth > 0) {
        try { setIssue(frameIssue(scaledCanvas(v, QUALITY_EDGE))) } catch { /* a frame that can't be read */ }
      }
      timer = window.setTimeout(check, CHECK_EVERY_MS)
    }
    ;(async () => {
      const cam = await startRearCamera(videoRef.current, () => on && aliveRef.current, { width: 1920, height: 1440 })
      if (!cam) return
      if ('fail' in cam) { if (on) setCamera(cam.fail); return }
      stream = cam.stream
      setCamera('on')
      check()
    })()
    return () => { on = false; window.clearTimeout(timer); stopCamera(stream, videoRef.current) }
  }, [live, step])

  const keep = (blob: Blob, q: QualityIssue | null) => {
    const shot = { blob, url: URL.createObjectURL(blob), issue: q }
    shotsRef.current.push(shot)
    if (step === 'front') setFront(shot)
    else setPanel(shot)
    setMsg(null)
    setStep('review')
  }

  const capture = async () => {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    try {
      const { blob, issue: q } = await toJpeg(v, step === 'front' ? FRONT_EDGE : PANEL_EDGE)
      if (aliveRef.current) keep(blob, q)
    } catch {
      setMsg('That photo couldn’t be used. Try again.')
    }
  }

  const pick = async (file: File | undefined) => {
    if (!file) return
    try {
      const bmp = await createImageBitmap(file)
      try {
        const { blob, issue: q } = await toJpeg(bmp, step === 'front' ? FRONT_EDGE : PANEL_EDGE)
        if (aliveRef.current) keep(blob, q)
      } finally { bmp.close() }
    } catch {
      setMsg('That photo couldn’t be opened. Try another.')
    }
  }

  const read = async () => {
    if (!panel) return
    setStep('reading')
    const ctl = new AbortController()
    readRef.current = ctl
    let res: LabelReadResult
    try {
      // a photo goes to the server: not before the health answer (its consent record can't sync yet)
      if (!consentLetsSync(useStore.getState().data)) throw new Error('no consent answer yet')
      // the server checks the label-photo consent itself: send a yes given moments ago first
      await useStore.getState().flushConsents()
      res = await readLabel({ panel: await base64(panel.blob), ...(front ? { front: await base64(front.blob) } : {}) }, { signal: ctl.signal })
    } catch {
      res = { status: 'error' }
    }
    if (!aliveRef.current) return
    if (res.status === 'ok') {
      onDone(draftFromLabel(res.read, { barcode, base, taken: taken() }))
      return
    }
    const then = base
      ? ' The Open Food Facts figures are below: check them against your pack.'
      : res.status === 'unavailable' ? ' Type it in instead.' : ' Type the numbers from the pack below.'
    typeInstead(FAIL_NOTE[res.status] + then)
  }

  const left = onBack ? <BackButton onClick={onBack} /> : undefined
  const title = 'Scan the label'

  if (step === 'consent') {
    return (
      <Sheet title={title} onClose={onClose} animate={animate} left={left}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>Before your first photo</div>
          <div className="sub">{CONSENT}</div>
          <div className="foot" style={{ padding: '10px 0 0' }}>Nothing else about you is sent.</div>
        </div>
        <div className="stack">
          <button className="btn tinted" onClick={() => { grantConsent('label-photo'); setStep('panel') }}>OK, take a photo</button>
          <button className="btn gray" onClick={() => typeInstead()}>Type it in instead</button>
        </div>
      </Sheet>
    )
  }

  if (step === 'reading') {
    return (
      <Sheet title={title} onClose={onClose} animate={animate} left={left}>
        <div className="empty" role="status">Reading the label…</div>
      </Sheet>
    )
  }

  if (step === 'review' && panel) {
    return (
      <Sheet title={title} onClose={onClose} animate={animate} left={left}>
        <div className="list icons">
          <div className="li">
            <img className="labelthumb" src={panel.url} alt="Your photo of the nutrition table" />
            <div className="m"><div className="t">Nutrition table</div><div className="s">{panel.issue ? `May be hard to read: ${QUALITY_PROMPT[panel.issue].toLowerCase()}` : 'Ready to read'}</div></div>
            <button className="navbtn" onClick={() => setStep('panel')}>Retake</button>
          </div>
          {front ? (
            <div className="li">
              <img className="labelthumb" src={front.url} alt="Your photo of the front of the pack" />
              <div className="m"><div className="t">Front of the pack</div><div className="s">For the name</div></div>
              <button className="navbtn" onClick={() => setFront(null)}>Remove</button>
            </div>
          ) : (
            <button className="li" onClick={() => setStep('front')}>
              <span className="ico" style={{ background: 'var(--fill)', color: 'var(--label)' }}><Icon name="camera" size={18} /></span>
              <div className="m"><div className="t">Add the front of the pack</div><div className="s">Optional, for the name</div></div><Chevron />
            </button>
          )}
        </div>
        <div className="stack">
          <button className="btn tinted" onClick={() => void read()}>Read the label</button>
        </div>
        <div className="foot">Your photo is read once, then Tali doesn’t keep it.</div>
      </Sheet>
    )
  }

  const isFront = step === 'front'
  const showLive = camera === 'starting' || camera === 'on'
  const prompt = camera === 'starting' ? 'Starting the camera…' : issue ? QUALITY_PROMPT[issue] : issue === null ? 'Looks good.' : 'Checking the picture…'
  return (
    <Sheet title={title} onClose={onClose} animate={animate}
      left={isFront ? <BackButton onClick={() => setStep('review')} /> : left}>
      <div className="foot" style={{ padding: '0 4px 10px' }}>{isFront ? 'Fit the front of the pack in the frame, with the name clear.' : GUIDANCE}</div>
      {/* always mounted, so the camera can attach as soon as it opens */}
      <div className="scanbox tall" hidden={!showLive}>
        <video ref={videoRef} playsInline muted autoPlay aria-label="Camera view" />
        <div className="scanframe label" aria-hidden="true" />
      </div>
      {!showLive && <div className="note" role="status"><Icon name="info" size={17} /><span>{CAMERA_NOTE[camera as CameraFail]}</span></div>}
      {showLive && <div className="foot" style={{ textAlign: 'center' }} role="status" aria-live="polite" data-quality={issue ?? (issue === null ? 'ok' : 'wait')}>{prompt}</div>}
      {msg && <div className="note" role="alert"><Icon name="info" size={17} /><span>{msg}</span></div>}
      {camera === 'on' && (
        <div className="stack">
          <button className="btn tinted" disabled={issue !== null} onClick={() => void capture()}>Capture</button>
          {issue !== null && <button className="btn gray" onClick={() => void capture()}>Capture anyway</button>}
        </div>
      )}
      <div className="list icons" style={{ marginTop: 14 }}>
        <label className="li" style={{ cursor: 'pointer' }}>
          <span className="ico" style={{ background: 'var(--tint)' }}><Icon name="camera" size={18} /></span>
          <div className="m"><div className="t">Choose a photo</div><div className="s">{isFront ? 'Of the front of the pack' : 'Of the nutrition table, from your photos'}</div></div>
          <input type="file" accept="image/*" className="vh" aria-label={isFront ? 'Choose a photo of the front of the pack' : 'Choose a photo of the nutrition table'}
            onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = '' }} />
        </label>
        {!isFront && (
          <button className="li" onClick={() => typeInstead()}>
            <div className="m"><div className="t">Type it in instead</div></div><Chevron />
          </button>
        )}
      </div>
    </Sheet>
  )
}
