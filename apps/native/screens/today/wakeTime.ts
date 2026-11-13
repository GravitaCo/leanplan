/**
 * The check-in's wake time typed into a text field (until N1's TimePicker), read the way the web's
 * time field would hold it: "7" 07:00, "730" 07:30, "0730" and "7:30" 07:30, "1230" 12:30,
 * "123" 01:23. Anything else comes back unchanged, so nightPatch leaves it out. No imports, so
 * Node tests it directly (scripts/test-today.mjs).
 */
export function normTime(v: string): string {
  const x = v.trim()
  let h: number, m: number
  const colon = x.match(/^(\d{1,2}):(\d{1,2})$/)
  if (colon) { h = +colon[1]; m = +colon[2] }
  else if (/^\d{1,2}$/.test(x)) { h = +x; m = 0 }
  else if (/^\d{3,4}$/.test(x)) { h = +x.slice(0, x.length - 2); m = +x.slice(-2) }
  else return v
  if (h > 23 || m > 59) return v
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
