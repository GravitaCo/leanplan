import type { Food } from '@/core/types'
import { GREGGS } from './chains/greggs'
import { KFC } from './chains/kfc'
import { POPEYES } from './chains/popeyes'
import { PIZZAHUT } from './chains/pizzahut'
import { BURGERKING } from './chains/burgerking'
import { NANDOS } from './chains/nandos'
import { INGREDIENTS } from './ingredients'

/** Built-in food database — values per 100 g (per 100 ml when `ml` is set, per item when
 *  `each` is set). `src` cites where the values come from (see `sources.ts`); every change
 *  must pass `npm run check:foods`. `cat` sets the default hand portion; `cook` marks plain
 *  foods usually cooked in fat, which get the one cooking-fat question. */
const BASE: Food[] = [
  {
    "n": "Chicken breast, cooked",
    "k": 148,
    "p": 32.0,
    "c": 0.0,
    "f": 2.2,
    "g": 150,
    "cat": "meat",
    "cook": true,
    "src": "cofid:18-323"
  },
  {
    "n": "Chicken thigh, cooked",
    "k": 196,
    "p": 24.4,
    "c": 0.0,
    "f": 10.9,
    "g": 150,
    "cat": "meat",
    "cook": true,
    "src": "cofid:18-329"
  },
  {
    "n": "Chicken, roast (with skin)",
    "k": 218,
    "p": 26.3,
    "c": 0.0,
    "f": 12.5,
    "g": 150,
    "cat": "meat",
    "src": "cofid:18-341"
  },
  {
    "n": "Turkey breast, cooked",
    "k": 155,
    "p": 35.0,
    "c": 0.0,
    "f": 1.7,
    "g": 150,
    "cat": "meat",
    "cook": true,
    "src": "cofid:18-356"
  },
  {
    "n": "Turkey mince, cooked",
    "k": 176,
    "p": 28.6,
    "c": 0.0,
    "f": 6.8,
    "g": 150,
    "cat": "meat",
    "cook": true,
    "src": "cofid:18-354"
  },
  {
    "n": "Beef mince 5% fat, cooked",
    "k": 137,
    "p": 24.7,
    "c": 0.0,
    "f": 4.2,
    "g": 150,
    "cat": "meat",
    "cook": true,
    "src": "cofid:18-507"
  },
  {
    "n": "Beef, roast",
    "k": 222,
    "p": 29.9,
    "c": 0.0,
    "f": 11.4,
    "g": 150,
    "cat": "meat",
    "src": "cofid:18-089"
  },
  {
    "n": "Beef burger patty, cooked",
    "k": 326,
    "p": 26.5,
    "c": 0.1,
    "f": 24.4,
    "g": 120,
    "cat": "meat",
    "cook": true,
    "src": "cofid:19-491"
  },
  {
    "n": "Pork chop, cooked",
    "k": 237,
    "p": 33.3,
    "c": 0.0,
    "f": 11.5,
    "g": 150,
    "cat": "meat",
    "cook": true,
    "src": "cofid:18-535"
  },
  {
    "n": "Pork loin, cooked",
    "k": 210,
    "p": 34.4,
    "c": 0.0,
    "f": 8.0,
    "g": 150,
    "cat": "meat",
    "cook": true,
    "src": "cofid:18-525"
  },
  {
    "n": "Gammon / ham steak, cooked",
    "k": 199,
    "p": 27.5,
    "c": 0.0,
    "f": 9.9,
    "g": 150,
    "cat": "meat",
    "cook": true,
    "src": "cofid:19-505"
  },
  {
    "n": "Lamb chop, cooked",
    "k": 305,
    "p": 26.5,
    "c": 0.0,
    "f": 22.1,
    "g": 120,
    "cat": "meat",
    "cook": true,
    "src": "cofid:18-477"
  },
  {
    "n": "Lamb mince, cooked",
    "k": 208,
    "p": 24.4,
    "c": 0.0,
    "f": 12.3,
    "g": 150,
    "cat": "meat",
    "cook": true,
    "src": "cofid:18-159"
  },
  {
    "n": "Pork sausage, cooked (1 ~50g)",
    "k": 294,
    "p": 14.5,
    "c": 9.8,
    "f": 22.1,
    "g": 50,
    "cat": "meat",
    "cook": true,
    "src": "cofid:19-509"
  },
  {
    "n": "Bacon, grilled",
    "k": 287,
    "p": 23.2,
    "c": 0.0,
    "f": 21.6,
    "g": 50,
    "cat": "meat",
    "src": "cofid:19-500"
  },
  {
    "n": "Bacon medallion, grilled",
    "k": 158,
    "p": 28.9,
    "c": 1.1,
    "f": 4.3,
    "g": 40,
    "cat": "meat",
    "src": "cofid:19-644"
  },
  {
    "n": "Black pudding",
    "k": 297,
    "p": 10.3,
    "c": 16.6,
    "f": 21.5,
    "g": 60,
    "cat": "meat",
    "src": "cofid:19-114"
  },
  {
    "n": "Ham, sliced",
    "k": 107,
    "p": 18.4,
    "c": 1.0,
    "f": 3.3,
    "g": 40,
    "cat": "meat",
    "src": "cofid:19-496"
  },
  {
    "n": "Chorizo",
    "k": 395,
    "p": 24.0,
    "c": 2.4,
    "f": 32.2,
    "g": 30,
    "cat": "meat",
    "src": "cofid:19-516"
  },
  {
    "n": "Salami",
    "k": 438,
    "p": 20.9,
    "c": 0.5,
    "f": 39.2,
    "g": 30,
    "cat": "meat",
    "src": "cofid:19-517"
  },
  {
    "n": "Pepperoni",
    "k": 504,
    "p": 19.2,
    "c": 1.2,
    "f": 46.3,
    "g": 20,
    "cat": "meat",
    "src": "usda:174575"
  },
  {
    "n": "Corned beef",
    "k": 205,
    "p": 25.9,
    "c": 1.0,
    "f": 10.9,
    "g": 50,
    "cat": "meat",
    "src": "cofid:19-128"
  },
  {
    "n": "Sausage roll",
    "k": 352,
    "p": 8.4,
    "c": 27.0,
    "f": 24.1,
    "g": 60,
    "cat": "meat",
    "src": "cofid:19-468"
  },
  {
    "n": "Scotch egg",
    "k": 241,
    "p": 12.0,
    "c": 13.1,
    "f": 16.0,
    "g": 120,
    "cat": "meat",
    "src": "cofid:19-518"
  },
  {
    "n": "Chicken nuggets, cooked",
    "k": 256,
    "p": 14.4,
    "c": 19.6,
    "f": 13.9,
    "g": 100,
    "cat": "meat",
    "src": "cofid:18-503"
  },
  {
    "n": "Breaded chicken, cooked",
    "k": 234,
    "p": 17.7,
    "c": 15.8,
    "f": 11.6,
    "g": 130,
    "cat": "meat",
    "src": "cofid:18-504"
  },
  {
    "n": "Salmon fillet, cooked",
    "k": 232,
    "p": 25.2,
    "c": 0.0,
    "f": 14.6,
    "g": 130,
    "cat": "fish",
    "cook": true,
    "src": "cofid:16-359"
  },
  {
    "n": "Smoked salmon",
    "k": 184,
    "p": 22.8,
    "c": 0.5,
    "f": 10.1,
    "g": 50,
    "cat": "fish",
    "src": "cofid:16-412"
  },
  {
    "n": "Tuna, canned in water",
    "k": 109,
    "p": 24.9,
    "c": 0.0,
    "f": 1.0,
    "g": 100,
    "cat": "fish",
    "src": "cofid:16-416"
  },
  {
    "n": "Tuna steak, cooked",
    "k": 136,
    "p": 32.3,
    "c": 0.0,
    "f": 0.8,
    "g": 130,
    "cat": "fish",
    "cook": true,
    "src": "cofid:16-400"
  },
  {
    "n": "Cod, cooked",
    "k": 100,
    "p": 23.9,
    "c": 0.0,
    "f": 0.5,
    "g": 130,
    "cat": "fish",
    "cook": true,
    "src": "cofid:16-373"
  },
  {
    "n": "Haddock, cooked",
    "k": 98,
    "p": 23.9,
    "c": 0.0,
    "f": 0.3,
    "g": 130,
    "cat": "fish",
    "cook": true,
    "src": "cofid:16-376"
  },
  {
    "n": "Sea bass, cooked",
    "k": 154,
    "p": 23.2,
    "c": 0.0,
    "f": 6.8,
    "g": 130,
    "cat": "fish",
    "cook": true,
    "src": "cofid:16-386"
  },
  {
    "n": "Mackerel, cooked",
    "k": 283,
    "p": 20.3,
    "c": 0.0,
    "f": 22.4,
    "g": 120,
    "cat": "fish",
    "cook": true,
    "src": "cofid:16-394"
  },
  {
    "n": "Sardines, canned in oil",
    "k": 220,
    "p": 23.3,
    "c": 0.0,
    "f": 14.1,
    "g": 90,
    "cat": "fish",
    "src": "cofid:16-440"
  },
  {
    "n": "Sardines, canned in tomato",
    "k": 175,
    "p": 18.5,
    "c": 0.9,
    "f": 10.8,
    "g": 90,
    "cat": "fish",
    "src": "cofid:16-422"
  },
  {
    "n": "Prawns, cooked",
    "k": 70,
    "p": 15.4,
    "c": 0.0,
    "f": 0.9,
    "g": 100,
    "cat": "fish",
    "cook": true,
    "src": "cofid:16-384"
  },
  {
    "n": "Fish fingers, cooked (3)",
    "k": 223,
    "p": 14.3,
    "c": 22.0,
    "f": 9.2,
    "g": 90,
    "cat": "fish",
    "src": "cofid:16-405"
  },
  {
    "n": "Breaded fish, cooked",
    "k": 204,
    "p": 13.7,
    "c": 19.8,
    "f": 8.3,
    "g": 120,
    "cat": "fish",
    "src": "cofid:16-370"
  },
  {
    "n": "Egg, whole (1 = 50g)",
    "k": 131,
    "p": 12.6,
    "c": 0.0,
    "f": 9.0,
    "g": 50,
    "cat": "eggs",
    "cook": true,
    "src": "cofid:12-937"
  },
  {
    "n": "Egg white",
    "k": 43,
    "p": 10.8,
    "c": 0.0,
    "f": 0.0,
    "g": 33,
    "cat": "eggs",
    "cook": true,
    "src": "cofid:12-938"
  },
  {
    "n": "Egg, fried",
    "k": 200,
    "p": 14.7,
    "c": 0.0,
    "f": 15.7,
    "g": 50,
    "cat": "eggs",
    "src": "cofid:12-944"
  },
  {
    "n": "Tofu, firm",
    "k": 144,
    "p": 15,
    "c": 3,
    "f": 9,
    "g": 100,
    "cat": "eggs",
    "cook": true,
    "src": "label"
  },
  {
    "n": "Quorn pieces",
    "k": 73,
    "p": 14.0,
    "c": 1.1,
    "f": 1.4,
    "g": 100,
    "cat": "eggs",
    "cook": true,
    "src": "cofid:13-574"
  },
  {
    "n": "Tempeh",
    "k": 166,
    "p": 20.7,
    "c": 6.4,
    "f": 6.4,
    "g": 100,
    "cat": "eggs",
    "cook": true,
    "src": "cofid:13-118"
  },
  {
    "n": "Falafel",
    "k": 183,
    "p": 6.4,
    "c": 15.9,
    "f": 11.2,
    "g": 100,
    "cat": "eggs",
    "src": "cofid:15-795"
  },
  {
    "n": "Edamame beans",
    "k": 142,
    "p": 12.2,
    "c": 6.5,
    "f": 7.6,
    "g": 80,
    "cat": "eggs",
    "src": "cofid:13-667"
  },
  {
    "n": "Lentils, cooked",
    "k": 92,
    "p": 7.8,
    "c": 14.5,
    "f": 0.7,
    "g": 150,
    "cat": "eggs",
    "src": "cofid:13-661"
  },
  {
    "n": "Chickpeas, cooked",
    "k": 129,
    "p": 8.4,
    "c": 18.3,
    "f": 3.0,
    "g": 150,
    "cat": "eggs",
    "src": "cofid:13-662"
  },
  {
    "n": "Kidney beans, cooked",
    "k": 100,
    "p": 8.6,
    "c": 15.1,
    "f": 1.0,
    "g": 150,
    "cat": "eggs",
    "src": "cofid:13-659"
  },
  {
    "n": "Black beans, cooked",
    "k": 132,
    "p": 8.9,
    "c": 23.7,
    "f": 0.5,
    "g": 150,
    "cat": "eggs",
    "src": "usda:173735"
  },
  {
    "n": "Baked beans",
    "k": 81,
    "p": 5.0,
    "c": 15.0,
    "f": 0.5,
    "g": 200,
    "cat": "eggs",
    "src": "cofid:13-532"
  },
  {
    "n": "Hummus",
    "k": 307,
    "p": 6.8,
    "c": 10.5,
    "f": 26.7,
    "g": 50,
    "cat": "eggs",
    "src": "cofid:13-556"
  },
  {
    "n": "Whey protein powder (scoop ~30g)",
    "k": 380,
    "p": 78,
    "c": 8,
    "f": 5,
    "g": 30,
    "cat": "eggs",
    "src": "label"
  },
  {
    "n": "Milk, whole",
    "k": 63,
    "p": 3.4,
    "c": 4.6,
    "f": 3.6,
    "g": 200,
    "cat": "dairy",
    "src": "cofid:12-596"
  },
  {
    "n": "Milk, semi-skimmed",
    "k": 46,
    "p": 3.5,
    "c": 4.7,
    "f": 1.7,
    "g": 200,
    "cat": "dairy",
    "src": "cofid:12-313"
  },
  {
    "n": "Milk, skimmed",
    "k": 34,
    "p": 3.5,
    "c": 4.8,
    "f": 0.3,
    "g": 200,
    "cat": "dairy",
    "src": "cofid:12-307"
  },
  {
    "n": "Almond milk, unsweetened",
    "k": 15,
    "p": 0.4,
    "c": 1.3,
    "f": 1.0,
    "g": 200,
    "cat": "dairy",
    "src": "usda:174832"
  },
  {
    "n": "Soya milk",
    "k": 26,
    "p": 2.4,
    "c": 0.5,
    "f": 1.6,
    "g": 200,
    "cat": "dairy",
    "src": "cofid:12-524"
  },
  {
    "n": "Greek yogurt, 0% fat",
    "k": 59,
    "p": 10.2,
    "c": 3.6,
    "f": 0.4,
    "g": 170,
    "cat": "dairy",
    "src": "usda:170894"
  },
  {
    "n": "Greek yogurt, 5% fat",
    "k": 97,
    "p": 9.0,
    "c": 4.0,
    "f": 5.0,
    "g": 170,
    "cat": "dairy",
    "src": "usda:171304"
  },
  {
    "n": "Natural yogurt",
    "k": 79,
    "p": 5.7,
    "c": 7.8,
    "f": 3.0,
    "g": 170,
    "cat": "dairy",
    "src": "cofid:12-184"
  },
  {
    "n": "Low-fat fruit yogurt",
    "k": 78,
    "p": 4.2,
    "c": 13.7,
    "f": 1.1,
    "g": 125,
    "cat": "dairy",
    "src": "cofid:12-380"
  },
  {
    "n": "Cottage cheese",
    "k": 103,
    "p": 9.4,
    "c": 3.1,
    "f": 6.0,
    "g": 100,
    "cat": "dairy",
    "src": "cofid:12-539"
  },
  {
    "n": "Cheddar cheese",
    "k": 416,
    "p": 25.4,
    "c": 0.1,
    "f": 34.9,
    "g": 30,
    "cat": "dairy",
    "src": "cofid:12-346"
  },
  {
    "n": "Mozzarella",
    "k": 257,
    "p": 18.6,
    "c": 0.0,
    "f": 20.3,
    "g": 50,
    "cat": "dairy",
    "src": "cofid:12-360"
  },
  {
    "n": "Feta",
    "k": 250,
    "p": 15.6,
    "c": 1.5,
    "f": 20.2,
    "g": 40,
    "cat": "dairy",
    "src": "cofid:12-525"
  },
  {
    "n": "Parmesan",
    "k": 415,
    "p": 36.2,
    "c": 0.9,
    "f": 29.7,
    "g": 15,
    "cat": "dairy",
    "src": "cofid:12-526"
  },
  {
    "n": "Cream cheese",
    "k": 252,
    "p": 5.3,
    "c": 3.0,
    "f": 24.4,
    "g": 30,
    "cat": "dairy",
    "src": "cofid:12-551"
  },
  {
    "n": "Brie",
    "k": 343,
    "p": 20.3,
    "c": 0.0,
    "f": 29.1,
    "g": 30,
    "cat": "dairy",
    "src": "cofid:12-344"
  },
  {
    "n": "Halloumi",
    "k": 313,
    "p": 23.9,
    "c": 1.7,
    "f": 23.5,
    "g": 60,
    "cat": "dairy",
    "src": "cofid:12-496"
  },
  {
    "n": "Babybel",
    "k": 300,
    "p": 23,
    "c": 0,
    "f": 24,
    "g": 20,
    "cat": "dairy",
    "src": "label"
  },
  {
    "n": "Butter",
    "k": 744,
    "p": 0.6,
    "c": 0.6,
    "f": 82.2,
    "g": 10,
    "cat": "dairy",
    "src": "cofid:17-685"
  },
  {
    "n": "Double cream",
    "k": 496,
    "p": 1.6,
    "c": 1.7,
    "f": 53.7,
    "g": 30,
    "cat": "dairy",
    "src": "cofid:12-334"
  },
  {
    "n": "Single cream",
    "k": 193,
    "p": 3.3,
    "c": 2.2,
    "f": 19.1,
    "g": 30,
    "cat": "dairy",
    "src": "cofid:12-332"
  },
  {
    "n": "Creme fraiche",
    "k": 378,
    "p": 2.2,
    "c": 2.4,
    "f": 40.0,
    "g": 30,
    "cat": "dairy",
    "src": "cofid:12-335"
  },
  {
    "n": "Custard",
    "k": 98,
    "p": 2.7,
    "c": 16.3,
    "f": 2.9,
    "g": 120,
    "cat": "dairy",
    "src": "cofid:12-543"
  },
  {
    "n": "Rice pudding",
    "k": 85,
    "p": 3.3,
    "c": 16.1,
    "f": 1.3,
    "g": 150,
    "cat": "dairy",
    "src": "cofid:12-580"
  },
  {
    "n": "Ice cream, vanilla",
    "k": 169,
    "p": 3.2,
    "c": 22.0,
    "f": 8.2,
    "g": 60,
    "cat": "dairy",
    "src": "cofid:12-508"
  },
  {
    "n": "White rice, cooked",
    "k": 131,
    "p": 2.8,
    "c": 31.1,
    "f": 0.4,
    "g": 180,
    "cat": "grains",
    "src": "cofid:11-862"
  },
  {
    "n": "Brown rice, cooked",
    "k": 132,
    "p": 3.6,
    "c": 29.2,
    "f": 0.9,
    "g": 180,
    "cat": "grains",
    "src": "cofid:11-869"
  },
  {
    "n": "Basmati rice, cooked",
    "k": 117,
    "p": 2.8,
    "c": 26.5,
    "f": 0.7,
    "g": 180,
    "cat": "grains",
    "src": "cofid:11-858"
  },
  {
    "n": "Egg fried rice",
    "k": 169,
    "p": 3.9,
    "c": 28.1,
    "f": 5.3,
    "g": 180,
    "cat": "grains",
    "src": "cofid:11-885"
  },
  {
    "n": "Pasta, cooked",
    "k": 169,
    "p": 5.5,
    "c": 37.2,
    "f": 0.8,
    "g": 180,
    "cat": "grains",
    "src": "cofid:11-1129"
  },
  {
    "n": "Wholewheat pasta, cooked",
    "k": 134,
    "p": 5.2,
    "c": 27.5,
    "f": 1.1,
    "g": 180,
    "cat": "grains",
    "src": "cofid:11-723"
  },
  {
    "n": "Rice noodles, cooked",
    "k": 89,
    "p": 1.9,
    "c": 21.3,
    "f": 0.2,
    "g": 180,
    "cat": "grains",
    "src": "cofid:11-725"
  },
  {
    "n": "Instant noodles, dry pack (~85g)",
    "k": 440,
    "p": 10.2,
    "c": 60.3,
    "f": 17.6,
    "g": 85,
    "cat": "grains",
    "src": "usda:171177"
  },
  {
    "n": "Couscous, cooked",
    "k": 178,
    "p": 7.2,
    "c": 37.5,
    "f": 1.0,
    "g": 180,
    "cat": "grains",
    "src": "cofid:11-902"
  },
  {
    "n": "Quinoa, cooked",
    "k": 120,
    "p": 4.4,
    "c": 21.3,
    "f": 1.9,
    "g": 180,
    "cat": "grains",
    "src": "usda:168917"
  },
  {
    "n": "Bulgur wheat, cooked",
    "k": 83,
    "p": 3.1,
    "c": 18.6,
    "f": 0.2,
    "g": 180,
    "cat": "grains",
    "src": "usda:170287"
  },
  {
    "n": "Oats, dry",
    "k": 381,
    "p": 10.9,
    "c": 70.7,
    "f": 8.1,
    "g": 50,
    "cat": "grains",
    "src": "cofid:11-788"
  },
  {
    "n": "Porridge, made with water",
    "k": 47,
    "p": 1.4,
    "c": 8.8,
    "f": 1.0,
    "g": 250,
    "cat": "grains",
    "src": "cofid:11-1107"
  },
  {
    "n": "Porridge, made with milk",
    "k": 84,
    "p": 4.6,
    "c": 12.1,
    "f": 2.3,
    "g": 250,
    "cat": "grains",
    "src": "cofid:11-789"
  },
  {
    "n": "White bread (slice ~36g)",
    "k": 236,
    "p": 8.7,
    "c": 48.7,
    "f": 2.1,
    "g": 36,
    "cat": "grains",
    "src": "cofid:11-1145"
  },
  {
    "n": "Wholemeal bread (slice ~36g)",
    "k": 217,
    "p": 9.4,
    "c": 42.0,
    "f": 2.5,
    "g": 36,
    "cat": "grains",
    "src": "cofid:11-981"
  },
  {
    "n": "Brown bread (slice)",
    "k": 207,
    "p": 7.9,
    "c": 42.1,
    "f": 2.0,
    "g": 36,
    "cat": "grains",
    "src": "cofid:11-971"
  },
  {
    "n": "Sourdough bread",
    "k": 272,
    "p": 10.8,
    "c": 51.9,
    "f": 2.4,
    "g": 50,
    "cat": "grains",
    "src": "usda:172675"
  },
  {
    "n": "Bagel",
    "k": 273,
    "p": 10.0,
    "c": 57.8,
    "f": 1.8,
    "g": 85,
    "cat": "grains",
    "src": "cofid:11-970"
  },
  {
    "n": "English muffin",
    "k": 223,
    "p": 10.0,
    "c": 44.2,
    "f": 1.9,
    "g": 60,
    "cat": "grains",
    "src": "cofid:11-541"
  },
  {
    "n": "Pitta bread",
    "k": 255,
    "p": 9.1,
    "c": 55.1,
    "f": 1.3,
    "g": 60,
    "cat": "grains",
    "src": "cofid:11-974"
  },
  {
    "n": "Naan bread",
    "k": 285,
    "p": 7.8,
    "c": 50.2,
    "f": 7.3,
    "g": 90,
    "cat": "grains",
    "src": "cofid:11-973"
  },
  {
    "n": "Tortilla wrap (1 ~60g)",
    "k": 285,
    "p": 7.8,
    "c": 53.9,
    "f": 5.7,
    "g": 60,
    "cat": "grains",
    "src": "cofid:11-925"
  },
  {
    "n": "Baguette",
    "k": 263,
    "p": 9.0,
    "c": 56.1,
    "f": 1.9,
    "g": 70,
    "cat": "grains",
    "src": "cofid:11-978"
  },
  {
    "n": "Croissant",
    "k": 373,
    "p": 8.3,
    "c": 43.3,
    "f": 19.7,
    "g": 60,
    "cat": "grains",
    "src": "cofid:11-988"
  },
  {
    "n": "Cornflakes",
    "k": 376,
    "p": 7.1,
    "c": 90.9,
    "f": 0.8,
    "g": 30,
    "cat": "grains",
    "src": "cofid:11-742"
  },
  {
    "n": "Weetabix (2 ~38g)",
    "k": 332,
    "p": 10.5,
    "c": 72.7,
    "f": 1.9,
    "g": 38,
    "cat": "grains",
    "src": "cofid:11-773"
  },
  {
    "n": "Muesli",
    "k": 366,
    "p": 9.2,
    "c": 72.6,
    "f": 6.3,
    "g": 50,
    "cat": "grains",
    "src": "cofid:11-780"
  },
  {
    "n": "Granola",
    "k": 450,
    "p": 8.4,
    "c": 61.9,
    "f": 20.5,
    "g": 50,
    "cat": "grains",
    "src": "cofid:11-939"
  },
  {
    "n": "Pancakes",
    "k": 234,
    "p": 6.3,
    "c": 37.9,
    "f": 7.4,
    "g": 80,
    "cat": "grains",
    "src": "cofid:11-1143"
  },
  {
    "n": "Potato, boiled",
    "k": 74,
    "p": 1.8,
    "c": 17.5,
    "f": 0.1,
    "g": 200,
    "cat": "potato",
    "src": "cofid:13-490"
  },
  {
    "n": "Jacket potato, baked",
    "k": 97,
    "p": 2.5,
    "c": 22.6,
    "f": 0.2,
    "g": 250,
    "cat": "potato",
    "src": "cofid:13-491"
  },
  {
    "n": "Mashed potato",
    "k": 102,
    "p": 1.9,
    "c": 15.9,
    "f": 3.9,
    "g": 200,
    "cat": "potato",
    "src": "cofid:13-553"
  },
  {
    "n": "Roast potatoes",
    "k": 161,
    "p": 2.6,
    "c": 26.4,
    "f": 5.7,
    "g": 150,
    "cat": "potato",
    "src": "cofid:13-599"
  },
  {
    "n": "Chips, oven",
    "k": 189,
    "p": 3.2,
    "c": 35.3,
    "f": 4.9,
    "g": 150,
    "cat": "potato",
    "src": "cofid:13-487"
  },
  {
    "n": "Fries, fast food",
    "k": 290,
    "p": 3.5,
    "c": 39.7,
    "f": 14.2,
    "g": 120,
    "cat": "potato",
    "src": "cofid:13-486"
  },
  {
    "n": "Hash brown",
    "k": 219,
    "p": 2.6,
    "c": 28.5,
    "f": 11.6,
    "g": 50,
    "cat": "potato",
    "src": "usda:170044"
  },
  {
    "n": "Potato wedges",
    "k": 176,
    "p": 2.8,
    "c": 30.6,
    "f": 5.5,
    "g": 150,
    "cat": "potato",
    "src": "cofid:13-483"
  },
  {
    "n": "Sweet potato, baked",
    "k": 115,
    "p": 1.6,
    "c": 27.9,
    "f": 0.4,
    "g": 200,
    "cat": "potato",
    "src": "cofid:13-672"
  },
  {
    "n": "Broccoli",
    "k": 34,
    "p": 4.3,
    "c": 3.2,
    "f": 0.6,
    "g": 80,
    "cat": "veg",
    "cook": true,
    "src": "cofid:13-502"
  },
  {
    "n": "Cauliflower",
    "k": 30,
    "p": 2.5,
    "c": 4.4,
    "f": 0.4,
    "g": 80,
    "cat": "veg",
    "cook": true,
    "src": "cofid:13-512"
  },
  {
    "n": "Carrots",
    "k": 34,
    "p": 0.5,
    "c": 7.7,
    "f": 0.4,
    "g": 80,
    "cat": "veg",
    "src": "cofid:13-496"
  },
  {
    "n": "Spinach",
    "k": 25,
    "p": 2.8,
    "c": 1.6,
    "f": 0.8,
    "g": 80,
    "cat": "veg",
    "cook": true,
    "src": "cofid:13-572"
  },
  {
    "n": "Kale",
    "k": 33,
    "p": 3.4,
    "c": 1.4,
    "f": 1.6,
    "g": 80,
    "cat": "veg",
    "cook": true,
    "src": "cofid:13-234"
  },
  {
    "n": "Cabbage",
    "k": 26,
    "p": 1.8,
    "c": 4.4,
    "f": 0.2,
    "g": 80,
    "cat": "veg",
    "cook": true,
    "src": "cofid:13-582"
  },
  {
    "n": "Green beans",
    "k": 24,
    "p": 2.1,
    "c": 3.1,
    "f": 0.4,
    "g": 80,
    "cat": "veg",
    "cook": true,
    "src": "cofid:13-514"
  },
  {
    "n": "Courgette",
    "k": 16,
    "p": 1.3,
    "c": 2.3,
    "f": 0.2,
    "g": 80,
    "cat": "veg",
    "cook": true,
    "src": "cofid:13-627"
  },
  {
    "n": "Aubergine",
    "k": 15,
    "p": 0.9,
    "c": 2.2,
    "f": 0.4,
    "g": 80,
    "cat": "veg",
    "cook": true,
    "src": "cofid:13-161"
  },
  {
    "n": "Mushrooms",
    "k": 7,
    "p": 1.0,
    "c": 0.3,
    "f": 0.2,
    "g": 80,
    "cat": "veg",
    "cook": true,
    "src": "cofid:13-505"
  },
  {
    "n": "Tomato",
    "k": 14,
    "p": 0.5,
    "c": 3.0,
    "f": 0.1,
    "g": 80,
    "cat": "veg",
    "src": "cofid:13-517"
  },
  {
    "n": "Cherry tomatoes",
    "k": 22,
    "p": 1.1,
    "c": 3.6,
    "f": 0.5,
    "g": 80,
    "cat": "veg",
    "src": "cofid:13-519"
  },
  {
    "n": "Tinned tomatoes",
    "k": 19,
    "p": 1.1,
    "c": 3.8,
    "f": 0.1,
    "g": 200,
    "cat": "veg",
    "src": "cofid:13-530"
  },
  {
    "n": "Passata",
    "k": 38,
    "p": 1.6,
    "c": 9.0,
    "f": 0.2,
    "g": 100,
    "cat": "veg",
    "src": "usda:170460"
  },
  {
    "n": "Cucumber",
    "k": 14,
    "p": 1.0,
    "c": 1.2,
    "f": 0.6,
    "g": 80,
    "cat": "veg",
    "src": "cofid:13-523"
  },
  {
    "n": "Lettuce",
    "k": 11,
    "p": 1.2,
    "c": 1.4,
    "f": 0.1,
    "g": 50,
    "cat": "veg",
    "src": "cofid:13-520"
  },
  {
    "n": "Rocket",
    "k": 18,
    "p": 3.6,
    "c": 0.0,
    "f": 0.4,
    "g": 30,
    "cat": "veg",
    "src": "cofid:13-522"
  },
  {
    "n": "Mixed salad leaves",
    "k": 13,
    "p": 1.0,
    "c": 1.6,
    "f": 0.4,
    "g": 50,
    "cat": "veg",
    "src": "cofid:15-648"
  },
  {
    "n": "Onion",
    "k": 35,
    "p": 1.0,
    "c": 8.0,
    "f": 0.1,
    "g": 60,
    "cat": "veg",
    "cook": true,
    "src": "cofid:13-499"
  },
  {
    "n": "Spring onion",
    "k": 23,
    "p": 2.0,
    "c": 3.0,
    "f": 0.5,
    "g": 15,
    "cat": "veg",
    "src": "cofid:13-352"
  },
  {
    "n": "Garlic",
    "k": 98,
    "p": 7.9,
    "c": 16.3,
    "f": 0.6,
    "g": 5,
    "cat": "veg",
    "src": "cofid:13-244"
  },
  {
    "n": "Bell pepper",
    "k": 21,
    "p": 0.8,
    "c": 4.3,
    "f": 0.2,
    "g": 80,
    "cat": "veg",
    "cook": true,
    "src": "cofid:13-524"
  },
  {
    "n": "Leek",
    "k": 23,
    "p": 1.5,
    "c": 4.1,
    "f": 0.2,
    "g": 80,
    "cat": "veg",
    "cook": true,
    "src": "cofid:13-624"
  },
  {
    "n": "Celery",
    "k": 9,
    "p": 0.5,
    "c": 1.4,
    "f": 0.1,
    "g": 40,
    "cat": "veg",
    "src": "cofid:13-636"
  },
  {
    "n": "Asparagus",
    "k": 25,
    "p": 2.9,
    "c": 2.0,
    "f": 0.6,
    "g": 80,
    "cat": "veg",
    "cook": true,
    "src": "cofid:13-157"
  },
  {
    "n": "Butternut squash",
    "k": 36,
    "p": 1.1,
    "c": 8.3,
    "f": 0.1,
    "g": 120,
    "cat": "veg",
    "cook": true,
    "src": "cofid:13-355"
  },
  {
    "n": "Parsnip",
    "k": 64,
    "p": 1.8,
    "c": 12.5,
    "f": 1.1,
    "g": 80,
    "cat": "veg",
    "cook": true,
    "src": "cofid:13-312"
  },
  {
    "n": "Brussels sprouts",
    "k": 42,
    "p": 3.5,
    "c": 4.1,
    "f": 1.4,
    "g": 80,
    "cat": "veg",
    "cook": true,
    "src": "cofid:13-177"
  },
  {
    "n": "Sweetcorn, tinned",
    "k": 78,
    "p": 2.6,
    "c": 13.9,
    "f": 1.7,
    "g": 80,
    "cat": "veg",
    "src": "cofid:13-529"
  },
  {
    "n": "Coleslaw",
    "k": 173,
    "p": 0.8,
    "c": 6.0,
    "f": 16.3,
    "g": 50,
    "cat": "veg",
    "src": "cofid:15-635"
  },
  {
    "n": "Olives",
    "k": 103,
    "p": 0.9,
    "c": 0.0,
    "f": 11.0,
    "g": 30,
    "cat": "veg",
    "src": "cofid:14-340"
  },
  {
    "n": "Sundried tomatoes",
    "k": 213,
    "p": 5.1,
    "c": 23.3,
    "f": 14.1,
    "g": 20,
    "cat": "veg",
    "src": "usda:169384"
  },
  {
    "n": "Banana (1 ~118g)",
    "k": 81,
    "p": 1.2,
    "c": 20.3,
    "f": 0.1,
    "g": 118,
    "cat": "fruit",
    "src": "cofid:14-318"
  },
  {
    "n": "Apple (1 ~150g)",
    "k": 51,
    "p": 0.6,
    "c": 11.6,
    "f": 0.5,
    "g": 150,
    "cat": "fruit",
    "src": "cofid:14-319"
  },
  {
    "n": "Orange (1 ~130g)",
    "k": 36,
    "p": 0.8,
    "c": 8.2,
    "f": 0.2,
    "g": 130,
    "cat": "fruit",
    "src": "cofid:14-327"
  },
  {
    "n": "Pear",
    "k": 43,
    "p": 0.3,
    "c": 10.9,
    "f": 0.1,
    "g": 150,
    "cat": "fruit",
    "src": "cofid:14-321"
  },
  {
    "n": "Peach",
    "k": 33,
    "p": 1.0,
    "c": 7.6,
    "f": 0.1,
    "g": 120,
    "cat": "fruit",
    "src": "cofid:14-299"
  },
  {
    "n": "Plum",
    "k": 41,
    "p": 0.6,
    "c": 9.7,
    "f": 0.3,
    "g": 60,
    "cat": "fruit",
    "src": "cofid:14-372"
  },
  {
    "n": "Kiwi",
    "k": 44,
    "p": 0.8,
    "c": 8.6,
    "f": 0.9,
    "g": 75,
    "cat": "fruit",
    "src": "cofid:14-371"
  },
  {
    "n": "Pineapple",
    "k": 45,
    "p": 0.5,
    "c": 11.4,
    "f": 0.1,
    "g": 100,
    "cat": "fruit",
    "src": "cofid:14-376"
  },
  {
    "n": "Mango",
    "k": 48,
    "p": 0.7,
    "c": 10.7,
    "f": 0.6,
    "g": 120,
    "cat": "fruit",
    "src": "cofid:14-378"
  },
  {
    "n": "Melon",
    "k": 24,
    "p": 0.5,
    "c": 5.5,
    "f": 0.1,
    "g": 150,
    "cat": "fruit",
    "src": "cofid:14-354"
  },
  {
    "n": "Watermelon",
    "k": 31,
    "p": 0.5,
    "c": 7.1,
    "f": 0.3,
    "g": 200,
    "cat": "fruit",
    "src": "cofid:14-296"
  },
  {
    "n": "Strawberries",
    "k": 30,
    "p": 0.6,
    "c": 6.1,
    "f": 0.5,
    "g": 80,
    "cat": "fruit",
    "src": "cofid:14-324"
  },
  {
    "n": "Blueberries",
    "k": 40,
    "p": 0.9,
    "c": 9.1,
    "f": 0.2,
    "g": 80,
    "cat": "fruit",
    "src": "cofid:14-325"
  },
  {
    "n": "Raspberries",
    "k": 25,
    "p": 0.8,
    "c": 5.1,
    "f": 0.3,
    "g": 80,
    "cat": "fruit",
    "src": "cofid:14-375"
  },
  {
    "n": "Grapes",
    "k": 65,
    "p": 0.7,
    "c": 16.1,
    "f": 0.2,
    "g": 80,
    "cat": "fruit",
    "src": "cofid:14-350"
  },
  {
    "n": "Cherries",
    "k": 63,
    "p": 1.2,
    "c": 14.6,
    "f": 0.4,
    "g": 80,
    "cat": "fruit",
    "src": "cofid:14-382"
  },
  {
    "n": "Pomegranate",
    "k": 51,
    "p": 1.3,
    "c": 11.8,
    "f": 0.2,
    "g": 80,
    "cat": "fruit",
    "src": "cofid:14-226"
  },
  {
    "n": "Dates",
    "k": 235,
    "p": 2.4,
    "c": 58.7,
    "f": 0.6,
    "g": 25,
    "cat": "fruit",
    "src": "cofid:14-394"
  },
  {
    "n": "Raisins / sultanas",
    "k": 256,
    "p": 3.0,
    "c": 62.6,
    "f": 1.0,
    "g": 30,
    "cat": "fruit",
    "src": "cofid:14-393"
  },
  {
    "n": "Dried apricots",
    "k": 161,
    "p": 2.2,
    "c": 39.4,
    "f": 0.5,
    "g": 30,
    "cat": "fruit",
    "src": "cofid:14-392"
  },
  {
    "n": "Lemon",
    "k": 19,
    "p": 1.0,
    "c": 3.2,
    "f": 0.3,
    "g": 60,
    "cat": "fruit",
    "src": "cofid:14-128"
  },
  {
    "n": "Grapefruit",
    "k": 34,
    "p": 0.9,
    "c": 6.9,
    "f": 0.5,
    "g": 120,
    "cat": "fruit",
    "src": "cofid:14-384"
  },
  {
    "n": "Peanut butter",
    "k": 607,
    "p": 22.8,
    "c": 13.1,
    "f": 51.8,
    "g": 20,
    "cat": "fats",
    "src": "cofid:14-892"
  },
  {
    "n": "Almonds",
    "k": 554,
    "p": 21.2,
    "c": 5.3,
    "f": 49.9,
    "g": 25,
    "cat": "fats",
    "src": "cofid:14-896"
  },
  {
    "n": "Walnuts",
    "k": 688,
    "p": 14.7,
    "c": 3.3,
    "f": 68.5,
    "g": 25,
    "cat": "fats",
    "src": "cofid:14-879"
  },
  {
    "n": "Cashews",
    "k": 573,
    "p": 17.7,
    "c": 18.1,
    "f": 48.2,
    "g": 25,
    "cat": "fats",
    "src": "cofid:14-811"
  },
  {
    "n": "Pistachios",
    "k": 601,
    "p": 17.9,
    "c": 8.2,
    "f": 55.4,
    "g": 25,
    "cat": "fats",
    "src": "cofid:14-840"
  },
  {
    "n": "Mixed nuts",
    "k": 581,
    "p": 23.8,
    "c": 11.6,
    "f": 49.1,
    "g": 25,
    "cat": "fats",
    "src": "cofid:14-880"
  },
  {
    "n": "Peanuts",
    "k": 564,
    "p": 25.8,
    "c": 12.5,
    "f": 46.0,
    "g": 25,
    "cat": "fats",
    "src": "cofid:14-877"
  },
  {
    "n": "Sunflower seeds",
    "k": 576,
    "p": 19.8,
    "c": 18.6,
    "f": 47.5,
    "g": 15,
    "cat": "fats",
    "src": "cofid:14-845"
  },
  {
    "n": "Pumpkin seeds",
    "k": 565,
    "p": 24.4,
    "c": 15.2,
    "f": 45.6,
    "g": 15,
    "cat": "fats",
    "src": "cofid:14-842"
  },
  {
    "n": "Chia seeds",
    "k": 486,
    "p": 16.5,
    "c": 42.1,
    "f": 30.7,
    "g": 15,
    "cat": "fats",
    "src": "usda:170554"
  },
  {
    "n": "Tahini",
    "k": 607,
    "p": 18.5,
    "c": 0.9,
    "f": 58.9,
    "g": 15,
    "cat": "fats",
    "src": "cofid:14-847"
  },
  {
    "n": "Olive oil (tbsp ~14g)",
    "k": 899,
    "p": 0.0,
    "c": 0.0,
    "f": 99.9,
    "g": 14,
    "cat": "fats",
    "src": "cofid:17-038"
  },
  {
    "n": "Vegetable oil (tbsp ~14g)",
    "k": 899,
    "p": 0.0,
    "c": 0.0,
    "f": 99.9,
    "g": 14,
    "cat": "fats",
    "src": "cofid:17-686"
  },
  {
    "n": "Coconut oil (tbsp ~14g)",
    "k": 899,
    "p": 0.0,
    "c": 0.0,
    "f": 99.9,
    "g": 14,
    "cat": "fats",
    "src": "cofid:17-031"
  },
  {
    "n": "Ketchup (tbsp ~17g)",
    "k": 115,
    "p": 1.6,
    "c": 28.6,
    "f": 0.1,
    "g": 17,
    "cat": "sauces",
    "src": "cofid:17-709"
  },
  {
    "n": "Mayonnaise",
    "k": 686,
    "p": 1.1,
    "c": 2.4,
    "f": 74.8,
    "g": 15,
    "cat": "sauces",
    "src": "cofid:17-654"
  },
  {
    "n": "Light mayonnaise",
    "k": 288,
    "p": 1.0,
    "c": 8.2,
    "f": 28.1,
    "g": 15,
    "cat": "sauces",
    "src": "cofid:17-679"
  },
  {
    "n": "BBQ sauce",
    "k": 140,
    "p": 1.0,
    "c": 36.1,
    "f": 0.1,
    "g": 20,
    "cat": "sauces",
    "src": "cofid:17-705"
  },
  {
    "n": "Mustard",
    "k": 139,
    "p": 7.1,
    "c": 9.7,
    "f": 8.2,
    "g": 10,
    "cat": "sauces",
    "src": "cofid:17-364"
  },
  {
    "n": "Soy sauce (tbsp ~16g)",
    "k": 79,
    "p": 3.0,
    "c": 17.9,
    "f": 0.0,
    "g": 16,
    "cat": "sauces",
    "src": "cofid:17-721"
  },
  {
    "n": "Sriracha",
    "k": 93,
    "p": 1.9,
    "c": 19.2,
    "f": 0.9,
    "g": 15,
    "cat": "sauces",
    "src": "usda:171186"
  },
  {
    "n": "Pesto",
    "k": 420,
    "p": 5.6,
    "c": 3.9,
    "f": 42.5,
    "g": 20,
    "cat": "sauces",
    "src": "cofid:17-622"
  },
  {
    "n": "Gravy (made)",
    "k": 30,
    "p": 0.3,
    "c": 4.7,
    "f": 1.2,
    "g": 70,
    "cat": "sauces",
    "src": "cofid:17-725"
  },
  {
    "n": "Salad dressing / vinaigrette",
    "k": 335,
    "p": 0.3,
    "c": 11.7,
    "f": 32.2,
    "g": 15,
    "cat": "sauces",
    "src": "cofid:17-701"
  },
  {
    "n": "Honey (tbsp ~21g)",
    "k": 288,
    "p": 0.4,
    "c": 76.4,
    "f": 0.0,
    "g": 21,
    "cat": "sauces",
    "src": "cofid:17-050"
  },
  {
    "n": "Jam",
    "k": 261,
    "p": 0.6,
    "c": 69.0,
    "f": 0.0,
    "g": 15,
    "cat": "sauces",
    "src": "cofid:17-073"
  },
  {
    "n": "Marmalade",
    "k": 261,
    "p": 0.1,
    "c": 69.5,
    "f": 0.0,
    "g": 15,
    "cat": "sauces",
    "src": "cofid:17-078"
  },
  {
    "n": "Nutella",
    "k": 549,
    "p": 6.2,
    "c": 60.5,
    "f": 33.0,
    "g": 15,
    "cat": "sauces",
    "src": "cofid:17-687"
  },
  {
    "n": "Maple syrup",
    "k": 260,
    "p": 0.0,
    "c": 67.0,
    "f": 0.1,
    "g": 20,
    "cat": "sauces",
    "src": "usda:169661"
  },
  {
    "n": "Marmite",
    "k": 250,
    "p": 34,
    "c": 24,
    "f": 0.1,
    "g": 4,
    "cat": "sauces",
    "src": "label"
  },
  {
    "n": "Sugar (tsp ~4g)",
    "k": 394,
    "p": 0.0,
    "c": 105.0,
    "f": 0.0,
    "g": 4,
    "cat": "sauces",
    "src": "cofid:17-063"
  },
  {
    "n": "Pizza, cheese & tomato",
    "k": 272,
    "p": 12.2,
    "c": 36.1,
    "f": 9.8,
    "g": 250,
    "cat": "ready",
    "src": "cofid:11-936"
  },
  {
    "n": "Pizza, pepperoni",
    "k": 255,
    "p": 13.2,
    "c": 29.1,
    "f": 10.3,
    "g": 250,
    "cat": "ready",
    "src": "cofid:11-1015"
  },
  {
    "n": "Lasagne (ready meal)",
    "k": 143,
    "p": 7.4,
    "c": 15.7,
    "f": 6.1,
    "g": 400,
    "cat": "ready",
    "src": "cofid:19-523"
  },
  {
    "n": "Shepherd's / cottage pie",
    "k": 111,
    "p": 4.5,
    "c": 11.9,
    "f": 5.4,
    "g": 400,
    "cat": "ready",
    "src": "cofid:19-494"
  },
  {
    "n": "Macaroni cheese",
    "k": 183,
    "p": 7.8,
    "c": 19.8,
    "f": 8.6,
    "g": 300,
    "cat": "ready",
    "src": "cofid:11-954"
  },
  {
    "n": "Spaghetti bolognese",
    "k": 126,
    "p": 6.6,
    "c": 20.0,
    "f": 2.8,
    "g": 350,
    "cat": "ready",
    "src": "cofid:19-524"
  },
  {
    "n": "Chicken tikka masala",
    "k": 156,
    "p": 12.4,
    "c": 4.9,
    "f": 9.8,
    "g": 350,
    "cat": "ready",
    "src": "cofid:19-296"
  },
  {
    "n": "Beef curry",
    "k": 137,
    "p": 13.5,
    "c": 6.3,
    "f": 6.6,
    "g": 350,
    "cat": "ready",
    "src": "cofid:19-488"
  },
  {
    "n": "Chow mein",
    "k": 147,
    "p": 8.5,
    "c": 12.7,
    "f": 7.2,
    "g": 350,
    "cat": "ready",
    "src": "cofid:19-321"
  },
  {
    "n": "Sweet & sour chicken",
    "k": 194,
    "p": 7.6,
    "c": 19.7,
    "f": 10.0,
    "g": 350,
    "cat": "ready",
    "src": "cofid:19-324"
  },
  {
    "n": "Spring roll",
    "k": 242,
    "p": 6.5,
    "c": 18.2,
    "f": 16.4,
    "g": 50,
    "cat": "ready",
    "src": "cofid:19-327"
  },
  {
    "n": "Samosa",
    "k": 217,
    "p": 5.1,
    "c": 30.0,
    "f": 9.3,
    "g": 60,
    "cat": "ready",
    "src": "cofid:15-305"
  },
  {
    "n": "Onion bhaji",
    "k": 270,
    "p": 11.2,
    "c": 24.6,
    "f": 14.7,
    "g": 50,
    "cat": "ready",
    "src": "cofid:15-828"
  },
  {
    "n": "Doner kebab meat",
    "k": 377,
    "p": 23.5,
    "c": 0.0,
    "f": 31.4,
    "g": 150,
    "cat": "ready",
    "src": "cofid:19-539"
  },
  {
    "n": "Cheeseburger, fast food",
    "k": 254,
    "p": 13.6,
    "c": 28.3,
    "f": 10.4,
    "g": 120,
    "cat": "ready",
    "src": "cofid:19-545"
  },
  {
    "n": "Chicken burger, fast food",
    "k": 235,
    "p": 12.5,
    "c": 23.4,
    "f": 10.8,
    "g": 150,
    "cat": "ready",
    "src": "cofid:19-315"
  },
  {
    "n": "Hot dog (sausage + bun)",
    "k": 264,
    "p": 10.7,
    "c": 35.6,
    "f": 9.8,
    "g": 100,
    "cat": "ready",
    "src": "cofid:19-581"
  },
  {
    "n": "Meatballs (in sauce)",
    "k": 123,
    "p": 10.0,
    "c": 4.6,
    "f": 7.2,
    "g": 150,
    "cat": "ready",
    "src": "cofid:19-613"
  },
  {
    "n": "Sushi, salmon set",
    "k": 152,
    "p": 8.7,
    "c": 25.2,
    "f": 2.5,
    "g": 150,
    "cat": "ready",
    "src": "cofid:16-361"
  },
  {
    "n": "Tomato soup",
    "k": 51,
    "p": 0.9,
    "c": 7.8,
    "f": 2.0,
    "g": 300,
    "cat": "ready",
    "src": "cofid:17-652"
  },
  {
    "n": "Chicken soup",
    "k": 58,
    "p": 1.7,
    "c": 4.5,
    "f": 3.8,
    "g": 300,
    "cat": "ready",
    "src": "cofid:17-695"
  },
  {
    "n": "McDonald's Large Fries",
    "k": 290,
    "p": 3.5,
    "c": 39.7,
    "f": 14.2,
    "g": 154,
    "cat": "fastfood",
    "src": "cofid:13-486"
  },
  {
    "n": "McDonald's Cheeseburger",
    "k": 254,
    "p": 13.6,
    "c": 28.3,
    "f": 10.4,
    "g": 115,
    "cat": "fastfood",
    "src": "cofid:19-545"
  },
  {
    "n": "Subway 6-inch Chicken Tikka",
    "k": 175.13,
    "p": 14.2,
    "c": 21.8,
    "f": 3.6,
    "g": 197,
    "cat": "fastfood",
    "src": "subway-uk",
    "ref": {
      "g": 197,
      "k": 345
    }
  },
  {
    "n": "Subway 6-inch Italian BMT",
    "k": 277.7,
    "p": 14.4,
    "c": 29.5,
    "f": 11.5,
    "g": 139,
    "cat": "fastfood",
    "src": "subway-uk",
    "ref": {
      "g": 139,
      "k": 386
    }
  },
  {
    "n": "Crisps (bag ~25g)",
    "k": 493,
    "p": 6.2,
    "c": 55.8,
    "f": 28.8,
    "g": 25,
    "cat": "snacks",
    "src": "cofid:17-671"
  },
  {
    "n": "Tortilla chips",
    "k": 504,
    "p": 7.2,
    "c": 60.8,
    "f": 27.4,
    "g": 30,
    "cat": "snacks",
    "src": "cofid:17-644"
  },
  {
    "n": "Pretzels",
    "k": 384,
    "p": 10.0,
    "c": 80.4,
    "f": 2.9,
    "g": 30,
    "cat": "snacks",
    "src": "usda:167555"
  },
  {
    "n": "Milk chocolate (small bar ~45g)",
    "k": 519,
    "p": 7.3,
    "c": 56.0,
    "f": 31.1,
    "g": 45,
    "cat": "snacks",
    "src": "cofid:17-648"
  },
  {
    "n": "Dark chocolate 70% (2 squares ~20g)",
    "k": 598,
    "p": 7.8,
    "c": 45.9,
    "f": 42.6,
    "g": 20,
    "cat": "snacks",
    "src": "usda:170273"
  },
  {
    "n": "Maltesers",
    "k": 476,
    "p": 7.6,
    "c": 63.0,
    "f": 23.3,
    "g": 37,
    "cat": "snacks",
    "src": "cofid:17-651"
  },
  {
    "n": "Wine gums / Haribo",
    "k": 324,
    "p": 6.5,
    "c": 79.5,
    "f": 0.0,
    "g": 30,
    "cat": "snacks",
    "src": "cofid:17-107"
  },
  {
    "n": "Jaffa cake (1)",
    "k": 354,
    "p": 4.4,
    "c": 69.3,
    "f": 8.5,
    "g": 12,
    "cat": "snacks",
    "src": "cofid:11-739"
  },
  {
    "n": "Digestive biscuit",
    "k": 463,
    "p": 6.2,
    "c": 65.6,
    "f": 21.3,
    "g": 15,
    "cat": "snacks",
    "src": "cofid:11-799"
  },
  {
    "n": "Chocolate digestive",
    "k": 488,
    "p": 6.3,
    "c": 61.8,
    "f": 25.7,
    "g": 17,
    "cat": "snacks",
    "src": "cofid:11-807"
  },
  {
    "n": "Hobnob",
    "k": 480,
    "p": 6.4,
    "c": 66.4,
    "f": 22.9,
    "g": 18,
    "cat": "snacks",
    "src": "cofid:11-803"
  },
  {
    "n": "Rich tea biscuit",
    "k": 444,
    "p": 6.4,
    "c": 75.4,
    "f": 15.1,
    "g": 8,
    "cat": "snacks",
    "src": "cofid:11-797"
  },
  {
    "n": "Shortbread",
    "k": 515,
    "p": 5.3,
    "c": 62.2,
    "f": 29.0,
    "g": 20,
    "cat": "snacks",
    "src": "cofid:11-802"
  },
  {
    "n": "Cream cracker",
    "k": 445,
    "p": 8.9,
    "c": 69.7,
    "f": 16.4,
    "g": 16,
    "cat": "snacks",
    "src": "cofid:11-820"
  },
  {
    "n": "Oatcakes",
    "k": 453,
    "p": 9.3,
    "c": 62.8,
    "f": 20.0,
    "g": 30,
    "cat": "snacks",
    "src": "cofid:11-823"
  },
  {
    "n": "Rice cakes",
    "k": 387,
    "p": 8.2,
    "c": 81.5,
    "f": 2.8,
    "g": 10,
    "cat": "snacks",
    "src": "usda:170250"
  },
  {
    "n": "Flapjack",
    "k": 434,
    "p": 5.1,
    "c": 55.7,
    "f": 22.8,
    "g": 60,
    "cat": "snacks",
    "src": "cofid:11-814"
  },
  {
    "n": "Blueberry muffin",
    "k": 375,
    "p": 5.0,
    "c": 47.8,
    "f": 19.5,
    "g": 70,
    "cat": "snacks",
    "src": "cofid:11-738"
  },
  {
    "n": "Brownie",
    "k": 506,
    "p": 6.2,
    "c": 54.3,
    "f": 30.8,
    "g": 50,
    "cat": "snacks",
    "src": "cofid:11-1127"
  },
  {
    "n": "Cookie",
    "k": 471,
    "p": 5.4,
    "c": 60.0,
    "f": 24.9,
    "g": 40,
    "cat": "snacks",
    "src": "cofid:11-815"
  },
  {
    "n": "Water",
    "k": 0,
    "p": 0,
    "c": 0,
    "f": 0,
    "g": 250,
    "ml": true,
    "cat": "drinks",
    "src": "cofid:17-377"
  },
  {
    "n": "Coffee, black",
    "k": 2,
    "p": 0.2,
    "c": 0.3,
    "f": 0.0,
    "g": 240,
    "ml": true,
    "cat": "drinks",
    "src": "cofid:17-833"
  },
  {
    "n": "Hot chocolate (with milk)",
    "k": 74,
    "p": 3.7,
    "c": 10.9,
    "f": 2.0,
    "g": 240,
    "ml": true,
    "cat": "drinks",
    "src": "cofid:17-790"
  },
  {
    "n": "Tea, no milk",
    "k": 0,
    "p": 0.1,
    "c": 0.0,
    "f": 0.0,
    "g": 240,
    "ml": true,
    "cat": "drinks",
    "src": "cofid:17-165"
  },
  {
    "n": "Tea with milk",
    "k": 7,
    "p": 0.5,
    "c": 0.7,
    "f": 0.2,
    "g": 240,
    "ml": true,
    "cat": "drinks",
    "src": "cofid:17-169"
  },
  {
    "n": "Milkshake",
    "k": 88,
    "p": 3.7,
    "c": 15.3,
    "f": 1.8,
    "g": 300,
    "ml": true,
    "cat": "drinks",
    "src": "cofid:12-327"
  },
  {
    "n": "Fruit smoothie",
    "k": 49,
    "p": 0.5,
    "c": 12.2,
    "f": 0.1,
    "g": 250,
    "ml": true,
    "cat": "drinks",
    "src": "cofid:17-747"
  },
  {
    "n": "Orange juice",
    "k": 36,
    "p": 0.9,
    "c": 8.6,
    "f": 0.0,
    "g": 200,
    "ml": true,
    "cat": "drinks",
    "src": "cofid:14-329"
  },
  {
    "n": "Apple juice",
    "k": 37,
    "p": 0.1,
    "c": 9.7,
    "f": 0.0,
    "g": 200,
    "ml": true,
    "cat": "drinks",
    "src": "cofid:14-331"
  },
  {
    "n": "Cola",
    "k": 41,
    "p": 0.0,
    "c": 10.9,
    "f": 0.0,
    "g": 330,
    "ml": true,
    "cat": "drinks",
    "src": "cofid:17-175"
  },
  {
    "n": "Diet cola",
    "k": 1,
    "p": 0.0,
    "c": 0.0,
    "f": 0.0,
    "g": 330,
    "ml": true,
    "cat": "drinks",
    "src": "cofid:17-505"
  },
  {
    "n": "Lemonade",
    "k": 22,
    "p": 0.0,
    "c": 5.8,
    "f": 0.0,
    "g": 330,
    "ml": true,
    "cat": "drinks",
    "src": "cofid:17-179"
  },
  {
    "n": "Energy drink",
    "k": 42,
    "p": 0.0,
    "c": 11.1,
    "f": 0.0,
    "g": 250,
    "ml": true,
    "cat": "drinks",
    "src": "cofid:17-672"
  },
  {
    "n": "Squash, diluted",
    "k": 7,
    "p": 0.0,
    "c": 1.8,
    "f": 0.0,
    "g": 250,
    "ml": true,
    "cat": "drinks",
    "src": "cofid:17-847"
  },
  {
    "n": "Tonic water",
    "k": 22,
    "p": 0.0,
    "c": 5.9,
    "f": 0.0,
    "g": 150,
    "ml": true,
    "cat": "drinks",
    "src": "cofid:17-736"
  },
  {
    "n": "Red wine",
    "k": 76,
    "p": 0.1,
    "c": 0.2,
    "f": 0.0,
    "g": 175,
    "ml": true,
    "cat": "drinks",
    "src": "cofid:17-752"
  },
  {
    "n": "White wine",
    "k": 75,
    "p": 0.1,
    "c": 0.6,
    "f": 0.0,
    "g": 175,
    "ml": true,
    "cat": "drinks",
    "src": "cofid:17-755"
  },
  {
    "n": "Prosecco",
    "k": 84,
    "p": 0.3,
    "c": 5.1,
    "f": 0.0,
    "g": 125,
    "ml": true,
    "cat": "drinks",
    "src": "cofid:17-757"
  },
  {
    "n": "Spirits, vodka/gin",
    "k": 222,
    "p": 0.0,
    "c": 0.0,
    "f": 0.0,
    "g": 25,
    "ml": true,
    "cat": "drinks",
    "src": "cofid:17-247"
  },
  {
    "n": "Coca-Cola",
    "k": 41,
    "p": 0.0,
    "c": 10.9,
    "f": 0.0,
    "g": 330,
    "ml": true,
    "cat": "drinks",
    "src": "cofid:17-175"
  },
  {
    "n": "Coca-Cola Zero Sugar",
    "k": 1,
    "p": 0.0,
    "c": 0.0,
    "f": 0.0,
    "g": 330,
    "ml": true,
    "cat": "drinks",
    "src": "cofid:17-505"
  },
  {
    "n": "Diet Coke",
    "k": 1,
    "p": 0.0,
    "c": 0.0,
    "f": 0.0,
    "g": 330,
    "ml": true,
    "cat": "drinks",
    "src": "cofid:17-505"
  },
  {
    "n": "Pepsi",
    "k": 41,
    "p": 0.0,
    "c": 10.9,
    "f": 0.0,
    "g": 330,
    "ml": true,
    "cat": "drinks",
    "src": "cofid:17-175"
  },
  {
    "n": "Pepsi Max",
    "k": 1,
    "p": 0.0,
    "c": 0.0,
    "f": 0.0,
    "g": 330,
    "ml": true,
    "cat": "drinks",
    "src": "cofid:17-505"
  },
  {
    "n": "Fanta Orange",
    "k": 19,
    "p": 0,
    "c": 4.5,
    "f": 0,
    "g": 330,
    "ml": true,
    "cat": "drinks",
    "src": "off:5000112552119",
    "ref": {
      "g": 100,
      "k": 19,
      "p": 0,
      "c": 4.5,
      "f": 0
    }
  },
  {
    "n": "Sprite",
    "k": 14,
    "p": 0,
    "c": 3.3,
    "f": 0,
    "g": 330,
    "ml": true,
    "cat": "drinks",
    "src": "off:5000112658149",
    "ref": {
      "g": 100,
      "k": 14,
      "c": 3.3,
      "f": 0
    }
  },
  {
    "n": "Irn-Bru",
    "k": 20,
    "p": 0,
    "c": 4.8,
    "f": 0,
    "g": 330,
    "ml": true,
    "cat": "drinks",
    "src": "off:5000382023197",
    "ref": {
      "g": 100,
      "k": 20,
      "c": 4.8,
      "f": 0
    }
  },
  {
    "n": "Lucozade Original",
    "k": 60,
    "p": 0.0,
    "c": 16.0,
    "f": 0.0,
    "g": 500,
    "ml": true,
    "cat": "drinks",
    "src": "cofid:17-761"
  },
  {
    "n": "Red Bull",
    "k": 42,
    "p": 0.0,
    "c": 11.1,
    "f": 0.0,
    "g": 250,
    "ml": true,
    "cat": "drinks",
    "src": "cofid:17-672"
  },
  {
    "n": "Monster Energy",
    "k": 42,
    "p": 0.0,
    "c": 11.1,
    "f": 0.0,
    "g": 500,
    "ml": true,
    "cat": "drinks",
    "src": "cofid:17-672"
  },
  {
    "n": "Oasis",
    "k": 17,
    "p": 0,
    "c": 4.1,
    "f": 0,
    "g": 330,
    "ml": true,
    "cat": "drinks",
    "src": "off:5449000125002",
    "ref": {
      "g": 100,
      "k": 17,
      "p": 0,
      "c": 4.1,
      "f": 0
    }
  },
  {
    "n": "J2O",
    "k": 19,
    "p": 0,
    "c": 4.1,
    "f": 0,
    "g": 275,
    "ml": true,
    "cat": "drinks",
    "src": "off:50412143",
    "ref": {
      "g": 100,
      "k": 19,
      "p": 0,
      "c": 4.1,
      "f": 0
    }
  },
  {
    "n": "Volvic Touch of Fruit",
    "k": 0.4,
    "p": 0,
    "c": 0,
    "f": 0,
    "g": 500,
    "ml": true,
    "cat": "drinks",
    "src": "off:3057640578113",
    "ref": {
      "g": 100,
      "k": 0.4,
      "p": 0,
      "c": 0,
      "f": 0
    }
  }
]

/** Chain menus are generated files in `chains/` (see scripts/import/). */
export const FOODS: Food[] = BASE.concat(INGREDIENTS, GREGGS, KFC, POPEYES, PIZZAHUT, BURGERKING, NANDOS)
