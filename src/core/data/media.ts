import type { ExerciseMedia } from '@/core/types'

/**
 * Where a clip given as a bare file name is served from (`public/videos/`). Every clip in DEMOS
 * now comes from the Bunny Stream library as a full URL, which `mediaUrl` passes through.
 */
export const VIDEO_BASE = 'videos/'

export function mediaUrl(path: string): string {
  return /^https?:\/\//.test(path) ? path : VIDEO_BASE + path
}

/**
 * Demo clips with their tempo, timed from the footage (bar/head position tracked frame by frame
 * at 8 fps, so phase edges are accurate to about ⅛ s). The counter shows what the clip really
 * does, so re-time these whenever a clip is replaced.
 */
export const DEMOS = {
  // Bunny Stream library (MP4 fallback, 720×1280). The library refuses requests with no referrer,
  // which a page always sends, so these play in the app but not as bare links.
  // 17.8 s, trimmed to end with arms straight so the loop is seamless (the untrimmed upload,
  // e3bb9bad, runs on into a third rep and is not used)
  barbellCurl: {
    src: 'https://vz-36841ffb-54c.b-cdn.net/ea9ee735-a0c7-4fd9-8fbc-12cb82680bf1/play_720p.mp4',
    poster: 'https://vz-36841ffb-54c.b-cdn.net/ea9ee735-a0c7-4fd9-8fbc-12cb82680bf1/thumbnail.jpg',
    durationSec: 17.8,
    tempo: [
      { at: 0, kind: 'ready' },
      { at: 1.1, kind: 'lift', rep: 1 },
      { at: 2.1, kind: 'squeeze', rep: 1 },
      { at: 4.5, kind: 'lower', rep: 1 },
      { at: 7.0, kind: 'stretch', rep: 1 },
      { at: 9.6, kind: 'lift', rep: 2 },
      { at: 10.7, kind: 'squeeze', rep: 2 },
      { at: 12.7, kind: 'lower', rep: 2 },
      { at: 15.1, kind: 'stretch', rep: 2 },
    ],
  },
  romanianDeadlift: {
    src: 'https://vz-36841ffb-54c.b-cdn.net/9375b37c-96cd-49de-8421-7494c11e9788/play_720p.mp4',
    poster: 'https://vz-36841ffb-54c.b-cdn.net/9375b37c-96cd-49de-8421-7494c11e9788/thumbnail.jpg',
    durationSec: 20.07,
    tempo: [
      { at: 0, kind: 'ready' },
      { at: 2.6, kind: 'lower', rep: 1 },
      { at: 7.2, kind: 'stretch', rep: 1 },
      { at: 8.1, kind: 'lift', rep: 1 },
      { at: 9.2, kind: 'squeeze', rep: 1 },
      { at: 11.7, kind: 'lower', rep: 2 },
      { at: 15.3, kind: 'stretch', rep: 2 },
      { at: 16.1, kind: 'lift', rep: 2 },
      { at: 17.3, kind: 'squeeze', rep: 2 },
    ],
  },
  // One rep: standing, a very slow descent (about 7.5 s), a 1 s pause at about parallel, 3 s up.
  barbellSquat: {
    src: 'https://vz-36841ffb-54c.b-cdn.net/736acf7f-bdde-4175-844a-a01e36e706fb/play_720p.mp4',
    poster: 'https://vz-36841ffb-54c.b-cdn.net/736acf7f-bdde-4175-844a-a01e36e706fb/thumbnail.jpg',
    durationSec: 15.08,
    tempo: [
      { at: 0, kind: 'ready' },
      { at: 2.7, kind: 'lower', rep: 1 },
      { at: 10.3, kind: 'stretch', rep: 1 },
      { at: 11.4, kind: 'lift', rep: 1 },
    ],
  },
  // Starts partway down rep 1 and ends at lockout of rep 2; the camera pushes in over the clip,
  // so the loop jumps back to the wide shot. Timed by eye at 4 fps (the zoom defeats tracking).
  barbellBench: {
    src: 'https://vz-36841ffb-54c.b-cdn.net/df890da8-9385-4ff0-941f-f11945e6171d/play_720p.mp4',
    poster: 'https://vz-36841ffb-54c.b-cdn.net/df890da8-9385-4ff0-941f-f11945e6171d/thumbnail.jpg',
    durationSec: 15.08,
    tempo: [
      { at: 0, kind: 'lower', rep: 1 },
      { at: 2.5, kind: 'stretch', rep: 1 },
      { at: 4.8, kind: 'lift', rep: 1 },
      { at: 5.75, kind: 'squeeze', rep: 1 },
      { at: 7.4, kind: 'lower', rep: 2 },
      { at: 9.3, kind: 'stretch', rep: 2 },
      { at: 12.7, kind: 'lift', rep: 2 },
      { at: 13.75, kind: 'squeeze', rep: 2 },
    ],
  },
  // Three reps, seated: dumbbells at shoulder height, a press of about 1 s, a short pause at the top, about 2 s down, then a pause at the shoulders. Tracked by the top of the dumbbells at 8 fps.
  shoulderPress: {
    src: 'https://vz-36841ffb-54c.b-cdn.net/29092357-d85e-4704-9507-e35ec656b292/play_720p.mp4',
    poster: 'https://vz-36841ffb-54c.b-cdn.net/29092357-d85e-4704-9507-e35ec656b292/thumbnail.jpg',
    durationSec: 15.08,
    tempo: [
      { at: 0, kind: 'ready' },
      { at: 0.5, kind: 'lift', rep: 1 },
      { at: 1.5, kind: 'squeeze', rep: 1 },
      { at: 2.3, kind: 'lower', rep: 1 },
      { at: 4.5, kind: 'stretch', rep: 1 },
      { at: 6.2, kind: 'lift', rep: 2 },
      { at: 7.1, kind: 'squeeze', rep: 2 },
      { at: 7.8, kind: 'lower', rep: 2 },
      { at: 9.75, kind: 'stretch', rep: 2 },
      { at: 10.8, kind: 'lift', rep: 3 },
      { at: 11.8, kind: 'squeeze', rep: 3 },
      { at: 12.6, kind: 'lower', rep: 3 },
      { at: 14.6, kind: 'stretch', rep: 3 },
    ],
  },
  // Two reps holding a chair, one side shown: a slow lowering of about 5.5 s, a pause near the bottom, about 2 s up. Tracked by the top of the head at 8 fps.
  splitSquat: {
    src: 'https://vz-36841ffb-54c.b-cdn.net/31719b54-423d-454a-9d3e-941e50ea2e53/play_720p.mp4',
    poster: 'https://vz-36841ffb-54c.b-cdn.net/31719b54-423d-454a-9d3e-941e50ea2e53/thumbnail.jpg',
    durationSec: 20.07,
    tempo: [
      { at: 0, kind: 'ready' },
      { at: 0.3, kind: 'lower', rep: 1 },
      { at: 5.9, kind: 'stretch', rep: 1 },
      { at: 8.6, kind: 'lift', rep: 1 },
      { at: 10.8, kind: 'squeeze', rep: 1 },
      { at: 12.7, kind: 'lower', rep: 2 },
      { at: 16.3, kind: 'stretch', rep: 2 },
      { at: 17.1, kind: 'lift', rep: 2 },
      { at: 19.1, kind: 'squeeze', rep: 2 },
    ],
  },
  // Two reps: about 2 s up, a 2 s squeeze at the top, about 2.5 s down, a rest on the floor. Ends partway down rep 2, so the loop jumps slightly. Tracked by hip height at 8 fps.
  gluteBridge: {
    src: 'https://vz-36841ffb-54c.b-cdn.net/ffc84847-66a7-4efc-94fb-f4e164b8da47/play_720p.mp4',
    poster: 'https://vz-36841ffb-54c.b-cdn.net/ffc84847-66a7-4efc-94fb-f4e164b8da47/thumbnail.jpg',
    durationSec: 15.08,
    tempo: [
      { at: 0, kind: 'ready' },
      { at: 0.5, kind: 'lift', rep: 1 },
      { at: 2.5, kind: 'squeeze', rep: 1 },
      { at: 4.75, kind: 'lower', rep: 1 },
      { at: 7.25, kind: 'stretch', rep: 1 },
      { at: 9.4, kind: 'lift', rep: 2 },
      { at: 11.5, kind: 'squeeze', rep: 2 },
      { at: 13.3, kind: 'lower', rep: 2 },
    ],
  },
  // Two reps, hands on a bench, legs straight: about 2.5 s down, a pause at the bottom, about 1.7 s up, a pause with arms straight. Tracked by head height at 8 fps.
  inclinePushUp: {
    src: 'https://vz-36841ffb-54c.b-cdn.net/0f94c2e0-2b5e-4c82-b8be-e77d26446f97/play_720p.mp4',
    poster: 'https://vz-36841ffb-54c.b-cdn.net/0f94c2e0-2b5e-4c82-b8be-e77d26446f97/thumbnail.jpg',
    durationSec: 15.08,
    tempo: [
      { at: 0, kind: 'ready' },
      { at: 0.4, kind: 'lower', rep: 1 },
      { at: 2.9, kind: 'stretch', rep: 1 },
      { at: 4.6, kind: 'lift', rep: 1 },
      { at: 6.3, kind: 'squeeze', rep: 1 },
      { at: 8.5, kind: 'lower', rep: 2 },
      { at: 10.7, kind: 'stretch', rep: 2 },
      { at: 12.0, kind: 'lift', rep: 2 },
      { at: 13.6, kind: 'squeeze', rep: 2 },
    ],
  },
  // Two reps from a chair, arms crossed: about 2 s to stand (the lean forward counts), a 2 s pause
  // standing tall, about 1.7 s to sit, a seated pause before the next rep. Starts and ends seated, so
  // the loop is seamless. The top of the head leaves the frame when she stands, so it was tracked by
  // the centre of the body's mass at 8 fps.
  sitToStand: {
    src: 'https://vz-36841ffb-54c.b-cdn.net/5b34fdf0-cf42-44fa-a28f-6e5dd1c225c1/play_720p.mp4',
    poster: 'https://vz-36841ffb-54c.b-cdn.net/5b34fdf0-cf42-44fa-a28f-6e5dd1c225c1/thumbnail.jpg',
    durationSec: 15.08,
    tempo: [
      { at: 0, kind: 'ready' },
      { at: 2.1, kind: 'lift', rep: 1 },
      { at: 4.4, kind: 'squeeze', rep: 1 },
      { at: 6.2, kind: 'lower', rep: 1 },
      { at: 7.9, kind: 'ready', rep: 2 },
      { at: 10.0, kind: 'lift', rep: 2 },
      { at: 11.3, kind: 'squeeze', rep: 2 },
      { at: 12.5, kind: 'lower', rep: 2 },
      { at: 14.0, kind: 'ready' },
    ],
  },
  // A hold, right knee down, still throughout: no reps to time, so one phase for the whole clip.
  halfKneelingHipFlexor: {
    src: 'https://vz-36841ffb-54c.b-cdn.net/13668949-cd93-4b58-a352-ef0628225da3/play_720p.mp4',
    poster: 'https://vz-36841ffb-54c.b-cdn.net/13668949-cd93-4b58-a352-ef0628225da3/thumbnail.jpg',
    durationSec: 15.08,
    hold: 'stretch',
    tempo: [{ at: 0, kind: 'stretch' }],
  },
  // A hold on the forearm, bottom knee down, still until the hips ease down in the last second.
  sidePlankKnees: {
    src: 'https://vz-36841ffb-54c.b-cdn.net/8dde7844-9e5f-4143-9b05-51b70a6839aa/play_720p.mp4',
    poster: 'https://vz-36841ffb-54c.b-cdn.net/8dde7844-9e5f-4143-9b05-51b70a6839aa/thumbnail.jpg',
    durationSec: 15.08,
    hold: 'position',
    tempo: [{ at: 0, kind: 'squeeze' }],
  },
  // Two reps on one side: about 1 s to reach the arm and opposite leg out, a 4 s hold (3 s on rep
  // 2), about 2 s back, then a pause on all fours. Tracked by how far each frame differs from the
  // start, at 8 fps.
  birdDog: {
    src: 'https://vz-36841ffb-54c.b-cdn.net/28383feb-9988-436c-8ee2-579450e898c5/play_720p.mp4',
    poster: 'https://vz-36841ffb-54c.b-cdn.net/28383feb-9988-436c-8ee2-579450e898c5/thumbnail.jpg',
    durationSec: 15.08,
    tempo: [
      { at: 0, kind: 'lift', rep: 1 },
      { at: 1.1, kind: 'squeeze', rep: 1 },
      { at: 5.25, kind: 'lower', rep: 1 },
      { at: 7.2, kind: 'ready', rep: 2 },
      { at: 9.1, kind: 'lift', rep: 2 },
      { at: 10.0, kind: 'squeeze', rep: 2 },
      { at: 13.0, kind: 'lower', rep: 2 },
      { at: 14.2, kind: 'ready' },
    ],
  },
  // Two reps on one side, hands on the wall: about 2 s to bring the knee forward to the wall, a
  // pause there (about 2 s, then 3 s), about 1.3 s back, a pause. Ends where it starts. Tracked by
  // the front knee's position at 8 fps.
  kneeToWall: {
    src: 'https://vz-36841ffb-54c.b-cdn.net/e7138db7-2d22-431a-920d-cd9cc1ccb7b9/play_720p.mp4',
    poster: 'https://vz-36841ffb-54c.b-cdn.net/e7138db7-2d22-431a-920d-cd9cc1ccb7b9/thumbnail.jpg',
    durationSec: 15.08,
    tempo: [
      { at: 0, kind: 'ready' },
      { at: 1.2, kind: 'lower', rep: 1 },
      { at: 3.3, kind: 'stretch', rep: 1 },
      { at: 5.45, kind: 'lift', rep: 1 },
      { at: 6.7, kind: 'ready', rep: 2 },
      { at: 8.4, kind: 'lower', rep: 2 },
      { at: 10.0, kind: 'stretch', rep: 2 },
      { at: 12.8, kind: 'lift', rep: 2 },
      { at: 14.5, kind: 'ready' },
    ],
  },
} satisfies Record<string, ExerciseMedia>
