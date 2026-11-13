/**
 * The label camera's behaviour with no UI (the web's LabelCaptureView capture steps): permission,
 * the live quality line, Capture and Capture anyway, and the photo. The screen draws it once
 * N1's kit lands; the read itself is src/data/labelRead.ts.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { QualityIssue } from '@/core/domain/labelQuality'
import { cameraPermission, requestCameraPermission, type TiloCameraViewProps, type TiloCameraViewRef } from '../../modules/tilo-camera'
import { captureShot, pickShot, type PhotoKind, type Shot } from './labelPhoto'
import { captureReady, issueFromEvent, LABEL_CAMERA_PROPS } from './labelQualityLive'

export type LabelCamera = 'starting' | 'on' | 'denied' | 'none'
/** The web's two photo errors: a capture it couldn't use, a pick it couldn't open. */
export type LabelPhotoError = 'unusable' | 'unopenable'

export interface LabelCameraState {
  camera: LabelCamera
  /** undefined: checking; null: looks good; else the prompt's key */
  issue: QualityIssue | null | undefined
  /** Capture is the main button only when the frame passes; otherwise "Capture anyway" shows too */
  ready: boolean
  busy: boolean
  error: LabelPhotoError | null
  capture: () => Promise<Shot | null>
  choose: () => Promise<Shot | null>
  ref: React.RefObject<TiloCameraViewRef | null>
  cameraProps: Pick<TiloCameraViewProps, 'mode' | 'qualityEdge' | 'clip' | 'qualityIntervalMs' | 'active' | 'onReady' | 'onMountError' | 'onQuality'>
}

/** `active`: a capture step is showing (the web runs the camera only then). */
export function useLabelCamera(kind: PhotoKind, active: boolean): LabelCameraState {
  const ref = useRef<TiloCameraViewRef | null>(null)
  const alive = useRef(true)
  const [camera, setCamera] = useState<LabelCamera>('starting')
  const [issue, setIssue] = useState<QualityIssue | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<LabelPhotoError | null>(null)

  useEffect(() => () => { alive.current = false }, [])
  // each capture step starts afresh, as the web's effect does
  useEffect(() => {
    if (!active) return
    setCamera('starting'); setIssue(undefined); setError(null)
    void (async () => {
      let p = await cameraPermission()
      if (p === 'undetermined') p = await requestCameraPermission()
      if (alive.current && p === 'denied') setCamera('denied')
    })()
  }, [active, kind])

  const run = useCallback(async (take: () => Promise<Shot | null>, err: LabelPhotoError): Promise<Shot | null> => {
    if (busy) return null
    setBusy(true); setError(null)
    try {
      return await take()
    } catch {
      if (alive.current) setError(err)
      return null
    } finally {
      if (alive.current) setBusy(false)
    }
  }, [busy])

  return {
    camera,
    issue,
    ready: captureReady(issue),
    busy,
    error,
    capture: () => run(() => (ref.current ? captureShot(ref.current, kind) : Promise.reject(new Error('no camera'))), 'unusable'),
    choose: () => run(() => pickShot(kind), 'unopenable'),
    ref,
    cameraProps: {
      ...LABEL_CAMERA_PROPS,
      active: active && camera !== 'denied',
      onReady: () => { if (alive.current) setCamera('on') },
      onMountError: (reason) => { if (alive.current) setCamera(reason) },
      onQuality: (e) => { if (alive.current) setIssue((prev) => issueFromEvent(e, prev)) },
    },
  }
}
