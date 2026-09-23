import type { MacroTarget, Profile, ActivityLevel } from '@/core/types'

export const DEFAULT_TARGET: MacroTarget = { kcal: 1850, p: 150, c: 175, f: 60 }

export const DEFAULT_PROFILE: Profile = {
  name: '',
  sex: 'M',
  age: null,
  height: null,
  activityLevel: 'light',
  supplements: [],
  notificationsEnabled: false,
}

/** Activity multipliers for the Mifflin–St Jeor TDEE estimate. */
export const ACTIVITY: Record<ActivityLevel, { label: string; mult: number }> = {
  sedentary: { label: 'Sedentary (desk job, little exercise)', mult: 1.2 },
  light: { label: 'Lightly active (1–3 days/week)', mult: 1.375 },
  moderate: { label: 'Moderately active (3–5 days/week)', mult: 1.55 },
  active: { label: 'Very active (6–7 days/week)', mult: 1.725 },
}

/** MET values per cardio modality, used to estimate calories burned. */
/**
 * Cardio MET values from the 2024 Adult Compendium of Physical Activities (Herrmann et al. 2024,
 * pacompendium.com). Every key has its activity code in MET_SOURCES; `npm test` checks this.
 * Keys are stored in logs (`cardioType`), so never rename or remove one: retire it from
 * CARDIO_OPTIONS instead. Values are group means; copy always says "about".
 */
export const CARDIO_MET: Record<string, number> = {
  'Brisk walk': 4.8,
  Walk: 3.8,
  'Easy walk': 3.0,
  'Incline walk 1–5%': 5.3,
  'Incline walk 6–10%': 7.0,
  'Incline walk 11–20%': 8.8,
  'Stationary bike': 5.8,
  'Cross-trainer': 5.0,
  Rower: 5.0,
  Mobility: 2.3,
  Other: 3.0,
  // retired from the picker (split by grade above); kept so older logs still resolve
  'Incline treadmill': 5.0,
}

/** Where each CARDIO_MET value comes from: "code (MET) description" from the 2024 Compendium, or why there is none. */
export const MET_SOURCES: Record<string, string> = {
  'Brisk walk': '17200 (4.8) walking, 3.5–3.9 mph, level, brisk, firm surface, for exercise',
  Walk: '17190 (3.8) walking, 2.8–3.4 mph, level, moderate pace, firm surface',
  'Easy walk': '17170 (3.0) walking, 2.5 mph, firm, level surface',
  'Incline walk 1–5%': '17034 (5.3) climbing hills, no load, 1–5% grade, moderate to brisk (outdoor proxy for treadmill)',
  'Incline walk 6–10%': '17035 (7.0) climbing hills, no load, 6–10% grade, moderate to brisk (outdoor proxy for treadmill)',
  'Incline walk 11–20%': '17036 (8.8) climbing hills, no load, 11–20% grade, slow to moderate (outdoor proxy for treadmill)',
  'Stationary bike': '01218 (5.8) bicycling, stationary, 70–80 watts',
  'Cross-trainer': '02048 (5.0) elliptical trainer, moderate effort',
  Rower: '02071 (5.0) rowing, stationary ergometer, general, <100 watts, moderate effort',
  Mobility: '02101 (2.3) stretching, mild',
  Other: 'none: 3.0 MET is the lower edge of moderate intensity (2018 Physical Activity Guidelines for Americans), a stated floor',
  'Incline treadmill': '17032 (5.0) climbing hills, no load, 5–20% grade, very slow pace (legacy key)',
}

/** The cardio types offered in the picker, in display order. */
export const CARDIO_OPTIONS: string[] = [
  'Brisk walk', 'Walk', 'Easy walk', 'Incline walk 1–5%', 'Incline walk 6–10%', 'Incline walk 11–20%',
  'Stationary bike', 'Cross-trainer', 'Rower', 'Mobility', 'Other',
]

/**
 * The values shipped before the 2024 Compendium audit (workout plan D11). Only used for days
 * before profile.burnSwitch, so past ranges never move.
 */
export const LEGACY_CARDIO_MET: Record<string, number> = {
  Walk: 3.8,
  'Incline treadmill': 5.0,
  'Stationary bike': 5.5,
  'Cross-trainer': 5.5,
  Rower: 6.0,
  Other: 4.5,
}
