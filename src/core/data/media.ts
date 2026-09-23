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
} satisfies Record<string, ExerciseMedia>
