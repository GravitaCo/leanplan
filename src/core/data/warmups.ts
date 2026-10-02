/**
 * The warm-up that opens every Tali session (fitness-workouts; boards ob5-0, ob3-5, note s-ob8
 * point 4): a 1–2 minute pulse raiser, then moving stretches for the joints the session uses.
 * `core/domain/warmup.ts` builds the block from these lists; this file is data only.
 *
 * Every move is in the exercise library. The cues here are the warm-up versions: shorter than the
 * library's, and each says to stay within a comfortable range. Nothing ballistic, no long static
 * holds (moves keep moving), no jumping.
 */

/** The warm-up cue for each move the block can use. */
export const WARMUP_CUES: Record<string, string> = {
  'march-on-the-spot': 'March at an easy pace, swinging your arms loosely, and let your breathing pick up a little. Keep it relaxed and comfortable: this is to warm you up, not tire you out.',
  'step-jacks': 'Step one foot out to the side as your arms rise, then step back in and switch. Raise your arms only as high as is comfortable and keep a steady rhythm. No jumping needed.',
  'arm-circles': 'Arms out to the sides, draw small circles forwards and let them grow, then go backwards. Keep the circles within a comfortable range and your shoulders away from your ears.',
  'hip-circles': 'Hands on your hips, feet hip-width apart, and draw slow circles with your hips, one way then the other. Keep them within a comfortable range and your upper body tall.',
  'leg-swings': 'Hold a wall and swing one leg forwards and back, easy and loose, a little bigger each time. Stay within a comfortable range: stay tall and don’t kick for height.',
  'worlds-greatest-stretch': 'Step into a long lunge, back knee down or lifted, hands inside your front foot. Reach the inside arm up as your chest turns, then bring it down. Go only as far as is comfortable.',
  'bodyweight-squat': 'Feet about shoulder-width apart, sit your hips back and down, then stand tall. Start shallow and go a little deeper each time, within a comfortable range, heels down.',
  'glute-bridge': 'Lie on your back, knees bent and feet flat. Squeeze your glutes to lift your hips, then lower slowly. Lift within a comfortable range, without arching your lower back.',
  'knee-to-wall': 'Face a wall with one foot a little way back. Bend that knee towards the wall, heel down, then back. Move within a comfortable range and keep the knee in line with your toes.',
  'hip-90-90': 'Sit with both knees bent to one side, hands behind you. Lift your knees and turn them over to the other side, then back. Move within a comfortable range; don’t force the knees down.',
  'open-book': 'Lie on your side, knees bent and stacked, arms out in front. Open the top arm up and over, following it with your eyes, then close. Open only as far as is comfortable.',
  'band-pull-apart': 'Hold a light band at shoulder height, arms straight. Pull it apart by drawing your shoulder blades together, then return slowly. Keep it light and within a comfortable range.',
  'scapular-wall-slide': 'Back against a wall, arms bent in a goalpost shape. Slide your arms up as far as is comfortable, ribs down, then back. Don’t arch away from the wall to reach higher.',
  'incline-push-up': 'Hands on a wall, worktop or sturdy table, body in a straight line. Lower your chest towards your hands, then press away. Keep it easy and within a comfortable range.',
  'cat-cow': 'On hands and knees, round your back as you breathe out, then let your belly drop gently as you breathe in. Move slowly, within a comfortable range rather than to your limit.',
  'thread-the-needle': 'On hands and knees, slide one arm under your body, then reach it up towards the ceiling, following your hand with your eyes. Keep it flowing and within a comfortable range.',
  'inchworm': 'Stand tall, bend your knees and put your hands on the floor. Walk your hands out only as far as is comfortable, then walk them back and stand up. Bend your knees as much as you need.',
  'half-sun-salutation': 'Breathe in and reach up, breathe out and fold forwards with soft knees, lift halfway with a long back, fold, then rise. Move with your breath and fold only as far as is comfortable.',
  'shoulder-rolls': 'Lift your shoulders up towards your ears, roll them back and down, then reverse. Keep it slow and smooth, within a comfortable range.',
}

/**
 * Moving stretches per session kind, most useful first: a block takes as many as its length
 * allows. `reserve` stands in for a move the person's kit rules out or the session already has.
 */
export const WARMUP_LISTS: Record<'legs' | 'push' | 'pull' | 'full' | 'mind-body' | 'running' | 'cardio', { moves: string[]; reserve: string[] }> = {
  legs: { moves: ['leg-swings', 'bodyweight-squat', 'worlds-greatest-stretch', 'glute-bridge', 'hip-circles', 'knee-to-wall'], reserve: ['hip-90-90', 'cat-cow'] },
  push: { moves: ['arm-circles', 'band-pull-apart', 'open-book', 'incline-push-up', 'scapular-wall-slide', 'thread-the-needle'], reserve: ['cat-cow', 'shoulder-rolls'] },
  pull: { moves: ['arm-circles', 'cat-cow', 'thread-the-needle', 'band-pull-apart', 'open-book', 'scapular-wall-slide'], reserve: ['shoulder-rolls', 'hip-circles'] },
  full: { moves: ['leg-swings', 'arm-circles', 'bodyweight-squat', 'worlds-greatest-stretch', 'band-pull-apart', 'inchworm'], reserve: ['scapular-wall-slide', 'open-book', 'glute-bridge'] },
  'mind-body': { moves: ['cat-cow', 'hip-circles', 'shoulder-rolls', 'thread-the-needle', 'open-book', 'arm-circles'], reserve: ['leg-swings', 'march-on-the-spot'] },
  running: { moves: ['leg-swings', 'hip-circles', 'knee-to-wall'], reserve: [] },
  cardio: { moves: ['leg-swings', 'hip-circles'], reserve: [] },
}

/** Kit a move needs, and the no-kit move it becomes without it. */
export const WARMUP_KIT_SWAPS: Record<string, { needs: 'band'; swap: string }> = {
  'band-pull-apart': { needs: 'band', swap: 'scapular-wall-slide' },
}

/** The easy start of a cardio session, by activity (the pulse raiser is the activity itself). */
export const CARDIO_EASY: Record<'running' | 'walking' | 'other', { n: (name: string) => string; cue: string }> = {
  running: { n: () => 'Walk, then an easy jog', cue: 'Start with a brisk walk and let it build into a slow, easy jog. Keep your steps short and relaxed, at a pace where you could chat comfortably.' },
  walking: { n: () => 'Easy walk', cue: 'Start at a relaxed pace and build up gradually. Let your arms swing and your breathing settle; keep it comfortable, the brisker part comes after.' },
  other: { n: (name) => `${name}, easy pace`, cue: 'Start slowly with light effort, at a pace where you could chat comfortably, and build up gradually. Keep it easy: the real effort comes after.' },
}
