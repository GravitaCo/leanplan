/**
 * The words the shared design-system primitives print or announce, in one place for the web's
 * src/ui and the native app's apps/native/lib/ui. React-free. A screen's own words stay in its
 * area's copy file; these are only the ones a primitive brings with it.
 */
export const UI = {
  /** a sheet's default left button */
  cancel: 'Cancel',
  /** a picker sheet's keep button (native) */
  done: 'Done',
  /** BackButton's default label */
  back: 'Back',
  /** the profile button's label */
  profile: 'Profile',
  /** a Ruler or Wheel with nothing picked yet */
  notSet: 'Not set',
  /** DayNav */
  previousDay: 'Previous day',
  nextDay: 'Next day',
  today: 'Today',
  /** WeekStrip: a day with nothing scheduled */
  rest: 'Rest',
  /** MoveStrip's list label */
  thisWeek: 'This week',
  /** the tab bar's label, its tabs, and the Mind tab while Mind is switched off */
  main: 'Main',
  tabs: { today: 'Summary', mind: 'Mind', food: 'Food', train: 'Train', plan: 'Plan', profile: 'Profile' },
  mindOff: 'Mind, switched off in Profile',
  /** MacroTrio's columns */
  protein: 'Protein',
  carbs: 'Carbs',
  fat: 'Fat',
} as const
