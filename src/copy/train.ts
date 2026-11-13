import type { Equipment, SetFeel } from '@/core/types'
import type { WarmupBlock } from '@/core/domain/warmup'
import { WELLBEING_ENABLED } from '@/data/wellbeingFlag'

/**
 * Train's words (native-build-plan finding 4: src/copy/ holds the words both apps show). Moved
 * unchanged from the web's Train screens, which import them from here.
 */
/** Red flags (plan §4.0.4): on the hold timer and the exercise cards. */
export const RED_FLAG = "Stop if you get chest pain, feel dizzy or faint, or have sudden severe pain. Call 999 for chest pain that feels tight or heavy, spreads to your arm, jaw or back, or doesn't ease with rest. Call NHS 111 if you're not sure."

/** After "Stopped early" (fitness-workouts): when pain needs a professional's look before trying the move again. */
export const PAIN_HELP = "If pain is sharp, in a joint, or still there after a few days, speak to a GP or physiotherapist before doing this move again."

/** The shared part of the §4.0.4 disclaimer; each place adds its own first sentence (mental-performance). */
export const CARE_DISCLAIMER =
  'This is general fitness guidance, not medical advice. If you have pain, an injury or a health condition, check with your GP or a physiotherapist before starting or changing exercise. Stop any movement that causes pain.'

/** "How was that set?" in the Adjust sheet. */
export const FEELS: [SetFeel, string][] = [
  ['spare', 'Could have done lots more'],
  ['right', 'About right, two or three left'],
  ['struggle', 'Last rep was a real struggle'],
  ['stopped', 'Stopped early'],
]

/**
 * The warm-up line (fitness-workouts), shared with the preview card: with the warm-up block
 * (`mins`), the lighter sets that follow it; without it, as before the block.
 */
export const warmupCopy = (name: string, mins?: number) =>
  `${mins ? `After the ${mins}-minute warm-up, do` : '5 minutes of easy movement, then'} one or two lighter ${name.toLowerCase()} sets, building up to your working weight. Log them as warm-ups: they don't count towards your targets.`

/** The day view's note under the block (ob3-5). */
export const warmupNote = (b: WarmupBlock) => (b.kind === 'cardio'
  ? 'Every session starts here: a few easy minutes so your heart rate and breathing can rise gently, then moving stretches for your hips and legs. Each move has a short how-to.'
  : 'Every session starts here: 1 to 2 minutes to raise your pulse, then moving stretches for today’s joints. Each move has a short how-to.')

/**
 * Day-of choices (plan §0.2): equal options, the planned session always one tap away. With
 * WELLBEING_ENABLED (board B3) there are three: As planned, Shorter and 'swap', the day-matched
 * swap (hardDay.swapForWorkout); without it, today's four.
 */
export type Choice = 'planned' | 'shorter' | 'mobility' | 'walk' | 'swap'
export const CHOICES: [Choice, string][] = WELLBEING_ENABLED
  ? [['planned', 'As planned'], ['shorter', 'Shorter'], ['swap', 'Swap']]
  : [['planned', 'As planned'], ['shorter', 'Shorter'], ['mobility', '10-min mobility'], ['walk', 'Easy walk']]

/**
 * The support lines from the load note (workout plan §0.5, ai-platform-plan §4.2 item 3).
 * General wellness only: no diagnosis words. Numbers checked on 13 Nov 2026 (mental-performance) against
 * samaritans.org and beateatingdisorders.org.uk; re-check them whenever this copy is touched.
 */
export const SUPPORT_LINES: [string, string, string][] = [
  ['Samaritans', '116 123', 'Free, any time, day or night (UK and Ireland)'],
  ['Beat (England)', '0808 801 0677', 'Eating disorder support, 3pm to 8pm, Monday to Friday'],
  ['Beat (Scotland)', '0808 801 0432', '3pm to 8pm, Monday to Friday'],
  ['Beat (Wales)', '0808 801 0433', '3pm to 8pm, Monday to Friday'],
  ['Beat (Northern Ireland)', '0808 801 0434', '3pm to 8pm, Monday to Friday'],
  ['NHS 111', '111', 'For health advice when it isn\'t an emergency'],
]

/** The library's kit filters: the few that decide most of what someone can do. */
export const LIB_KIT: [Equipment | 'none', string][] = [['none', 'No equipment'], ['dumbbell', 'Dumbbells'], ['band', 'Band'], ['mat', 'Mat'], ['machine', 'Gym machines']]
