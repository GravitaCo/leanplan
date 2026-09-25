/**
 * Food search ranking. Pure TS so native can reuse it.
 *
 * - Matches at a word start rank first, then matches ending a word ("cheeseburger" for
 *   "burger"); matches inside a word ("egg" in "Greggs") only when nothing better exists.
 * - Each word scores its best occurrence: a whole-word match beats a prefix ("milk" →
 *   "Milk, whole" before "Milkshake"), and earlier in the name beats later.
 * - A plural also matches as its singular when that is a whole word ("eggs" → "Egg, whole").
 * - Ties keep database order, which is curated (common foods first), instead of
 *   favouring short names.
 */

/** How a word matched: 0 = at a word start ("Egg"), 1 = ending a word ("cheese|burger|",
 *  "straw|berries|"), 2 = inside a word ("gr|egg|s"). Tier 2 is only used when nothing better matches. */
interface Hit { tier: number; score: number; whole: boolean }

function isWordChar(ch: string | undefined): boolean {
  return !!ch && /[a-z0-9]/.test(ch)
}

/** Chain names that contain food words: matches inside them count less than the dish itself. */
const BRAND = /^(pizza hut|pizzaexpress|burger king|greggs|kfc|popeyes|nando's|subway|mcdonald's|domino's)\b/i

function hit(name: string, words: string[]): Hit | null {
  const n = name.toLowerCase()
  const brandEnd = n.match(BRAND)?.[0].length ?? 0
  let tier = 0, score = 0, whole = true
  for (const w of words) {
    let best: { t: number; s: number; whole: boolean } | null = null
    for (let i = n.indexOf(w); i >= 0; i = n.indexOf(w, i + 1)) {
      const atStart = !isWordChar(n[i - 1])
      const atEnd = !isWordChar(n[i + w.length])
      // ending a word inside the brand ("Gr|eggs|") is no better than mid-word
      const t = atStart ? 0 : atEnd && i >= brandEnd ? 1 : 2
      // a word found only inside the brand ("pizza" in "Pizza Hut Fries") ranks after real matches
      const sc = i - (atStart && atEnd ? 20 : 0) + (i < brandEnd ? 60 : 0)
      if (!best || t < best.t || (t === best.t && sc < best.s)) best = { t, s: sc, whole: atStart && atEnd }
    }
    if (!best) return null
    tier = Math.max(tier, best.t)
    score += best.s
    whole &&= best.whole
  }
  return { tier, score, whole }
}

/** Items whose `name` matches every word, best first. */
export function rankByName<T>(items: T[], name: (x: T) => string, words: string[]): T[] {
  // A plural also searches as its singular when the singular is a whole word somewhere
  // ("eggs" finds "Egg, whole" even though "Eggs Benedict" matches too), but not when it
  // isn't ("pea" only inside "pear": "peas" keeps "Chickpeas"). Each item keeps its better match.
  const singular = words.map((w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w))
  const alt = singular.some((w, i) => w !== words[i]) ? items.map((x) => hit(name(x), singular)) : null
  const useAlt = !!alt && alt.some((h) => h?.tier === 0 && h.whole)
  const better = (a: Hit | null, b: Hit | null) => (!a ? b : !b ? a : b.tier < a.tier || (b.tier === a.tier && b.score < a.score) ? b : a)
  const hits = items
    .map((x, i) => ({ x, i, h: useAlt ? better(hit(name(x), words), alt![i]) : hit(name(x), words) }))
    .filter((o) => o.h !== null) as { x: T; i: number; h: Hit }[]
  const useMid = !hits.some((o) => o.h.tier < 2)
  return hits
    .filter((o) => useMid || o.h.tier < 2)
    .sort((a, b) => a.h.tier - b.h.tier || a.h.score - b.h.score || a.i - b.i)
    .map((o) => o.x)
}
