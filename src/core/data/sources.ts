import type { Food } from '@/core/types'

/**
 * Where food values come from. A food's `src` is `"<key>"` or `"<key>:<code>"` (e.g.
 * `"cofid:19-539"`), so each row stays small and the full citation lives here once.
 * Add a source here before adding foods from it, and check its licence.
 *
 * Licences: CoFID contains public sector information licensed under the Open Government
 * Licence v3.0. Open Food Facts data is © Open Food Facts contributors, ODbL (we use an
 * insubstantial extract, attributed). Chain values are the chains' own published figures.
 */
export interface Source {
  label: string
  url: string
  /** minimum typical relative error for values from this source, when it's known to be wide */
  err?: number
}

/** UK menu calorie labels: 21% mean absolute error per item (bomb calorimetry of 295 items,
 *  Br J Nutr 2025, PMC12722009). See docs/plans/nutrition-accuracy-research.md §1.1. */
const MENU_ERR = 0.2

export const SOURCES: Record<string, Source> = {
  cofid: { label: 'UK CoFID 2021', url: 'https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid' },
  usda: { label: 'USDA FoodData Central (US data; carbs include fibre)', url: 'https://fdc.nal.usda.gov/' },
  label: { label: 'Pack label', url: '' },
  off: { label: 'Pack label via Open Food Facts', url: 'https://world.openfoodfacts.org/' },
  'subway-uk': { label: 'Subway UK, Sep 2026', url: 'https://www.subway.com/en-GB/MenuNutrition/Nutrition', err: MENU_ERR },
  'bk-gb': { label: 'Burger King UK, Sep 2026', url: 'https://www.burgerking.co.uk/', err: MENU_ERR },
  'nandos-uk': { label: 'Nando’s UK, Sep 2026', url: 'https://www.nandos.co.uk/food/menu', err: MENU_ERR },
  'greggs-uk': { label: 'Greggs UK, Sep 2026', url: 'https://www.greggs.com/nutrition', err: MENU_ERR },
  'popeyes-uk': { label: 'Popeyes UK, Sep 2026', url: 'https://popeyesuk.com/nutrition', err: MENU_ERR },
  'pizzahut-uk': { label: 'Pizza Hut Restaurants UK (dine-in), Jul 2026', url: '', err: MENU_ERR },
  'pizzaexpress-uk': { label: 'PizzaExpress UK (England, Wales & Scotland), Sep 2026', url: 'https://www.pizzaexpress.com/allergens-and-nutritionals', err: MENU_ERR },
  'kfc-uk': { label: 'KFC UK, Aug 2026', url: 'https://brand-uk.assets.kfc.co.uk/nutrition-allergens.pdf', err: MENU_ERR },
}

/** The source's minimum error for a food, or 0. */
export function sourceErr(f: Pick<Food, 'src' | 'id'>): number {
  return (!f.id && f.src && SOURCES[f.src.split(':')[0]]?.err) || 0
}

/** Human line for a food's source: "UK CoFID 2021 · 19-539", "Your label", or null if unchecked. */
export function sourceOf(f: Pick<Food, 'src' | 'id'>): { text: string; url: string } | null {
  if (f.id) return { text: 'Your label', url: '' }
  if (!f.src) return null
  const [key, code] = f.src.split(':')
  const s = SOURCES[key]
  if (!s) return null
  return { text: code ? `${s.label} · ${code}` : s.label, url: s.url }
}
