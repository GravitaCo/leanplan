/** Date helpers — all logging is keyed by a local `YYYY-MM-DD` string. */

export function ymd(t: Date): string {
  return (
    t.getFullYear() +
    '-' +
    String(t.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(t.getDate()).padStart(2, '0')
  )
}

export function todayStr(): string {
  return ymd(new Date())
}

export function parseYmd(d: string): Date {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day)
}

export function shiftDay(d: string, n: number): string {
  const t = parseYmd(d)
  t.setDate(t.getDate() + n)
  return ymd(t)
}

export const DAY_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
/** Monday-first initials for week strips and bars. */
export const DOW = 'MTWTFSS'
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function fmtDate(d: string): { dow: string; full: string; idx: number } {
  const t = parseYmd(d)
  return {
    dow: DAY_NAME[t.getDay()],
    full: t.getDate() + ' ' + MONTHS[t.getMonth()] + ' ' + t.getFullYear(),
    idx: t.getDay(),
  }
}

export function r0(x: number): number {
  return Math.round(x)
}

/** One decimal: what stored food values keep (finer than anything shown, no float noise in storage and sync). */
export function r1(x: number): number {
  return Math.round(x * 10) / 10
}

/** Whole number with thousands separators, e.g. 1,850. */
export function fmt(x: number): string {
  return Math.round(x || 0).toLocaleString('en-GB')
}
