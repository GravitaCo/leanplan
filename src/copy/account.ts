/**
 * Account, consent and legal words (native-build-plan finding 4): the sign-in screens, the owner
 * choice, the consent screen and its sheets, Profile's health data, back up, privacy, sign-out and
 * delete account. Both apps read them from here, so the web and native show the same words. A
 * sentence with a link inside is split around it (`before`, `link`, `after`). Wording changes go
 * past `compliance` (consent and legal) as before.
 */

const count = (x: number, one: string, many: string) => x + ' ' + (x === 1 ? one : many)

/* ---------------- sign-in (screens/AuthScreen.tsx) ---------------- */

export const AUTH = {
  modes: {
    signin: { t: 'Welcome back', s: 'Eat well, move often, feel better.', cta: 'Sign in' },
    signup: { t: 'Create your account', s: 'Two minutes to set up, then it works offline.', cta: 'Create account' },
    forgot: { t: 'Reset your password', s: 'Enter your email and we’ll send you a link to set a new one.', cta: 'Send reset link' },
    'check-email': { t: 'Check your email', s: '', cta: '' },
  },
  email: 'Email',
  emailPlaceholder: 'you@example.com',
  password: 'Password',
  passwordNew: 'At least 8 characters',
  passwordCurrent: 'Your password',
  confirm: 'Confirm password',
  confirmPlaceholder: 'Repeat password',
  forgot: 'Forgot?',
  wait: 'Please wait…',
  or: 'or',
  google: 'Continue with Google',
  errEmail: 'Please enter your email.',
  errFields: 'Please fill in all fields.',
  errMatch: 'Passwords do not match.',
  errShort: 'Password must be at least 8 characters.',
  errRate: 'Give it a minute, then try again.',
  sent: (email: string) => `We sent a link to ${email || 'your inbox'}. Open it on this phone to continue.`,
  back: 'Back to sign in',
  resentLead: 'Sent again. It can take a minute or two. ',
  resendLead: 'Nothing yet? Check your spam folder, or ',
  sendAnother: 'Send another',
  sendAgain: 'send it again',
  /** "Tilo is for people aged 18 and over. Read the Terms and Privacy notice. You'll be asked…" */
  legal: {
    lead: (minAge: number) => `Tilo is for people aged ${minAge} and over. Read the `,
    terms: 'Terms',
    and: ' and ',
    privacy: 'Privacy notice',
    after: '. You’ll be asked to agree after you sign up.',
  },
  haveAccount: 'Already have an account?',
  newHere: 'New to Tilo?',
  toSignIn: 'Sign in',
  toSignUp: 'Create an account',
} as const

/* ---------------- whose data is on this phone (AuthScreen OwnerChoiceScreen) ---------------- */

export const OWNER = {
  signedInAs: (who: string) => `Signed in as ${who}`,
  thisAccount: 'this account',
  checking: 'Checking the log on this device…',
  title: 'This device has another log',
  p1: (who: string) => `The log on this device was made in a different account, or before it was linked to ${who}.`,
  p2: (who: string) => `Starting fresh removes it from this device and loads ${who}’s own data. If the log is yours from another account, cancel and sign in to that one instead: anything that hadn’t synced yet is still there.`,
  p3: (who: string) => `Keeping it adds it to ${who}, replacing that account’s targets, profile, and any days, foods or recipes that are in both.`,
  sure: 'Some of the log on this device isn’t in any account, so starting fresh deletes it for good. Export a copy first if you might want it.',
  exportCopy: 'Export a copy',
  freshSure: 'Start fresh and delete it',
  fresh: (who: string) => `Start fresh with ${who}`,
  keep: (who: string) => `Keep this log in ${who}`,
  cancel: 'Cancel and sign out',
} as const

/* ---------------- consent (screens/legal/ConsentScreen.tsx, PrivacySheets.tsx) ---------------- */

export const CONSENT = {
  title: 'Before you start',
  lead: 'What you log in Tilo, like your weight, food, workouts, sleep, stress, mood and any injuries, is health information. It’s stored on this phone and in a database in Ireland (EU) that’s private to your account. It’s never sold, shared for marketing or used for ads.',
  health: { before: 'I agree to Tilo storing and using my health information to run the app for me, as the ', link: 'privacy policy', after: ' explains. I can withdraw this at any time in Profile, then Privacy.' },
  terms: { before: 'I accept the ', link: 'terms and conditions', after: ', and understand Tilo gives general wellness information, not medical advice.' },
  adult: (minAge: number) => `I’m ${minAge} or over.`,
  cont: 'Continue',
  back: 'Back',
  notNowKeep: 'Not now, keep it on this phone',
  notNowFoot: 'Until you agree, nothing you log syncs to your account or is backed up there.',
  reasked: 'We won’t ask again: you can agree any time in Profile, then Privacy.',
  askAgain: 'We’ll ask once more in 2 weeks.',
  signOut: 'Sign out',
  notNowSignOut: 'Not now, sign out',
  deleteFoot: (email: string | null) => `Already have data in Tilo and would rather it was deleted? Email ${email ?? ''} and we’ll delete your account.`,
  gpFoot: 'If you’re pregnant, have a medical condition, or have had an eating disorder, talk to a GP before using Tilo to guide your eating.',
} as const

export const REGRANT = {
  title: 'Health data',
  lead: 'Turning this back on lets Tilo save your weigh-ins, check-ins and body details again, and uploads your whole log from this phone to your account.',
  box: { before: 'I agree to Tilo storing and using my health information to run the app for me, as the ', link: 'privacy policy', after: ' explains. I can withdraw this at any time.' },
  cta: 'Turn health data back on',
} as const

/** "Read the privacy notice" / "What's sent, and where" (onboarding/Consent.tsx PrivacySheet). */
export const PRIVACY_SHEET = {
  title: 'Privacy',
  p1: 'Your log is stored on this phone and, once you agree, synced to a private database tied to your account. It’s never sold or used for ads.',
  p2: { before: 'The full details are in the ', link: 'privacy policy', after: '.' },
} as const

export const HEALTH_TICKS = [
  'It’s private to your account. Nobody else can see it.',
  'It’s never sold or used for ads.',
  'Download it or delete it any time in Profile.',
  'Saved on this phone first, so this works offline too.',
] as const

/* ---------------- Profile: health data (screens/profile/AccountData.tsx) ---------------- */

export const HEALTH_DATA = {
  title: 'Health data',
  status: { on: 'On', paused: 'Paused', off: 'Off', unasked: 'Not asked yet' },
  on: 'Tilo keeps your log, including your weight, check-ins and body details, to run the app and build your plan and targets.',
  /** followed by unconsentedCopyLine() */
  paused: 'Your log is on this phone only until you agree: nothing syncs to your account or is backed up there. ',
  off: 'You’ve said no, so your log is on your phones only: nothing syncs to your account. To build your plan, Tilo uses things like your weight, sleep, stress and health, and needs your OK to keep them.',
  unasked: 'To build your plan, Tilo asks about things like your weight, sleep, stress and health. That’s health data, so we need your OK to keep it.',
  readPrivacy: 'Read the privacy notice',
  agree: 'Yes, keep it',
  stop: 'Stop keeping my health data',
  /** the withdraw step: the prompt itself is HEALTH_WITHDRAW_PROMPT (data/consent.ts) */
  /** "On this phone: 1 weigh-in, 2 check-ins." or null when there's nothing to name */
  onPhone: (h: { weighIns: number; checkins: number; profileFields: number; trainingPrefs: number }): string | null => {
    const parts = [h.weighIns ? count(h.weighIns, 'weigh-in', 'weigh-ins') : '', h.checkins ? count(h.checkins, 'check-in', 'check-ins') : '', h.profileFields ? count(h.profileFields, 'body detail', 'body details') : '', h.trainingPrefs ? count(h.trainingPrefs, 'training preference', 'training preferences') : ''].filter(Boolean)
    return parts.length ? `On this phone: ${parts.join(', ')}.` : null
  },
  download: 'Download a copy',
  downloaded: 'Downloaded',
  remove: 'Remove my health data',
  removed: 'Health data removed',
} as const

/* ---------------- Profile: back up, privacy, sign out (screens/ProfileScreen.tsx) ---------------- */

export const BACKUP = {
  row: 'Back up and restore',
  value: 'Export, import',
  phoneOnly: 'Your log is only on this phone until you agree to Tilo keeping your health data, so export a copy now and then.',
  stored: (tail: string) => `Your log is stored on this device, so Tilo works without a connection${tail}. Export a copy now and then.`,
  storedSyncing: ', and it syncs to your private database when you’re online',
  storedPaused: '. Not syncing right now: changes sync when you’re back online, or sign in again from Account',
  exportBtn: 'Export',
  importBtn: 'Import',
  invalid: "That isn't a valid backup file",
  /** native only: the share sheet couldn't be offered (the web's download can't fail this way).
   *  New words: to approve with the port (design, compliance). */
  exportFailed: 'Couldn’t export a copy. Nothing was changed. Try again.',
  importTitle: 'Import backup',
  /** `span` is " (date)" or " (date to date)", or empty */
  has: (b: { days: number; foods: number; recipes: number; workouts: number }, span: string) =>
    `This backup has ${count(b.days, 'day', 'days')}${span}, ${count(b.foods, 'saved food', 'saved foods')}, ${count(b.recipes, 'recipe', 'recipes')} and ${count(b.workouts, 'workout', 'workouts')}.`,
  replaces: (b: { days: number; foods: number; recipes: number; workouts: number }) =>
    `Importing replaces your targets and profile${b.days ? (b.days === 1 ? ', that day' : ', those ' + b.days + ' days') : ''}${b.foods || b.recipes ? ' and any saved food or recipe with the same name' : ''}${b.workouts ? ', and adds its workouts' : ''} on all your devices. Anything else here stays as it is.`,
} as const

export const ACCOUNT_ROW = {
  heading: 'Account and data',
  account: 'Account',
  signedInAs: 'Signed in as',
  notSyncing: 'Your account (not syncing right now)',
  changeFoot: 'Change your name or email from the card at the top.',
  deleteRow: 'Delete account',
} as const

export const PRIVACY_ROW = {
  label: 'Privacy',
  off: 'Health data off',
  agreedOn: (date: string) => `You agreed to Tilo using your health information on ${date}. `,
  withdrawn: 'You’ve withdrawn consent, so your log is on your phones only and Tilo doesn’t keep your weigh-ins, check-ins or body details. ',
  stored: 'Your data is stored on this phone and in your private account database.',
  phoneOnly: 'Your log is only on this phone until you agree.',
  neverSold: ' It’s never sold or used for ads.',
  withdraw: 'Withdraw consent for health data',
  turnBackOn: 'Turn health data back on',
  wellness: 'Tilo offers general wellness guidance, not medical advice.',
} as const

export const SIGN_OUT = {
  title: 'Sign out',
  phoneOnly: 'What you log now is only on this phone: nothing syncs to your account until you agree to Tilo keeping your health data. Signing out keeps it here for when you sign back in. Removing it deletes it from this phone for good, so export a copy first.',
  stays: 'Your log stays on this device for when you sign back in. On a shared phone you can remove it instead: it stays in your account.',
  unsynced: (n: number) => `${n === 1 ? '1 change hasn’t' : n + ' changes haven’t'} synced yet, so removing the log now would lose ${n === 1 ? 'it' : 'them'}. Connect first, or export a copy in Back up and restore.`,
  signingOut: 'Signing out…',
  exportCopy: 'Export a copy',
  removeSure: 'Remove anyway and delete your log',
  removeLose: (n: number) => 'Remove anyway and lose ' + (n === 1 ? '1 change' : n + ' changes'),
  remove: 'Sign out and remove this device’s log',
} as const

/* ---------------- delete account (AccountData.tsx, boards ob6-5 and ob6-6) ---------------- */

export const DELETE = {
  back: 'Profile',
  title: 'Delete your account',
  lead: "This deletes everything, from our servers and from this phone. It can't be undone.",
  goesHeading: 'What gets deleted',
  goes: ['Your food log, meals and recipes', 'Workouts and sets', 'Weight, check-ins and notes', 'Plans and settings', 'Your login'],
  copyRow: 'Download a copy first',
  copySub: "A file with everything you've logged",
  button: 'Delete account',
  needsConnection: 'Needs a connection, so it deletes everywhere at once.',
  confirmTitle: 'Delete everything?',
  confirmLead: 'Your account and all your data will be deleted from Tilo and this phone. You can sign up again any time, but it starts fresh.',
  googleAgain: 'Sign in with Google again',
  /** native (iOS) only, for an account that signed in with Apple. New words: to approve with Sign in
   *  with Apple (design, compliance, Benn or Sara) */
  appleAgain: 'Sign in with Apple again',
  reauthApple: 'To delete your account, confirm it’s you: sign in with Apple again.',
  password: 'Your password, to confirm it’s you',
  typed: 'Type DELETE to confirm',
  wrongPassword: 'That password doesn’t match this account. Nothing has been deleted.',
  deleting: 'Deleting…',
  confirm: 'Delete everything',
  cancel: 'Cancel',
} as const
