/**
 * The wizard's words, from the approved boards (Design canvas rows Onboarding 1–5). Plain data
 * with no React, so `npm test` runs the copy lint over every line (engine §3.7 test 7, onboarding
 * §4). Where a board has no words for something the build needs, the line is marked GAP.
 */
import type { StepId } from '@/core/domain/wizard'
import { FIRST_SESSION, FOOD9, HEALTH_ANSWERS_ROW, IF_THEN, REDO_ROW, SETUP_CARD, SETUP_ROW } from './copyApp'
export { FIRST_SESSION, IF_THEN, SETUP_CARD }

/**
 * `lead` (or `line`, where the refined boards draw a short line the screen didn't have) is the one
 * 17px line under the title; `why` and `note` open behind its "Why we ask" link (note s-r: no
 * footnotes on question screens).
 */
export interface ScreenCopy { title: string; lead?: string; line?: string; why?: string; note?: string; hint?: string; unit?: string }

export const COPY: Partial<Record<StepId, ScreenCopy>> = {
  intro: { title: 'A few questions, so Tali fits you', lead: 'Everything we ask is used for something you’ll see. First, a little about you.',
    /** not on ob1-0, kept: compliance item 32 (Benn's wording) needs the Redo setup line */
    note: 'Skip any question you like. Your answers are private to your account. You can redo setup any time from Profile.' },
  'skip-age': { title: 'No problem. Just your age, then you’re in.', lead: 'It’s the one thing we need to keep Tali safe for you.', note: 'You’ll start on a simple starter week with no calorie numbers. Build your own plan whenever you like from Today or Plan.' },
  name: { title: 'What do you like to be called?', why: 'so Tali can greet you. Your first name is plenty.' },
  age: { title: 'How old are you?', line: 'Tali is for people aged 18 and over.', why: 'it keeps your plan safe and sets your energy needs.', note: 'Tali is for people aged 18 and over. We keep your age, never your date of birth.' },
  ready: { title: 'A few health questions', lead: 'Do any of these apply to you right now?', why: 'a yes just means we start more gently. It never stops you using Tali.', note: 'We keep a short note of what applies (like pregnancy), never a medical record.' },
  why: { title: 'What would make this worth it for you?', lead: 'Pick any that feel true.', why: 'we’ll remind you of it in your weekly look-back.' },
  goal: { title: 'What’s your main goal?', line: 'It shapes your training and your food.', why: 'it shapes both your training and your food targets. You can change it any time.' },
  lately: { title: 'How are things lately?', lead: 'Thinking about the last two weeks.', why: 'when sleep or stress is hard going, we start lighter. You can update this by redoing setup.' },
  wellbeing: { title: 'How food and weight feel for you', why: 'if it’s a yes or sometimes, Tali hides weight and calorie targets and keeps things gentle. We keep your answer (yes, no or rather not say) to keep things gentle. Nothing more.' },
  body: { title: 'About your body', why: 'your height and sex set your energy needs.', note: 'Sex changes the energy estimate a little. "Prefer not to say" uses a middle estimate with a wider range.' },
  medical: { title: 'Does any of this apply to you?', lead: 'Pick any that apply.', why: 'some conditions and medicines change how eating less affects you. We keep what it means for your plan, not the condition.' },
  weight: { title: 'What do you weigh?', line: 'Roughly is fine. It stays private.', hint: 'Drag to set. Skip it and we won’t show calorie numbers yet.', why: 'with your height and age, it gives your starting calorie range. Skip it and we won’t show calorie numbers until you add it.', note: 'Roughly is fine. It stays private to your account, and in gentle mode Tali never shows it back.' },
  move: { title: 'How much do you move on a normal day?', lead: 'Not counting workouts.', why: 'it sets your everyday energy use. Workouts are counted separately.' },
  handoff: { title: 'How you like to train', lead: 'So your week fits your life. You can change any of it later.' },
  'plan-intro': { title: 'Your plan is ready', lead: 'We’ve built a week from your answers, and a starting point for food.' },
  moving: { title: 'Are you moving much at the moment?', why: 'it sets how gently your first weeks start.' },
  confidence: { title: 'How confident do you feel with workouts?', why: 'it sets how many exercises and sets you start with.' },
  days: { title: 'How many days a week would you like to train?', lead: 'Fewer is fine to start. You can add days later.', why: 'your workouts land on the days you pick. Other days are rest, or a walk if you fancy it.' },
  minutes: { title: 'How long can a session be?', lead: 'Roughly is fine.', why: 'it sets how many exercises fit. Short sessions count.', unit: 'minutes' },
  where: { title: 'Where will you train?', why: 'so every exercise is one you can do there.' },
  kit: { title: 'What do you have at home?', lead: 'Pick all that apply.', why: 'every exercise uses kit you have.' },
  enjoy: { title: 'What do you enjoy?', lead: 'Pick any. "Not sure yet" is fine.', why: 'more of what you enjoy makes it easier to keep going.' },
  /** the safety line is the one line under the title (it was the footnote) */
  areas: { title: 'Any areas to go easy on?', line: 'Pain that’s new, sharp or getting worse is worth checking with a GP or physio first.', why: 'we leave out moves that load them and pick gentler ones.' },
}

/** The three part intros (ob1-0, ob2-0, ob3-0; s-ob8 point 1): one pattern, "Part n of 3". */
export const PARTS = {
  intro: { n: 1, k: 'About you', time: 'About 2 minutes', go: 'Let’s go', alt: 'Skip, I’ll set things up myself',
    points: ['Your name and age', 'A few health questions', 'Your goal, and how things are lately', 'Your height, weight and a normal day'] },
  handoff: { n: 2, k: 'How you like to train', time: 'About a minute', go: 'Continue', alt: 'Skip for now, start with a simple week',
    points: ['How many days, and which ones', 'How long a session can be', 'Where you train and what kit you have', 'What you enjoy, and anything to go easy on'] },
  'plan-intro': { n: 3, k: 'Your plan', time: '', go: 'See my week', alt: '',
    points: ['Your week, with a warm-up in every session', 'Why each part is there', 'Your food starting point'] },
} as const
export const partLabel = (n: number, k: string) => `Part ${n} of 3 · ${k}`

/** ob2-4: the warm-up the chosen length includes (N from core/domain/warmup), in full-size text. */
export const MINUTES_WARMUP = (n: number) => `Includes ${n === 8 || n === 11 || n === 18 ? 'an' : 'a'} ${n}-minute warm-up at the start.`
export const MINUTES_WARMUP_S = 'Longer sessions get a longer warm-up, from 4 to 10 minutes.'

export const READINESS_ITEMS = [
  'Chest pain, or a heart condition a doctor has told you about',
  'Dizziness, fainting or losing your balance',
  'Pregnant, breastfeeding, or recent surgery',
]
/** The boards don't split pregnancy from recent surgery; this follow-up does (Benn approved; wording mental-performance). */
export const PREGNANCY_FOLLOWUP = 'Which of these is it?'
export const PREGNANCY_OPTIONS = [['pregnant', 'Pregnant'], ['breastfeeding', 'Breastfeeding'], ['surgery', 'Recent surgery']] as const
/** The 12-week re-ask (§13.5, §14; board ob7-3). */
export const PREGNANCY_REASK = 'Does this still apply?'

export const WELLBEING_STATEMENT = '"Food or weight sometimes feels stressful or all-consuming for me."'
export const WELLBEING_OPTIONS = [['yes', 'Yes'], ['sometimes', 'Sometimes'], ['no', 'No'], ['rather-not-say', 'Rather not say']] as const

export const MEDICAL_ITEMS = [
  'Diabetes treated with insulin, or tablets that can cause lows',
  'Kidney disease',
  'A weight-loss injection, like semaglutide or tirzepatide',
]

/** Tap-to-advance screens (note s-r): no Continue, this line at the foot instead. */
export const TAP = 'Tap one to carry on.'
export const TAP_GOAL = 'Tap one to carry on. You can change it any time.'
export const WHY_LINK = 'Why we ask'
/** r4-days: the chosen days spelled out; none chosen yet */
export const DAYS_SPREAD = (spread: string) => `Not sure? Leave these and we’ll spread them out: ${spread}.`

export const ONE_DAY_NOTE = 'One day is a great start. Two gets you the full benefit when you’re ready.'

/** Onboarding 4: the signposting screens. */
export const NOTES = {
  // board "Age 18+ · 2": the wizard's stop (first run)
  under16: { title: 'Tali is for 18+', lead: 'Thanks for giving it a try. Tali is made for people aged 18 and over, so we can’t set you up just yet.', more: 'If you’d like help with food, being active or how you’re feeling, a parent or carer, another adult you trust, your school or college nurse, or your GP is a good place to start.', note: 'We haven’t kept any of your answers. Closing deletes your new account.' },
  // board "Age 18+ · 1": the app's stop, when an under-18 age comes in from Profile, a backup,
  // sync or this phone's saved data. `notSaved` only when the age wasn't stored (Profile, a backup)
  underAge: {
    title: 'Tali is for 18+',
    lead: 'Thanks for using Tali. It’s made for people aged 18 and over, so we need to close your account. That’s about how Tali is built, not about you or anything you’ve logged.',
    more: 'Tali’s food and activity targets are made for adults, not for bodies that are still growing. If you’d like help with food, being active or how you’re feeling, a parent or carer, another adult you trust, your school or college nurse, or your GP is a good place to start.',
    note: 'Closing deletes your account and everything logged in it, on this phone and on our servers.',
    notSaved: 'Your age hasn’t been saved.',
    close: 'Close and delete',
    wrong: 'I typed my age wrong',
  },
  wellbeing: { eyebrow: 'Food and weight', title: 'Thanks for telling us', lead: 'We’ll keep things gentle: no weight on screen and no calorie target to hit. You can still log food and train, and change this in Profile any time.', h: 'If you’d like to talk to someone', note: 'This stays private to you. We keep your answer (yes, no or rather not say) to keep things gentle. Nothing more.' },
  readiness: { eyebrow: 'Your health check', title: 'We’ll start gently', lead: 'Because of your answer, your plan starts with lighter, low-impact sessions. It’s a good idea to check with your GP before you build up.', h: 'If you need advice', note: 'Chest pain during a workout? Stop and call 999. Feeling faint? Stop, sit down, and call 999 if it doesn’t pass quickly.' },
  pregnancy: { eyebrow: 'Pregnancy and breastfeeding', title: 'We’ll keep things gentle', lead: 'While you’re pregnant or breastfeeding, Tali won’t suggest eating less, and there’s no calorie number. Training stays gentle. Your midwife, health visitor or GP can tell you what’s right for you.', h: 'If you need advice', note: 'In 12 weeks we’ll check whether this still applies. You can clear this in Profile any time.' },
  medical: { eyebrow: 'Your health', title: 'Food stays at maintenance for now', lead: 'With what you’ve told us, eating less is best planned with your GP or care team. Tali keeps food at maintenance and won’t suggest a high-protein target. Training works as normal.', h: 'If you need advice', note: 'You can update this in Profile any time.' },
}

const kc = (n: number) => n.toLocaleString('en-GB')

/** Onboarding 3: the summary. */
export const SUMMARY = {
  built: 'Built from your answers',
  starter: 'Starter week',
  /** r6-summary's hero: the plan's name, then its shape */
  heroT: 'Your first week',
  starterHeroT: 'A simple first week',
  starterCardT: 'Tell us more to personalise it',
  starterCardS: 'You haven’t told us how you like to train, so this is a simple week anyone can start with. About a minute of questions turns it into your own.',
  whyH: 'Why this week',
  allReasons: 'All reasons',
  /** r6-summary, under the week's day strip */
  warmLine: (n: number) => `Each session starts with ${n === 8 || n === 11 || n === 18 ? 'an' : 'a'} ${n}-minute warm-up`,
  start: 'Start my week',
  edit: 'Change my answers',
  noWeight: 'Add your weight any time for a starting estimate.',
  noWeightS: 'Logging food works as normal. We just won’t show a calorie or protein number until we can give you an honest one.',
  noHeight: 'Add your height any time for a starting estimate.',
  maint: 'Eating at maintenance',
  maintS: 'No calorie number for now. Log food if you find it useful; there’s no target to hit.',
  /** ob4-7: pregnancy or breastfeeding */
  maintP: 'That means eating to meet what your body needs each day, with no weight goal. There’s no calorie number to aim for, and logging works in full.',
  maintLongK: 'For how long:',
  maintLong: 'while you’re pregnant or breastfeeding, when some weight change is normal. We’ll check in every 12 weeks, and you can change it any time in Profile.',
  maintMore: 'What this means',
  /** ob4-9: no health data consent */
  noConsentT: 'Targets need your OK',
  noConsentS: 'Logging works in full. To set targets from your height, weight and age, Tali needs your OK to keep health data.',
  noConsentGo: 'Turn on health data',
  /** ob4-9: no age saved */
  noAgeT: 'Add your age for a starting estimate',
  noAgeS: 'Logging works in full. Your age sets your energy needs and keeps things safe, so we show no numbers without it.',
  noAgeGo: 'Add age',
  /** ob3-1: under the suggested week */
  others: 'See other plans',
  othersS: 'This week is our suggestion. You can choose a ready-made plan instead.',
  daySub: 'Why each part is here',
  /** ob3-2's first row. The board's moves are placeholders (s-ob8 point 4), so the line names none. */
  warmRow: (n: number) => `Warm-up · ${n} min`,
  warmRowS: 'A minute or two to raise your pulse, then moving stretches for today’s joints',
  /** ob9-1: the standard card */
  startT: (kcal: number) => `About ${kc(kcal)} kcal a day to start`,
  /** ob9-1. GAP: a surplus says "more than", a start at the estimate says "around" (s-ob9 draws a deficit) */
  startS: (e: { diff: number; estimate: number; direction: 'less' | 'more' | 'same' }, review: string) =>
    (e.direction === 'same'
      ? `That’s around our best estimate of what you burn (about ${kc(e.estimate)} a day).`
      : `That’s about ${kc(Math.abs(e.diff))} ${e.direction} than our best estimate of what you burn (around ${kc(e.estimate)} a day).`) +
    ` Estimates like this can be 15% out either way, so Tali checks it against your weigh-ins after ${review} and adjusts.`,
  /** ob9-1 and ob4-9: Sometimes */
  sometimesT: 'A steady range to eat around',
  sometimesS: 'With no deficit and no weight. For your first two weeks it’s one tap away on Food, then we’ll ask if you’d like it on Today.',
  /** ob9-1 and ob4-9: Yes */
  yesT: 'Log what you eat, if it helps',
  yesS: 'There’s no calorie number and no weight, and protein is shown in words. You can change this in Profile any time.',
  changeLink: 'Change in Profile › Health check answers',
  /** ob9-5 */
  howT: 'How we worked this out',
  how: {
    burnT: 'What you burn, roughly',
    /** departs from ob9-5's "Workouts are counted separately": the estimate already counts the week's planned sessions (targets.ts) */
    burn: (est: number) => `Around ${kc(est)} kcal a day, from your age, height, weight, how much you move and the workouts in your week.`,
    sureT: 'How sure we are',
    sure: (lo: number, hi: number) => `Estimates like this can be about 15% out either way, so the real figure is likely somewhere between ${kc(lo)} and ${kc(hi)}.`,
    startT: 'Your starting point',
    start: (e: { start: number; diff: number; paceKg: number; direction: 'less' | 'more' | 'same' }) =>
      e.direction === 'same'
        ? `About ${kc(e.start)} a day: around the estimate, so your weight is likely to stay about the same.`
        : `About ${kc(e.start)} a day: about ${kc(Math.abs(e.diff))} ${e.direction} than the estimate, for ${e.paceKg <= 0.25 ? 'a gentle pace' : 'a pace'} of around ${paceWords(e.paceKg)} a week.`,
    nextT: 'What happens next',
    next: (review: string) => `After ${review} of weigh-ins, Tali compares what happened with what we expected and suggests an adjustment. Nothing changes without your OK.`,
  },
}

/** 0.25 → "a quarter of a kilo", 0.5 → "half a kilo", otherwise "0.4 kg" */
function paceWords(kg: number): string {
  if (Math.abs(kg - 0.25) < 0.001) return 'a quarter of a kilo'
  if (Math.abs(kg - 0.5) < 0.001) return 'half a kilo'
  if (Math.abs(kg - 1) < 0.001) return 'a kilo'
  return `${kg < 0.1 ? 'under 0.1' : kg.toLocaleString('en-GB', { maximumFractionDigits: 2 })} kg`
}

/** ob4-8: "What this means", the person's own reason only (drawn: pregnancy). */
export const MAINT_SHEET = {
  title: 'Eating at maintenance',
  rows: [
    ['What it means', 'Eating to meet what your body needs each day, with no weight goal. You don’t need to count anything. Log food if it helps you, or not at all.'],
    ['Why Tali does this', 'Based on something you told us, Tali isn’t setting a weight goal for now. Training carries on at a pace that feels comfortable.'],
    ['How long it lasts', 'While you’re pregnant or breastfeeding. We’ll check in every 12 weeks, and you can change it any time in Profile.'],
    ['What happens next', 'Tali asks before changing anything, and nothing changes on its own.'],
  ] as [string, string][],
  answers: 'See your health check answers',
}

/** ob3-6: "See other plans". GAP: "Suggested for you" and "In use" once a Tali plan is chosen. */
export const OTHERS = {
  title: 'Other plans',
  close: 'Close',
  lead: 'Ready-made plans by Tali. Pick one to use instead of your suggested week. Your answers stay saved, so you can switch back.',
  mineK: 'Suggested for you · in use',
  mineOff: 'Suggested for you',
  mine: 'Your week, built from your answers',
  inUse: 'In use',
  h: 'Ready-made',
  more: 'More to come, including a 2-day plan for beginners.',
}

/**
 * Onboarding 7: Profile › Health data › Health check answers, and the 12-week check-in on Today
 * (boards ob7-1 to ob7-4, s-ob7, approved 28 Sept 2026). Values show only what is stored (outcomes,
 * never the condition, and pregnancy and breastfeeding aren't told apart): Benn approved these
 * values and the lines for stored "no" and "Rather not say" answers (28 Sept 2026). "How things
 * are lately" stays unlisted.
 */
export const HEALTH_ANSWERS = {
  row: HEALTH_ANSWERS_ROW,
  title: 'Health check answers',
  lead: 'Answers from your health check, and what each one changes.',
  empty: 'Nothing kept from your health check.',
  foot: 'Clearing these changes your plan and targets straight away.',
  change: 'Change',
  clear: 'Clear',
  labels: { pregnancy: 'Pregnant or breastfeeding', medical: 'Conditions or medicines', readiness: 'Health check', wellbeing: 'Food and weight' },
  /** only a yes is stored (not the condition, not pregnant vs breastfeeding) */
  yes: 'Yes',
  no: 'No',
  none: 'None of these',
  gentler: 'Gentler start',
  /** Onboarding 9 stores Yes and Sometimes apart */
  wellbeingFlagged: 'Yes',
  wellbeingSometimes: 'Sometimes',
  rather: 'Rather not say',
  does: {
    pregnancy: 'Food stays at maintenance with no calorie number, and training stays gentle.',
    medical: 'Food stays at maintenance, with no high-protein target.',
    readiness: 'Your plan starts with lighter, low-impact sessions.',
    wellbeing: 'Weight is hidden and there’s no calorie target to hit.',
    /** GAP: Sometimes has no ob7 line; the ob9-1 card in a sentence */
    wellbeingSometimes: 'Food shows a steady range with no deficit, and weight is hidden.',
    /** "Rather not say" without the deficit chosen */
    rather: 'Food stays at maintenance for now.',
    /** a stored answer that changes nothing */
    nothing: 'Nothing changes in your plan.',
  },
  confirmT: (label: string) => { const l = String(label); return `Clear ${l.charAt(0).toLowerCase() + l.slice(1)}?` },
  confirm: 'Your food targets will show calorie numbers again, and training goes back to your usual pace.',
  /** s-ob7's undrawn variant: something else still hides the numbers */
  confirmHidden: 'Your plan goes back to your usual pace. Calorie numbers stay hidden while gentle mode is on.',
  /** a gentler start (the health check) is still kept after this clear (Benn, 28 Sept 2026) */
  confirmGentler: 'Your food targets will show calorie numbers again. Your gentler start stays until you clear it too.',
  keep: 'Keep it',
}
/**
 * Profile › Health data › Redo setup (Benn approved the row, compliance item 32). GAP: the offer
 * after the summary's Start has no board; plain words for "the rebuild is offered, never automatic".
 */
export const REDO = {
  row: REDO_ROW,
  /** the same, for someone who never ran setup */
  setupRow: SETUP_ROW,
  offerT: 'Rebuild your week too?',
  offer: 'Your new answers are saved either way. Rebuilding makes a new week from them. What you’ve logged and the exercises you’ve liked or skipped stay.',
  rebuild: 'Rebuild my week',
  keep: 'Keep my current week',
}

export const CHECKIN = {
  title: PREGNANCY_REASK,
  lead: 'You told us you were pregnant or breastfeeding. We’ll keep things gentle while it does.',
  options: [['pregnant', 'Still pregnant'], ['breastfeeding', 'Breastfeeding now'], ['no-longer', 'No longer']] as const,
  later: 'Ask me later',
  doneT: 'Thanks. Your plan and targets will update.',
  seeAnswers: 'See your health check answers',
  done: 'Done',
}

const EXPLAINED = { start: 1650, estimate: 1900, diff: 250, paceKg: 0.25, direction: 'less' as const }
const EXPLAINED_ALL = [EXPLAINED, { ...EXPLAINED, start: 2150, diff: -250, direction: 'more' as const }, { ...EXPLAINED, start: 1900, diff: 0, paceKg: 0, direction: 'same' as const }]
/** Onboarding 9's lines that take more than numbers */
const FN_SAMPLES = new Map<unknown, unknown[][]>([
  [SUMMARY.startS, EXPLAINED_ALL.map((e) => [e, '3–4 weeks'])],
  [SUMMARY.how.start, EXPLAINED_ALL.map((e) => [e])],
  [SUMMARY.how.next, [['3–4 weeks']]],
  [FOOD9.slots, [[['breakfast', 'lunch', 'snack'], 2], [['dinner'], 1], [[], 0]]],
  [FOOD9.withProtein, [[2, 3], [1, 1], [0, 2]]],
  [FOOD9.meals, [[0], [1], [3]]],
])

/** Every line above, for the copy lint. */
export function allCopy(): string[] {
  const out: string[] = []
  const walk = (x: unknown) => {
    if (typeof x === 'string') out.push(x)
    else if (typeof x === 'function') {
      const f = x as (...a: unknown[]) => string
      const tries = FN_SAMPLES.get(f) ?? (f.length >= 3 ? [[62, 95, 130], [62, 60, null]] : f.length === 2 ? [[1, 2], [2, 3]] : [[1], [2]])
      for (const a of tries) out.push(String(f(...a)))
    }
    else if (Array.isArray(x)) x.forEach(walk)
    else if (x && typeof x === 'object') Object.values(x).forEach(walk)
  }
  walk([COPY, TAP, TAP_GOAL, WHY_LINK, DAYS_SPREAD, PARTS, MINUTES_WARMUP, MINUTES_WARMUP_S, MAINT_SHEET, OTHERS, IF_THEN, READINESS_ITEMS, PREGNANCY_FOLLOWUP, PREGNANCY_OPTIONS, PREGNANCY_REASK, WELLBEING_STATEMENT, WELLBEING_OPTIONS, MEDICAL_ITEMS, ONE_DAY_NOTE, NOTES, SUMMARY, SETUP_CARD, FIRST_SESSION, FOOD9, HEALTH_ANSWERS, REDO, CHECKIN])
  return out
}
