/**
 * Food search ranking. Pure TS so native can reuse it. With chain menus in the database,
 * plain substring order buries the obvious match ("greggs sausage" → the sausage roll), so
 * results are ranked: the exact phrase first, then words matched at the start of a word,
 * earlier in the name, and shorter (simpler) names.
 */

/** Lower is better; null = doesn't match every word. */
export function searchScore(name: string, words: string[]): number | null {
  const n = name.toLowerCase()
  let score = 0
  for (const w of words) {
    const i = n.indexOf(w)
    if (i < 0) return null
    const wordStart = i === 0 || !/[a-z0-9]/.test(n[i - 1])
    score += i + (wordStart ? 0 : 40)
  }
  if (words.length > 1 && n.includes(words.join(' '))) score -= 30
  return score + n.length * 0.5
}

/** Items whose `name` matches every word, best first. */
export function rankByName<T>(items: T[], name: (x: T) => string, words: string[]): T[] {
  return items
    .map((x) => ({ x, s: searchScore(name(x), words) }))
    .filter((o): o is { x: T; s: number } => o.s !== null)
    .sort((a, b) => a.s - b.s)
    .map((o) => o.x)
}
