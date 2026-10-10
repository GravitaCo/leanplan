import type { Food, FoodCategory } from '@/core/types'

/**
 * Other common UK takeaways: fish and chip shop, kebab shop, pizza takeaway, burger and chicken
 * shop, Thai. Generic dishes with plain names, never any restaurant's own figures (the chains
 * have their own menus elsewhere).
 *
 * Values, per 100 g, in this order of preference:
 * - `cofid-takeaway:<code>`: the CoFID 2021 row exactly, for a dish CoFID sampled from UK
 *   takeaways (fish and chip shops, kebab shops, Thai restaurants). ±30%.
 * - `takeaway-lab:<paper>`: a whole takeaway meal lab-analysed in a UK survey, per 100 g as the
 *   paper gives it (median). ±30%, shown as an estimate.
 *   [J14] Jaworowska A, Blackham T, Long R, et al. (2014) Nutritional composition of takeaway
 *   food in the UK. Nutr Food Sci 44(5):414-430, doi:10.1108/NFS-08-2013-0093. 489 meals from
 *   274 independent takeaways in Liverpool, Wirral and Knowsley, analysed by Eurofins. Table 1
 *   (per 100 g, median) and Table 2 (portion as sold, median g). The same data are reprinted in
 *   Blackham T (2022), LJMU PhD thesis, Appendix 4.0-4.1.
 * - `est-cofid:<code>`: a common dish CoFID doesn't have, carrying the closest CoFID dish's values
 *   exactly (±40%, labelled as an estimate). The reason for each match is noted.
 * - `est-cofid:<code>+<code>+…`: a composite (a kebab, a burrito), the weighted sum of its CoFID
 *   components (±40%, an estimate). See COMPOSITES; check:foods recomputes each from its audit record.
 * Every CoFID value was checked against the CoFID 2021 workbook, sheet "1.3 Proximates" (Oct 2026).
 *
 * Portions (`g`), from a published weight where one exists, else marked ASSUMPTION:
 * - [J14] Table 2 median portion of the whole meal as sold.
 * - [JF25] Jaworowska A, Force S (2025) Int J Environ Res Public Health 22(1):121,
 *   PMC11764605, Table 1, "standard" London takeaways, median portion: beef burger 207 g.
 * - [SF] Seafish, NFFF and AHDB Potatoes, proposed standard fish and chip portion sizes
 *   (M Drummond, Towngate Fisheries, 2016 industry presentation): fish after battering and
 *   frying small 98.8 g, regular 197.5 g, large 296.3 g; chips small 142 g, regular 284 g,
 *   large 425 g. These are the industry's recommended sizes; its own survey found the average
 *   cod and chips was 660 g, and [J14] measured 749 g, so many shops serve more.
 * - [SP] safefood (2012) Pizza: what's in that box? Nutrition takeout series. 240 takeaway
 *   12-inch pizzas (island of Ireland) averaged 512 g, used as 510 g (at 512 g a pepperoni lands
 *   on half a kcal and the screen would round differently from the data). 10-inch and 14-inch
 *   weights are scaled from it by area (same thickness assumed): 510 × 100/144 = 354 g and
 *   510 × 196/144 = 694 g.
 */

const LAB = 'takeaway-lab:Jaworowska 2014'

function dish(n: string, k: number, p: number, c: number, f: number, g: number, src: string, cat: FoodCategory = 'fastfood'): Food {
  return { n, k, p, c, f, g, cat, src, eat: true }
}

/**
 * CoFID 2021 per-100 g values for the components of composite dishes, copied exactly (checked
 * against the workbook, sheet "1.3 Proximates", Oct 2026; "Tr" as 0). Exported so check:foods can
 * recompute each composite from its audit record.
 */
export const COMPONENTS: Record<string, { name: string; k: number; p: number; c: number; f: number }> = {
  '19-539': { name: 'Doner kebabs, meat only (20 takeaway samples)', k: 377, p: 23.5, c: 0, f: 31.4 },
  '19-150': { name: 'Shish kebab, meat only (20 takeaway samples)', k: 206, p: 29.0, c: 0, f: 10.0 },
  '18-323': { name: 'Chicken, breast, grilled without skin, meat only', k: 148, p: 32.0, c: 0, f: 2.2 },
  '18-551': { name: 'Pork, shoulder steaks (collar), grilled, lean and fat', k: 292, p: 29.2, c: 0, f: 19.5 },
  '16-389': { name: 'Prawns, king, purchased cooked', k: 68, p: 16.2, c: 0, f: 0.4 },
  '13-485': { name: 'Potato chips, from takeaway fish and chip shops', k: 214, p: 3.5, c: 33.2, f: 8.4 },
  '11-974': { name: 'Bread, pitta, white', k: 255, p: 9.1, c: 55.1, f: 1.3 },
  '11-973': { name: 'Bread, naan, retail', k: 285, p: 7.8, c: 50.2, f: 7.3 },
  '11-1006': { name: 'Bread rolls, white, soft', k: 254, p: 9.3, c: 51.5, f: 2.6 },
  '11-925': { name: 'Tortilla, wheat, soft', k: 285, p: 7.8, c: 53.9, f: 5.7 },
  '11-937': { name: 'Bread, garlic and herb, retail', k: 348, p: 7.0, c: 45.1, f: 16.7 },
  '17-644': { name: 'Tortilla chips fried in sunflower oil', k: 504, p: 7.2, c: 60.8, f: 27.4 },
  '11-862': { name: 'Rice, white, long grain, boiled', k: 131, p: 2.8, c: 31.1, f: 0.4 },
  '13-660': { name: 'Beans, red kidney, canned, re-heated, drained', k: 100, p: 8.6, c: 15.1, f: 1.0 },
  '15-795': { name: 'Falafel, fried in rapeseed oil, homemade', k: 183, p: 6.4, c: 15.9, f: 11.2 },
  '12-346': { name: 'Cheese, Cheddar, English', k: 416, p: 25.4, c: 0.1, f: 34.9 },
  '12-360': { name: 'Cheese, Mozzarella, fresh', k: 257, p: 18.6, c: 0, f: 20.3 },
  '17-685': { name: 'Butter, salted', k: 744, p: 0.6, c: 0.6, f: 82.2 },
  '15-648': { name: 'Salad, green (lettuce, cucumber, pepper, celery)', k: 13, p: 1.0, c: 1.6, f: 0.4 },
  '13-520': { name: 'Lettuce, average, raw', k: 11, p: 1.2, c: 1.4, f: 0.1 },
  '13-517': { name: 'Tomatoes, standard, raw', k: 14, p: 0.5, c: 3.0, f: 0.1 },
  '13-499': { name: 'Onions, raw', k: 35, p: 1.0, c: 8.0, f: 0.1 },
  '13-316': { name: 'Peppers, capsicum, chilli, green, raw', k: 20, p: 2.9, c: 0.7, f: 0.6 },
  '13-505': { name: 'Mushrooms, white, raw', k: 7, p: 1.0, c: 0.3, f: 0.2 },
  '17-654': { name: 'Mayonnaise, standard, retail (as garlic sauce)', k: 686, p: 1.1, c: 2.4, f: 74.8 },
  '17-719': { name: 'Chilli sauce', k: 40, p: 1.3, c: 7.3, f: 0.8 },
  '17-705': { name: 'Barbecue sauce', k: 140, p: 1.0, c: 36.1, f: 0.1 },
  '13-556': { name: 'Houmous', k: 307, p: 6.8, c: 10.5, f: 26.7 },
  '12-547': { name: 'Tzatziki', k: 76, p: 3.4, c: 3.4, f: 5.5 },
  '17-681': { name: 'Stock, chicken, ready made, retail', k: 12, p: 2.3, c: 0.2, f: 0.2 },
  '14-889': { name: 'Coconut milk, retail', k: 169, p: 1.1, c: 3.3, f: 16.9 },
}

/** Per-100 g values of a dish made of `parts` ([CoFID code, grams]): the weighted sum of the
 *  components, kcal whole and macros to 0.1 g. Pure sum-of-parts; nothing else is added. */
export function compose(parts: [string, number][]): { k: number; p: number; c: number; f: number; g: number } {
  const g = parts.reduce((s, [, w]) => s + w, 0)
  const per = (m: 'k' | 'p' | 'c' | 'f') => parts.reduce((s, [code, w]) => {
    const v = COMPONENTS[code]
    if (!v) throw new Error(`composite: no CoFID values recorded for ${code}`)
    return s + v[m] * w
  }, 0) / g
  return { k: Math.round(per('k')), p: Math.round(per('p') * 10) / 10, c: Math.round(per('c') * 10) / 10, f: Math.round(per('f') * 10) / 10, g }
}

/** Each composite's parts by name, so check:foods can match them to the audit record. */
export const COMPOSITE_PARTS: Record<string, [string, number][]> = {}

/** A composite dish: `est-cofid:CODE+CODE+…`, the serving is the sum of the parts. */
function composite(n: string, parts: [string, number][], cat: FoodCategory = 'fastfood'): Food {
  COMPOSITE_PARTS[n] = parts
  const v = compose(parts)
  return dish(n, v.k, v.p, v.c, v.f, v.g, `est-cofid:${parts.map(([code]) => code).join('+')}`, cat)
}

/**
 * Composite dishes (est-cofid, ±40%): no CoFID row or lab analysis covers them, so each is the
 * weighted sum of its CoFID components. The amount of each part is an ASSUMPTION (a typical
 * takeaway build) unless noted; the doner kebabs keep CoFID's own doner-in-pitta make-up
 * (19-526: 50% meat, 22% pitta, 28% salad) as a guide. Garlic sauce is counted as mayonnaise
 * (what most kebab-shop garlic sauce is); "sauces" means 20-25 g each of garlic and chilli.
 */
const COMPOSITES: Food[] = [
  // doner meat 120 g, pitta 75 g, salad 60 g, garlic sauce 20 g, chilli sauce 20 g = 295 g
  composite('Doner kebab, small, in pitta (takeaway)', [['19-539', 120], ['11-974', 75], ['15-648', 60], ['17-654', 20], ['17-719', 20]]),
  // doner meat 200 g, pitta 90 g, salad 80 g, garlic 25 g, chilli 25 g = 420 g
  composite('Doner kebab, large, in pitta (takeaway)', [['19-539', 200], ['11-974', 90], ['15-648', 80], ['17-654', 25], ['17-719', 25]]),
  // doner meat 120 g, naan 173 g (safefood 2015 takeaway naan average), salad 60 g, garlic 20 g, chilli 20 g
  composite('Doner kebab, small, in naan (takeaway)', [['19-539', 120], ['11-973', 173], ['15-648', 60], ['17-654', 20], ['17-719', 20]]),
  // doner meat 200 g, naan 173 g (safefood 2015), salad 80 g, garlic 25 g, chilli 25 g
  composite('Doner kebab, large, in naan (takeaway)', [['19-539', 200], ['11-973', 173], ['15-648', 80], ['17-654', 25], ['17-719', 25]]),
  // doner 100 g, lamb shish meat 100 g, grilled chicken breast 100 g (for chicken shish: CoFID has
  // no chicken shish row), naan 173 g (safefood 2015), salad 80 g, garlic 25 g, chilli 25 g
  composite('Mixed kebab, in naan (takeaway)', [['19-539', 100], ['19-150', 100], ['18-323', 100], ['11-973', 173], ['15-648', 80], ['17-654', 25], ['17-719', 25]]),
  // chips 284 g ([SF] regular), doner meat 150 g, cheddar 40 g, garlic 25 g, chilli 25 g, barbecue sauce 25 g
  composite('Halal snack pack, doner meat on chips with cheese and sauces (takeaway)', [['13-485', 284], ['19-539', 150], ['12-346', 40], ['17-654', 25], ['17-719', 25], ['17-705', 25]]),
  // chips 284 g ([SF] regular), cheddar 50 g
  composite('Cheesy chips (takeaway)', [['13-485', 284], ['12-346', 50]]),
  // chips 142 g ([SF] small), soft white roll 70 g, butter 10 g
  composite('Chip butty (takeaway)', [['13-485', 142], ['11-1006', 70], ['17-685', 10]]),
  // garlic bread 150 g, mozzarella 50 g
  composite('Garlic bread with cheese (takeaway)', [['11-937', 150], ['12-360', 50]]),
  // falafel 120 g (about 4), wheat tortilla 80 g, salad 60 g, houmous 30 g
  composite('Falafel wrap (takeaway)', [['15-795', 120], ['11-925', 80], ['15-648', 60], ['13-556', 30]]),
  // pork shoulder, grilled, 120 g (gyros is usually pork in the UK), pitta 75 g, chips 80 g,
  // tzatziki 40 g, tomato 30 g, onion 15 g
  composite('Gyros, pork, in pitta (takeaway)', [['18-551', 120], ['11-974', 75], ['13-485', 80], ['12-547', 40], ['13-517', 30], ['13-499', 15]]),
  // tortilla chips 100 g, cheddar 60 g, tomato 40 g, onion 15 g, green chilli 10 g (CoFID has
  // no salsa or soured cream row, so tomato, onion and chilli stand in for salsa; no soured cream)
  composite('Nachos with cheese (takeaway)', [['17-644', 100], ['12-346', 60], ['13-517', 40], ['13-499', 15], ['13-316', 10]]),
  // wheat tortilla 100 g, long grain rice 120 g, grilled chicken breast 100 g, kidney beans 60 g,
  // cheddar 30 g, lettuce 20 g, tomato 30 g (no soured cream: no CoFID row)
  composite('Chicken burrito (takeaway)', [['11-925', 100], ['11-862', 120], ['18-323', 100], ['13-660', 60], ['12-346', 30], ['13-520', 20], ['13-517', 30]]),
  // chicken stock 300 g, king prawns 60 g, mushrooms 30 g, tomato 20 g (the paste, lime and fish
  // sauce add little and have no CoFID rows)
  composite('Tom yum soup, prawn (takeaway)', [['17-681', 300], ['16-389', 60], ['13-505', 30], ['13-517', 20]], 'ready'),
  // coconut milk 150 g, chicken stock 150 g, grilled chicken breast 60 g, mushrooms 30 g
  composite('Tom kha soup, chicken (takeaway)', [['14-889', 150], ['17-681', 150], ['18-323', 60], ['13-505', 30]], 'ready'),
]

// ── Fish and chip shop ──
// CoFID 16-368: cod in batter, 10 samples from takeaways
const COD = [240, 16.8, 10.7, 14.7] as const
// CoFID 16-495: haddock in batter, 20 samples from fish and chip shops
const HADDOCK = [232, 17.1, 10.0, 14.0] as const
// CoFID 16-499: plaice in batter, 20 samples from fish and chip shops
const PLAICE = [257, 15.2, 12.0, 16.8] as const
// CoFID 13-485: chips from takeaway fish and chip shops, 10 samples
const CHIPS = [214, 3.5, 33.2, 8.4] as const

const FISH_AND_CHIPS: Food[] = [
  // [J14] fish and chips, n = 64: per 100 g median; portion 749 g (656-827). Cod or haddock with chips
  dish('Fish and chips, cod or haddock (takeaway)', 229, 6.7, 25.8, 11.1, 749, LAB),
  // [J14] chips and curry sauce, n = 9: 487 g (459-548)
  dish('Chips and curry sauce (takeaway)', 191, 2.5, 24.2, 9.0, 487, LAB),
  // [J14] chicken and chips, n = 25: 694 g (606-828)
  dish('Fried chicken and chips (takeaway)', 226, 10.9, 24.4, 9.7, 694, LAB),

  // the fish on its own, by [SF] size (weight after battering and frying)
  dish('Cod in batter, small (takeaway)', ...COD, 99, 'cofid-takeaway:16-368'),
  dish('Cod in batter, regular (takeaway)', ...COD, 198, 'cofid-takeaway:16-368'),
  dish('Cod in batter, large (takeaway)', ...COD, 296, 'cofid-takeaway:16-368'),
  dish('Haddock in batter, small (takeaway)', ...HADDOCK, 99, 'cofid-takeaway:16-495'),
  dish('Haddock in batter, regular (takeaway)', ...HADDOCK, 198, 'cofid-takeaway:16-495'),
  dish('Haddock in batter, large (takeaway)', ...HADDOCK, 296, 'cofid-takeaway:16-495'),
  dish('Plaice in batter, small (takeaway)', ...PLAICE, 99, 'cofid-takeaway:16-499'),
  dish('Plaice in batter, regular (takeaway)', ...PLAICE, 198, 'cofid-takeaway:16-499'),
  dish('Plaice in batter, large (takeaway)', ...PLAICE, 296, 'cofid-takeaway:16-499'),
  // CoFID 16-138: 10 samples from fish and chip shops. [SF] regular
  dish('Rock salmon (huss) in batter (takeaway)', 295, 14.7, 10.3, 21.9, 198, 'cofid-takeaway:16-138'),
  // CoFID 16-301: 7 samples from fish and chip shops. ASSUMPTION 100 g
  dish('Cod roe in batter (takeaway)', 189, 12.4, 8.9, 11.8, 100, 'cofid-takeaway:16-301'),

  // chips by [SF] size
  dish('Chips, small (takeaway)', ...CHIPS, 142, 'cofid-takeaway:13-485'),
  dish('Chips, regular (takeaway)', ...CHIPS, 284, 'cofid-takeaway:13-485'),
  dish('Chips, large (takeaway)', ...CHIPS, 425, 'cofid-takeaway:13-485'),

  // CoFID 18-327: chicken portions, not coated, deep-fried, meat and skin, 10 samples from fish
  // and chip shops. ASSUMPTION 200 g of meat off the bone
  dish('Fried chicken, chip shop, not battered (takeaway)', 259, 26.9, 0, 16.8, 200, 'cofid-takeaway:18-327'),
  // CoFID 19-319: saveloy, 20 takeaway samples. ASSUMPTION 100 g (one saveloy)
  dish('Saveloy (takeaway)', 296, 13.8, 10.8, 22.3, 100, 'cofid-takeaway:19-319'),
  // as fried pork sausages (CoFID has no battered sausage; the batter isn't counted, so likely a
  // little high in fat and low in carbs). ASSUMPTION 120 g
  dish('Battered sausage (takeaway)', 308, 13.9, 9.9, 23.9, 120, 'est-cofid:19-512'),
  // as breaded scampi fried in sunflower oil (calculated from analysed baked scampi). ASSUMPTION 150 g
  dish('Scampi (takeaway)', 243, 10.6, 22.2, 13.0, 150, 'est-cofid:16-443'),
  // as cod fishcakes (recipe, fried). ASSUMPTION 120 g (one fishcake)
  dish('Fishcake (takeaway)', 235, 11.3, 15.2, 14.7, 120, 'est-cofid:16-458'),
  // as individual retail beef pies (9 products incl. steak and mushroom). ASSUMPTION 200 g
  dish('Steak pie (takeaway)', 292, 9.2, 25.5, 17.7, 200, 'est-cofid:18-506'),
  // as individual chicken pies (12 samples incl. chicken and mushroom). ASSUMPTION 200 g
  dish('Chicken and mushroom pie (takeaway)', 288, 9.0, 24.6, 17.7, 200, 'est-cofid:19-515'),
  // as canned mushy peas, reheated (chip shops mostly serve them from marrowfat peas). ASSUMPTION 150 g
  dish('Mushy peas (takeaway)', 81, 5.8, 13.8, 0.7, 150, 'est-cofid:13-563', 'veg'),
  // as UK-style sweet curry sauce (recipe). ASSUMPTION 150 g (one tub)
  dish('Curry sauce, chip shop (takeaway)', 92, 1.1, 9.8, 5.7, 150, 'est-cofid:15-751', 'sauces'),
  // as gravy made from granules, which is what most chip shops use. ASSUMPTION 150 g (one tub)
  dish('Gravy, chip shop (takeaway)', 30, 0.3, 4.7, 1.2, 150, 'est-cofid:17-725', 'sauces'),
  // as retail tartare sauce. ASSUMPTION 30 g (one pot)
  dish('Tartare sauce (takeaway)', 299, 1.3, 17.9, 24.6, 30, 'est-cofid:17-722', 'sauces'),
]

// ── Kebab shop ──
const KEBAB: Food[] = [
  // [J14] doner kebab (meat, bread and salad), n = 12: 447 g (338-503)
  dish('Doner kebab (takeaway)', 277, 13.4, 18.2, 15.6, 447, LAB),
  // [J14] doner kebab with chips, n = 32: 751 g (561-979). Also covers doner meat and chips
  dish('Doner kebab with chips (takeaway)', 254, 8.6, 22.9, 13.3, 751, LAB),
  // [J14] chicken kebab (in bread with salad), n = 22: 481 g (436-539). The paper doesn't
  // split chicken shish from chicken doner, so this one name covers both
  dish('Chicken kebab, shish or doner, in bread with salad (takeaway)', 147, 15.2, 11.8, 5.6, 481, LAB),
  // [J14] shish kebab (in bread with salad), n = 21: 386 g (334-478)
  dish('Shish kebab, lamb, in bread with salad (takeaway)', 155, 15.0, 13.8, 4.0, 386, LAB),
  // CoFID 19-150: shish kebab, meat only, 20 samples from takeaways. ASSUMPTION 150 g
  dish('Shish kebab meat only, lamb (takeaway)', 206, 29.0, 0, 10.0, 150, 'cofid-takeaway:19-150'),
  // as beef kofta (recipe). ASSUMPTION 150 g of meat
  dish('Kofte kebab meat only (takeaway)', 290, 25.3, 1.3, 20.5, 150, 'est-cofid:19-642'),
  // as meat-topped pizza (retail and takeaway): the closest match for a thin bread with minced
  // meat. ASSUMPTION 180 g (one lahmacun)
  dish('Lahmacun (takeaway)', 255, 13.2, 29.1, 10.3, 180, 'est-cofid:11-1015'),
  // as standard mayonnaise: kebab-shop garlic sauce and pizza garlic and herb dips are mostly
  // mayonnaise. ASSUMPTION 30 g (one pot)
  dish('Garlic sauce or garlic and herb dip (takeaway)', 686, 1.1, 2.4, 74.8, 30, 'est-cofid:17-654', 'sauces'),
  // as CoFID chilli sauce (8 samples, including garlic chilli sauce). ASSUMPTION 30 g
  dish('Chilli sauce, kebab shop (takeaway)', 40, 1.3, 7.3, 0.8, 30, 'est-cofid:17-719', 'sauces'),
  // as green salad (lettuce, cucumber, pepper). ASSUMPTION 80 g
  dish('Salad, kebab shop (takeaway)', 13, 1.0, 1.6, 0.4, 80, 'est-cofid:15-648', 'veg'),
  // CoFID 19-544: hamburger, takeaway. [JF25] beef burger 207 g (183-234)
  dish('Beef burger in a bun (takeaway)', 246, 13.5, 31.2, 8.3, 207, 'cofid-takeaway:19-544'),
  // CoFID 19-487: quarter-pound burger with cheese, takeaway. [JF25] beef burger 207 g
  dish('Quarter pounder with cheese (takeaway)', 263, 16.3, 21.2, 13.2, 207, 'cofid-takeaway:19-487'),
]

// ── Pizza takeaway ──
// [J14] Table 1 medians per 100 g: margherita n = 12, pepperoni n = 12, meat n = 20,
// ham and pineapple n = 10. Vegetarian: CoFID 11-1014 (30 retail and takeaway samples).
const PIZZAS: [string, number, number, number, number, string][] = [
  ['Margherita pizza', 301, 13.4, 32.7, 12.8, LAB],
  ['Pepperoni pizza', 304, 14.1, 31.7, 14.3, LAB],
  ['Meat feast pizza', 288, 15.8, 26.4, 12.9, LAB],
  ['Ham and pineapple pizza', 257, 13.7, 28.0, 9.9, LAB],
  ['Vegetarian pizza', 216, 10.8, 29.6, 6.9, 'cofid-takeaway:11-1014'],
]
/** whole pizza weights by size: [SP] 12-inch average, 10 and 14 inch scaled by area */
const SIZES: [string, number][] = [['10-inch', 354], ['12-inch', 510], ['14-inch', 694]]

const PIZZA: Food[] = [
  ...PIZZAS.flatMap(([n, k, p, c, f, src]) => SIZES.map(([size, g]) => dish(`${n}, ${size}, whole (takeaway)`, k, p, c, f, g, src))),
  // as retail garlic and herb bread. ASSUMPTION 150 g
  dish('Garlic bread (takeaway)', 348, 7.0, 45.1, 16.7, 150, 'est-cofid:11-937'),
  // as marinated barbecued chicken wings, weighed with the bone. ASSUMPTION 180 g (about 6 wings)
  dish('Chicken wings, barbecue, weighed with bone (takeaway)', 179, 17.8, 2.7, 10.8, 180, 'est-cofid:19-652'),
  // as bottled barbecue sauce. ASSUMPTION 30 g (one pot)
  dish('Barbecue dip (takeaway)', 140, 1.0, 36.1, 0.1, 30, 'est-cofid:17-705', 'sauces'),
]

// ── Burger and chicken shop ── (CoFID takeaway samples from fast-food chains, named generically)
const CHICKEN_SHOP: Food[] = [
  // CoFID 18-500: chicken portions, battered, deep fried, 6 takeaway samples. ASSUMPTION 150 g
  dish('Fried chicken, coated, off the bone (takeaway)', 233, 24.8, 4.8, 12.8, 150, 'cofid-takeaway:18-500'),
  // same. ASSUMPTION 70 g eaten from one drumstick
  dish('Fried chicken drumstick, coated (takeaway)', 233, 24.8, 4.8, 12.8, 70, 'cofid-takeaway:18-500'),
  // same. ASSUMPTION 100 g (meat and coating from about 4 wings)
  dish('Fried chicken wings, coated, plain or spicy (takeaway)', 233, 24.8, 4.8, 12.8, 100, 'cofid-takeaway:18-500'),
  // CoFID 18-501: coated chicken pieces, takeaway (nuggets, bites, popcorn chicken). ASSUMPTION 120 g
  dish('Chicken strips, coated (takeaway)', 267, 18.5, 17.6, 14.1, 120, 'cofid-takeaway:18-501'),
  dish('Popcorn chicken (takeaway)', 267, 18.5, 17.6, 14.1, 120, 'cofid-takeaway:18-501'),
  // as roast chicken leg quarter, meat and skin, weighed with bone (the marinade isn't counted).
  // ASSUMPTION 250 g on the bone
  dish('Peri-peri chicken, quarter, weighed with bone (takeaway)', 120, 10.7, 0, 8.6, 250, 'est-cofid:18-338'),
  // as roast whole chicken, meat and skin, weighed with bone. ASSUMPTION 450 g on the bone
  dish('Peri-peri chicken, half, weighed with bone (takeaway)', 138, 16.6, 0, 7.9, 450, 'est-cofid:18-342'),
]

// ── Thai ── (no published takeaway portion weights: 400 g per main is an ASSUMPTION)
const THAI: Food[] = [
  // CoFID 19-465: Thai green chicken curry, 10 takeaway and restaurant samples
  dish('Thai green curry, chicken (takeaway)', 119, 8.8, 1.5, 8.7, 400, 'cofid-takeaway:19-465', 'ready'),
  // as Thai green chicken curry (the same coconut-milk curry with red paste)
  dish('Thai red curry, chicken (takeaway)', 119, 8.8, 1.5, 8.7, 400, 'est-cofid:19-465', 'ready'),
  // as Thai green chicken curry; massaman's potato and peanuts aren't counted, so likely low in carbs
  dish('Massaman curry (takeaway)', 119, 8.8, 1.5, 8.7, 400, 'est-cofid:19-465', 'ready'),
  // CoFID 15-634: Thai stir-fry vegetable curry, 10 takeaway and restaurant samples
  dish('Thai vegetable curry (takeaway)', 101, 3.8, 3.3, 8.2, 400, 'cofid-takeaway:15-634', 'ready'),
  // as chicken chow mein from takeaways (stir-fried noodles with chicken; pad thai's rice noodles,
  // egg and peanuts aren't modelled)
  dish('Pad thai, chicken (takeaway)', 147, 8.5, 12.7, 7.2, 400, 'est-cofid:19-321', 'ready'),
  // as chicken chow mein from takeaways (stir-fried flat noodles with chicken)
  dish('Pad see ew, chicken (takeaway)', 147, 8.5, 12.7, 7.2, 400, 'est-cofid:19-321', 'ready'),
  // as stir-fried chicken with mushrooms and cashew nuts (recipe)
  dish('Chicken with cashew nuts, Thai (takeaway)', 160, 18.4, 4.8, 7.0, 400, 'est-cofid:19-569', 'ready'),
  // CoFID 19-323: chicken satay, 10 takeaway samples. ASSUMPTION 120 g (a starter of 4 skewers)
  dish('Chicken satay (takeaway)', 191, 21.7, 3.0, 10.3, 120, 'cofid-takeaway:19-323', 'ready'),
  // as cod fishcakes (recipe, fried): the closest CoFID fishcake. Thai fishcakes are a fried fish
  // paste with curry paste and beans, with no flour or potato, so likely lower in carbs.
  // ASSUMPTION 120 g (a starter of about 5)
  dish('Thai fishcakes (takeaway)', 235, 11.3, 15.2, 14.7, 120, 'est-cofid:16-458', 'ready'),
]

export const OTHER_TAKEAWAY: Food[] = [...FISH_AND_CHIPS, ...KEBAB, ...PIZZA, ...CHICKEN_SHOP, ...THAI, ...COMPOSITES]
