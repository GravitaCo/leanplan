import type { Food } from '@/core/types'

/**
 * UK Chinese takeaway dishes (generic, not any restaurant's own figures), under the plain names
 * people search for. Audit records: docs/data/food-audit-2026-10-chinese.json.
 *
 * Values, per 100 g, in this order of preference:
 * - `cofid-takeaway:<code>`: the CoFID 2021 row itself, exactly. Every one of these was lab-analysed
 *   from UK takeaways (Aspland & James Ltd, "Nutrient analysis of ethnic and takeaway foods", 1997;
 *   the sweet and sour sauce is LFRA, "Nutrient analysis of miscellaneous foods", 1992). A separate
 *   source key from `cofid` so these carry a ±30% margin: takeaway recipes and portions vary far
 *   more than a lab row suggests (nutrition-accuracy, Oct 2026).
 * - `takeaway-lab:LJMU`: whole meals bought from independent takeaways in Liverpool, Wirral and
 *   Knowsley and lab-analysed (Jaworowska et al. 2014, Nutr Food Sci 44(5):414-430; the per-100 g
 *   medians for energy, protein, carbohydrate and fat are in Blackham T (2022) PhD thesis, LJMU,
 *   Appendix Tables 8.5 and 8.6, portions in Table 8.3). Used only where CoFID has no takeaway row
 *   for the dish. ±30%, as CoFID's takeaway rows.
 * - `est-cofid:<code>`: a common dish with no published analysis, carrying the closest CoFID
 *   dish's values (labelled as an estimate in the app, ±40%). The reason for each match is noted.
 *
 * Portions (`g`): where a UK survey weighed the dish as sold, `g` is its median (or mean) portion:
 * - [L] Jaworowska et al. 2014 (above), whole meal as sold, median: Blackham 2022 Table 8.3, and
 *   §4.4 for the parts of a meal (boiled rice 297 g, chips 462 g, both from sweet and sour chicken
 *   meals less the chicken).
 * - [H] Jaworowska A, Force S (2025) Total fat and fatty acid content in meals served by
 *   independent takeaway outlets ... in London, UK. Int J Environ Res Public Health 22(1):121,
 *   doi:10.3390/ijerph22010121, Table 1, "standard" (non-scheme) outlets, n = 4 each, median (IQR).
 * - [S] safefood (2012) What's in your Chinese takeaway? Nutrition takeout series, Table 3: mean
 *   portion of 30 meals each from 35 takeaways in Northern Ireland and Ireland.
 * Where none weighed the dish, `g` is an assumption, said so per dish.
 * Sauced mains are 430 g, derived from [H] (Jaworowska & Force 2025, PMC11764605, Table 1): sweet
 * and sour chicken with egg fried rice weighed 990 g and beef in black bean sauce with egg fried
 * rice 998 g (medians); less the 558 g egg fried rice median, each main is about 430 g.
 *
 * No honest match, so not listed: hot and sour soup, wonton soup and crispy seaweed (CoFID has no
 * thickened Chinese broth or deep-fried greens, and no takeaway analysis covers them).
 */
export const CHINESE_TAKEAWAY: Food[] = [
  // ── Rice ──
  // [L] special fried rice: 21 meals, 686 g (604-742)
  { n: 'Special fried rice', k: 200, p: 11.5, c: 22.8, f: 7.3, g: 686, cat: 'ready', eat: true, src: 'takeaway-lab:LJMU' },
  // [H] egg fried rice 558 g (499-617)
  { n: 'Egg fried rice (takeaway)', k: 186, p: 4.3, c: 33.3, f: 4.9, g: 558, cat: 'ready', eat: true, src: 'cofid-takeaway:11-444' },
  // as takeaway egg fried rice (the same fried rice with meat, prawns or mushrooms added).
  // 686 g, as [L]'s special fried rice
  { n: 'Chicken fried rice', k: 186, p: 4.3, c: 33.3, f: 4.9, g: 686, cat: 'ready', eat: true, src: 'est-cofid:11-444' },
  { n: 'King prawn fried rice', k: 186, p: 4.3, c: 33.3, f: 4.9, g: 686, cat: 'ready', eat: true, src: 'est-cofid:11-444' },
  { n: 'Mushroom fried rice', k: 186, p: 4.3, c: 33.3, f: 4.9, g: 686, cat: 'ready', eat: true, src: 'est-cofid:11-444' },
  // special fried rice seasoned with curry powder: as takeaway egg fried rice. 686 g, as [L]'s special fried rice
  { n: 'Singapore fried rice', k: 186, p: 4.3, c: 33.3, f: 4.9, g: 686, cat: 'ready', eat: true, src: 'est-cofid:11-444' },
  // plain boiled long-grain rice. [L] 297 g (sweet and sour chicken with boiled rice, less the chicken)
  { n: 'Boiled rice (takeaway)', k: 131, p: 2.8, c: 31.1, f: 0.4, g: 297, cat: 'ready', eat: true, src: 'est-cofid:11-862' },

  // ── Noodles ──
  // as chicken chow mein (mixed meats and prawns with the same noodles). [H] special chow mein 551 g (525-594)
  { n: 'Special chow mein (takeaway)', k: 147, p: 8.5, c: 12.7, f: 7.2, g: 551, cat: 'ready', eat: true, src: 'est-cofid:19-321' },
  // [L] chicken chow mein 690 g (567-873), n = 10. The whole box: the app's existing "Chow mein"
  // has the same CoFID values at a 350 g plate, so this name says it's the full takeaway portion
  { n: 'Chicken chow mein, whole box (takeaway)', k: 147, p: 8.5, c: 12.7, f: 7.2, g: 690, cat: 'ready', eat: true, src: 'cofid-takeaway:19-321' },
  // as chicken chow mein. No survey weighed beef chow mein: 551 g, the lowest standard-outlet chow mein median ([H])
  { n: 'Beef chow mein (takeaway)', k: 147, p: 8.5, c: 12.7, f: 7.2, g: 551, cat: 'ready', eat: true, src: 'est-cofid:19-321' },
  // [L] prawn chow mein: 21 meals, 679 g (584-834)
  { n: 'King prawn chow mein', k: 102, p: 5.8, c: 12.8, f: 3.5, g: 679, cat: 'ready', eat: true, src: 'takeaway-lab:LJMU' },
  // [L] char siu chow mein: 10 meals, 716 g (680-848)
  { n: 'Char siu (barbecue pork) chow mein (takeaway)', k: 129, p: 10.3, c: 9.6, f: 5.3, g: 716, cat: 'ready', eat: true, src: 'takeaway-lab:LJMU' },
  // as chicken chow mein (the same takeaway noodles; likely a little lower in protein without the
  // chicken). 551 g, as special chow mein ([H])
  { n: 'Vegetable chow mein', k: 147, p: 8.5, c: 12.7, f: 7.2, g: 551, cat: 'ready', eat: true, src: 'est-cofid:19-321' },
  // stir-fried thin noodles with mixed meats, prawns and curry powder: as takeaway chicken chow
  // mein (stir-fried noodles with meat). 551 g, as special chow mein ([H])
  { n: 'Singapore noodles (Singapore vermicelli)', k: 147, p: 8.5, c: 12.7, f: 7.2, g: 551, cat: 'ready', eat: true, src: 'est-cofid:19-321' },
  // soft noodles fried with beansprouts and spring onion: as CoFID's egg noodles fried with spring
  // onions (the same dish, a home recipe). 551 g, as special chow mein ([H])
  { n: 'Fried noodles with beansprouts', k: 244, p: 5.0, c: 30.5, f: 12.2, g: 551, cat: 'ready', eat: true, src: 'est-cofid:11-1096' },

  // ── Chicken ── (430 g each, derived from [H]'s main-with-rice weights: see above, unless noted)
  // CoFID: 10 takeaway samples (battered chicken with the sauce)
  { n: 'Sweet and sour chicken (takeaway)', k: 194, p: 7.6, c: 19.7, f: 10.0, g: 430, cat: 'ready', eat: true, src: 'cofid-takeaway:19-324' },
  // as takeaway sweet and sour chicken (the same battered chicken and sauce, with peppers,
  // onion and pineapple)
  { n: 'Sweet and sour chicken, Hong Kong style', k: 194, p: 7.6, c: 19.7, f: 10.0, g: 430, cat: 'ready', eat: true, src: 'est-cofid:19-324' },
  // as takeaway sweet and sour chicken (battered chicken with the sauce). 469 g: [L]'s sweet and
  // sour chicken with no rice, 28 meals, median (419-586)
  { n: 'Sweet and sour chicken balls with sauce', k: 194, p: 7.6, c: 19.7, f: 10.0, g: 469, cat: 'ready', eat: true, src: 'est-cofid:19-324' },
  // as battered sweet and sour pork without sauce (same takeaway batter and frying). 200 g assumed
  { n: 'Chicken balls, battered (takeaway)', k: 240, p: 7.8, c: 22.4, f: 13.9, g: 200, cat: 'ready', eat: true, src: 'est-cofid:19-304' },
  // stir-fried chicken with peanuts, chilli and peppers: as CoFID's chicken stir-fried with
  // mushrooms and cashew nuts (a home recipe: stir-fried chicken with nuts)
  { n: 'Kung pao chicken (kung po)', k: 160, p: 18.4, c: 4.8, f: 7.0, g: 430, cat: 'ready', eat: true, src: 'est-cofid:19-569' },
  // as CoFID's chicken stir-fried with mushrooms and cashew nuts
  { n: 'Chicken with cashew nuts', k: 160, p: 18.4, c: 4.8, f: 7.0, g: 430, cat: 'ready', eat: true, src: 'est-cofid:19-569' },
  // coated, deep-fried chicken tossed with peppers, onion and chilli: as CoFID's coated chicken
  // pieces from takeaways. 300 g assumed (a dry dish, no sauce)
  { n: 'Salt and pepper chicken', k: 267, p: 18.5, c: 17.6, f: 14.1, g: 300, cat: 'ready', eat: true, src: 'est-cofid:18-501' },
  // battered chicken in a sweet sauce: as takeaway sweet and sour chicken
  { n: 'Honey chilli chicken', k: 194, p: 7.6, c: 19.7, f: 10.0, g: 430, cat: 'ready', eat: true, src: 'est-cofid:19-324' },
  // battered chicken in a sweet lemon sauce: as takeaway sweet and sour chicken
  { n: 'Lemon chicken', k: 194, p: 7.6, c: 19.7, f: 10.0, g: 430, cat: 'ready', eat: true, src: 'est-cofid:19-324' },
  // as beef in black bean sauce (same stir-fry and sauce, a similar lean meat)
  { n: 'Chicken in black bean sauce (takeaway)', k: 103, p: 10.5, c: 2.7, f: 5.6, g: 430, cat: 'ready', eat: true, src: 'est-cofid:19-460' },
  // stir-fried chicken and vegetables in a thickened brown sauce: as beef in black bean sauce
  { n: 'Chicken in oyster sauce', k: 103, p: 10.5, c: 2.7, f: 5.6, g: 430, cat: 'ready', eat: true, src: 'est-cofid:19-460' },
  { n: 'Chicken with mushrooms', k: 103, p: 10.5, c: 2.7, f: 5.6, g: 430, cat: 'ready', eat: true, src: 'est-cofid:19-460' },
  // stir-fried chicken with beansprouts and vegetables: as beef in black bean sauce
  { n: 'Chicken chop suey', k: 103, p: 10.5, c: 2.7, f: 5.6, g: 430, cat: 'ready', eat: true, src: 'est-cofid:19-460' },
  // stir-fried chicken and vegetables in a hot Szechuan sauce: as Szechuan prawns with vegetables
  { n: 'Szechuan chicken', k: 83, p: 7.8, c: 2.5, f: 4.7, g: 430, cat: 'ready', eat: true, src: 'est-cofid:16-335' },
  // CoFID: chicken satay, 10 takeaway samples (chicken in satay sauce)
  { n: 'Chicken satay (in satay sauce)', k: 191, p: 21.7, c: 3.0, f: 10.3, g: 430, cat: 'ready', eat: true, src: 'cofid-takeaway:19-323' },
  // [L] chicken satay with fried rice: 10 meals, 891 g (781-1063)
  { n: 'Chicken satay with egg fried rice', k: 146, p: 7.4, c: 17.8, f: 4.4, g: 891, cat: 'ready', eat: true, src: 'takeaway-lab:LJMU' },
  // Chinese curry (chicken and onion in a curry sauce): as CoFID's takeaway chicken curry (Indian
  // takeaways, the only lab-tested takeaway chicken curry). [S] beef curry mean 555 g
  { n: 'Chinese chicken curry', k: 145, p: 11.7, c: 2.5, f: 9.8, g: 555, cat: 'ready', eat: true, src: 'est-cofid:19-322' },
  // [L] sweet and sour chicken with boiled rice: 10 meals, 766 g (744-868)
  { n: 'Sweet and sour chicken with boiled rice', k: 188, p: 6.3, c: 28.4, f: 5.2, g: 766, cat: 'ready', eat: true, src: 'takeaway-lab:LJMU' },
  // [L] sweet and sour chicken with chips: 22 meals, 931 g (785-1199)
  { n: 'Sweet and sour chicken with chips', k: 208, p: 5.9, c: 26.7, f: 8.0, g: 931, cat: 'ready', eat: true, src: 'takeaway-lab:LJMU' },

  // ── Beef ──
  { n: 'Beef with green peppers in black bean sauce (takeaway)', k: 103, p: 10.5, c: 2.7, f: 5.6, g: 430, cat: 'ready', eat: true, src: 'cofid-takeaway:19-460' },
  // [L] beef in black bean sauce with fried rice: 31 meals, 915 g (871-1013)
  { n: 'Beef in black bean sauce with egg fried rice', k: 147, p: 6.5, c: 17.4, f: 5.3, g: 915, cat: 'ready', eat: true, src: 'takeaway-lab:LJMU' },
  // as beef in black bean sauce (stir-fried beef and vegetables in a thickened brown sauce)
  { n: 'Beef in oyster sauce (takeaway)', k: 103, p: 10.5, c: 2.7, f: 5.6, g: 430, cat: 'ready', eat: true, src: 'est-cofid:19-460' },
  { n: 'Beef with ginger and spring onions', k: 103, p: 10.5, c: 2.7, f: 5.6, g: 430, cat: 'ready', eat: true, src: 'est-cofid:19-460' },
  { n: 'Beef chop suey', k: 103, p: 10.5, c: 2.7, f: 5.6, g: 430, cat: 'ready', eat: true, src: 'est-cofid:19-460' },
  // as Szechuan prawns with vegetables (same sauce and stir-fry)
  { n: 'Szechuan beef', k: 83, p: 7.8, c: 2.5, f: 4.7, g: 430, cat: 'ready', eat: true, src: 'est-cofid:16-335' },
  // battered strips of beef in a sweet chilli sauce: as takeaway sweet and sour chicken (battered
  // meat in a sweet sauce)
  { n: 'Crispy chilli beef', k: 194, p: 7.6, c: 19.7, f: 10.0, g: 430, cat: 'ready', eat: true, src: 'est-cofid:19-324' },
  // as CoFID's retail beef curry (lab-tested, meat and sauce). [S] beef curry mean 555 g
  { n: 'Chinese beef curry', k: 137, p: 13.5, c: 6.3, f: 6.6, g: 555, cat: 'ready', eat: true, src: 'est-cofid:19-488' },

  // ── Pork and duck ──
  // as sweet and sour chicken (same batter and sauce, a similar lean meat)
  { n: 'Sweet and sour pork (takeaway)', k: 194, p: 7.6, c: 19.7, f: 10.0, g: 430, cat: 'ready', eat: true, src: 'est-cofid:19-324' },
  // CoFID: "sauce not included". 200 g assumed (the battered pieces without their sauce)
  { n: 'Sweet and sour pork, battered, no sauce (takeaway)', k: 240, p: 7.8, c: 22.4, f: 13.9, g: 200, cat: 'ready', eat: true, src: 'cofid-takeaway:19-304' },
  // Chinese roast pork in a sweet glaze: as Chinese-style barbecue ribs, retail (lab-tested, meat
  // only: the same marinade, a fattier cut). 200 g assumed
  { n: 'Char siu (Chinese barbecue roast pork)', k: 281, p: 26.3, c: 5.8, f: 17.1, g: 200, cat: 'ready', eat: true, src: 'est-cofid:19-264' },
  // as Chinese-style barbecue ribs, retail (lab-tested, meat only). CoFID's takeaway ribs (18-499)
  // have protein and fat (22.1 g, 18.7 g, close to these) but no energy or carbohydrate.
  // Weight of the meat off the bone: 150 g assumed
  { n: 'Spare ribs, Chinese barbecue, meat only (takeaway)', k: 281, p: 26.3, c: 5.8, f: 17.1, g: 150, cat: 'ready', eat: true, src: 'est-cofid:19-264' },
  // as the barbecue ribs above (the same ribs, fried and tossed with salt, pepper and chilli
  // instead of sauced). Meat off the bone: 150 g assumed
  { n: 'Salt and pepper spare ribs, meat only', k: 281, p: 26.3, c: 5.8, f: 17.1, g: 150, cat: 'ready', eat: true, src: 'est-cofid:19-264' },
  // CoFID: seasoned roasted duck, meat and skin, 10 samples from Chinese takeaways. 100 g assumed
  { n: 'Crispy duck, Chinese style (takeaway)', k: 331, p: 27.9, c: 0.3, f: 24.2, g: 100, cat: 'ready', eat: true, src: 'cofid-takeaway:18-490' },
  // the pancakes only. 60 g assumed (about six pancakes); no published weight
  { n: 'Pancakes for crispy duck (takeaway)', k: 305, p: 7.8, c: 53.3, f: 7.9, g: 60, cat: 'ready', eat: true, src: 'cofid-takeaway:11-922' },

  // ── King prawns ──
  { n: 'Szechuan prawns with vegetables (takeaway)', k: 83, p: 7.8, c: 2.5, f: 4.7, g: 430, cat: 'ready', eat: true, src: 'cofid-takeaway:16-335' },
  // [L] kung po king prawns with boiled rice: 10 meals, 882 g (794-931)
  { n: 'Kung pao king prawns with boiled rice (kung po)', k: 126, p: 4.1, c: 22.5, f: 2.7, g: 882, cat: 'ready', eat: true, src: 'takeaway-lab:LJMU' },
  // stir-fried king prawns and vegetables in a sauce: as Szechuan prawns with vegetables
  { n: 'King prawns in black bean sauce', k: 83, p: 7.8, c: 2.5, f: 4.7, g: 430, cat: 'ready', eat: true, src: 'est-cofid:16-335' },
  { n: 'King prawn chop suey', k: 83, p: 7.8, c: 2.5, f: 4.7, g: 430, cat: 'ready', eat: true, src: 'est-cofid:16-335' },
  // as CoFID's chicken stir-fried with mushrooms and cashew nuts (the same dish with prawns)
  { n: 'King prawns with cashew nuts', k: 160, p: 18.4, c: 4.8, f: 7.0, g: 430, cat: 'ready', eat: true, src: 'est-cofid:19-569' },
  // battered king prawns in the sauce: as takeaway sweet and sour chicken
  { n: 'Sweet and sour king prawns', k: 194, p: 7.6, c: 19.7, f: 10.0, g: 430, cat: 'ready', eat: true, src: 'est-cofid:19-324' },
  // coated, deep-fried prawns: as CoFID's breaded scampi, fried. 300 g assumed (a dry dish)
  { n: 'Salt and pepper king prawns', k: 243, p: 10.6, c: 22.2, f: 13.0, g: 300, cat: 'ready', eat: true, src: 'est-cofid:16-443' },
  // king prawns in satay sauce: as CoFID's takeaway chicken satay (the same sauce). [S] mean 517 g
  { n: 'King prawn satay', k: 191, p: 21.7, c: 3.0, f: 10.3, g: 517, cat: 'ready', eat: true, src: 'est-cofid:19-323' },
  // as CoFID's takeaway prawn curry (Indian takeaways). [S] beef curry mean 555 g
  { n: 'Chinese king prawn curry', k: 118, p: 8.2, c: 2.3, f: 8.5, g: 555, cat: 'ready', eat: true, src: 'est-cofid:16-333' },

  // ── Foo yung, vegetables and tofu ──
  // a Chinese omelette with chicken, mixed meats or mushrooms: as CoFID's plain omelette. 300 g assumed
  { n: 'Chicken foo yung', k: 191, p: 10.9, c: 0, f: 16.4, g: 300, cat: 'ready', eat: true, src: 'est-cofid:12-946' },
  { n: 'Special foo yung', k: 191, p: 10.9, c: 0, f: 16.4, g: 300, cat: 'ready', eat: true, src: 'est-cofid:12-946' },
  { n: 'Mushroom foo yung', k: 191, p: 10.9, c: 0, f: 16.4, g: 300, cat: 'ready', eat: true, src: 'est-cofid:12-946' },
  { n: 'Stir-fried vegetables (takeaway)', k: 52, p: 1.8, c: 2.1, f: 4.1, g: 430, cat: 'ready', eat: true, src: 'cofid-takeaway:15-364' },
  // as CoFID's beansprouts stir-fried in oil. 300 g assumed
  { n: 'Beansprouts, stir-fried (takeaway)', k: 72, p: 1.9, c: 2.5, f: 6.1, g: 300, cat: 'ready', eat: true, src: 'est-cofid:13-567' },
  // fried tofu tossed with salt, pepper and chilli: as CoFID's fried tofu. 250 g assumed
  { n: 'Salt and pepper tofu', k: 261, p: 23.5, c: 2.0, f: 17.7, g: 250, cat: 'ready', eat: true, src: 'est-cofid:13-571' },

  // ── Soup ──
  // a thickened chicken soup with sweetcorn and egg: as CoFID's canned cream of chicken soup, the
  // closest thickened chicken soup (similar energy; likely more fat, less carbohydrate). 300 g assumed
  { n: 'Chicken and sweetcorn soup', k: 58, p: 1.7, c: 4.5, f: 3.8, g: 300, cat: 'ready', eat: true, src: 'est-cofid:17-695' },

  // ── Starters ──
  // a meat spring roll is the app's existing "Spring roll" (CoFID 19-327, 50 g)
  // as the meat spring roll (same pastry and deep frying, which carry most of the energy)
  { n: 'Spring roll, vegetable (takeaway)', k: 242, p: 6.5, c: 18.2, f: 16.4, g: 50, cat: 'ready', eat: true, src: 'est-cofid:19-327' },
  // fried wontons: as the meat spring roll (a filled wrapper, deep-fried). 100 g assumed without
  // the sauce ([S] weighed 183 g with sweet and sour sauce)
  { n: 'Wontons, fried', k: 242, p: 6.5, c: 18.2, f: 16.4, g: 100, cat: 'ready', eat: true, src: 'est-cofid:19-327' },
  // 80 g assumed for a starter
  { n: 'Sesame prawn toast (takeaway)', k: 382, p: 12.9, c: 16.7, f: 29.8, g: 80, cat: 'ready', eat: true, src: 'cofid-takeaway:16-367' },
  // wings fried without a coating and tossed with salt, pepper and chilli: as CoFID's uncoated
  // deep-fried chicken from takeaways (meat and skin). Meat off the bone: 150 g assumed
  { n: 'Salt and pepper chicken wings, meat only', k: 259, p: 26.9, c: 0, f: 16.8, g: 150, cat: 'ready', eat: true, src: 'est-cofid:18-327' },
  // 30 g assumed (a small bag)
  { n: 'Prawn crackers (takeaway)', k: 570, p: 0.3, c: 58.2, f: 39.0, g: 30, cat: 'snacks', eat: true, src: 'cofid-takeaway:11-1023' },

  // ── Chips and sauces ──
  // as CoFID's chips from takeaway fish and chip shops. [L] 462 g (chips with sweet and sour chicken, less the chicken)
  { n: 'Chips (takeaway)', k: 214, p: 3.5, c: 33.2, f: 8.4, g: 462, cat: 'ready', eat: true, src: 'est-cofid:13-485' },
  // takeaway chips tossed with peppers, onion, salt and chilli: as CoFID's takeaway chips. 462 g, as above
  { n: 'Salt and pepper chips', k: 214, p: 3.5, c: 33.2, f: 8.4, g: 462, cat: 'ready', eat: true, src: 'est-cofid:13-485' },
  // [L] chips and curry sauce: 9 meals, 487 g (459-548)
  { n: 'Chips and curry sauce', k: 191, p: 2.5, c: 24.2, f: 9.0, g: 487, cat: 'ready', eat: true, src: 'takeaway-lab:LJMU' },
  // as CoFID's sweet UK-style curry sauce (the same roux-thickened, mild curry sauce). 200 g assumed (a pot)
  { n: 'Chinese curry sauce', k: 92, p: 1.1, c: 9.8, f: 5.7, g: 200, cat: 'sauces', eat: true, src: 'est-cofid:15-751' },
  // dipping sauce bought from Chinese restaurants. 100 g assumed (one pot)
  { n: 'Sweet and sour sauce (takeaway)', k: 157, p: 0.2, c: 32.8, f: 3.4, g: 100, cat: 'sauces', eat: true, src: 'cofid-takeaway:17-336' },
]
