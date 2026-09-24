import type { ExerciseMedia } from '@/core/types'

/**
 * Where demo clips are served from. They ship in `public/videos/` for now (same origin, so they
 * work locally and on any preview build). The plan is to move them to Bunny CDN: upload the
 * files there and point this at the pull-zone URL, e.g. 'https://tali.b-cdn.net/exercises/'.
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
  // 17.8 s, trimmed to end with arms straight so the loop is seamless
  barbellCurl: {
    src: 'barbell-curl.mp4',
    poster: 'barbell-curl.jpg',
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
    src: 'romanian-deadlift.mp4',
    poster: 'romanian-deadlift.jpg',
    durationSec: 20.0,
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
  // Bunny Stream library (MP4 fallback, 720×1280). The library refuses requests with no referrer,
  // which a page always sends, so these play in the app but not as bare links.
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
} satisfies Record<string, ExerciseMedia>
