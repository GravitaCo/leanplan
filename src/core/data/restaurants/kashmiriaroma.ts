import type { Food } from '@/core/types'
import { est, PORTION as P } from './estimates'

/**
 * Kashmiri Aroma, Bradford (table menu, 2022). No published nutrition: every dish is an
 * ESTIMATE from the closest UK lab-tested CoFID dish (see ./estimates.ts for the method,
 * portions and the known low bias). ±40%. Match quality as in ./aagrah.ts.
 *
 * Karahis come on or off the bone: the serving is the edible weight (off the bone). Curries are
 * meat and sauce only; log rice and bread separately.
 *
 * Left out (no honest match): Special Tandoori Mix, Tawa sharing platter; samosa chaat, channa
 * chaat, gol gappay, masala fries; machli masala, king prawns tikka, liver tikka, lamb chops,
 * chicken wings, seekh and shami kebab; namkeen karahi gosht; paya, nihari, maghaz masala, saag
 * gosht, bhindi gosht; balti paneer; creamy mutton and king prawn dishes (Hyderabadi, makhni,
 * meat korma, king prawn tikka masala); desi butter chicken and chicken makhni (far richer than
 * the takeaway average); machli achar and Hyderabadi; king prawn biryani; keema
 * and aloo naan, aloo paratha, green chutney, pickles, salad; salty and strawberry lassi,
 * mocktails, milkshakes, soft drinks; pizzas, burgers, loaded naans and parmesans.
 */
export const KASHMIRI_AROMA: Food[] = [
  // ---- Starters
  est('Kashmiri Aroma chicken tikka', '19-540', P.starter), // fair: retail tandoori chicken pieces
  est('Kashmiri Aroma meat samosa', '19-326', P.samosas), // good
  est('Kashmiri Aroma vegetable samosa', '15-305', P.samosas), // fair
  est('Kashmiri Aroma onion pakora', '15-828', P.starter), // fair: onion in gram flour batter

  // ---- Desi karahis
  est('Kashmiri Aroma Punjabi karahi chicken', '19-322', P.curry), // fair
  est('Kashmiri Aroma charsi karahi chicken', '19-322', P.curry), // fair
  est('Kashmiri Aroma Afghani karahi murgh', '19-322', P.curry), // fair
  est('Kashmiri Aroma chicken tikka karahi', '19-322', P.curry), // fair
  est('Kashmiri Aroma Punjabi karahi gosht', '19-595', P.curry), // fair: lamb rogan josh recipe
  est('Kashmiri Aroma charsi karahi lamb', '19-595', P.curry), // fair
  est('Kashmiri Aroma Afghani karahi gosht', '19-595', P.curry), // fair
  est('Kashmiri Aroma karahi machli', '16-364', P.curry), // fair: analysed white fish curry
  est('Kashmiri Aroma karahi king prawns', '16-365', P.curry), // fair

  // ---- Mains
  est('Kashmiri Aroma chicken masala', '19-322', P.curry), // fair
  est('Kashmiri Aroma Mangalore chicken', '19-322', P.curry), // fair
  est('Kashmiri Aroma murgh saag', '19-322', P.curry), // fair
  est('Kashmiri Aroma balti chicken', '19-322', P.curry), // fair
  est('Kashmiri Aroma meat masala', '19-595', P.curry), // fair (mutton)
  est('Kashmiri Aroma balti gosht', '19-595', P.curry), // fair (mutton)
  est('Kashmiri Aroma balti keema mattar', '19-480', P.curry), // fair: lamb kheema recipe

  // ---- Achar, Hyderabadi and rogan josh dishes
  est('Kashmiri Aroma chicken achar', '19-322', P.curry), // fair
  est('Kashmiri Aroma chicken Hyderabadi', '19-322', P.curry), // fair
  est('Kashmiri Aroma chicken rogan josh', '19-322', P.curry), // fair
  est('Kashmiri Aroma mutton achar', '19-595', P.curry), // fair
  est('Kashmiri Aroma mutton rogan josh', '19-595', P.curry), // fair: same dish, lamb recipe
  est('Kashmiri Aroma jhinga achar', '16-365', P.curry), // fair
  est('Kashmiri Aroma jhinga rogan josh', '16-365', P.curry), // fair

  // ---- Old favourites
  est('Kashmiri Aroma chicken korma', '19-322', P.curry), // good
  est('Kashmiri Aroma chicken tikka masala', '19-322', P.curry), // good
  est('Kashmiri Aroma chicken bhuna', '19-322', P.curry), // fair
  est('Kashmiri Aroma mutton bhuna', '19-595', P.curry), // fair

  // ---- Vegetable dishes, side or main size
  est('Kashmiri Aroma aloo gobhi (side)', '15-679', P.side), // fair
  est('Kashmiri Aroma aloo gobhi (main)', '15-679', P.curry), // fair
  est('Kashmiri Aroma aloo palak (side)', '15-695', P.side), // fair
  est('Kashmiri Aroma aloo palak (main)', '15-695', P.curry), // fair
  est('Kashmiri Aroma bhindi (side)', '15-627', P.side), // good: analysed samples
  est('Kashmiri Aroma bhindi (main)', '15-627', P.curry), // good
  est('Kashmiri Aroma daal tarka (side)', '15-762', P.side), // fair
  est('Kashmiri Aroma daal tarka (main)', '15-762', P.curry), // fair
  est('Kashmiri Aroma chana masala (side)', '15-108', P.side), // fair
  est('Kashmiri Aroma chana masala (main)', '15-108', P.curry), // fair

  // ---- Biryanis, the rice dish alone (the vegetable curry sauce is separate)
  est('Kashmiri Aroma chicken biryani', '19-454', P.biryani), // good
  est('Kashmiri Aroma lamb biryani', '19-591', P.biryani), // fair: lamb biryani recipe

  // ---- Sundries
  est('Kashmiri Aroma plain naan', '11-973', P.naan, 'grains'), // fair: retail naan
  est('Kashmiri Aroma garlic naan', '11-973', P.naan, 'grains'), // fair
  // the menu gives no description: assumed the usual nuts-and-raisins Peshawari naan
  est('Kashmiri Aroma Peshawari naan', '11-910', P.naan, 'grains'), // fair
  est('Kashmiri Aroma plain paratha', '11-1104', P.paratha, 'grains'), // fair
  est('Kashmiri Aroma tandoori roti', '11-459', P.roti, 'grains'), // fair
  est('Kashmiri Aroma chapati', '11-459', P.chapati, 'grains'), // fair
  est('Kashmiri Aroma pilau rice', '11-968', P.pilau, 'grains'), // fair
  est('Kashmiri Aroma boiled rice', '11-858', P.boiledRice, 'grains'), // good: plain basmati
  est('Kashmiri Aroma chips', '13-485', P.chips, 'potato'), // fair: takeaway chips
  est('Kashmiri Aroma poppadom', '11-998', P.poppadom, 'snacks'), // good
  est('Kashmiri Aroma mango chutney', '17-343', P.chutney, 'sauces'), // good
  est('Kashmiri Aroma raita', '17-832', P.raita, 'sauces'), // fair

  // ---- Drinks (CoFID gives lassi per 100 g; stored per 100 ml, as the base milkshake is)
  est('Kashmiri Aroma sweet lassi', '12-373', P.lassi, 'drinks', true), // good
  est('Kashmiri Aroma mango lassi', '12-373', P.lassi, 'drinks', true), // fair
]
