/**
 * Scanning's words (barcode scan, Check the label, Scan the label, Tilo's shared product list;
 * boards sp-1 to sp-9), lifted out of the web's screens so the web and the native app show the
 * same text from one place. React-free. The consent and opt-in lines are compliance's wording,
 * word for word: changing CONSENT bumps CONSENT_VERSIONS['label-photo'] (src/data/consent.ts).
 */

/* ScanView.tsx */
export const SCAN_TITLE = 'Scan barcode'
export const SCAN_CAMERA_NOTE = {
  denied: 'Tilo can’t use the camera. That’s fine: take a photo of the barcode, or type the number below.',
  none: 'No camera is available here. Take a photo of the barcode, or type the number below.',
  noscan: 'The scanner needs a connection the first time it opens. Type the number below, or try again later.',
} as const
export const SCAN = {
  badCheck: 'That number doesn’t look right: the last digit doesn’t check out. Try again, or check the digits under the barcode.',
  lookingUp: 'Looking up',
  lookingUpAfter: 'If it’s not found you can enter it from the label.',
  starting: 'Starting the camera…',
  hold: 'Hold the barcode inside the frame.',
  takePhoto: 'Take a photo',
  readingPhoto: 'Reading the photo…',
  photoSub: 'Of the barcode, close up, or pick one from your photos',
  photoAria: 'Take a photo of the barcode',
  noBarcode: 'No barcode found in that photo. Try again closer, in good light, with the whole barcode in view, or type the number.',
  photoUnreadable: 'That photo couldn’t be read. Try another, or type the number below.',
  orType: 'Or type the number',
  barcode: 'Barcode',
  placeholder: '13 digits under the bars',
  lookUp: 'Look up',
  source: 'Values come from Open Food Facts, a shared database. You’ll check them against your pack before saving.',
} as const

/* AddFoodSheet.tsx: where a missing product goes (Create a food, with the barcode) */
export const MISSING_NOTE = {
  'not-found': 'Not found. Enter it from the label: per 100 g column.',
  offline: 'Couldn’t look it up without a connection. Enter it from the label: per 100 g column.',
  error: 'Couldn’t look it up right now. Enter it from the label: per 100 g column.',
} as const
export const LABEL_OFFLINE = 'Label photos need a connection the first time they open.'
/** Add food's two scan rows and the search bar's scan button */
export const SCAN_ENTRY = {
  barcode: 'Scan barcode',
  barcodeSub: 'Packaged food, from the pack',
  barcodeSubOffline: 'Works for products you’ve scanned before',
  label: 'Scan the label',
  labelSub: 'A photo of the nutrition table',
  opening: 'Opening the camera…',
} as const


/* ScanConfirmView.tsx */
export const NAME_HINT = 'Brand, product and flavour, e.g. Walkers Sensations Roasted Chicken & Thyme'
export const CONFIRM = {
  title: 'Check the label',
  save: 'Save',
  fromLabel: 'Your pack label (read from your photo).',
  fromOff: 'Pack label via Open Food Facts: check against your pack.',
  kcalFromKj: ' · calories worked out from kJ',
  photoInstead: 'If these numbers don’t match your pack, read them from a photo instead.',
  cook: 'For cooking',
  eat: 'Eat as it is',
  eatNote: 'Eaten as it comes, like a ready meal, crisps or a drink. Logged by the serving.',
  cookNote: 'Something you cook or mix with, like pasta, milk or a sauce. Offered in recipes and What can I make?',
  name: 'Name',
  needed: 'Needed',
  addFlavour: 'Add the flavour or variety',
  serving: 'Serving on the pack',
  servingNeeded: 'Needed: the serving the per-serving column is for',
  servingCheck: 'Check the serving size on the pack',
  servingPh: 'e.g. 30',
  per100ml: 'Label is per 100 ml?',
  usLabel: 'US label: carbs include fibre. ',
  stale: (y: number | string) => `Last updated ${y}. Recipes change: check against your pack.`,
  nutrition: 'Nutrition',
  perServing: 'Per serving',
  didYouMean: 'Did you mean',
  perServingSuffix: ' per serving',
  accept: 'Accept',
  hard: 'Hard to read in the photo. Check against your pack.',
  second: 'Worth a second look. Compare with your pack.',
  grams: (unit: string) => `Grams unless shown. The per 100 ${unit} column is what’s saved.`,
  consistent: 'These numbers are consistent with each other.',
  fillMarked: 'Fill in the marked fields',
  saveFood: 'Save food',
  savedFoods: (barcode: boolean) => `Saved foods appear in search${barcode ? ' and open straight away next time you scan them, even offline' : ''}.`,
} as const

/* LabelCaptureView.tsx */
export const LABEL_TITLE = 'Scan the label'
export const CONSENT = 'Tilo doesn’t keep your photo. It’s sent to Anthropic, the AI service we use, only to read the numbers, and isn’t used to train its AI. You can check the numbers before anything is saved.'
export const GUIDANCE = 'Find good light. Lay the pack flat. Fill the frame with the nutrition table. Avoid glare and creases.'
export const FAIL_NOTE: Record<'offline' | 'unavailable' | 'no-session' | 'consent' | 'limit' | 'unreadable' | 'error', string> = {
  offline: 'Couldn’t read the photo without a connection, or it took too long.',
  unavailable: 'Photo reading isn’t available right now.',
  'no-session': 'Sign in again to read photos.',
  consent: 'Couldn’t confirm your OK to read photos yet. Try again in a moment.',
  limit: 'You’ve used today’s photo reads. They reset tomorrow.',
  unreadable: 'The photo couldn’t be read. A flatter, brighter shot often helps.',
  error: 'Couldn’t read the photo right now.',
}
export const LABEL_CAMERA_NOTE = {
  denied: 'Tilo can’t use the camera. That’s fine: choose a photo of the label instead.',
  none: 'No camera is available here. Choose a photo of the label instead.',
} as const
export const LABEL = {
  before: 'Before your first photo',
  nothingElse: 'Nothing else about you is sent.',
  ok: 'OK, take a photo',
  typeInstead: 'Type it in instead',
  reading: 'Reading the label…',
  table: 'Nutrition table',
  hardToRead: 'May be hard to read: ',
  ready: 'Ready to read',
  retake: 'Retake',
  front: 'Front of the pack',
  forName: 'For the name',
  remove: 'Remove',
  addFront: 'Add the front of the pack',
  addFrontSub: 'Optional, for the name',
  read: 'Read the label',
  readOnce: 'Your photo is read once, then Tilo doesn’t keep it.',
  fitFront: 'Fit the front of the pack in the frame, with the name clear.',
  starting: 'Starting the camera…',
  capture: 'Capture',
  captureAnyway: 'Capture anyway',
  looksGood: 'Looks good.',
  checking: 'Checking the picture…',
  unopenable: 'That photo couldn’t be opened. Try another.',
  choose: 'Choose a photo',
  chooseFrontSub: 'Of the front of the pack',
  choosePanelSub: 'Of the nutrition table, from your photos',
  chooseFrontAria: 'Choose a photo of the front of the pack',
  choosePanelAria: 'Choose a photo of the nutrition table',
  unusable: 'That photo couldn’t be used. Try again.',
  thenOff: ' The Open Food Facts figures are below: check them against your pack.',
  thenUnavailable: ' Type it in instead.',
  thenType: ' Type the numbers from the pack below.',
  tableAlt: 'Your photo of the nutrition table',
  frontAlt: 'Your photo of the front of the pack',
} as const

/* SharedProduct.tsx */
export const OPT_IN = {
  title: 'Add new products you scan to Tilo’s shared list?',
  body: 'We save the barcode, name and figures, never who added them. Because of that, we can’t remove one you added later. Turn this off any time in Profile, Privacy.',
  yes: 'Yes, share new products',
  no: 'Not now',
} as const
export const REPORT = {
  title: 'Report this product',
  what: 'What’s wrong?',
  send: 'Send',
  reasons: [
    ['figures', 'Figures don’t match the pack'],
    ['wrong', 'Wrong product'],
    ['name', 'Offensive or personal details in the name'],
    ['other', 'Something else'],
  ] as const,
} as const
export const REPORT_TOAST = {
  sent: 'Report sent. Thank you.',
  offline: 'Reporting needs a connection. Try again when you’re online.',
  error: 'Couldn’t send the report. Try again in a moment.',
} as const
export const ONE_SERVING = 'One serving'
export const SHARE_ROW = {
  title: 'Share this product',
  sub: 'Helps others who scan this barcode',
  offline: 'Needs a connection.',
} as const
export const IN_OFF = {
  title: 'Open Food Facts already has this product',
  body: 'Anyone who scans it gets it, so there’s nothing to share.',
  ok: 'OK',
} as const
export const SHARE_LABEL_NOTE = 'Open Food Facts doesn’t have this product. To share it, take a photo of the label.'
export const SHARE_CHECK = {
  share: 'Share',
  button: 'Share this product',
  what: 'Barcode, name and figures only, never who added them.',
  saved: (name: string) => `Your saved ${name} takes these figures too.`,
} as const
