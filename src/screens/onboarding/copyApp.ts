/**
 * The onboarding lines shown inside the app itself (Today's setup card, the first session), apart
 * from copy.ts so the main bundle doesn't carry the wizard's words. Linted with the rest (copy.ts allCopy).
 */
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


/** ob5-4: once on Today after the first workout (s-ob8 point 5). The placeholder and the cues assume nothing about children. */
export const IF_THEN = {
  k: 'Optional · after your first workout',
  title: 'Plan when you’ll do it',
  lead: 'Linking a workout to something you already do makes it easier to remember. Pick a cue that fits your day.',
  after: 'After…', then: 'I’ll…', placeholder: 'my morning coffee', thenValue: 'do my workout',
  cues: ['my morning coffee', 'I get home from work', 'lunch'],
  save: 'Save', later: 'Not now',
}

/** Onboarding 7: Profile › Health data's row to the answers (ob7-1). */
export const HEALTH_ANSWERS_ROW = 'Health check answers'

/** Profile › Health data's row to redo the first-run setup, prefilled (compliance item 32). */
export const REDO_ROW = 'Redo setup'
/** The same place, for someone who used Tali before onboarding and never ran it (Benn approved). */
export const SETUP_ROW = 'Set up my plan'

const SLOT_WORD = { breakfast: 'breakfast', lunch: 'lunch', dinner: 'dinner', snack: 'a snack', other: 'something else' } as const
const andList = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
const kc = (n: number) => n.toLocaleString('en-GB')

/**
 * Onboarding 9 (boards ob9-2 to ob9-4, note s-ob9): Today's and Food's cards for a wellbeing Yes
 * or Sometimes, the two once-only asks and their undo rows in Profile › Health check answers.
 */
export const FOOD9 = {
  /** Yes (ob9-2): totals in words, never against a target */
  meals: (n: number) => (n ? `${n} ${n === 1 ? 'meal' : 'meals'} logged` : 'Nothing logged yet'),
  /** GAP: the board draws 2 of 3; one meal reads "With protein in it." and none says nothing */
  withProtein: (n: number, of: number) => (!n ? '' : of === 1 ? 'With protein in it.' : `With protein at ${n} of them.`),
  empty: 'Log a meal whenever it suits you.',
  logMeal: 'Log a meal',
  /** Sometimes (ob9-2): "Breakfast, lunch and a snack logged. Protein at 2 meals." */
  slots: (slots: (keyof typeof SLOT_WORD)[], protein: number) =>
    (slots.length ? `${cap(andList(slots.map((s) => SLOT_WORD[s])))} logged.` : 'Log a meal whenever it suits you.') +
    (protein ? ` Protein at ${protein} ${protein === 1 ? 'meal' : 'meals'}.` : ''),
  seeRange: 'See your range on Food',
  /** the range, never a single number: "Roughly 1,650–2,200 a day" */
  range: (lo: number, hi: number) => `Roughly ${kc(lo)}–${kc(hi)} kcal a day`,
  proteinRange: (eaten: number, lo: number, hi: number | null) => (hi == null ? `Protein ${kc(eaten)} g, at least ${kc(lo)} g a day` : `Protein ${kc(eaten)} g of ${kc(lo)}–${kc(hi)} g`),
  /** Yes, after "Show a range": on Food only */
  yesRangeS: 'There to help you eat enough, never less.',
  /** ob9-3 */
  todayAsk: { k: 'Once, in the app', t: 'Would you like your food range on Today?', s: 'Right now it’s one tap away on Food. Either way works, and you can change it in Profile.', yes: 'Show it', no: 'Keep it on Food' },
  /** ob9-4 */
  rangeAsk: { k: 'Your week-4 look-back', t: 'Would a calorie range help?', s: 'It’s there to help you eat enough, never less. It would sit on Food, not Today, and you can turn it off any time.', yes: 'Show a range', no: 'Not now' },
  /** GAP: no board for the undo rows; they sit under the answers on ob7-1's screen */
  optIn: {
    today: { label: 'Food range on Today', value: 'Shown', does: 'Your range shows on Today as well as Food.' },
    range: { label: 'Calorie range on Food', value: 'Shown', does: 'A range on Food to help you eat enough. Never on Today.' },
    off: 'Turn off',
  },
}

/**
 * Onboarding 10 (boards ob9-6, ob9-7, note s-ob10; wording by mental-performance): Profile ›
 * Health data › Support and helplines, for everyone. The services are signposts.ts's.
 */
export const SUPPORT = {
  row: 'Support and helplines',
  rowSub: 'Free, confidential services across the UK',
  title: 'Support and helplines',
  lead: 'People you can talk to about food, eating, mood or how things are going. You don’t need a reason to get in touch.',
  showing: (nation: string) => `Showing services for ${nation}`,
  change: 'Change',
  /** only true while opening the sheet is never logged, synced or sent (s-ob10) */
  foot: 'Opening this page is private. Tali doesn’t record it or tell anyone. All calls are free.',
  beat: 'Eating disorder support',
  beatWeb: 'Webchat and email too',
  mentalHealth: 'Mental health crisis line',
  urgent: 'Medical help when it isn’t an emergency',
  samaritans: 'Talk about anything',
  emergency: 'If you or someone else is in danger now',
  /** Northern Ireland's GP has no one number (the onboarding lists' word) */
  contact: 'Contact',
}
