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


/** ob5-4: once on Today after the first workout (s-ob8 point 5). The placeholder assumes nothing about children. */
export const IF_THEN = {
  k: 'Optional · after your first workout',
  title: 'Plan when you’ll do it',
  lead: 'Linking a workout to something you already do makes it easier to remember. Pick a cue that fits your day.',
  after: 'After…', then: 'I’ll…', placeholder: 'my morning coffee', thenValue: 'do my workout',
  cues: ['my morning coffee', 'I get home from work', 'lunch', 'I drop the kids at school'],
  save: 'Save', later: 'Not now',
}

/** Onboarding 7: Profile › Health data's row to the answers (ob7-1). */
export const HEALTH_ANSWERS_ROW = 'Health check answers'

/** Profile › Health data's row to redo the first-run setup, prefilled (compliance item 32). */
export const REDO_ROW = 'Redo setup'
/** The same place, for someone who used Tali before onboarding and never ran it (Benn approved). */
export const SETUP_ROW = 'Set up my plan'
