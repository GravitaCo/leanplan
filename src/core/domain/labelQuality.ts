/**
 * Photo quality for label scanning, measured on a small greyscale copy of a camera frame
 * (plan §1.1.3): blur as the variance of the Laplacian, brightness as mean luminance, glare as the
 * share of clipped white pixels. Pure maths on a pixel array, so native can reuse it.
 *
 * Thresholds are set for a frame about QUALITY_EDGE px on its long edge. They're deliberately
 * forgiving: a failing check only changes the prompt; "Capture anyway" is always there.
 */

/** Long edge of the frame the checks run on. */
export const QUALITY_EDGE = 320

export interface FrameQuality {
  /** variance of the 4-neighbour Laplacian: higher = sharper */
  blur: number
  /** mean luminance, 0–255 */
  brightness: number
  /** share of pixels at or above CLIP, 0–1 */
  glare: number
}

export const QUALITY_LIMITS = {
  /** below this mean the text is too dark to read reliably */
  minBrightness: 55,
  /** a pixel this bright has lost its detail */
  clip: 252,
  /** more than this share of clipped pixels = a glare patch that can hide digits */
  maxGlare: 0.1,
  /** Laplacian variance below this = motion or focus blur at QUALITY_EDGE px */
  minSharpness: 40,
}

/** Luminance (Rec. 601) of RGBA pixel data, as one byte per pixel. */
export function toGray(rgba: ArrayLike<number>, w: number, h: number): Uint8Array {
  const g = new Uint8Array(w * h)
  for (let i = 0, j = 0; j < g.length; i += 4, j++) g[j] = (rgba[i] * 299 + rgba[i + 1] * 587 + rgba[i + 2] * 114) / 1000
  return g
}

export function measureFrame(gray: ArrayLike<number>, w: number, h: number): FrameQuality {
  const n = w * h
  let sum = 0, clipped = 0
  for (let i = 0; i < n; i++) { sum += gray[i]; if (gray[i] >= QUALITY_LIMITS.clip) clipped++ }
  let lSum = 0, lSq = 0, count = 0
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const l = gray[i - w] + gray[i + w] + gray[i - 1] + gray[i + 1] - 4 * gray[i]
      lSum += l; lSq += l * l; count++
    }
  }
  const mean = count ? lSum / count : 0
  return { blur: count ? lSq / count - mean * mean : 0, brightness: n ? sum / n : 0, glare: n ? clipped / n : 0 }
}

export type QualityIssue = 'dark' | 'glare' | 'blur'

/** Neutral, specific prompts: what to change, never what went wrong. */
export const QUALITY_PROMPT: Record<QualityIssue, string> = {
  dark: 'A bit dark. Try near a window or under a light.',
  glare: 'Glare on the label. Tilt the pack a little.',
  blur: 'Hold still, or move back a little so it can focus.',
}

/** The first thing to fix, in the order it matters (light, then glare, then focus), or null. */
export function qualityIssue(q: FrameQuality): QualityIssue | null {
  if (q.brightness < QUALITY_LIMITS.minBrightness) return 'dark'
  if (q.glare > QUALITY_LIMITS.maxGlare) return 'glare'
  if (q.blur < QUALITY_LIMITS.minSharpness) return 'blur'
  return null
}
