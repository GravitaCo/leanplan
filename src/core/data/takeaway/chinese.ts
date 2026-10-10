import type { Food } from '@/core/types'

/**
 * UK Chinese takeaway dishes (generic, not any restaurant's own figures).
 *
 * Values, per 100 g:
 * - `cofid-takeaway:<code>`: the CoFID 2021 row itself, exactly. Every one of these was lab-analysed
 *   from UK takeaways (Aspland & James Ltd, "Nutrient analysis of ethnic and takeaway foods", 1997;
 *   the sweet and sour sauce is LFRA, "Nutrient analysis of miscellaneous foods", 1992).
 *   Audit records: docs/data/food-audit-2026-10-chinese.json. A separate source key from `cofid`
 *   so these carry a ±30% margin: takeaway recipes and portions vary far more than a lab row
 *   suggests (nutrition-accuracy, Oct 2026).
 * - `est-cofid:<code>`: a common dish CoFID doesn't have, carrying the closest lab-tested CoFID
 *   dish's values (labelled as an estimate in the app, ±40%). Used only where the match is close:
 *   same cooking method and sauce, a similar lean meat.
 *
 * Portions (`g`): CoFID gives none. Where a peer-reviewed UK survey weighed the dish as sold, `g`
 * is its median portion:
 * - [L] Jaworowska A et al. (2014) Nutritional composition of takeaway food in the UK.
 *   Nutr Food Sci 44(5):414-430, doi:10.1108/NFS-08-2013-0093, Table 2. Independent takeaways in
 *   Liverpool, Wirral and Knowsley, whole meal as sold, median (IQR).
 * - [H] Jaworowska A, Force S (2025) Total fat and fatty acid content in meals served by
 *   independent takeaway outlets ... in London, UK. Int J Environ Res Public Health 22(1):121,
 *   doi:10.3390/ijerph22010121, Table 1, "standard" (non-scheme) outlets, n = 4 each, median (IQR).
 * Where neither weighed the dish on its own, `g` is an assumption, said so per dish.
 * Sauced mains are 430 g, derived from [H] (Jaworowska & Force 2025, PMC11764605, Table 1): sweet
 * and sour chicken with egg fried rice weighed 990 g and beef in black bean sauce with egg fried
 * rice 998 g (medians); less the 558 g egg fried rice median, each main is about 430 g.
 */
export const CHINESE_TAKEAWAY: Food[] = [
  // ── Rice and noodles ──
  // [H] egg fried rice 558 g (499-617)
  { n: 'Egg fried rice (takeaway)', k: 186, p: 4.3, c: 33.3, f: 4.9, g: 558, cat: 'ready', src: 'cofid-takeaway:11-444' },
  // [L] chicken chow mein 690 g (567-873), n = 10. The whole box: the app's existing "Chow mein"
  // has the same CoFID values at a 350 g plate, so this name says it's the full takeaway portion
  { n: 'Chicken chow mein, whole box (takeaway)', k: 147, p: 8.5, c: 12.7, f: 7.2, g: 690, cat: 'ready', src: 'cofid-takeaway:19-321' },
  // as chicken chow mein (mixed meats and prawns with the same noodles). [H] special chow mein 551 g (525-594)
  { n: 'Special chow mein (takeaway)', k: 147, p: 8.5, c: 12.7, f: 7.2, g: 551, cat: 'ready', src: 'est-cofid:19-321' },
  // as chicken chow mein ([L] measured char siu and chicken chow mein at the same kcal per 100 g).
  // [L] char siu chow mein 716 g (680-848), n = 10
  { n: 'Char siu (barbecue pork) chow mein (takeaway)', k: 147, p: 8.5, c: 12.7, f: 7.2, g: 716, cat: 'ready', src: 'est-cofid:19-321' },
  // as chicken chow mein. No survey weighed beef chow mein: 551 g, the lowest standard-outlet chow mein median ([H])
  { n: 'Beef chow mein (takeaway)', k: 147, p: 8.5, c: 12.7, f: 7.2, g: 551, cat: 'ready', src: 'est-cofid:19-321' },

  // ── Mains ── (430 g each, derived from [H]'s main-with-rice weights: see above)
  // CoFID: 10 takeaway samples
  { n: 'Sweet and sour chicken (takeaway)', k: 194, p: 7.6, c: 19.7, f: 10.0, g: 430, cat: 'ready', src: 'cofid-takeaway:19-324' },
  // as sweet and sour chicken (same batter and sauce, a similar lean meat)
  { n: 'Sweet and sour pork (takeaway)', k: 194, p: 7.6, c: 19.7, f: 10.0, g: 430, cat: 'ready', src: 'est-cofid:19-324' },
  // CoFID: "sauce not included". 200 g assumed (the battered pieces without their sauce)
  { n: 'Sweet and sour pork, battered, no sauce (takeaway)', k: 240, p: 7.8, c: 22.4, f: 13.9, g: 200, cat: 'ready', src: 'cofid-takeaway:19-304' },
  // as battered sweet and sour pork without sauce (same takeaway batter and frying). 200 g assumed
  { n: 'Chicken balls, battered (takeaway)', k: 240, p: 7.8, c: 22.4, f: 13.9, g: 200, cat: 'ready', src: 'est-cofid:19-304' },
  { n: 'Beef with green peppers in black bean sauce (takeaway)', k: 103, p: 10.5, c: 2.7, f: 5.6, g: 430, cat: 'ready', src: 'cofid-takeaway:19-460' },
  // as beef in black bean sauce (same stir-fry and sauce, a similar lean meat)
  { n: 'Chicken in black bean sauce (takeaway)', k: 103, p: 10.5, c: 2.7, f: 5.6, g: 430, cat: 'ready', src: 'est-cofid:19-460' },
  // as beef in black bean sauce (stir-fried beef and vegetables in a thickened brown sauce)
  { n: 'Beef in oyster sauce (takeaway)', k: 103, p: 10.5, c: 2.7, f: 5.6, g: 430, cat: 'ready', src: 'est-cofid:19-460' },
  { n: 'Szechuan prawns with vegetables (takeaway)', k: 83, p: 7.8, c: 2.5, f: 4.7, g: 430, cat: 'ready', src: 'cofid-takeaway:16-335' },
  { n: 'Stir-fried vegetables (takeaway)', k: 52, p: 1.8, c: 2.1, f: 4.1, g: 430, cat: 'ready', src: 'cofid-takeaway:15-364' },

  // ── Duck ──
  // CoFID: seasoned roasted duck, meat and skin, 10 samples from Chinese takeaways. 100 g assumed
  { n: 'Crispy duck, Chinese style (takeaway)', k: 331, p: 27.9, c: 0.3, f: 24.2, g: 100, cat: 'ready', src: 'cofid-takeaway:18-490' },
  // the pancakes only. 60 g assumed (about six pancakes); no published weight
  { n: 'Pancakes for crispy duck (takeaway)', k: 305, p: 7.8, c: 53.3, f: 7.9, g: 60, cat: 'ready', src: 'cofid-takeaway:11-922' },
  // as Chinese-style barbecue ribs, retail (lab-tested, meat only). CoFID's takeaway ribs (18-499)
  // have protein and fat (22.1 g, 18.7 g, close to these) but no energy or carbohydrate.
  // Weight of the meat off the bone: 150 g assumed
  { n: 'Spare ribs, Chinese barbecue, meat only (takeaway)', k: 281, p: 26.3, c: 5.8, f: 17.1, g: 150, cat: 'ready', src: 'est-cofid:19-264' },

  // ── Starters and sides ── (no published portion weights: assumptions noted)
  // a meat spring roll is the app's existing "Spring roll" (CoFID 19-327, 50 g)
  // as the meat spring roll (same pastry and deep frying, which carry most of the energy)
  { n: 'Spring roll, vegetable (takeaway)', k: 242, p: 6.5, c: 18.2, f: 16.4, g: 50, cat: 'ready', src: 'est-cofid:19-327' },
  // 80 g assumed for a starter
  { n: 'Sesame prawn toast (takeaway)', k: 382, p: 12.9, c: 16.7, f: 29.8, g: 80, cat: 'ready', src: 'cofid-takeaway:16-367' },
  // 30 g assumed (a small bag)
  { n: 'Prawn crackers (takeaway)', k: 570, p: 0.3, c: 58.2, f: 39.0, g: 30, cat: 'snacks', eat: true, src: 'cofid-takeaway:11-1023' },
  // dipping sauce bought from Chinese restaurants. 100 g assumed (one pot)
  { n: 'Sweet and sour sauce (takeaway)', k: 157, p: 0.2, c: 32.8, f: 3.4, g: 100, cat: 'sauces', eat: true, src: 'cofid-takeaway:17-336' },
]
