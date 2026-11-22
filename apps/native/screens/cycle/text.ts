/**
 * Cycle's words (native only: Benn, 16 Nov 2026), verbatim from the approved boards on the master
 * Design canvas, page "Cycle v1 (draft for Benn)" (Benn, 22 Nov 2026), with Sara's 22 Nov answers
 * (docs/design/cycle-v1/README.md is the extracted spec). Change a word only with a board change.
 * Never "for women", never a phase, a forecast or a condition name (docs/plans/cycle.md §5.4).
 */
import type { CycleChip, CycleFlow, CycleSetup } from '@/core/domain/cycle'

export const CY = {
  row: 'Your cycle',
  on: 'On',
  off: 'Off',

  /* A2 */
  offer: {
    back: 'Profile',
    title: 'Your cycle',
    lead: "Log your period and how it feels, if you'd like to. On a painful day, Tilo can offer a lighter session.",
    willH: 'What Tilo will do',
    will: [
      'Ask "Period today?" in your check-in around your period. If your periods are regular, Tilo uses the starts you\'ve logged to bring the question back a few days early. Skip it whenever you like.',
      'Show which day of your period it is, counted from what you log.',
      'Offer a lighter session on a painful day, if you want one.',
      'Point you to the NHS or a GP if something is worth checking.',
    ],
    wontH: "What Tilo won't do",
    wont: [
      'Show you a date for your next period, or predict fertile days.',
      "Name phases, or tell you how you'll feel.",
      'Change your food targets.',
      'Put your log in a notification, or share it with anyone.',
    ],
    foot: 'Off until you turn it on. Nothing is kept from this page.',
    setUp: 'Set it up',
    notNow: 'Not now',
    none: "I don't have periods",
  },

  /* A3 */
  closed: {
    title: 'Got it',
    body: "Your cycle won't show in Profile any more. Tilo hasn't kept a reason.",
    done: 'Done',
    foot: "Changed your mind? It's in Profile, then Privacy.",
  },

  /* B1 */
  consent: {
    title: 'Before you turn it on',
    sub: "What you log in Your cycle, like bleeding, period pain and symptoms, and your answer about your periods, is health information. It stays on this phone. It isn't synced to your account, sold, shared or used for ads.",
    box: {
      before: 'I agree to Tilo storing and using my period and symptom log, and my answer about my periods, on this phone to run Your cycle for me, as the ',
      link: 'privacy policy',
      after: ' explains. This can show things about my sexual and reproductive health. I can turn it off any time in Profile, then Your cycle, and the log is deleted.',
    },
    cont: 'Continue',
    notNow: 'Not now',
    foot: "Your account keeps only the fact that you agreed, and when, so there's a record you said yes.",
  },

  /* B2 */
  question: {
    back: 'Back',
    eyebrow: 'Your cycle',
    title: 'Which fits you best?',
    lead: 'You can change this any time.',
    cont: 'Continue',
  },

  /* B3 */
  works: {
    eyebrow: 'Your cycle',
    title: "Here's how it works",
    chose: 'You chose',
    change: 'Change',
    phoneH: 'On this phone only',
    phone: [
      "Your cycle log stays on this phone. It isn't synced to your account or backed up by Tilo, so if this phone is lost, wiped or replaced, the log goes with it unless you've exported a copy.",
      'Signing out keeps it on this phone. Choosing Remove from this device when you sign out deletes it.',
    ],
    turnOn: 'Turn on Your cycle',
  },

  /* C1, C2 */
  checkin: {
    group: 'Cycle',
    row: 'Period today?',
    flow: 'Menstrual flow',
    pain: 'Pain',
    chips: 'Anything else?',
    foot: 'Kept on this phone only. Skip anything.',
  },

  /* D1, D1g, D2 */
  page: {
    back: 'Profile',
    title: 'Your cycle',
    day: (n: number) => `Day ${n} of your period`,
    dayFoot: "Counted from what you've logged.",
    gentle: 'Your period',
    gentleStarted: (when: string) => `Started ${when}, going by what you've logged.`,
    none: 'Nothing logged today',
    noneFoot: 'When a period starts, log the first day here or in your check-in.',
    started: 'Period started',
    recent: 'Recent days',
    today: 'Today',
    yesterday: 'Yesterday',
    empty: 'Nothing logged in the last two weeks.',
    addPast: 'Add or change a past day',
    help: 'When to get help',
    settings: 'Settings',
    fits: 'Which fits you best',
    export: 'Export my cycle log',
    foot: "Your cycle log is only on this phone. Export a copy now and then. The file isn't encrypted, so keep it somewhere private.",
    delete: 'Delete all cycle data',
  },

  /* D3 */
  log: {
    title: 'Log a day',
    day: 'Day',
    clear: 'Clear this day',
    foot: 'Fill in a day you missed, or fix one. Skip anything.',
  },

  /* D4 */
  help: {
    back: 'Your cycle',
    title: 'When to get help',
    lead: "Tilo logs what you tell it. It can't check your cycle, so these are worth knowing.",
    rows: [
      ['Bleeding between periods, or after sex', 'See your GP.'],
      ['Feeling faint or breathless with heavy bleeding', 'Call NHS 111. In Scotland, NHS 24 on 111. In Northern Ireland, contact your GP.'],
      ["Periods that stop, if that's new for you", "It's worth mentioning to a GP. Periods can stop for lots of reasons, including eating less than your body needs, a lot of training or stress."],
      ['Sudden, severe pain', "Call NHS 111, or 999 if it's an emergency."],
    ] as [string, string][],
    nhs111: ['NHS 111', "Medical help when it isn't an emergency · 24 hours", '111'] as const,
    emergency: ['Emergency services', 'If you or someone else is in danger now', '999'] as const,
    foot: 'Heavy periods and period pain that get in the way of things are worth raising with a GP too.',
    heavyLink: 'NHS: heavy periods',
    painLink: 'NHS: period pain',
    support: { before: "If you're struggling, ", link: 'support is here', after: '.' },
  },

  /* D5 */
  del: {
    title: 'Delete all cycle data?',
    body: 'Your period and symptom log, and your answer to "Which fits you best", are deleted from this phone, and Your cycle turns off. This can\'t be undone.',
    export: 'Export a copy first',
    confirm: 'Delete all cycle data',
    cancel: 'Cancel',
  },

  /* D6 and Sara's 22 Nov Privacy row */
  privacy: {
    line: 'Your cycle log is only on this phone.',
    delete: 'Delete all cycle data',
  },

  /* G1, G2 */
  prompt: {
    usualOpener: "You know what's usual for your periods. ",
    longBleed: 'If this is new for you, bleeding that lasts more than a week is worth mentioning to a GP.',
    heavy: "If they've got heavier, or they're getting in the way of things, they're worth raising with a GP.",
    pain: "If the pain is worse than usual, or stops you doing things, it's worth raising with a GP. You don't have to put up with it.",
    usual: 'This is usual for me',
    toast: "Got it. Tilo won't show this again unless things change. 'When to get help' is in Cycle settings.",
  },

  /* G4, G5 */
  gap: {
    ask: "You haven't logged a period for a while. Has a period come that isn't logged?",
    yes: 'Yes, add it',
    no: 'No',
    title: 'Thanks for letting us know',
    body: 'Periods can stop for lots of reasons, including eating less than your body needs or stress. Pregnancy is another. A GP can help you find out why.',
    deficit: "Until a period is logged, Tilo won't suggest eating less. You can still set your own target in Profile.",
    gp: ['Your GP', 'Surgery hours'] as const,
    beat: ['Beat', 'Eating disorder support · 3pm–8pm, Monday to Friday', '0808 801 0677'] as const,
    done: 'Done',
  },

  /* E1 (Train) */
  lighter: 'A lighter session is here if you want it.',
} as const

/** B2's options, in order. */
export const SETUP_OPTS: [CycleSetup, string][] = [
  ['regular', 'Periods, usually regular'],
  ['irregular', 'Irregular or unpredictable periods'],
  ['perimenopause', 'Periods changing with age (perimenopause)'],
  ['stop-skip', 'My periods often stop or skip'],
  ['none', "I don't have periods"],
  ['unsaid', 'Prefer not to say'],
]

export const setupLabel = (s: CycleSetup | undefined): string => SETUP_OPTS.find(([k]) => k === s)?.[1] ?? ''

/** B3b: the line under "You chose" for each answer ('none' has no B3 screen). */
export const SETUP_LINE: Record<Exclude<CycleSetup, 'none'>, string> = {
  regular: 'Tilo counts the days of a period from what you log, never from a calendar. If you keep checking in and no period is logged for about 3 months, Tilo will ask if one came.',
  irregular: 'Nothing here depends on a regular cycle. Log days as they come. If you keep checking in and no period is logged for about 6 months, Tilo will ask if one came.',
  perimenopause: "Periods can change a lot at this stage. Log what happens, when it happens. Tilo won't guess what comes next, and won't ask about gaps between periods.",
  'stop-skip': "Bleeding can be lighter, come at odd times or stop for a while. Log what happens, if anything. Tilo won't ask about gaps, so if your periods stop and that's new for you, it's worth mentioning to a GP.",
  unsaid: "That's fine. Log what happens. If you keep checking in and no period is logged for about 3 months, Tilo will ask if one came.",
}

export const FLOW_LABELS: [CycleFlow, string][] = [['stopped', 'Stopped'], ['spotting', 'Spotting'], ['light', 'Light'], ['medium', 'Medium'], ['heavy', 'Heavy']]
export const PAIN_LABELS = ['No pain', 'A bit', 'A lot'] as const
export const CHIP_LABELS: [CycleChip, string][] = [['cramps', 'Cramps'], ['bloating', 'Bloating'], ['headache', 'Headache'], ['breast-tenderness', 'Breast tenderness'], ['upset-stomach', 'Upset stomach']]

/** "Light · A bit of pain · Cramps" (D1's recent rows). */
export function dayLine(d: { flow?: CycleFlow; pain?: 1 | 2 | 3; chips?: CycleChip[] }): string {
  const parts: string[] = []
  if (d.flow) parts.push(FLOW_LABELS.find(([k]) => k === d.flow)![1])
  if (d.pain) parts.push(d.pain === 1 ? 'No pain' : d.pain === 2 ? 'A bit of pain' : 'A lot of pain')
  for (const c of d.chips ?? []) parts.push(CHIP_LABELS.find(([k]) => k === c)![1])
  return parts.join(' · ')
}

/** NHS pages (not given on the board; both checked live on 22 Nov 2026; re-check before beta with the rest). */
export const NHS = {
  heavy: 'https://www.nhs.uk/conditions/heavy-periods/',
  pain: 'https://www.nhs.uk/conditions/period-pain/',
}
