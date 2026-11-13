/**
 * Profile's words (ProfileScreen.tsx and its sheets, profile/AccountData.tsx's Health data sheet,
 * profile/FeedbackSheet.tsx), lifted verbatim out of the web's JSX so the web and the native app
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
  groups: { goal: 'You and your goal', tracking: 'Tracking', review: 'Weekly review', notifications: 'Notifications', account: 'Account and data', testing: 'Testing' },
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
  account: {
    row: 'Account',
    signedInAs: 'Signed in as',
    notSyncing: 'Your account (not syncing right now)',
    changeHint: 'Change your name or email from the card at the top.',
  },
  healthRow: 'Health data',
  healthStatus: { on: 'On', paused: 'Paused', off: 'Off', unasked: 'Not asked yet' },
  aiRow: 'AI features',
  backup: {
    row: 'Back up and restore',
    value: 'Export, import',
    phoneOnly: 'Your log is only on this phone until you agree to Tilo keeping your health data, so export a copy now and then.',
    stored: 'Your log is stored on this device, so Tilo works without a connection',
    syncs: ', and it syncs to your private database when you’re online',
    paused: '. Not syncing right now: changes sync when you’re back online, or sign in again from Account',
    exportNote: '. Export a copy now and then.',
    export: 'Export',
    import: 'Import',
    resume: (list: string) => `When sync started again, ${list} had changed on another device, so Tilo kept those. This phone’s earlier version is saved here: download it as a backup you can import.`,
    resumeBtn: 'Download this phone’s earlier version',
    invalid: "That isn't a valid backup file",
  },
  deleteRow: 'Delete account',
  feedbackRow: { label: 'Send feedback', sub: 'What’s working, and what you’d like to see' },
  about: {
    row: 'About Tilo',
    name: 'Tilo',
    lead: ' is a personal health and fitness tracker.',
    body: 'General fitness information only, not medical advice. Talk to a GP before starting a new diet or exercise programme.',
  },
  privacy: {
    row: 'Privacy',
    off: 'Health data off',
    agreedOn: (date: string) => `You agreed to Tilo using your health information on ${date}. `,
    withdrawn: 'You’ve withdrawn consent, so your log is on your phones only and Tilo doesn’t keep your weigh-ins, check-ins or body details. ',
    stored: 'Your data is stored on this phone and in your private account database.',
    phoneOnly: 'Your log is only on this phone until you agree.',
    neverSold: ' It’s never sold or used for ads.',
    shareProducts: 'Share new products I scan',
    shareFoot: 'Barcode, name and figures only, never who added them.',
    withdraw: 'Withdraw consent for health data',
    turnOn: 'Turn health data back on',
    del: 'Delete account',
  },
  signOut: 'Sign out',
  wellness: 'Tilo offers general wellness guidance, not medical advice.',
} as const

/** Import's confirm step (ProfileScreen ImportSheet). */
export const IMPORT = {
  title: 'Import backup',
  has: (days: string, span: string, foods: string, recipes: string, workouts: string) => `This backup has ${days}${span}, ${foods}, ${recipes} and ${workouts}.`,
  replaces: (days: string, saved: boolean, workouts: boolean) => `Importing replaces your targets and profile${days}${saved ? ' and any saved food or recipe with the same name' : ''}${workouts ? ', and adds its workouts' : ''} on all your devices. Anything else here stays as it is.`,
  go: 'Import',
}

/** Sign out (ProfileScreen SignOutSheet). */
export const SIGN_OUT = {
  title: 'Sign out',
  phoneOnly: 'What you log now is only on this phone: nothing syncs to your account until you agree to Tilo keeping your health data. Signing out keeps it here for when you sign back in. Removing it deletes it from this phone for good, so export a copy first.',
  keeps: 'Your log stays on this device for when you sign back in. On a shared phone you can remove it instead: it stays in your account.',
  unsynced: (n: number) => `${n === 1 ? '1 change hasn’t' : n + ' changes haven’t'} synced yet, so removing the log now would lose ${n === 1 ? 'it' : 'them'}. Connect first, or export a copy in Back up and restore.`,
  signingOut: 'Signing out…',
  go: 'Sign out',
  exportCopy: 'Export a copy',
  removeDelete: 'Remove anyway and delete your log',
  removeLose: (n: number) => 'Remove anyway and lose ' + (n === 1 ? '1 change' : n + ' changes'),
  remove: 'Sign out and remove this device’s log',
}

/** Profile › Health data, the sheet's main view (profile/AccountData.tsx HealthDataSheet). */
export const HEALTH_DATA = {
  title: 'Health data',
  done: 'Done',
  on: 'Tilo keeps your log, including your weight, check-ins and body details, to run the app and build your plan and targets.',
  /** followed by unconsentedCopyLine() */
  paused: 'Your log is on this phone only until you agree: nothing syncs to your account or is backed up there. ',
  off: 'You’ve said no, so your log is on your phones only: nothing syncs to your account. To build your plan, Tilo uses things like your weight, sleep, stress and health, and needs your OK to keep them.',
  unasked: 'To build your plan, Tilo asks about things like your weight, sleep, stress and health. That’s health data, so we need your OK to keep it.',
  privacyNotice: 'Read the privacy notice',
  agree: 'Yes, keep it',
  stop: 'Stop keeping my health data',
}

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
  ;[PROFILE, IMPORT, SIGN_OUT, HEALTH_DATA, FEEDBACK].forEach(walk)
  return out
}
