import type { Routine, RoutineSlot } from '@/core/types'

/**
 * Tali's own workouts for its plans (design canvas, Plans 1: "Stronger with age" and "Full body
 * system", defined by fitness-workouts, approved by Benn 27 Sept 2026). They're built-ins in the
 * shape of the user's own workouts, so the builder, Train and logging treat them alike; they're
 * never edited or archived. Ids are stable (plans and logged sessions name them): never rename.
 * Gentler options come from each exercise's library entry (a wall push-up for the incline one).
 * Stronger with age needs only dumbbells, a chair, a wall and a low step (fitness-workouts): its
 * row is one-arm on a chair and its press the incline push-up; holds are timed so sides switch.
 */
const block = (slots: [string, string][]): Routine['blocks'] => [{ id: 'main', kind: 'sets', slots: slots.map(([exId, rx]): RoutineSlot => ({ exId, rx })) }]

export const TALI_WORKOUTS: Routine[] = [
  {
    id: 'tali-strength-balance-a', name: 'Strength & Balance A', modality: 'strength', effort: 'hard', source: 'recommended',
    blocks: block([
      ['sit-to-stand', '3 × 8–12'], ['incline-push-up', '3 × 8–12'], ['one-arm-db-row', '3 × 10 each side'],
      ['step-up', '2 × 8 each side'], ['glute-bridge', '2 × 10–12'], ['farmer-carry', '3 × 20–30 steps'], ['tree-pose', '2 × 20–30 sec each side'],
    ]),
  },
  {
    id: 'tali-strength-balance-b', name: 'Strength & Balance B', modality: 'strength', effort: 'hard', source: 'recommended',
    blocks: block([
      ['goblet-squat', '3 × 8–12'], ['incline-push-up', '3 × 8–12'], ['one-arm-db-row', '3 × 10 each side'],
      ['split-squat', '2 × 6–8 each side'], ['bird-dog', '2 × 6 each side'], ['side-plank-knees', '2 × 15–20 sec each side'],
    ]),
  },
  {
    id: 'tali-balance-mobility', name: 'Balance & Mobility', modality: 'mobility', effort: 'light', source: 'recommended',
    blocks: block([
      ['march-on-the-spot', '1 × 60 sec'], ['tree-pose', '3 × 20–30 sec each side'], ['chair-pose', '3 × 15–20 sec'],
      ['split-squat', '1 × 6 each side'], ['knee-to-wall', '1 × 8 each side'], ['cat-cow', '10 slow rounds'],
      ['half-kneeling-hip-flexor', '30–45 sec each side'], ['shoulder-rolls', '10 each way'],
    ]),
  },
  {
    id: 'tali-full-body-a', name: 'Full body A', modality: 'strength', effort: 'hard', source: 'recommended',
    blocks: block([
      ['goblet-squat', '3 × 10–12'], ['db-bench-press', '3 × 8–12'], ['seated-cable-row', '3 × 10–12'], ['leg-curl', '2 × 10–12'], ['dead-bug', '2 × 6–8 each side'],
    ]),
  },
  {
    id: 'tali-full-body-b', name: 'Full body B', modality: 'strength', effort: 'hard', source: 'recommended',
    blocks: block([
      ['romanian-deadlift', '3 × 10'], ['lat-pulldown', '3 × 10–12'], ['db-shoulder-press', '3 × 10–12'], ['leg-press', '2 × 10–12'], ['side-plank-knees', '2 × 15–30 sec each side'],
    ]),
  },
  {
    id: 'tali-full-body-c', name: 'Full body C', modality: 'strength', effort: 'hard', source: 'recommended',
    blocks: block([
      ['db-split-squat', '3 × 8–10 each side'], ['incline-db-press', '3 × 10–12'], ['one-arm-db-row', '3 × 10 each side'],
      ['hip-thrust', '3 × 10–12'], ['face-pull', '2 × 15'], ['farmer-carry', '2 × 20–30 steps'],
    ]),
  },
]

export const TALI_WORKOUT_BY_ID: Record<string, Routine> = Object.fromEntries(TALI_WORKOUTS.map((r) => [r.id, r]))
