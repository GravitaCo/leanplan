/**
 * The sizes a label photo is sent at, as the web's LabelCaptureView (PANEL_EDGE, FRONT_EDGE,
 * MAX_BYTES and its toJpeg tries). Pure, so test-scan.ts checks it without a phone; Tilo's camera
 * module applies them.
 */
/** Long edge of the photo that's sent: enough for small print, well under the 1.5 MB cap. */
export const PANEL_EDGE = 1600
/** The front only needs the name, so it's sent smaller (cheaper to read). */
export const FRONT_EDGE = 1024
export const MAX_BYTES = 1_500_000

export type PhotoKind = 'panel' | 'front'

/** The long edge a photo of this kind is sent at. */
export const edgeOf = (kind: PhotoKind): number => (kind === 'front' ? FRONT_EDGE : PANEL_EDGE)

/** The web's three tries, in order: [long edge, JPEG quality]. */
export const jpegSteps = (edge: number): [number, number][] => [[edge, 0.85], [edge, 0.72], [Math.round(edge * 0.8), 0.72]]
