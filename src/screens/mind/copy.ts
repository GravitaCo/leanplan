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
}

/** Every string above, for the copy lint. */
export function mindPageCopy(): string[] {
  return [...Object.values(SHARED), ...Object.values(MIND), ...Object.values(SUPPORT_MIND)]
}
