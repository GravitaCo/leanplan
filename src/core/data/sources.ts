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
  /** a named dish estimated from the closest CoFID dish: no published figure (ref) exists */
  estimate?: true
  /** lab values per 100 g with a wide margin: there is no per-portion published figure (ref) */
  perHundred?: true
}

/** UK menu calorie labels: 21% mean absolute error per item (bomb calorimetry of 295 items,
 *  Br J Nutr 2025, PMC12722009). See docs/plans/nutrition-accuracy-research.md §1.1. */
const MENU_ERR = 0.2

export const SOURCES: Record<string, Source> = {
  cofid: { label: 'UK CoFID 2021', url: 'https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid' },
  // the same CoFID rows, for dishes CoFID sampled from UK takeaways: ±30% for how much takeaway
  // recipes and portions vary (nutrition-accuracy, Oct 2026). Audited like `cofid`.
  'cofid-takeaway': { label: 'UK CoFID 2021 (takeaway samples)', url: 'https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid', err: 0.3, perHundred: true },
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
  'toby-uk': { label: 'Toby Carvery UK, Oct 2026', url: 'https://allergens.mbplc.io/AllergenGuideTobyEstate.html', err: MENU_ERR },
  // Restaurants that publish no nutrition (Benn, Oct 2026): each dish carries the closest UK
  // CoFID dish's values (lab-tested or recipe-calculated) (`est-cofid:<CoFID code>`) and a typical portion from published
  // takeaway surveys. Never the restaurant's own figures; ±40% (nutrition-accuracy, Oct 2026).
  'est-cofid': { label: 'Estimated from the closest UK dish in CoFID 2021, not the restaurant’s own figures', url: 'https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid', err: 0.4, estimate: true },
  // whole takeaway meals bought from independent UK takeaways and lab-analysed (energy, protein,
  // carbohydrate, fat per 100 g, medians): Jaworowska et al. 2014, Nutr Food Sci 44(5):414-430,
  // doi:10.1108/NFS-08-2013-0093; full tables in Blackham T (2022) PhD thesis, Liverpool John
  // Moores University, Appendix Tables 8.3, 8.5, 8.6. Per-100 values with a wide margin, like
  // `cofid-takeaway` (±30%): no per-portion figure (ref) applies. Audited in docs/data like CoFID.
  'takeaway-lab': { label: 'UK lab analysis of takeaway meals (Liverpool, Wirral and Knowsley; Jaworowska et al. 2014)', url: 'https://researchonline.ljmu.ac.uk/id/eprint/20540/', err: 0.3, perHundred: true },
  'slims-uk': { label: 'Slim Chickens UK, Oct 2026', url: 'https://menus.tenkites.com/brg/slimscore', err: MENU_ERR },
  'kfc-uk': { label: 'KFC UK, Aug 2026', url: 'https://brand-uk.assets.kfc.co.uk/nutrition-allergens.pdf', err: MENU_ERR },
  // Autumn 2026 booklets (food v17/08/26, beverages v18/09/26); the PDF links change each season
  'starbucks-uk': { label: 'Starbucks UK, Sep 2026', url: 'https://www.starbucks.co.uk/nutrition', err: MENU_ERR },
  'nero-uk': { label: 'Caffè Nero UK, Sep 2026', url: 'https://caffenerowebsite.blob.core.windows.net/production/data/menus/caffenero_nutrition_allergens-en_GB.pdf', err: MENU_ERR },
  'pret-uk': { label: 'Pret A Manger UK, Oct 2026', url: 'https://www.pret.co.uk/en-GB/products', err: MENU_ERR },
  'costa-uk': { label: 'Costa Coffee UK in-store allergen & nutrition guide, Autumn 2026', url: 'https://www.costa.co.uk/nutrition', err: MENU_ERR },
}

/** Chain menus: sources whose values are a restaurant's published per-item figures. */
export function isMenuSource(src: string | undefined): boolean {
  return !!src && SOURCES[src.split(':')[0]]?.err === MENU_ERR
}

/** A custom food saved from a barcode scan (values read from Open Food Facts, then confirmed). */
const isScanned = (f: Pick<Food, 'src' | 'id'>) => !!f.id && !!f.src && f.src.split(':')[0] === 'off'

/** The source's minimum error for a food, or 0. A scanned food is the user's own pack, checked
 *  line by line before saving, so it gets the same margin as a label typed in (Benn, Sept 2026:
 *  the pack is the most accurate information we have). */
export function sourceErr(f: Pick<Food, 'src' | 'id'>): number {
  if (isScanned(f)) return 0
  return (!f.id && f.src && SOURCES[f.src.split(':')[0]]?.err) || 0
}

/** Human line for a food's source: "UK CoFID 2021 · 19-539", "Your label", or null if unchecked.
 *  A scanned food keeps its Open Food Facts line (with the barcode), like built-in OFF foods. */
export function sourceOf(f: Pick<Food, 'src' | 'id'>): { text: string; url: string } | null {
  if (f.id && !isScanned(f)) return { text: 'Your label', url: '' }
  // checked line by line against the user's own pack: credit that, not the crowdsourced record
  if (isScanned(f)) return { text: `Your pack label (found via Open Food Facts) · ${f.src!.split(':')[1] ?? ''}`.replace(/ · $/, ''), url: SOURCES.off.url }
  if (!f.src) return null
  const [key, code] = f.src.split(':')
  const s = SOURCES[key]
  if (!s) return null
  return { text: code ? `${s.label} · ${code}` : s.label, url: s.url }
}
