/**
 * Profile's words (ProfileScreen.tsx and its sheets, profile/FeedbackSheet.tsx; the account, consent,
 * backup, privacy, Health data and Sign out words are N2's, in account.ts), lifted verbatim out of the web's JSX so the web and the native app
 * (apps/native/screens/profile) read the same strings. React-free. A sentence with a bold figure is
 * split around it (`[before, after]`). The pillars and Notifications words are in pillars.ts and
 * notify.ts; Support and helplines and Health check answers in onboarding.ts and onboardingApp.ts.
 */

export const PROFILE = {
  title: 'Profile',
  id: {
    addName: 'Add your name',
    notSyncing: 'Account · not syncing right now',
    perDay: ' a day',
    displayName: 'Display name',
    namePh: 'Your name',
    email: 'Email',
    save: 'Save profile',
    emailError: (e: string) => 'Email error: ' + e,
    checkEmail: 'Check your email to confirm',
  },
  groups: { goal: 'You and your goal', tracking: 'Tracking', review: 'Weekly review', notifications: 'Notifications', testing: 'Testing' },
  body: {
    row: 'Body and goal',
    sex: 'Sex', male: 'Male', female: 'Female',
    age: 'Age', agePh: '35',
    height: 'Height (cm)', heightPh: '178',
    weight: 'Weight (kg)', weightPh: '82.5',
    activity: 'Activity level',
    save: 'Save metrics',
    mainGoal: 'Main goal',
  },
  sug: {
    off: "Calorie suggestions are off for now, so there's no number here.",
    /** Sometimes: Food's range around the bold "1,650–1,950 kcal" */
    range: ['Your food range is about ', ' a day, around maintenance.'] as const,
    maintAbout: ['Maintenance about ', '.'] as const,
    chooseGoal: 'Choose your main goal to see a suggested daily target.',
    maint: 'Maintenance ',
    protein: 'Protein ', carbs: 'Carbs ', fat: 'Fat ',
    about: 'about ',
    floored: 'Held at a safe minimum. We never suggest eating below your resting metabolic rate.',
    use: 'Use these targets',
    needAgeHeight: 'Add age and height to see suggested targets.',
    needAll: 'Add age, height and weight to see suggested targets.',
  },
  targets: {
    row: 'Daily targets',
    rangeOnly: "A range around maintenance, worked out from your body and activity level, so there's no calorie target to set.",
    kcal: 'Calories', range: 'Range ±', p: 'Protein (g)', c: 'Carbs (g)', f: 'Fat (g)',
    save: 'Save targets',
    foot: "Your day is judged against a range (up to ± 400), not a single number. Calories won't go below 1,200 here. Going lower is something to do with medical support.",
  },
  training: { row: 'Training', days: (n: number) => (n === 1 ? '1 day a week' : `${n} days a week`), foot: 'Your weekly training schedule lives on Plan.' },
  supps: {
    row: 'Supplements', edit: 'Edit', del: 'Delete', name: 'Name', namePh: 'Creatine 5 g', time: 'Time',
    update: 'Update', add: 'Add', cancel: 'Cancel', addRow: 'Add supplement',
  },
  diet: { row: 'Diet', none: 'None', note: "Meal suggestions offer swaps for ingredients that don't fit. Nothing is hidden." },
  hands: {
    row: 'Hand portions',
    value: (g: number) => `palm ${g} g`,
    title: 'Hand portions',
    lead: 'Hands scale with the person, which is why they work. Weigh one of each once and enter it here. After that, "a palm" is a measurement, not a guess.',
    save: 'Save',
    saved: 'Hand portions saved',
    unit: 'g',
  },
  accuracy: { row: 'Accuracy' },
  display: {
    row: 'Display', standard: 'Standard', gentle: 'Gentle',
    gentleNote: 'Calorie numbers are hidden while you log and review your day, and body weight is off your Summary. You see how the day is going in words, and protein stays visible. Targets stay editable here.',
    standardNote: 'Full numbers, with a ± margin on anything estimated.',
  },
  review: {
    day: 'Review day',
    weight: 'Include weight in reviews',
    foot: 'Your review shows how often you weighed in and, after 4 weeks, the trend in words. Summary shows your latest weigh-in. Never with gentle display. Change it any time.',
  },
  notify: {
    supps: 'Supplement reminders',
    unsupported: 'Not supported in this browser',
    blocked: 'Blocked in your phone settings',
    on: 'On', off: 'Off',
    remindersOn: 'Reminders on', remindersOff: 'Reminders off',
    unsaved: ', but this device couldn’t save the setting. Storage may be full.',
    denied: 'Permission denied',
    signIn: 'Sign in to get reminders',
    failed: 'Couldn’t turn reminders on. Try again when you’re online',
    weekly: 'Weekly review reminder',
    weeklySub: (day: string) => `One note on ${day} morning`,
    weeklyOn: 'Weekly reminder on', weeklyOff: 'Weekly reminder off',
    weeklyFailed: 'Couldn’t turn the reminder on. Try again when you’re online',
    iphone: 'iPhone needs iOS 16.4 or later, with Tilo added to your Home Screen from Safari.',
  },
  healthRow: 'Health data',
  aiRow: 'AI features',
  /** the rest of Back up and restore is N2's (src/copy/account.ts BACKUP) */
  backup: {
    resume: (list: string) => `When sync started again, ${list} had changed on another device, so Tilo kept those. This phone’s earlier version is saved here: download it as a backup you can import.`,
    resumeBtn: 'Download this phone’s earlier version',
  },
  feedbackRow: { label: 'Send feedback', sub: 'What’s working, and what you’d like to see' },
  about: {
    row: 'About Tilo',
    name: 'Tilo',
    lead: ' is a personal health and fitness tracker.',
    body: 'General fitness information only, not medical advice. Talk to a GP before starting a new diet or exercise programme.',
  },
  /** the rest of Privacy is N2's (src/copy/account.ts PRIVACY_ROW) */
  privacy: {
    shareProducts: 'Share new products I scan',
    shareFoot: 'Barcode, name and figures only, never who added them.',
  },
} as const

/** Tester feedback (profile/FeedbackSheet.tsx); the areas and ratings are core/domain/feedback.ts's. */
export const FEEDBACK = {
  title: 'Feedback',
  of: (step: number, total: number) => `${step} of ${total}`,
  introT: 'Help shape Tilo',
  intro: 'A few quick questions about each part of the app, then what you’d like to see next. It takes about two minutes, and you can skip anything.',
  goesTo: (to: string) => `Your answers go to ${to} from your own email app, so you’ll see exactly what’s sent.`,
  note: 'What worked, or what got in the way?',
  optional: 'Optional',
  wishesT: 'What would you like to see in Tilo?',
  wishesHint: 'Features, foods, workouts, anything that would make it more useful for you.',
  other: 'Anything else?',
  readyT: 'Ready to send',
  opened: (to: string) => `Your email app should now be open with this ready to send. Didn’t open? Copy it instead and paste it into an email to ${to}.`,
  opens: (to: string) => `Opens your email app, addressed to ${to}.`,
  answerOne: 'Answer at least one question to send.',
  included: ' The app version and device type are included to help track down bugs.',
  done: 'Done',
  send: 'Send by email',
  copy: 'Copy instead',
  copied: (to: string) => 'Copied. Paste it into an email to ' + to,
  copyFailed: 'Couldn’t copy on this device',
  start: 'Start',
  next: 'Next',
}

/** Every string above with sample arguments, for a copy lint. */
export function profileStrings(): string[] {
  const out: string[] = []
  const walk = (v: unknown) => {
    if (typeof v === 'string') out.push(v)
    else if (typeof v === 'function') out.push(String((v as (...a: unknown[]) => unknown)('x', 'y', 'z', 'w', 'v')))
    else if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') Object.values(v).forEach(walk)
  }
  ;[PROFILE, FEEDBACK].forEach(walk)
  return out
}
