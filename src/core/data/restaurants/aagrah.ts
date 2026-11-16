import type { Food } from '@/core/types'
import { est, PORTION as P } from './estimates'

/**
 * Aagrah (Leeds City, St Peter's Square; the group's shared menu). Aagrah publishes no
 * nutrition: every dish is an ESTIMATE from the closest UK lab-tested CoFID dish (see
 * ./estimates.ts for the method, portions and the known low bias). ±40%.
 *
 * Match quality per line: good = the same dish, CoFID from takeaway or restaurant samples;
 * fair = the same dish from retail, home or recipe data, or a close dish from takeaway samples.
 * Curries are meat and sauce only; log rice and bread separately.
 *
 * Left out (no honest match): Aagrah Special platters and Aagrah Special Biryani; Mixed Grill;
 * machli masala (and Machli Masala Piaz), machli kebab, Raavi, Machli Ravi, Kerala Machli, Goan
 * Machli, garlic prawns, prawn paratha, king prawn tikka, Pasni Jhinga, Shahi Jhinga; seekh,
 * shami and Kashmiri kebabs, chops and Shahi Chops Piaz; chicken wings, chicken chat, chicken
 * pakora, liver tikka, lamb tikka, paneer tikka, aloo tikki, Lahsen mushrooms; Tandoori Chicken,
 * Murgh Lahori Charga and Shahi Murgh/Lamb Tandoori complete meals; creamy lamb and king prawn
 * dishes (Meat/King Prawn Hyderabadi, Meat/King Prawn Makhani, Lamb/King Prawn Tikka Masala,
 * Kuna Gosht, meat korma); Nihari, Bhindi Gosht, Palak Gosht, Shajahan, Chicken & King Prawn
 * Sindhi; prawn and king prawn biryani, vegetable biryani, Lamb Shank Kabuli Pilau; paneer
 * dishes; Kashmiri Mushrooms; vegetable Hyderabadi, achar, Sindhi, makhani and lahsen; Goan king
 * prawn; Special Vegetable Thali; English dishes; family, cheese & onion and keema naan; cheese,
 * keema and aloo paratha; lemon rice, sweet potato chips, pickles, salad; Malai Murgh, Raan,
 * Whole Lamb. Creamy and butter-rich chicken dishes (butter chicken, chicken makhani, Murgh
 * Mughlai): far richer than the takeaway average. Lemon chicken: the menu doesn't describe a
 * curry. Peshwari naan: Aagrah's is made with pineapple, so CoFID 11-910 (nuts and raisins)
 * doesn't fit it.
 */
export const AAGRAH: Food[] = [
  // ---- Starters
  est('Aagrah onion bhaji', '15-828', P.starter), // fair
  est('Aagrah vegetable pakora', '15-620', P.starter), // good: CoFID sampled Leeds and Bradford
  est('Aagrah vegetable samosa', '15-305', P.samosas), // fair: retail samosas
  est('Aagrah meat samosa', '19-326', P.samosas), // good
  est('Aagrah chicken tikka', '19-540', P.starter), // fair: retail tandoori chicken pieces

  // ---- Chicken curries: 19-322, the takeaway average of korma, tikka masala, dhansak, jalfrezi
  //      and dopiaza (good where the dish is one of those five, fair otherwise)
  est('Aagrah chicken korma', '19-322', P.curry), // good
  est('Aagrah Kashmiri korma', '19-322', P.curry), // good
  est('Aagrah chicken Sindhi korma', '19-322', P.curry), // good
  est('Aagrah chicken tikka masala', '19-322', P.curry), // good
  est('Aagrah chicken jalfrezi', '19-322', P.curry), // good
  est('Aagrah chicken dopiaza', '19-322', P.curry), // good
  est('Aagrah chicken madras', '19-322', P.curry), // fair
  est('Aagrah chicken bhuna', '19-322', P.curry), // fair
  est('Aagrah chicken karahi', '19-322', P.curry), // fair
  est('Aagrah chicken Hyderabadi', '19-322', P.curry), // fair
  est('Aagrah chicken achar', '19-322', P.curry), // fair
  est('Aagrah Afghani chicken', '19-322', P.curry), // fair
  est('Aagrah rogan chicken', '19-322', P.curry), // fair
  est('Aagrah chicken palak', '19-322', P.curry), // fair
  est('Aagrah chicken Punjabi masala', '19-322', P.curry), // fair
  est('Aagrah lahsen chicken', '19-322', P.curry), // fair
  est('Aagrah chicken Manglore', '19-322', P.curry), // fair
  est('Aagrah balti chicken', '19-322', P.curry), // fair

  // ---- Lamb ("meat") curries, tomato or yoghurt based: lamb rogan josh recipe
  est('Aagrah meat rogan josh', '19-595', P.curry), // fair
  est('Aagrah lamb karahi', '19-595', P.curry), // fair
  est('Aagrah balti lamb', '19-595', P.curry), // fair
  est('Aagrah lamb Punjabi masala', '19-595', P.curry), // fair
  est('Aagrah gosht achar', '19-595', P.curry), // fair
  est('Aagrah meat bhuna', '19-595', P.curry), // fair
  est('Aagrah meat madras', '19-595', P.curry), // fair
  est('Aagrah meat dopiaza', '19-595', P.curry), // fair
  // keema (minced meat): lamb kheema recipe
  est('Aagrah keema bhuna', '19-480', P.curry), // fair
  est('Aagrah keema madras', '19-480', P.curry), // fair
  est('Aagrah keema dopiaza', '19-480', P.curry), // fair

  // ---- Prawn and king prawn
  est('Aagrah prawn bhuna', '16-365', P.curry), // good
  est('Aagrah prawn madras', '16-366', P.curry), // good
  est('Aagrah king prawn bhuna', '16-365', P.curry), // good
  est('Aagrah king prawn madras', '16-366', P.curry), // good
  est('Aagrah balti king prawn', '16-365', P.curry), // fair
  est('Aagrah rogan jhinga', '16-365', P.curry), // fair
  est('Aagrah king prawn achar', '16-365', P.curry), // fair

  // ---- Biryani (Sindhi, Kashmiri or Bombay recipe), the rice dish alone
  est('Aagrah chicken biryani', '19-454', P.biryani), // good
  est('Aagrah meat biryani', '19-591', P.biryani), // fair: lamb biryani recipe

  // ---- Vegetable curries (mains): vegetable curry ready meals (korma, dhansak, jalfrezi)
  est('Aagrah vegetable korma', '15-619', P.curry), // fair
  est('Aagrah vegetable madras', '15-619', P.curry), // fair
  est('Aagrah vegetable bhuna', '15-619', P.curry), // fair
  est('Aagrah vegetable dopiaza', '15-619', P.curry), // fair
  est('Aagrah balti vegetable', '15-619', P.curry), // fair
  est('Aagrah aloo gobhi', '15-679', P.curry), // fair

  // ---- Side dishes
  est('Aagrah mixed vegetables', '15-619', P.side), // fair
  est('Aagrah aloo palak', '15-695', P.side), // fair
  est('Aagrah aloo bhaji', '15-693', P.side), // fair
  est('Aagrah gobhi bhaji', '15-680', P.side), // fair
  est('Aagrah dall tarka', '15-762', P.side), // fair
  est('Aagrah daal piaz', '15-641', P.side), // fair: chana dal
  est('Aagrah Lahori cholay', '15-108', P.side), // fair
  est('Aagrah mushroom bhaji', '15-681', P.side), // fair
  est('Aagrah bhindi bhaji', '15-627', P.side), // good: analysed samples

  // ---- Sundries
  est('Aagrah naan', '11-973', P.naan, 'grains'), // fair: retail naan
  est('Aagrah garlic naan', '11-973', P.naan, 'grains'), // fair: CoFID sample includes garlic naan
  est('Aagrah plain paratha', '11-1104', P.paratha, 'grains'), // fair
  est('Aagrah chapati', '11-459', P.chapati, 'grains'), // fair
  est('Aagrah tandoori roti', '11-459', P.roti, 'grains'), // fair: fat-free wholemeal flatbread
  est('Aagrah pilau rice', '11-968', P.pilau, 'grains'), // fair
  est('Aagrah mushroom pilau rice', '15-846', P.pilau, 'grains'), // fair
  est('Aagrah plain steamed rice', '11-858', P.boiledRice, 'grains'), // good: plain basmati
  est('Aagrah handcut chips', '13-485', P.chips, 'potato'), // fair: takeaway chips
  est('Aagrah poppadom', '11-998', P.poppadom, 'snacks'), // good
  est('Aagrah mango chutney', '17-343', P.chutney, 'sauces'), // good
  est('Aagrah raita', '17-832', P.raita, 'sauces'), // fair
]
