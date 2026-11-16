import type { Food, FoodCategory } from '@/core/types'

/**
 * Restaurant dishes with no published nutrition, estimated from the closest UK dish in CoFID (lab-tested or recipe-calculated)
 * (source key `est-cofid`, ±40%: see sources.ts). Benn, Oct 2026: the restaurants publish no
 * figures and won't share recipes, and we commission no lab tests, so each dish carries one
 * CoFID 2021 dish's values exactly as CoFID gives them (kcal whole, macros to 0.1 g, per 100 g).
 * Nothing is adjusted, blended or invented. A dish with no honest match is left out.
 *
 * KNOWN BIAS, for nutrition-accuracy to review (values are deliberately NOT corrected):
 * CoFID likely reads low against real takeaways. Jaworowska et al. 2014 (below) lab-analysed
 * chicken korma with pilau rice at a median 1595 kcal for 869 g (Blackham 2022, LJMU PhD thesis,
 * eprint 20540, Appendix Table 8.3). The same meal from CoFID (about 580 g of 19-322 at 145 kcal
 * + 289 g of 11-968 at 134 kcal) comes to about 1228 kcal, about 23% low. Their Indian meals had
 * a median 176 kcal/100 g (Table 8.5) against 145 for 19-322.
 *
 * PORTIONS. Neither restaurant gives weights, so default servings come from published takeaway
 * surveys where one exists, and are marked ASSUMPTION where none does:
 *  - Jaworowska A, Blackham T, Long R et al. (2014) Nutritional composition of takeaway food in
 *    the UK. Nutrition & Food Science 44(5):414-430, doi:10.1108/NFS-08-2013-0093 (LJMU,
 *    Liverpool and Wirral, 95 Indian meals; weights as tabled in Blackham 2022, Appendix Table
 *    8.3, the source the `takeaway-lab:Blackham2022` dishes cite): Indian meal median 803 g; chicken korma with pilau
 *    869 g; lamb rogan josh with pilau 758 g; king prawn rogan josh with pilau 772 g; vegetable
 *    biryani 834 g. These are whole meals (curry plus rice), with no split between the two.
 *  - safefood (2015) What's in your Indian takeaway? (280 samples, 36 outlets, island of
 *    Ireland): average chicken tikka masala 523 g; pilau rice 289 g; boiled rice 284 g; plain
 *    naan 173 g (FSA Food Portion Sizes typical: curry 300 g, naan 160 g).
 *    The two agree: 869 g korma meal - 289 g pilau = 580 g of curry; 758 - 289 = 469 g.
 */

/** CoFID 2021 per-100 g values, copied exactly (checked against the CoFID 2021 workbook,
 *  sheet "1.3 Proximates", Oct 2026). `basis` says how CoFID got them. */
const COFID: Record<string, { name: string; basis: string; k: number; p: number; c: number; f: number }> = {
  // takeaway / restaurant samples (the best evidence)
  '19-322': { name: 'Curry, chicken, average, takeaway', basis: '50 takeaway samples: korma, tikka masala, dhansak, jalfrezi, dopiaza', k: 145, p: 11.7, c: 2.5, f: 9.8 },
  '19-454': { name: 'Biryani, chicken, takeaway', basis: '10 takeaway samples, 5 regions', k: 163, p: 8.5, c: 16.6, f: 7.4 },
  '19-326': { name: 'Meat samosas, takeaway', basis: '10 samples from Indian restaurants', k: 272, p: 11.4, c: 18.9, f: 17.3 },
  '15-620': { name: 'Pakora, vegetable, takeaway and restaurant', basis: '11 samples incl. 2 Leeds, 3 Bradford', k: 293, p: 8.4, c: 16.5, f: 22.0 },
  '16-365': { name: 'Curry, Prawn bhuna, takeaway', basis: '10 takeaway samples, 5 regions', k: 120, p: 8.6, c: 1.8, f: 8.7 },
  '16-366': { name: 'Curry, Prawn madras, takeaway', basis: '10 takeaway samples, 5 regions', k: 115, p: 7.8, c: 2.5, f: 8.3 },
  '11-910': { name: 'Bread, naan, peshwari naan, takeaway and retail', basis: '10 samples, 5 takeaway; nuts and raisins', k: 251, p: 7.6, c: 39.8, f: 7.9 },
  '11-998': { name: 'Papadums, takeaway', basis: '10 samples from different outlets', k: 501, p: 11.5, c: 28.3, f: 38.8 },
  '12-373': { name: 'Lassi, sweetened', basis: '5 samples, takeaway and retail', k: 65, p: 2.6, c: 12.3, f: 0.9 },
  '13-485': { name: 'Potato chips, fried in commercial oil, from takeaway fish and chip shops', basis: '10 takeaway samples', k: 214, p: 3.5, c: 33.2, f: 8.4 },
  // retail samples
  '11-973': { name: 'Bread, naan, retail', basis: '12 samples, incl. garlic and coriander', k: 285, p: 7.8, c: 50.2, f: 7.3 },
  '19-540': { name: 'Curry, chicken tandoori, retail, reheated', basis: '7 samples, 6 brands, 95-96% meat', k: 214, p: 27.4, c: 2.0, f: 10.8 },
  '19-449': { name: 'Curry, chicken balti, retail', basis: '10 retail samples', k: 105, p: 10.5, c: 4.8, f: 5.0 },
  '15-305': { name: 'Samosas, vegetable, retail', basis: '5 samples, 3 brands', k: 217, p: 5.1, c: 30.0, f: 9.3 },
  '15-619': { name: 'Curry, vegetable, ready meal, without rice, cooked', basis: '10 retail samples incl. korma, dhansak, jalfrezi', k: 94, p: 2.1, c: 8.4, f: 6.0 },
  '17-343': { name: 'Chutney, mango, sweet', basis: '10 samples, 5 brands', k: 189, p: 0.7, c: 48.3, f: 0.1 },
  '11-858': { name: 'Rice, white, basmati, boiled in unsalted water', basis: '11 samples, 9 products', k: 117, p: 2.8, c: 26.5, f: 0.7 },
  // analysed home-cooked samples
  '15-627': { name: 'Curry, bhindi subji, homemade', basis: '6 analysed samples: okra, onion, tomato, spices', k: 71, p: 2.9, c: 4.9, f: 4.6 },
  '16-364': { name: 'Curry, fish, homemade', basis: '5 analysed samples: white fish, onion, tomato, spices', k: 139, p: 11.3, c: 1.9, f: 9.6 },
  // recipes (calculated, not analysed)
  '11-968': { name: 'Rice, pilau, plain, homemade', basis: 'recipe', k: 134, p: 2.5, c: 24.3, f: 3.7 },
  '15-846': { name: 'Pilau, mushroom, homemade', basis: 'recipe', k: 138, p: 2.5, c: 23.9, f: 3.5 },
  '15-762': { name: 'Curry, lentil, red/masoor dahl, Punjabi, homemade', basis: 'recipe, thick', k: 141, p: 7.2, c: 19.3, f: 4.6 },
  '15-641': { name: 'Curry, chick pea dhal, homemade', basis: 'recipe (Punjabi, split chick peas)', k: 152, p: 7.9, c: 17.8, f: 6.1 },
  '15-108': { name: 'Curry, chick pea, whole and tomato, Punjabi, with vegetable oil, homemade', basis: 'recipe', k: 112, p: 5.6, c: 12.4, f: 4.9 },
  '15-679': { name: 'Bhaji, cauliflower and potato, homemade', basis: 'recipe', k: 106, p: 3.3, c: 10.1, f: 6.8 },
  '15-680': { name: 'Bhaji, cauliflower and vegetable, homemade', basis: 'recipe: cauliflower, onion, tomato', k: 117, p: 3.1, c: 6.6, f: 9.1 },
  '15-693': { name: 'Bhaji, potato, with vegetable oil, homemade', basis: 'recipe', k: 161, p: 2.2, c: 16.6, f: 10.0 },
  '15-695': { name: 'Bhaji, spinach and potato, homemade', basis: 'recipe', k: 192, p: 3.6, c: 13.4, f: 14.1 },
  '15-681': { name: 'Bhaji, mushroom, homemade', basis: 'recipe: mushroom and onion', k: 168, p: 1.2, c: 4.1, f: 16.6 },
  '15-828': { name: 'Pakora/bhajia, onion, fried in vegetable oil, homemade', basis: 'recipe: onion in chick pea flour batter', k: 270, p: 11.2, c: 24.6, f: 14.7 },
  '19-595': { name: 'Curry, lamb rogan josh, homemade', basis: 'recipe', k: 149, p: 14.4, c: 3.9, f: 9.1 },
  '19-591': { name: 'Curry, lamb biryani, homemade', basis: 'recipe', k: 195, p: 7.1, c: 20.9, f: 9.2 },
  '19-480': { name: 'Kheema, lamb, homemade', basis: 'recipe', k: 178, p: 11.0, c: 4.0, f: 13.4 },
  '11-1104': { name: 'Paratha, homemade', basis: 'recipe', k: 333, p: 7.8, c: 45.8, f: 14.4 },
  '11-459': { name: 'Chapatis, made without fat', basis: 'analysed and calculated', k: 202, p: 7.3, c: 43.7, f: 1.0 },
  '17-832': { name: 'Raita, homemade', basis: 'recipe, spiced yoghurt', k: 57, p: 4.4, c: 5.8, f: 2.4 },

  // added for the generic Indian takeaway list (../takeaway/indian.ts), Oct 2026, copied from
  // the same CoFID 2021 sheet
  '16-333': { name: 'Curry, prawn, takeaway', basis: '20 takeaway samples: 10 bhuna, 10 madras', k: 118, p: 8.2, c: 2.3, f: 8.5 },
  '18-501': { name: 'Chicken pieces, coated, takeaway', basis: '8 takeaway samples: nuggets, bites, popcorn chicken', k: 267, p: 18.5, c: 17.6, f: 14.1 },
  '16-368': { name: 'Cod, in batter, fried, takeaway', basis: '10 takeaway samples', k: 240, p: 16.8, c: 10.7, f: 14.7 },
  '19-525': { name: 'Shish kebab in pitta bread with salad', basis: 'calculated from takeaway shish kebab, pitta and salad', k: 149, p: 13.6, c: 15.4, f: 4.1 },
  '19-541': { name: 'Chicken wings, marinated, meat and skin, barbecued', basis: '4 retail samples incl. hot and spicy', k: 274, p: 27.4, c: 4.1, f: 16.6 },
  '16-388': { name: 'Prawns, king, grilled from raw', basis: '9 retail samples', k: 102, p: 23.5, c: 0.0, f: 0.9 },
  '18-172': { name: 'Lamb, shoulder, diced, kebabs, grilled, lean and fat', basis: 'calculated, 85% lean', k: 288, p: 28.5, c: 0.0, f: 19.3 },
  '15-629': { name: 'Saag, homemade', basis: '5 analysed samples, spinach curry', k: 111, p: 3.3, c: 5.0, f: 8.8 },
  '12-472': { name: 'Pilau, vegetable, homemade', basis: '6 analysed samples', k: 112, p: 3.3, c: 22.6, f: 1.5 },
  '11-911': { name: 'Puri, homemade', basis: '9 analysed samples, 3 from cafés: deep-fried chapati', k: 366, p: 7.2, c: 36.5, f: 22.3 },
  '19-599': { name: 'Curry, lamb vindaloo, homemade', basis: 'recipe', k: 199, p: 19.8, c: 2.7, f: 12.9 },
  '19-642': { name: 'Kofta, beef, homemade', basis: 'recipe: spiced minced beef', k: 290, p: 25.3, c: 1.3, f: 20.5 },
  '19-594': { name: 'Kofta, lamb, coated with breadcrumbs, homemade', basis: 'recipe', k: 277, p: 23.8, c: 9.7, f: 16.0 },
  '15-849': { name: 'Potato cakes, fried in rapeseed oil', basis: 'recipe', k: 210, p: 3.9, c: 31.4, f: 8.4 },
  '15-739': { name: 'Curry, Bombay potato, homemade', basis: 'recipe: potato, tomato, spices', k: 118, p: 1.8, c: 13.8, f: 6.7 },
  '15-699': { name: 'Bhaji, vegetable, with rapeseed oil, homemade', basis: 'recipe: mixed vegetables', k: 213, p: 1.8, c: 10.1, f: 18.5 },
  '15-751': { name: 'Sauce, curry, sweet, UK type, homemade', basis: 'recipe: basic UK curry sauce', k: 92, p: 1.1, c: 9.8, f: 5.7 },
  '11-1083': { name: 'Gulab jamen/jambu, retail', basis: 'recipe', k: 306, p: 7.2, c: 43.3, f: 12.8 },
}

/** Default servings in g (ml for lassi). Published where a source exists, else ASSUMPTION. */
export const PORTION = {
  /** safefood 2015 average chicken tikka masala, 523 g, rounded to 520 g (at 523 g some dishes
   *  land on half a kcal, and the screen would round differently from the data); fits
   *  Jaworowska (469-580 g of curry in a curry-and-rice meal). Used for every curry main
   *  (ASSUMPTION for curries other than tikka masala). */
  curry: 520,
  /** ASSUMPTION: a side-dish curry at about half a main. No published figure. */
  side: 250,
  /** ASSUMPTION: the biryani alone. Jaworowska's vegetable biryani meal is 834 g as served,
   *  which in UK takeaways usually includes the side vegetable curry sauce, so we take about
   *  two-thirds. Log the sauce or raita separately. */
  biryani: 550,
  /** safefood 2015 averages */
  pilau: 289,
  boiledRice: 284,
  naan: 173,
  /** ASSUMPTION: a starter portion (about 3 bhajis or pakora pieces, or 150 g of tikka). */
  starter: 150,
  /** ASSUMPTION: two samosas of about 60 g (the base database's single samosa). */
  samosas: 120,
  /** ASSUMPTIONS for breads and extras with no published weight */
  paratha: 100, chapati: 50, roti: 90, poppadom: 12, chutney: 30, raita: 150, chips: 200,
  /** ASSUMPTION: a glass, as the base database's milkshake */
  lassi: 300,
} as const

/** One restaurant dish: `name` (a stable ID), the CoFID code it's estimated from, the serving. */
export function est(name: string, code: string, g: number, cat: FoodCategory = 'ready', ml = false): Food {
  return cofidFood('est-cofid', name, code, g, cat, ml)
}

/** A generic dish that IS the CoFID takeaway row (CoFID sampled that dish from takeaways), so it
 *  cites `cofid-takeaway` (±30%) instead of being an estimate. Needs an audit record in docs/data. */
export function takeawayRow(name: string, code: string, g: number, cat: FoodCategory = 'ready', ml = false): Food {
  return cofidFood('cofid-takeaway', name, code, g, cat, ml)
}

function cofidFood(key: 'est-cofid' | 'cofid-takeaway', name: string, code: string, g: number, cat: FoodCategory, ml: boolean): Food {
  const v = COFID[code]
  if (!v) throw new Error(`${key}: no CoFID values recorded for ${code}`)
  const food: Food = { n: name, k: v.k, p: v.p, c: v.c, f: v.f, g }
  if (ml) food.ml = true
  food.cat = cat
  food.src = `${key}:${code}`
  food.eat = true
  return food
}
