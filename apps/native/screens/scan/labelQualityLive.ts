/**
 * The label camera's live quality line, as the web's LabelCaptureView: `undefined` while checking
 * ("Checking the picture…"), `null` when the frame passes ("Looks good.", Capture on), or the
 * first thing to fix (its QUALITY_PROMPT, Capture off with "Capture anyway" beside it). The
 * numbers come from the camera; the judging is core's `qualityIssue`, with core's limits passed to
 * the camera (never copied into Swift). Pure, tested in test-scan.ts.
 */
import { QUALITY_EDGE, QUALITY_LIMITS, qualityIssue, type QualityIssue } from '@/core/domain/labelQuality'
import { toFrameQuality } from '../../modules/tilo-camera/src/mapping'

/** The web's CHECK_EVERY_MS: how often a frame is checked. */
export const CHECK_EVERY_MS = 350

/** Props for <TiloCameraView mode="label" />: core's frame size and clip level, the web's pace. */
export const LABEL_CAMERA_PROPS = { mode: 'label', qualityEdge: QUALITY_EDGE, clip: QUALITY_LIMITS.clip, qualityIntervalMs: CHECK_EVERY_MS } as const

/** A quality event as the live line's state; a malformed event leaves the line as it was. */
export function issueFromEvent(e: unknown, prev: QualityIssue | null | undefined): QualityIssue | null | undefined {
  const q = toFrameQuality(e)
  return q ? qualityIssue(q) : prev
}

/** Capture is offered as the main button only when the last frame passed (the web: disabled
 *  unless `issue === null`; "Capture anyway" otherwise). */
export const captureReady = (issue: QualityIssue | null | undefined): boolean => issue === null
