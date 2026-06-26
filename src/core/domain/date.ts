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

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function fmtDate(d: string): { dow: string; full: string; idx: number } {
  const t = parseYmd(d)
  return {
    dow: DAYS[t.getDay()],
    full: t.getDate() + ' ' + MONTHS[t.getMonth()] + ' ' + t.getFullYear(),
    idx: t.getDay(),
  }
}

export function r0(x: number): number {
  return Math.round(x)
}

export function r1(x: number): number {
  return Math.round(x * 10) / 10
}
