/**
 * The weekly review's pure helpers (boards ml-c4, ml-d1), React-free so the web's WeeklyReview and
 * the native app share them. Moved unchanged from review/WeeklyReview.tsx, which re-exports them.
 */

/** Review days, Monday first: [day number, initial, name]. */
export const DAYS: [number, string, string][] = [[1, 'M', 'Monday'], [2, 'T', 'Tuesday'], [3, 'W', 'Wednesday'], [4, 'T', 'Thursday'], [5, 'F', 'Friday'], [6, 'S', 'Saturday'], [0, 'S', 'Sunday']]
export const dayName = (d: number) => DAYS.find((x) => x[0] === d)![2]
