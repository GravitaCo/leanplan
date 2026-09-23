/**
 * Food search ranking. Pure TS so native can reuse it.
 *
 * - Words must match at the start of a word when any item allows it ("egg" shouldn't
 *   match every "Greggs" item when real egg foods exist).
 * - Each word scores its best occurrence: a whole-word match beats a prefix ("milk" →
 *   "Milk, whole" before "Milkshake"), and earlier in the name beats later.
 * - A plural with no word-start match is retried as the singular ("eggs" → "egg").
 * - Ties keep database order, which is curated (common foods first), instead of
 *   favouring short names.
 */

interface Hit { score: number; atStarts: boolean }

function isWordChar(ch: string | undefined): boolean {
  return !!ch && /[a-z0-9]/.test(ch)
}

function hit(name: string, words: string[]): Hit | null {
  const n = name.toLowerCase()
  let score = 0
  let atStarts = true
  for (const w of words) {
    let best: number | null = null
    let bestStart = false
    for (let i = n.indexOf(w); i >= 0; i = n.indexOf(w, i + 1)) {
      const start = !isWordChar(n[i - 1])
      const whole = start && !isWordChar(n[i + w.length])
      const s = i - (whole ? 20 : 0) + (start ? 0 : 100)
      if (best === null || s < best) { best = s; bestStart = start }
    }
    if (best === null) return null
    score += best
    atStarts &&= bestStart
  }
  return { score, atStarts }
}

/** Items whose `name` matches every word, best first. */
export function rankByName<T>(items: T[], name: (x: T) => string, words: string[]): T[] {
  const hits = items.map((x, i) => ({ x, i, h: hit(name(x), words) })).filter((o) => o.h !== null) as { x: T; i: number; h: Hit }[]
  const anyAtStarts = hits.some((o) => o.h.atStarts)
  // "eggs" with no word starting "eggs": try the singular before matching inside words ("Greggs")
  const singular = words.map((w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w))
  if (!anyAtStarts && singular.some((w, i) => w !== words[i])) {
    const alt = rankByName(items, name, singular)
    if (alt.length) return alt
  }
  return hits
    .filter((o) => !anyAtStarts || o.h.atStarts)
    .sort((a, b) => a.h.score - b.h.score || a.i - b.i)
    .map((o) => o.x)
}
