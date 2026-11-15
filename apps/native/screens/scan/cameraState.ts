/**
 * The camera line's state for the scan screens, as a pure reducer (tested in test-scan.ts):
 * 'starting' each time the camera is turned on (the web's "Starting the camera…"), 'on' once Tilo's
 * camera says it's running (it says so on every start), or why it can't be used. A refusal sticks:
 * turning the camera back on doesn't hide the note.
 */
export type CameraState = 'starting' | 'on' | 'denied' | 'none'
export type CameraEvent =
  | { type: 'activate' }
  | { type: 'ready' }
  | { type: 'fail'; reason: 'denied' | 'none' }

export function cameraReducer(state: CameraState, e: CameraEvent): CameraState {
  if (state === 'denied' || state === 'none') return state
  if (e.type === 'activate') return 'starting'
  if (e.type === 'ready') return 'on'
  return e.reason
}
