import type { Food, FoodCategory } from '@/core/types'
import { est, takeawayRow, PORTION as P } from '../restaurants/estimates'
import { composite } from './other'

/**
 * UK Indian, Pakistani and Bangladeshi takeaway and curry-house dishes under plain generic names
 * (no restaurant's own figures). Curries are meat and sauce only: log rice and bread separately,
 * as in ../restaurants/estimates.ts, except the few whole meals a lab weighed as sold (marked).
 *
 * Values, best evidence first:
 * 1. `cofid-takeaway:<code>` (±30%): CoFID sampled this very dish from UK takeaways; the CoFID 2021
 *    row exactly. Audit records: docs/data/food-audit-2026-10-indian.json.
 * 2. `takeaway-lab:Blackham2022` (±30%): a UK lab analysis of real takeaway meals, median per
 *    100 g and median portion as sold, from [B22] Blackham T (2022) PhD thesis, LJMU (Research
 *    Online eprint 20540), Appendix Table 8.5 (energy, protein, carbohydrate per 100 g), Table 8.6
 *    (fat per 100 g) and Table 8.3 (meal weight). The sampling is [J14] Jaworowska A, Blackham T,
 *    Long R, Taylor C, Ashton M, Stevenson L, Davies IG (2014) Nutritional composition of takeaway
 *    food in the UK. Nutr Food Sci 44(5):414-430, doi:10.1108/NFS-08-2013-0093: independent
 *    takeaways in Liverpool, Wirral and Knowsley. Each is a whole meal as sold (curry with its
 *    rice or chips). [B22] also has two curries bought without rice (Knowsley, n = 3 each), per
 *    100 g: chicken tikka masala 173 kcal, 10.9 g protein, 15.5 g carbs, 8.6 g fat (510 g); lamb
 *    rogan josh 184 kcal, 12.0 g protein, 6.6 g carbs, 13.9 g fat (470 g). Too few to list (n = 3),
 *    but both read higher than the CoFID estimates below (145 and 149 kcal), in line with the
 *    known low bias.
 * 3. `est-cofid:<code>` (±40%, an estimate): the closest CoFID dish, lab-tested or recipe-calculated,
 *    exactly as CoFID gives it (see ../restaurants/estimates.ts for the method and its known low
 *    bias against real takeaways). Match quality per line, as in ../restaurants/aagrah.ts:
 *    good = the same dish from takeaway samples; fair = the same dish from retail, home or recipe
 *    data, or a close dish from takeaway samples; poor = the nearest honest match, likely to read
 *    low or high as noted.
 * 4. `est-cofid:<code>+<code>` (±40%, an estimate): a composite (paneer dishes, cheese naan), the
 *    weighted sum of CoFID components with ASSUMPTION amounts (see ./other.ts COMPOSITES;
 *    check:foods recomputes each from its audit record).
 *
 * `aka`: other names people search for a dish by ("dhal", "lamb curry"); see core/domain/search.ts.
 *
 * Portions: ../restaurants/estimates.ts PORTION (safefood 2015 and [J14] where published, else
 * marked ASSUMPTION there), plus the assumptions below.
 */

/** ASSUMPTION (no published weight for any of these): edible meat of a quarter tandoori chicken, off the bone */
const TANDOORI_QUARTER = 150
/** ASSUMPTION: a tandoori or grill main (shashlik, mixed grill, tandoori king prawns) */
const GRILL_MAIN = 250
/** ASSUMPTION: two gulab jamun with their syrup */
const GULAB = 80
/** ASSUMPTION: one puri */
const PURI = 40

/** A dish from a UK takeaway lab analysis ([B22]): median per 100 g, median portion. */
function lab(n: string, k: number, p: number, c: number, f: number, g: number, cat: FoodCategory = 'ready'): Food {
  return { n, k, p, c, f, g, cat, src: 'takeaway-lab:Blackham2022', eat: true }
}

export const INDIAN_TAKEAWAY: Food[] = [
  // ── Starters ──
  // the app already has "Onion bhaji" (CoFID 15-828, one bhaji) and "Samosa" (vegetable, one)
  takeawayRow('Vegetable pakora', '15-620', P.starter), // good: 11 takeaway and restaurant samples
  est('Chicken pakora', '18-501', P.starter), // fair: coated chicken pieces fried by takeaways (breadcrumb, not gram flour)
  est('Fish pakora', '16-368', P.starter), // fair: battered white fish, takeaway
  takeawayRow('Meat samosas', '19-326', P.samosas), // good: Indian restaurant samples; two samosas
  est('Vegetable samosas', '15-305', P.samosas), // fair: retail; two samosas
  est('Chicken tikka', '19-540', P.starter), // fair: retail tandoori chicken pieces
  est('Lamb tikka', '18-172', P.starter), // fair: grilled diced lamb, unmarinated
  est('Seekh kebab', '19-642', P.starter), // fair: spiced minced beef kofta (seekh is usually lamb)
  est('Shami kebab', '19-594', P.starter), // poor: lamb kofta in breadcrumbs (shami binds with lentils)
  est('Tandoori chicken, quarter (meat off the bone)', '19-540', TANDOORI_QUARTER), // fair
  est('Tandoori chicken, half (meat off the bone)', '19-540', TANDOORI_QUARTER * 2), // fair
  est('Chicken wings, tandoori (meat off the bone)', '19-541', P.starter), // fair: marinated barbecued wings
  est('Aloo tikki', '15-849', P.starter), // fair: fried potato cakes
  est('Chicken chaat', '19-322', P.starter), // fair: chicken in a spiced sauce, takeaway curry average
  takeawayRow('Poppadom (papadom, papadum)', '11-998', P.poppadom, 'snacks'), // good: one poppadom
  est('Puri', '11-911', PURI, 'grains'), // fair: deep-fried bread, incl. café samples
  est('Mango chutney', '17-343', P.chutney, 'sauces'), // good
  est('Mint yoghurt sauce', '17-832', P.chutney, 'sauces'), // fair: spiced yoghurt raita
  est('Raita', '17-832', P.raita, 'sauces'), // fair

  // ── Chicken curries ── 19-322, CoFID's takeaway chicken curry: 50 takeaway samples, 10 each of
  // korma, tikka masala, dhansak, jalfrezi and dopiaza, pooled into one row. That pooled row is
  // the generic takeaway chicken curry itself; for any one named curry it is an estimate (good for
  // those five, fair for the rest, poor for the creamy, butter-rich ones)
  takeawayRow('Chicken curry, Indian (takeaway)', '19-322', P.curry),
  est('Chicken korma', '19-322', P.curry), // good
  // good; the app's "Chicken tikka masala" (CoFID 19-296) is retail. The aka puts this one first
  { ...est('Chicken tikka masala (takeaway)', '19-322', P.curry), aka: ['chicken tikka masala', 'tikka masala'] },
  est('Chicken dhansak', '19-322', P.curry), // good
  est('Chicken jalfrezi', '19-322', P.curry), // good
  est('Chicken dopiaza', '19-322', P.curry), // good
  est('Chicken madras', '19-322', P.curry), // fair
  est('Chicken vindaloo', '19-322', P.curry), // fair
  est('Chicken phall', '19-322', P.curry), // fair
  est('Chicken bhuna', '19-322', P.curry), // fair
  est('Chicken rogan josh', '19-322', P.curry), // fair
  est('Chicken balti', '19-322', P.curry), // fair
  est('Chicken karahi', '19-322', P.curry), // fair
  est('Chicken pathia', '19-322', P.curry), // fair
  est('Chicken saag', '19-322', P.curry), // fair
  est('Chicken methi', '19-322', P.curry), // fair
  est('Chicken achari', '19-322', P.curry), // fair
  est('Butter chicken', '19-322', P.curry), // poor: reads low
  est('Chicken makhani', '19-322', P.curry), // poor: reads low
  est('Chicken pasanda', '19-322', P.curry), // poor: reads low

  // ── Lamb curries ── lamb rogan josh recipe (fair), except where noted
  { ...est('Lamb rogan josh', '19-595', P.curry), aka: ['lamb curry'] }, // fair: the same dish, recipe
  est('Lamb vindaloo', '19-599', P.curry), // fair: lamb vindaloo recipe
  est('Lamb madras', '19-595', P.curry), // fair
  est('Lamb bhuna', '19-595', P.curry), // fair
  est('Lamb balti', '19-595', P.curry), // fair
  est('Lamb karahi', '19-595', P.curry), // fair
  est('Lamb jalfrezi', '19-595', P.curry), // fair
  est('Lamb dopiaza', '19-595', P.curry), // fair
  est('Lamb dhansak', '19-595', P.curry), // fair (no lentils)
  est('Lamb pathia', '19-595', P.curry), // fair
  est('Lamb saag', '19-595', P.curry), // fair
  est('Lamb achari', '19-595', P.curry), // fair
  est('Lamb korma', '19-595', P.curry), // poor: creamy, reads low
  est('Lamb tikka masala', '19-595', P.curry), // poor: creamy, reads low
  est('Lamb pasanda', '19-595', P.curry), // poor: creamy, reads low
  est('Keema curry', '19-480', P.curry), // fair: lamb mince curry recipe

  // ── Prawn and king prawn curries ── CoFID's takeaway prawn bhuna and madras, and their average
  takeawayRow('Prawn bhuna', '16-365', P.curry), // 10 takeaway samples
  takeawayRow('Prawn madras', '16-366', P.curry), // 10 takeaway samples
  est('Prawn vindaloo', '16-366', P.curry), // fair: madras sauce
  est('Prawn korma', '16-333', P.curry), // poor: creamy, reads low
  est('Prawn jalfrezi', '16-333', P.curry), // fair
  est('Prawn dhansak', '16-333', P.curry), // fair (no lentils)
  est('Prawn pathia', '16-333', P.curry), // fair
  est('Prawn saag', '16-333', P.curry), // fair
  est('King prawn bhuna', '16-365', P.curry), // good
  est('King prawn madras', '16-366', P.curry), // good
  est('King prawn rogan josh', '16-365', P.curry), // fair
  est('King prawn jalfrezi', '16-333', P.curry), // fair
  est('King prawn balti', '16-365', P.curry), // fair
  est('King prawn karahi', '16-365', P.curry), // fair
  est('King prawn dopiaza', '16-333', P.curry), // fair
  est('King prawn korma', '16-333', P.curry), // poor: creamy, reads low
  est('King prawn tikka masala', '16-333', P.curry), // poor: creamy, reads low

  // ── Vegetable and paneer curries (mains) ── retail vegetable curry (korma, dhansak, jalfrezi samples)
  est('Vegetable korma', '15-619', P.curry), // fair
  est('Vegetable madras', '15-619', P.curry), // fair
  est('Vegetable bhuna', '15-619', P.curry), // fair
  est('Vegetable jalfrezi', '15-619', P.curry), // fair
  est('Vegetable balti', '15-619', P.curry), // fair
  est('Vegetable dhansak', '15-619', P.curry), // fair
  est('Vegetable dopiaza', '15-619', P.curry), // fair
  est('Vegetable vindaloo', '15-619', P.curry), // fair
  // paneer: CoFID has paneer (12-495) but no paneer curry, so these are composites. Amounts are
  // ASSUMPTIONS (no published recipe split); the totals keep P.curry and P.side
  // paneer 150 g + retail korma/tikka masala cooking sauce 370 g = 520 g (a jar sauce, so likely low
  // in fat against a takeaway's)
  composite('Paneer tikka masala', [['12-495', 150], ['17-626', 370]], 'ready'),
  // paneer 120 g + boiled peas 150 g + tomato and onion curry sauce 250 g = 520 g (the sauce is an
  // oily home recipe, so likely high in fat)
  { ...composite('Mattar paneer', [['12-495', 120], ['13-536', 150], ['15-881', 250]], 'ready'), aka: ['matar paneer', 'mutter paneer'] },
  // analysed spinach curry 175 g + paneer 75 g = 250 g (a side)
  { ...composite('Saag paneer', [['15-629', 175], ['12-495', 75]], 'ready'), aka: ['palak paneer'] },

  // ── Biryanis ── the rice dish alone; log its curry sauce or raita separately
  takeawayRow('Chicken biryani', '19-454', P.biryani), // good: 10 takeaway samples
  est('Lamb biryani', '19-591', P.biryani), // fair: recipe
  est('Prawn biryani', '19-454', P.biryani), // fair: takeaway chicken biryani
  est('King prawn biryani', '19-454', P.biryani), // fair
  est('Special biryani', '19-454', P.biryani), // fair: mixed meats and prawns
  // [J14] ([B22]) vegetable biryani as sold (often with its vegetable curry sauce), n = 10: 834 g
  lab('Vegetable biryani', 151, 2.8, 15.4, 7.9, 834),

  // ── Tandoori and grill mains ──
  est('Chicken shashlik', '19-540', GRILL_MAIN), // fair: tandoori chicken pieces (the peppers and onion lower it)
  est('Mixed grill', '19-540', GRILL_MAIN), // poor: tandoori chicken only; seekh and lamb make it richer
  est('Tandoori king prawns', '16-388', GRILL_MAIN), // poor: grilled king prawns without the marinade, reads low

  // ── Whole meals as weighed by [J14] ([B22] Tables 8.3, 8.5, 8.6: curry with its rice or chips; medians, n = 10-22) ──
  lab('Chicken korma with pilau rice', 179, 7.4, 17.3, 8.5, 869), // n = 10
  lab('Chicken tikka masala with keema rice', 187, 8.9, 16.9, 9.6, 808), // n = 21
  lab('Lamb rogan josh with pilau rice', 174, 7.6, 16.1, 7.9, 758), // n = 10
  lab('King prawn rogan josh with pilau rice', 136, 4.6, 17.8, 4.6, 772), // n = 22
  lab('Lamb bhuna with chips', 206, 7.0, 18.4, 11.2, 745), // n = 22
  // chips and curry sauce is "Chips and curry sauce (takeaway)" in other.ts

  // ── Vegetable side dishes ── (P.side, about half a main)
  est('Saag aloo', '15-695', P.side), // fair: spinach and potato bhaji
  est('Bombay aloo', '15-739', P.side), // fair: Bombay potato curry recipe
  est('Aloo gobi', '15-679', P.side), // fair: cauliflower and potato bhaji
  est('Chana masala', '15-108', P.side), // fair: chickpea and tomato curry
  { ...est('Tarka dal', '15-762', P.side), aka: ['dal', 'dhal', 'dahl', 'daal', 'lentil curry'] }, // fair: red lentil dal
  est('Bhindi bhaji', '15-627', P.side), // good: analysed okra curry
  est('Mushroom bhaji', '15-681', P.side), // fair
  est('Cauliflower bhaji', '15-680', P.side), // fair
  est('Saag bhaji', '15-629', P.side), // fair: analysed spinach curry
  est('Vegetable bhaji (side dish)', '15-699', P.side), // fair: mixed vegetable bhaji recipe

  // ── Rice ── the app already has "Egg fried rice" (CoFID, takeaway) and "Egg fried rice (takeaway)"
  est('Pilau rice', '11-968', P.pilau, 'grains'), // fair: recipe
  est('Boiled rice, Indian takeaway', '11-858', P.boiledRice, 'grains'), // good: boiled basmati
  est('Mushroom rice', '15-846', P.pilau, 'grains'), // fair: mushroom pilau recipe
  est('Vegetable rice', '12-472', P.pilau, 'grains'), // fair: analysed vegetable pilau
  est('Keema rice', '19-591', P.pilau, 'grains'), // poor: lamb biryani recipe (rice cooked with lamb)

  // ── Breads ── retail naan includes garlic and coriander samples
  est('Plain naan', '11-973', P.naan, 'grains'), // fair
  est('Garlic naan', '11-973', P.naan, 'grains'), // fair
  takeawayRow('Peshwari naan', '11-910', P.naan, 'grains'), // good: half the samples from takeaways
  est('Keema naan', '11-973', P.naan, 'grains'), // poor: plain naan, the mince filling adds protein
  // ASSUMPTION: a plain naan (173 g, safefood 2015) + 40 g cheddar = 213 g
  composite('Cheese naan', [['11-973', 173], ['12-346', 40]], 'grains'),
  est('Kulcha', '11-973', P.naan, 'grains'), // fair: leavened flatbread
  est('Chapati', '11-459', P.chapati, 'grains'), // fair
  est('Tandoori roti', '11-459', P.roti, 'grains'), // fair
  est('Paratha', '11-1104', P.paratha, 'grains'), // fair

  // ── Other ── chips are "Chips, small/regular/large (takeaway)" and curry sauce is "Curry sauce,
  // chip shop (takeaway)" in other.ts
  // portion: [J14] Table 2, shish kebab (meat in bread with salad) median 386 g, n = 21
  est('Chicken tikka naan wrap', '19-525', 386), // poor: shish kebab in pitta with salad; naan is denser, reads low

  // ── Desserts and drinks ── (CoFID gives lassi per 100 g; stored per 100 ml, as the base milkshake is)
  est('Gulab jamun', '11-1083', GULAB, 'snacks'), // fair: recipe
  takeawayRow('Sweet lassi', '12-373', P.lassi, 'drinks', true), // good: takeaway and retail samples
  est('Mango lassi', '12-373', P.lassi, 'drinks', true), // fair: sweet lassi without the mango
]
