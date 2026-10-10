/* WP8: Train hard-day choices (board B3). The core (dayOptions, guided) is tested in test-core;
   this covers the Train helpers in screens/train/hardDay.ts and lints their copy. Run from
   scripts/test-wellbeing.ts; returns the number of failures. */
import type { ExerciseTemplate } from '@/core/types'
import { WORKOUTS } from '@/core/data/workouts'
import { exById } from '@/core/domain/library'
import { setCount, slotsOf, targetFor } from '@/core/domain/guided'
import { mindCopyIssues } from '@/core/domain/engine/why'
import { CHOICES } from '@/screens/train/Preview'
import { HARD_DAY_COPY, HARD_DAY_STRINGS, easierAim, hardDayChoices, roughShorter, swapForWorkout, swapTile } from '@/screens/train/hardDay'

const t = (id: string, rx = '3 × 10–12'): ExerciseTemplate => ({ id, n: exById(id)?.n ?? id, t: rx, cue: '' })

export function trainSuite(): number {
  const checks: [string, boolean, string?][] = []
  const ok = (n: string, v: boolean, info?: string) => checks.push([n, v, info])

  /* ---------- the day-matched swap tile ---------- */
  ok('Legs is lower: "Hips, hamstrings and calves"', swapForWorkout(WORKOUTS.Legs.ex, exById).swap === 'mobility-lower')
  ok('Push and Pull are upper', swapForWorkout(WORKOUTS.Push.ex, exById).swap === 'mobility-upper' && swapForWorkout(WORKOUTS.Pull.ex, exById).swap === 'mobility-upper')
  const cardio = swapForWorkout(WORKOUTS.Cardio.ex, exById)
  ok('Cardio day gets 10-minute mobility', cardio.day === 'cardio' && cardio.swap === 'mobility', JSON.stringify(cardio))
  ok('lower tile', JSON.stringify(swapTile('mobility-lower')) === JSON.stringify({ title: 'Hips, hamstrings and calves', detail: 'About 10 min · on a mat' }), JSON.stringify(swapTile('mobility-lower')))
  ok('upper tile', swapTile('mobility-upper').title === 'Upper back, chest and shoulders' && swapTile('mobility-upper').detail === 'About 10 min · on a mat')
  ok('mobility tile', JSON.stringify(swapTile('mobility')) === JSON.stringify({ title: '10-minute mobility', detail: 'Hips, back and shoulders · on a mat' }), JSON.stringify(swapTile('mobility')))
  ok('walk tile', JSON.stringify(swapTile('walk')) === JSON.stringify({ title: 'Easy walk', detail: '10–20 min' }))

  /* ---------- choices ---------- */
  ok('three equal choices; Shorter dropped when a rough night empties it', hardDayChoices(false).join() === 'planned,shorter,swap' && hardDayChoices(true).join() === 'planned,swap')
  ok('flag on (as built for users): the three B3 chips', CHOICES.map(([, l]) => l).join() === 'As planned,Shorter,Swap')
  ok('Legs & Core shorter is 10 sets', setCount(slotsOf(WORKOUTS.Legs.ex, {}, true, exById).map((s) => s.shown), true) === '10 sets')

  /* ---------- the rough-night shorter version ---------- */
  const ex = [t('step-up'), t('cardio-run', '20–30 min'), t('mountain-climber'), t('back-squat')]
  const r = roughShorter(ex, {}, [], exById)
  ok('steadier swaps', r.swaps[0] === 'goblet-squat' && r.swaps[1] === 'cardio-walk' && r.swaps[3] == null, JSON.stringify(r.swaps))
  ok('intervals with no steadier are left out', r.leaveOut.join() === '2' && !r.empty)
  const own = roughShorter(ex, { 0: 'db-split-squat' }, [], exById)
  ok("the person's own swap stays", own.swaps[0] === 'db-split-squat', JSON.stringify(own.swaps))
  const kept = roughShorter(ex, {}, [0, 2], exById)
  ok('a slot put back with Undo stays as planned', kept.swaps[0] == null && kept.leaveOut.length === 0, JSON.stringify(kept))
  const hiit = roughShorter([t('mountain-climber'), t('step-jacks'), t('squat-thrust')], {}, [], exById)
  ok('all-interval workout: the swap is offered instead', hiit.empty)
  ok('Legs & Core has nothing to change', Object.keys(roughShorter(WORKOUTS.Legs.ex, {}, [], exById).swaps).length === 0)

  /* ---------- the easier effort target ---------- */
  ok('aim line with last time', easierAim({ lo: 10, hi: 12 }, '40') === 'Aim for 10–12 reps with 3 or 4 to spare, at 40 kg or lighter', easierAim({ lo: 10, hi: 12 }, '40'))
  ok('aim line with no last time', easierAim({ lo: 10, hi: 12 }) === 'Aim for 10–12 reps with 3 or 4 to spare')
  const last = { name: 'Barbell squat', sets: [{ w: '40', reps: '10' }] }
  const easy = targetFor('weight-reps', '2 × 10–12', last, 0, [], { shorter: 'easier' })
  const usual = targetFor('weight-reps', '2 × 10–12', last, 0, [])
  ok('easier day: no +1 rep against last time', easy?.reps === '10' && easy.w === '40' && usual?.reps === '11', JSON.stringify([easy, usual]))

  /* ---------- copy ---------- */
  const lint = HARD_DAY_STRINGS.flatMap((s) => mindCopyIssues(s).map((i) => `${s}: ${i}`))
  ok('hard-day strings pass mindCopyIssues', lint.length === 0, lint.join(' | '))
  ok('no em dashes', HARD_DAY_STRINGS.every((s) => !s.includes('—')))
  ok('B3.17 says jump rope (new-copy FINAL)', HARD_DAY_COPY.roughNote.includes('jump rope'))

  let bad = 0
  for (const [n, v, info] of checks) { if (!v) bad++; console.log(v ? 'PASS' : 'FAIL', 'wellbeing train: ' + n + (v || !info ? '' : ` (${info})`)) }
  return bad
}
