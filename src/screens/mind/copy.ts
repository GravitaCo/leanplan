/**
 * Every user-facing string on the Mind tab (wellbeing copy deck v2, ids cited; boards B5 and B6).
 * Skill and one-thing wording lives in core/data/skills.ts. All of it is linted with
 * mindCopyIssues (scripts/wellbeing/mind-page.ts). Later packages add their own blocks here
 * (B4, B7, B8, B9, B10, B11) under a heading with their package number.
 */

/** S.1 and S.2: the shared support row and the wellness line (deck 0.3). */
export const SHARED = {
  /** S.1, the quiet support row; opens the Support sheet. Never red, never a tint fill. */
  support: 'Need support now?',
  /** S.2, the wellness line at the foot of the Mind page */
  wellness: 'For everyday wellbeing. Not a treatment for any condition.',
}

/** WP6: the Mind page (board B5, as the Mind tab root: Benn, 8 Oct 2026). */
export const MIND = {
  /** B5.2 */
  title: 'Mind',
  /** B5.4 */
  today: 'Today',
  /** B5.5 labels (the values are insights.ts's MOODS, SLEEP, STRESS, ENERGY) */
  mood: 'Mood',
  sleep: 'Sleep',
  stress: 'Stress',
  energy: 'Energy',
  /** B5.6 */
  update: 'Update',
  /** before today's check-in (not drawn on B5; the Summary card's lines, deck B2.8 to B2.10) */
  askTitle: 'How are you today?',
  askSub: 'Mood, sleep, stress and energy · 20 seconds',
  checkIn: 'Check in',
  /** B5.7 */
  skills: 'Skills',
  /** B5.17, B5.18 */
  plans: 'If–then plans',
  plansWhere: 'On Plan',
}

/** WP6: the Support sheet in the Mind context (board B6 frame 1). Lead and nation line are SUPPORT's. */
export const SUPPORT_MIND = {
  /** B6.7 */
  notCrisis: 'Tali isn’t a crisis service and doesn’t monitor what you write. If you or someone else is in danger now, call 999.',
  /** B6.8: true only while opening the sheet is never recorded, counted or synced (tested) */
  foot: 'Opening this page is private. Tali doesn’t record it or tell anyone. Calls to these numbers are free. Texting Shout is free from the main UK networks.',
  /** register item 44: the nation line before a nation is picked ("Showing services for the whole UK") */
  anyNation: 'the whole UK',
  /** register item 44: Northern Ireland's GP row (no NHS 111 there; nidirect "GP out of hours
   *  service", checked 10 Oct 2026: a local number per area, so no number here) */
  gpOutOfHours: 'Medical help when it isn’t an emergency. Out of hours, call the GP out-of-hours service for your area.',
}

/** WP13: Unload (board B8, canvas wp-b8-light, wp-b8-dark, wp-b8-more). Cancel and Done (B8.2)
 *  are the sheet's usual buttons. */
export const UNLOAD = {
  /** B8.1 */
  title: 'Unload',
  /** B8.3 */
  lead: "Write what's on your mind, and one next step for each.",
  /** B8.4, B8.5 */
  mind: 'On my mind',
  mindHint: "Whatever's taking up room",
  /** B8.6, B8.7 */
  next: 'Next step',
  nextHint: "Optional. One small thing, or 'nothing for now'",
  /** B8.8 */
  addAnother: 'Add another',
  /** B8.9, B8.10 */
  wentOk: 'One thing that went OK today',
  wentOkHint: 'Optional',
  /** B8.11 (final, mental-performance with compliance). "only" is banned elsewhere: this exact
   *  string is in COPY_ALLOWED (why.ts). */
  local: "Your notes stay on this device only. They aren't synced or sent anywhere, so if you remove Tali or clear this device's data, they're gone.",
  /** B8.12, with "support is here" linked to the Support sheet */
  notRead: "Tali doesn't read your notes. If you're struggling, support is here.",
  notReadLead: "Tali doesn't read your notes. If you're struggling, ",
  notReadLink: 'support is here',
  /** B8.13 */
  notCrisis: "Tali isn't a crisis service. In an emergency, call 999.",
  /** B8.14, the toast after Done */
  saved: 'Saved on this device',
  /** B8.15, B8.16 */
  earlier: 'Earlier notes',
  delete: 'Delete',
  /** the Earlier notes list: a next step after its thought (board wp-b8-more) */
  nextPrefix: 'Next step: ',
}

/**
 * WP11: the weekly reflection on the Mind page (boards B4, B5.16). The lines, the B4.7 line and
 * the observation come from core/domain/mind.ts (reflectionLines, REFLECTION_LATER, observation).
 */
export const REFLECTION = {
  /** B5.16, the section label (the card's own B4.1 heading is dropped under it) */
  title: 'Your week',
  /** B4.15 */
  seeWeek: 'See your whole week',
}

/** Every string above, for the copy lint. */
/** WP15: the low-mood signpost on Summary (board B6 frame 2, canvas wp-b6-more). Its line is
 *  core/domain/mind LOW_MOOD_LINE_ANY_NATION (B6.10, on the banner for every nation); lowMoodLine(nation)
 *  keeps B6.9, B6.10 Northern Ireland and B6.11 Scotland for when a nation is stored. B6.14 is not
 *  shown (held for the clinician review). */
export const LOW_MOOD = {
  /** B6.12, opens the Support sheet */
  seeSupport: 'See support',
  /** B6.13 */
  dismiss: 'Dismiss',
}

/**
 * B12: Wind down (canvas wp-b12-light, wp-b12-dark; approved by Benn, 10 Oct 2026). Verbatim from
 * new-copy-b11b-b13.md, its FINAL section winning. The title and sub are the skill's own (skills.ts),
 * and so are the routine rows (WIND_DOWN_ITEMS). Left off on purpose: the plan's alcohol note (a
 * mechanism claim) and "Stop any time" (nothing runs here).
 */
export const WIND_DOWN = {
  routine: 'Your routine',
  /** the label's right side, "From 22:30"; left out with no wind-down time set */
  from: (t: string) => `From ${t}`,
  change: 'Change your routine',
  anyOrder: 'Do as much or as little as you like, in any order.',
  /** FINAL (mental-performance, compliance): NHS wording, months or affecting daily life */
  gp: "If sleep has been hard going for a while, or it's making everyday life hard, it's worth talking to a GP.",
  /** the sheet */
  sheetTitle: 'Your routine',
  sheetLead: "Pick what you'd like in your evening. Change it any time.",
  timeLine: (t: string) => `Your wind-down time is ${t}. You can change it in Profile, under Notifications.`,
  /** with no wind-down time set, instead of a default (FINAL); opens Profile › Notifications */
  setTime: 'Set a wind-down time',
}

/** B13: Get outside (canvas wp-b13-light, wp-b13-dark; approved by Benn, 10 Oct 2026). Move tokens. */
export const OUTSIDE = {
  lead: 'Some time outdoors, in whatever way suits you: an easy walk, somewhere green to sit, or a few minutes in daylight.',
  walkHeading: "If you'd like a walk",
  /** the row (the Easy walk's own prescription, core/data/workouts.ts SWAPS.walk); Start logs it on Train */
  walk: 'Easy walk',
  walkTime: '10–20 min',
  start: 'Start',
  walkFoot: "Walk at a relaxed pace, one where you could chat in full sentences. Stop whenever you've had enough.",
}

export function mindPageCopy(): string[] {
  return [...Object.values(SHARED), ...Object.values(MIND), ...Object.values(SUPPORT_MIND), ...Object.values(UNLOAD), ...Object.values(REFLECTION), ...Object.values(LOW_MOOD),
    ...Object.values(WIND_DOWN).map((v) => (typeof v === 'function' ? v('22:30') : v)), ...Object.values(OUTSIDE)]
}
