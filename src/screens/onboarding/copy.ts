/**
 * The wizard's words, from the approved boards (Design canvas rows Onboarding 1–5). Plain data
 * with no React, so `npm test` runs the copy lint over every line (engine §3.7 test 7, onboarding
 * §4). Where a board has no words for something the build needs, the line is marked GAP.
 */
import type { StepId } from '@/core/domain/wizard'

export interface ScreenCopy { title: string; lead?: string; why?: string; note?: string }

export const COPY: Partial<Record<StepId, ScreenCopy>> = {
  intro: { title: 'A few questions, so Tali fits you', lead: 'Everything we ask is used for something you’ll see. Here’s what your answers do:', note: 'Skip any question you like. Your answers are private to your account, and you can change them any time in Profile.' },
  'skip-age': { title: 'No problem. Just your age, then you’re in.', lead: 'It’s the one thing we need to keep Tali safe for you.', note: 'You’ll start on a simple starter week with no calorie numbers. Build your own plan whenever you like from Today or Plan.' },
  name: { title: 'What do you like to be called?', why: 'so Tali can greet you. Your first name is plenty.' },
  age: { title: 'How old are you?', why: 'it keeps your plan safe and sets your energy needs.', note: 'Tali is for people aged 18 and over. We keep your age, never your date of birth.' },
  ready: { title: 'A quick health check', lead: 'Do any of these apply to you right now?', why: 'a yes just means we start more gently. It never stops you using Tali.', note: 'We keep the result (gentler start or not), never your answers.' },
  why: { title: 'What would make this worth it for you?', lead: 'Pick any that feel true.', why: 'we’ll remind you of it in your weekly look-back.' },
  goal: { title: 'What’s your main goal?', why: 'it shapes both your training and your food targets. You can change it any time.' },
  lately: { title: 'How are things lately?', lead: 'Thinking about the last two weeks.', why: 'when sleep or stress is hard going, we start lighter. You can change this later.' },
  wellbeing: { title: 'How food and weight feel for you', why: 'if it’s a yes or sometimes, Tali hides weight and calorie targets and keeps things gentle. We keep whether that’s on, nothing more.' },
  body: { title: 'About your body', why: 'your height and sex set your energy needs.', note: 'Sex changes the energy estimate a little. "Prefer not to say" uses a middle estimate with a wider range.' },
  medical: { title: 'Does any of this apply to you?', lead: 'Pick any that apply.', why: 'some conditions and medicines change how eating less affects you. We keep what it means for your plan, not the condition.' },
  weight: { title: 'What do you weigh?', why: 'with your height and age, it gives your starting calorie range. Skip it and we won’t show calorie numbers until you add it.', note: 'Roughly is fine. It stays private to your account, and in gentle mode Tali never shows it back.' },
  move: { title: 'How much do you move on a normal day?', lead: 'Not counting workouts.', why: 'it sets your everyday energy use. Workouts are counted separately.' },
  handoff: { title: 'Thanks. Now, how you like to train.', lead: 'A few quick taps about your time, kit and what you enjoy, and Tali builds your week from your answers. About a minute.', note: 'Rather do it later? You’ll get a starter week now, and a card on Today to finish whenever suits you.' },
  moving: { title: 'Are you moving much at the moment?', why: 'it sets how gently your first weeks start.' },
  confidence: { title: 'How confident do you feel with workouts?', why: 'it sets how many exercises and sets you start with.' },
  days: { title: 'How many days a week?', why: 'your workouts land on the days you pick. Other days are rest or a walk if you fancy it.' },
  minutes: { title: 'How long can a session be?', why: 'it sets how many exercises fit. Short sessions count.', note: 'minutes, including a warm-up' },
  where: { title: 'Where will you train?', why: 'so every exercise is one you can do there.' },
  kit: { title: 'What do you have at home?', lead: 'Pick all that apply.', why: 'every exercise uses kit you have.' },
  enjoy: { title: 'What do you enjoy?', lead: 'Pick any. "Not sure yet" is fine.', why: 'more of what you enjoy makes it easier to keep going.' },
  areas: { title: 'Any areas to go easy on?', why: 'we leave out moves that load them and pick gentler ones.', note: 'Pain that’s new, sharp or getting worse is worth checking with a GP or physio first.' },
}

export const INTRO_POINTS: [string, string][] = [
  ['A week built around you', 'Your goal, time and kit decide what goes in it, and every choice says why.'],
  ['Honest food targets', 'Your age, height, weight and daily movement set a starting range, checked against your weigh-ins later.'],
  ['Kept safe', 'A few health questions make sure we start at the right pace for you.'],
]

export const READINESS_ITEMS = [
  'Chest pain, or a heart condition a doctor has told you about',
  'Dizziness, fainting or losing your balance',
  'Pregnant, breastfeeding, or recent surgery',
]
/** GAP: the boards don't split pregnancy from recent surgery; this follow-up does (for the ob4-4 route). */
export const PREGNANCY_FOLLOWUP = 'Is that pregnancy or breastfeeding?'

export const WELLBEING_STATEMENT = '"Food or weight sometimes feels stressful or all-consuming for me."'
export const WELLBEING_OPTIONS = [['yes', 'Yes'], ['sometimes', 'Sometimes'], ['no', 'No'], ['rather-not-say', 'Rather not say']] as const

export const MEDICAL_ITEMS = [
  'Diabetes treated with insulin, or tablets that can cause lows',
  'Kidney disease',
  'A weight-loss injection, like semaglutide or tirzepatide',
]

export const ONE_DAY_NOTE = 'One day is a good start. A second day adds more when you’re ready, if you’d like.'

/** Onboarding 4: the signposting screens. */
export const NOTES = {
  under16: { title: 'Tali is for 18+', lead: 'Thanks for giving it a try. Tali is made for people aged 18 and over, so we can’t set you up just yet.', more: 'If you’d like help with food, moving more or how you’re feeling, a parent, a school nurse or your GP is a good place to start.', note: 'We haven’t kept any of your answers.' },
  wellbeing: { eyebrow: 'Food and weight', title: 'Thanks for telling us', lead: 'We’ll keep things gentle: no weight on screen and no calorie target to hit. You can still log food and train, and change this in Profile any time.', h: 'If you’d like to talk to someone', note: 'This stays private to you. We keep whether gentle mode is on, nothing else.' },
  readiness: { eyebrow: 'Your health check', title: 'We’ll start gently', lead: 'Because of your answer, your plan starts with lighter, low-impact sessions. It’s a good idea to check with your GP before you build up.', h: 'If you need advice', note: 'Chest pain or feeling faint during a workout? Stop, rest, and call 999 if it doesn’t pass.' },
  pregnancy: { eyebrow: 'Pregnancy and breastfeeding', title: 'We’ll keep things gentle', lead: 'While you’re pregnant or breastfeeding, Tali keeps food at maintenance with no calorie number, and training gentle. Your midwife, health visitor or GP can tell you what’s right for you.', h: 'If you need advice', note: 'We’ll ask again in 12 weeks. You can clear this in Profile any time.' },
  medical: { eyebrow: 'Your health', title: 'Food stays at maintenance for now', lead: 'With what you’ve told us, eating less is best planned with your GP or diabetes team. Tali keeps food at maintenance and won’t suggest a high-protein target. Training works as normal.', h: 'If you need advice', note: 'You can update this in Profile any time.' },
}

/** Onboarding 3: the summary. */
export const SUMMARY = {
  built: 'Built from your answers',
  starter: 'Starter week',
  title: 'Here’s a starting point, not a test',
  lead: 'Your first week is easy on purpose. Everything here changes with you.',
  starterCardT: 'Starter week: tell us more to personalise it',
  starterCardS: 'You haven’t told us how you like to train, so this is a simple week anyone can start with. About a minute of questions turns it into your own.',
  whyH: 'Why this week · tap any to see more',
  noWeight: 'Add your weight any time for a starting estimate.',
  noWeightS: 'Logging food works as normal. We just won’t show a calorie or protein number until we can give you an honest one.',
  noHeight: 'Add your height any time for a starting estimate.',
  maint: 'Eating at maintenance',
  maintS: 'No calorie number for now. Log food if you find it useful; there’s no target to hit.',
  ifThen: 'Want a small plan for week 1?',
  ifThenS: '"After ___, I’ll ___." Optional.',
  daySub: 'Why each part is here',
  /** GAP: the "How we worked this out" sheet has no board; this is the §5 chain in plain words */
  howT: 'How we worked this out',
  how: [
    'We start from your resting energy: an estimate from your age, height, weight and sex (the Mifflin–St Jeor equation).',
    'Then we add your everyday movement, not counting workouts, and the sessions in your week.',
    'That gives your likely maintenance, as a range, since any estimate like this can be out by about a sixth. Your goal then sets the starting number, never below a safe minimum.',
    'After 3–4 weeks of weigh-ins, Tali checks it against what actually happened.',
  ],
}

/** Onboarding 2: Today's card and the handoff. */
export const SETUP_CARD = {
  k: 'Finish your setup', r: 'About a minute', t: 'Tell us how you like to train, and we’ll build your week from it.',
  s: 'Until then you’re on a starter week: 3 short full-body sessions.', go: 'Continue setup', later: 'Not now',
}

/** Onboarding 5. */
export const FIRST_SESSION = {
  findK: (n: number) => `Find your weight · ${n === 1 ? 'first' : 'second'} session`,
  find: 'No wrong answer. Pick something that feels comfortable. We’ll adjust from how it felt.',
  know: 'I know my weights',
  feelT: 'How was that set?',
  feelNote: 'We ask on the last set of each exercise. Skipping keeps next time the same.',
  thumbsNote: 'Like or not for me: tap the thumbs on any exercise. No reason needed.',
  feels: [['spare', 'Easy, lots left'], ['right', 'About right, 2 or 3 left'], ['struggle', 'Hard, the last rep was a struggle'], ['stopped', 'Stopped early']] as const,
}

/** Every line above, for the copy lint. */
export function allCopy(): string[] {
  const out: string[] = []
  const walk = (x: unknown) => {
    if (typeof x === 'string') out.push(x)
    else if (typeof x === 'function') out.push(String((x as (n: number) => string)(1)), String((x as (n: number) => string)(2)))
    else if (Array.isArray(x)) x.forEach(walk)
    else if (x && typeof x === 'object') Object.values(x).forEach(walk)
  }
  walk([COPY, INTRO_POINTS, READINESS_ITEMS, PREGNANCY_FOLLOWUP, WELLBEING_STATEMENT, WELLBEING_OPTIONS, MEDICAL_ITEMS, ONE_DAY_NOTE, NOTES, SUMMARY, SETUP_CARD, FIRST_SESSION])
  return out
}
