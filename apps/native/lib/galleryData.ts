/** The gallery's fixed examples, shared word for word by the native gallery (lib/Gallery.tsx) and
 *  its web twin (scripts/web-gallery/Gallery.tsx). Plain data: no React Native, no DOM. */
import type { ConnectionState } from '@/core/domain/connection'
import { NATIONS, SIGNPOSTS, beatFor } from '@/core/data/signposts'
import { ACTIVITY } from '@/core/data/constants'
import { HANDS } from '@/core/domain/estimate'
import { MOODS } from '@/core/domain/insights'

export const G = {
  conn: [
    { kind: 'up-to-date', pending: 0 }, { kind: 'pending', pending: 3 }, { kind: 'offline', pending: 0 },
    { kind: 'sign-in', pending: 0 }, { kind: 'problem', pending: 0 }, { kind: 'phone-only', pending: 0 },
  ] as ConnectionState[],
  seg: [['day', 'Day'], ['week', 'Week'], ['month', 'Month']] as [string, string][],
  goal: [
    { k: 'lose', t: 'Lose some fat', s: 'A steady, gentle deficit', icon: 'trend' },
    { k: 'maintain', t: 'Keep it steady', s: 'Eat to maintain', icon: 'steady' },
    { k: 'gain', t: 'Build muscle', icon: 'dumbbell' },
  ] as const,
  areas: [{ k: 'back', t: 'Lower back' }, { k: 'knees', t: 'Knees', s: 'Squats and lunges adapt' }, { k: 'none', t: 'Nothing right now' }] as const,
  enjoy: [{ k: 'walk', t: 'Walking' }, { k: 'gym', t: 'Weights' }, { k: 'yoga', t: 'Yoga and stretching' }] as const,
  three: [{ k: '1', t: 'Rarely' }, { k: '2', t: 'Sometimes' }, { k: '3', t: 'Often' }] as const,
  prose: { p1: 'Targets are ranges, not lines to hit. A day above or below is normal.', li: ['Weigh in when it suits you', 'Your week matters more than a day'], h3: 'How it works', p2: 'Change any of it in Profile.' },
  opts: [['rarely', 'Rarely'], ['some', 'Some days', 'One or two a week'], ['most', 'Most days']] as const,
  kit: [['none', 'Nothing'], ['bands', 'Resistance bands'], ['db', 'Dumbbells', 'Any weight']] as const,
  ticks: ['It’s private to your account. Nobody else can see it.', 'It’s never sold or used for ads.', 'Download it or delete it any time in Profile.'],
  /** AgeStop's Beat row: one call line per nation and the web line (the multi-line signpost) */
  beatLines: [{ name: 'Beat', desc: `For anyone worried about food, eating or their body. ${SIGNPOSTS.beat.hours}. Webchat too.`, web: SIGNPOSTS.beat.web, lines: NATIONS.map(([k, l]) => [l, beatFor(k)] as [string, string]) }],
  /** a 40 g serving's 5-up scale (PortionView) */
  serv: [['0.5', '½', '20 g'], ['1', '1', '40 g'], ['1.5', '1½', '60 g'], ['2', '2', '80 g'], ['3', '3', '120 g']].map(([key, big, text]) => ({ key, big, text })),
  moods: MOODS.map((text, i) => ({ key: i + 1, text })),
  hands: Object.entries(HANDS).map(([k, h]) => [k, h.label, h.hint] as const),
  cardio: [['Brisk walk', 'Brisk walk'], ['Stationary bike', 'Stationary bike'], ['Rower', 'Rower']] as const,
  activity: Object.entries(ACTIVITY).map(([k, v]) => [k, v.label] as const),
  spark: [80.4, 80.1, 80.3, 79.9, 79.8, 80.0, 79.6, 79.5],
}

