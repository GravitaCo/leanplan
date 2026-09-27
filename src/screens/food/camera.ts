/**
 * Camera and image helpers shared by the barcode scanner and label capture: open the rear camera
 * into a <video>, stop every track, and draw a frame or photo scaled down onto a canvas.
 * Works in iOS Safari (including the home-screen app) and Android Chrome.
 */

export type CameraFail = 'denied' | 'none'

/** The rear camera in `video`, or why not. `alive()` false = the view closed while asking: the
 *  stream is stopped at once so the camera light never stays on. */
export async function startRearCamera(video: HTMLVideoElement | null, alive: () => boolean, ideal?: { width: number; height: number }): Promise<{ stream: MediaStream } | { fail: CameraFail } | null> {
  if (!navigator.mediaDevices?.getUserMedia) return { fail: 'none' }
  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', ...(ideal ? { width: { ideal: ideal.width }, height: { ideal: ideal.height } } : {}) },
      audio: false,
    })
  } catch (e) {
    const name = (e as { name?: string })?.name
    return { fail: name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'none' }
  }
  if (!alive()) { stream.getTracks().forEach((t) => t.stop()); return null }
  if (video) { video.srcObject = stream; video.play().catch(() => {}) }
  return { stream }
}

/** Stops every track and detaches the video. */
export function stopCamera(stream: MediaStream | null, video: HTMLVideoElement | null): void {
  stream?.getTracks().forEach((t) => t.stop())
  if (video) video.srcObject = null
}

/** `src` drawn onto a new canvas with its long edge at most `max` px (never scaled up). */
export function scaledCanvas(src: CanvasImageSource & { width?: number; height?: number; videoWidth?: number; videoHeight?: number }, max: number): HTMLCanvasElement {
  const w = src.videoWidth || (src.width as number), h = src.videoHeight || (src.height as number)
  const scale = Math.min(1, max / Math.max(w, h))
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w * scale))
  c.height = Math.max(1, Math.round(h * scale))
  c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height)
  return c
}
