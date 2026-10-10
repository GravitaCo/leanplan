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
]

export const OTHER_TAKEAWAY: Food[] = [...FISH_AND_CHIPS, ...KEBAB, ...PIZZA, ...CHICKEN_SHOP, ...THAI]
