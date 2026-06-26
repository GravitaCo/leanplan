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
export const CARDIO_MET: Record<string, number> = {
  Walk: 3.8,
  'Incline treadmill': 5.0,
  'Stationary bike': 5.5,
  'Cross-trainer': 5.5,
  Rower: 6.0,
  Other: 4.5,
}
