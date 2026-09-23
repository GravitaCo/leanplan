import type { Food } from '@/core/types'

/** Built-in food database — values per 100g (or 100ml when `ml` is set). `cat` sets the
 *  default hand portion; `cook` marks plain foods usually cooked in fat, which get the one
 *  cooking-fat question. */
export const FOODS: Food[] = [
  {
    "n": "Chicken breast, cooked",
    "k": 165,
    "p": 31,
    "c": 0,
    "f": 3.6,
    "g": 150,
    "cat": "meat",
    "cook": true
  },
  {
    "n": "Chicken thigh, cooked",
    "k": 209,
    "p": 26,
    "c": 0,
    "f": 11,
    "g": 150,
    "cat": "meat",
    "cook": true
  },
  {
    "n": "Chicken, roast (with skin)",
    "k": 215,
    "p": 27,
    "c": 0,
    "f": 12,
    "g": 150,
    "cat": "meat"
  },
  {
    "n": "Turkey breast, cooked",
    "k": 135,
    "p": 30,
    "c": 0,
    "f": 1,
    "g": 150,
    "cat": "meat",
    "cook": true
  },
  {
    "n": "Turkey mince, cooked",
    "k": 175,
    "p": 27,
    "c": 0,
    "f": 7,
    "g": 150,
    "cat": "meat",
    "cook": true
  },
  {
    "n": "Beef mince 5% fat, cooked",
    "k": 170,
    "p": 26,
    "c": 0,
    "f": 7,
    "g": 150,
    "cat": "meat",
    "cook": true
  },
  {
    "n": "Beef mince 20% fat, cooked",
    "k": 250,
    "p": 24,
    "c": 0,
    "f": 17,
    "g": 150,
    "cat": "meat",
    "cook": true
  },
  {
    "n": "Beef steak (sirloin), cooked",
    "k": 210,
    "p": 29,
    "c": 0,
    "f": 10,
    "g": 150,
    "cat": "meat",
    "cook": true
  },
  {
    "n": "Beef, roast",
    "k": 180,
    "p": 27,
    "c": 0,
    "f": 8,
    "g": 150,
    "cat": "meat"
  },
  {
    "n": "Beef burger patty, cooked",
    "k": 250,
    "p": 26,
    "c": 0,
    "f": 17,
    "g": 120,
    "cat": "meat",
    "cook": true
  },
  {
    "n": "Pork chop, cooked",
    "k": 230,
    "p": 28,
    "c": 0,
    "f": 13,
    "g": 150,
    "cat": "meat",
    "cook": true
  },
  {
    "n": "Pork loin, cooked",
    "k": 200,
    "p": 30,
    "c": 0,
    "f": 9,
    "g": 150,
    "cat": "meat",
    "cook": true
  },
  {
    "n": "Gammon / ham steak, cooked",
    "k": 190,
    "p": 24,
    "c": 0,
    "f": 10,
    "g": 150,
    "cat": "meat",
    "cook": true
  },
  {
    "n": "Lamb chop, cooked",
    "k": 280,
    "p": 25,
    "c": 0,
    "f": 20,
    "g": 120,
    "cat": "meat",
    "cook": true
  },
  {
    "n": "Lamb mince, cooked",
    "k": 270,
    "p": 24,
    "c": 0,
    "f": 19,
    "g": 150,
    "cat": "meat",
    "cook": true
  },
  {
    "n": "Duck breast, cooked",
    "k": 200,
    "p": 27,
    "c": 0,
    "f": 10,
    "g": 150,
    "cat": "meat",
    "cook": true
  },
  {
    "n": "Pork sausage, cooked (1 ~50g)",
    "k": 290,
    "p": 14,
    "c": 10,
    "f": 22,
    "g": 50,
    "cat": "meat",
    "cook": true
  },
  {
    "n": "Chicken sausage, cooked (1 ~50g)",
    "k": 175,
    "p": 16,
    "c": 5,
    "f": 10,
    "g": 50,
    "cat": "meat",
    "cook": true
  },
  {
    "n": "Bacon, grilled",
    "k": 330,
    "p": 24,
    "c": 0.5,
    "f": 26,
    "g": 50,
    "cat": "meat"
  },
  {
    "n": "Bacon medallion, grilled",
    "k": 145,
    "p": 22,
    "c": 0.5,
    "f": 6,
    "g": 40,
    "cat": "meat"
  },
  {
    "n": "Black pudding",
    "k": 290,
    "p": 13,
    "c": 15,
    "f": 22,
    "g": 60,
    "cat": "meat"
  },
  {
    "n": "Ham, sliced",
    "k": 110,
    "p": 18,
    "c": 1,
    "f": 4,
    "g": 40,
    "cat": "meat"
  },
  {
    "n": "Chorizo",
    "k": 450,
    "p": 24,
    "c": 2,
    "f": 38,
    "g": 30,
    "cat": "meat"
  },
  {
    "n": "Salami",
    "k": 380,
    "p": 22,
    "c": 1,
    "f": 32,
    "g": 30,
    "cat": "meat"
  },
  {
    "n": "Pepperoni",
    "k": 490,
    "p": 20,
    "c": 1,
    "f": 44,
    "g": 20,
    "cat": "meat"
  },
  {
    "n": "Corned beef",
    "k": 205,
    "p": 26,
    "c": 1,
    "f": 11,
    "g": 50,
    "cat": "meat"
  },
  {
    "n": "Sausage roll",
    "k": 320,
    "p": 9,
    "c": 26,
    "f": 21,
    "g": 60,
    "cat": "meat"
  },
  {
    "n": "Scotch egg",
    "k": 240,
    "p": 12,
    "c": 15,
    "f": 15,
    "g": 120,
    "cat": "meat"
  },
  {
    "n": "Chicken nuggets, cooked",
    "k": 290,
    "p": 15,
    "c": 18,
    "f": 18,
    "g": 100,
    "cat": "meat"
  },
  {
    "n": "Breaded chicken, cooked",
    "k": 240,
    "p": 18,
    "c": 14,
    "f": 12,
    "g": 130,
    "cat": "meat"
  },
  {
    "n": "Salmon fillet, cooked",
    "k": 206,
    "p": 22,
    "c": 0,
    "f": 13,
    "g": 130,
    "cat": "fish",
    "cook": true
  },
  {
    "n": "Smoked salmon",
    "k": 180,
    "p": 25,
    "c": 0,
    "f": 9,
    "g": 50,
    "cat": "fish"
  },
  {
    "n": "Tuna, canned in water",
    "k": 116,
    "p": 26,
    "c": 0,
    "f": 1,
    "g": 100,
    "cat": "fish"
  },
  {
    "n": "Tuna steak, cooked",
    "k": 130,
    "p": 28,
    "c": 0,
    "f": 1,
    "g": 130,
    "cat": "fish",
    "cook": true
  },
  {
    "n": "Cod, cooked",
    "k": 105,
    "p": 23,
    "c": 0,
    "f": 0.9,
    "g": 130,
    "cat": "fish",
    "cook": true
  },
  {
    "n": "Haddock, cooked",
    "k": 110,
    "p": 24,
    "c": 0,
    "f": 1,
    "g": 130,
    "cat": "fish",
    "cook": true
  },
  {
    "n": "Sea bass, cooked",
    "k": 125,
    "p": 24,
    "c": 0,
    "f": 3,
    "g": 130,
    "cat": "fish",
    "cook": true
  },
  {
    "n": "Mackerel, cooked",
    "k": 260,
    "p": 19,
    "c": 0,
    "f": 20,
    "g": 120,
    "cat": "fish",
    "cook": true
  },
  {
    "n": "Sardines, canned in oil",
    "k": 210,
    "p": 25,
    "c": 0,
    "f": 12,
    "g": 90,
    "cat": "fish"
  },
  {
    "n": "Sardines, canned in tomato",
    "k": 180,
    "p": 20,
    "c": 2,
    "f": 10,
    "g": 90,
    "cat": "fish"
  },
  {
    "n": "Prawns, cooked",
    "k": 99,
    "p": 24,
    "c": 0.2,
    "f": 0.3,
    "g": 100,
    "cat": "fish",
    "cook": true
  },
  {
    "n": "Fish fingers, cooked (3)",
    "k": 220,
    "p": 13,
    "c": 20,
    "f": 11,
    "g": 90,
    "cat": "fish"
  },
  {
    "n": "Breaded fish, cooked",
    "k": 200,
    "p": 14,
    "c": 15,
    "f": 10,
    "g": 120,
    "cat": "fish"
  },
  {
    "n": "Egg, whole (1 = 50g)",
    "k": 143,
    "p": 13,
    "c": 0.7,
    "f": 9.5,
    "g": 50,
    "cat": "eggs",
    "cook": true
  },
  {
    "n": "Egg white",
    "k": 52,
    "p": 11,
    "c": 0.7,
    "f": 0.2,
    "g": 33,
    "cat": "eggs",
    "cook": true
  },
  {
    "n": "Egg, fried",
    "k": 180,
    "p": 14,
    "c": 0.8,
    "f": 14,
    "g": 50,
    "cat": "eggs"
  },
  {
    "n": "Tofu, firm",
    "k": 144,
    "p": 15,
    "c": 3,
    "f": 9,
    "g": 100,
    "cat": "eggs",
    "cook": true
  },
  {
    "n": "Quorn mince",
    "k": 105,
    "p": 15,
    "c": 4,
    "f": 2,
    "g": 100,
    "cat": "eggs",
    "cook": true
  },
  {
    "n": "Quorn pieces",
    "k": 115,
    "p": 15,
    "c": 4.5,
    "f": 2,
    "g": 100,
    "cat": "eggs",
    "cook": true
  },
  {
    "n": "Tempeh",
    "k": 190,
    "p": 19,
    "c": 9,
    "f": 11,
    "g": 100,
    "cat": "eggs",
    "cook": true
  },
  {
    "n": "Falafel",
    "k": 330,
    "p": 13,
    "c": 32,
    "f": 18,
    "g": 100,
    "cat": "eggs"
  },
  {
    "n": "Edamame beans",
    "k": 120,
    "p": 11,
    "c": 9,
    "f": 5,
    "g": 80,
    "cat": "eggs"
  },
  {
    "n": "Lentils, cooked",
    "k": 116,
    "p": 9,
    "c": 20,
    "f": 0.4,
    "g": 150,
    "cat": "eggs"
  },
  {
    "n": "Chickpeas, cooked",
    "k": 164,
    "p": 9,
    "c": 27,
    "f": 2.6,
    "g": 150,
    "cat": "eggs"
  },
  {
    "n": "Kidney beans, cooked",
    "k": 127,
    "p": 9,
    "c": 22,
    "f": 0.5,
    "g": 150,
    "cat": "eggs"
  },
  {
    "n": "Black beans, cooked",
    "k": 132,
    "p": 9,
    "c": 24,
    "f": 0.5,
    "g": 150,
    "cat": "eggs"
  },
  {
    "n": "Baked beans",
    "k": 78,
    "p": 4.7,
    "c": 13,
    "f": 0.2,
    "g": 200,
    "cat": "eggs"
  },
  {
    "n": "Hummus",
    "k": 177,
    "p": 8,
    "c": 14,
    "f": 10,
    "g": 50,
    "cat": "eggs"
  },
  {
    "n": "Whey protein powder (scoop ~30g)",
    "k": 380,
    "p": 78,
    "c": 8,
    "f": 5,
    "g": 30,
    "cat": "eggs"
  },
  {
    "n": "Milk, whole",
    "k": 64,
    "p": 3.4,
    "c": 4.7,
    "f": 3.6,
    "g": 200,
    "cat": "dairy"
  },
  {
    "n": "Milk, semi-skimmed",
    "k": 50,
    "p": 3.6,
    "c": 4.8,
    "f": 1.8,
    "g": 200,
    "cat": "dairy"
  },
  {
    "n": "Milk, skimmed",
    "k": 35,
    "p": 3.5,
    "c": 5,
    "f": 0.2,
    "g": 200,
    "cat": "dairy"
  },
  {
    "n": "Almond milk, unsweetened",
    "k": 15,
    "p": 0.5,
    "c": 0.3,
    "f": 1.1,
    "g": 200,
    "cat": "dairy"
  },
  {
    "n": "Oat milk",
    "k": 45,
    "p": 1,
    "c": 6.6,
    "f": 1.5,
    "g": 200,
    "cat": "dairy"
  },
  {
    "n": "Soya milk",
    "k": 33,
    "p": 3.3,
    "c": 1.2,
    "f": 1.8,
    "g": 200,
    "cat": "dairy"
  },
  {
    "n": "Greek yogurt, 0% fat",
    "k": 59,
    "p": 10,
    "c": 3.6,
    "f": 0.4,
    "g": 170,
    "cat": "dairy"
  },
  {
    "n": "Greek yogurt, 5% fat",
    "k": 97,
    "p": 9,
    "c": 3.6,
    "f": 5,
    "g": 170,
    "cat": "dairy"
  },
  {
    "n": "Natural yogurt",
    "k": 79,
    "p": 5,
    "c": 7,
    "f": 3,
    "g": 170,
    "cat": "dairy"
  },
  {
    "n": "Low-fat fruit yogurt",
    "k": 90,
    "p": 4,
    "c": 15,
    "f": 1.5,
    "g": 125,
    "cat": "dairy"
  },
  {
    "n": "Skyr",
    "k": 63,
    "p": 11,
    "c": 4,
    "f": 0.2,
    "g": 150,
    "cat": "dairy"
  },
  {
    "n": "Cottage cheese",
    "k": 98,
    "p": 11,
    "c": 3.4,
    "f": 4.3,
    "g": 100,
    "cat": "dairy"
  },
  {
    "n": "Cheddar cheese",
    "k": 416,
    "p": 25,
    "c": 0.1,
    "f": 34,
    "g": 30,
    "cat": "dairy"
  },
  {
    "n": "Mozzarella",
    "k": 280,
    "p": 22,
    "c": 2,
    "f": 21,
    "g": 50,
    "cat": "dairy"
  },
  {
    "n": "Feta",
    "k": 265,
    "p": 14,
    "c": 1.5,
    "f": 22,
    "g": 40,
    "cat": "dairy"
  },
  {
    "n": "Parmesan",
    "k": 430,
    "p": 38,
    "c": 0,
    "f": 29,
    "g": 15,
    "cat": "dairy"
  },
  {
    "n": "Cream cheese",
    "k": 250,
    "p": 6,
    "c": 4,
    "f": 24,
    "g": 30,
    "cat": "dairy"
  },
  {
    "n": "Soft cheese, light",
    "k": 110,
    "p": 9,
    "c": 4,
    "f": 6,
    "g": 30,
    "cat": "dairy"
  },
  {
    "n": "Brie",
    "k": 340,
    "p": 20,
    "c": 0.5,
    "f": 28,
    "g": 30,
    "cat": "dairy"
  },
  {
    "n": "Halloumi",
    "k": 321,
    "p": 22,
    "c": 2,
    "f": 25,
    "g": 60,
    "cat": "dairy"
  },
  {
    "n": "Babybel",
    "k": 300,
    "p": 23,
    "c": 0,
    "f": 24,
    "g": 20,
    "cat": "dairy"
  },
  {
    "n": "Butter",
    "k": 717,
    "p": 0.9,
    "c": 0.1,
    "f": 81,
    "g": 10,
    "cat": "dairy"
  },
  {
    "n": "Margarine / spread",
    "k": 600,
    "p": 0.2,
    "c": 0.7,
    "f": 66,
    "g": 10,
    "cat": "dairy"
  },
  {
    "n": "Double cream",
    "k": 450,
    "p": 1.7,
    "c": 2.7,
    "f": 48,
    "g": 30,
    "cat": "dairy"
  },
  {
    "n": "Single cream",
    "k": 195,
    "p": 2.6,
    "c": 4,
    "f": 19,
    "g": 30,
    "cat": "dairy"
  },
  {
    "n": "Creme fraiche",
    "k": 300,
    "p": 2.4,
    "c": 3,
    "f": 30,
    "g": 30,
    "cat": "dairy"
  },
  {
    "n": "Custard",
    "k": 100,
    "p": 3,
    "c": 16,
    "f": 3,
    "g": 120,
    "cat": "dairy"
  },
  {
    "n": "Rice pudding",
    "k": 90,
    "p": 3.4,
    "c": 15,
    "f": 2,
    "g": 150,
    "cat": "dairy"
  },
  {
    "n": "Ice cream, vanilla",
    "k": 200,
    "p": 3.5,
    "c": 24,
    "f": 11,
    "g": 60,
    "cat": "dairy"
  },
  {
    "n": "White rice, cooked",
    "k": 130,
    "p": 2.7,
    "c": 28,
    "f": 0.3,
    "g": 180,
    "cat": "grains"
  },
  {
    "n": "Brown rice, cooked",
    "k": 123,
    "p": 2.7,
    "c": 26,
    "f": 1,
    "g": 180,
    "cat": "grains"
  },
  {
    "n": "Basmati rice, cooked",
    "k": 120,
    "p": 3,
    "c": 25,
    "f": 0.4,
    "g": 180,
    "cat": "grains"
  },
  {
    "n": "Egg fried rice",
    "k": 165,
    "p": 4,
    "c": 24,
    "f": 6,
    "g": 180,
    "cat": "grains"
  },
  {
    "n": "Pilau rice",
    "k": 180,
    "p": 3.5,
    "c": 30,
    "f": 5,
    "g": 180,
    "cat": "grains"
  },
  {
    "n": "Pasta, cooked",
    "k": 131,
    "p": 5,
    "c": 25,
    "f": 1.1,
    "g": 180,
    "cat": "grains"
  },
  {
    "n": "Wholewheat pasta, cooked",
    "k": 124,
    "p": 5,
    "c": 26,
    "f": 1.4,
    "g": 180,
    "cat": "grains"
  },
  {
    "n": "Egg noodles, cooked",
    "k": 138,
    "p": 4.5,
    "c": 25,
    "f": 2,
    "g": 180,
    "cat": "grains"
  },
  {
    "n": "Rice noodles, cooked",
    "k": 110,
    "p": 2,
    "c": 25,
    "f": 0.2,
    "g": 180,
    "cat": "grains"
  },
  {
    "n": "Instant noodles, dry pack (~85g)",
    "k": 440,
    "p": 9,
    "c": 60,
    "f": 17,
    "g": 85,
    "cat": "grains"
  },
  {
    "n": "Gnocchi, cooked",
    "k": 150,
    "p": 3.5,
    "c": 30,
    "f": 1,
    "g": 180,
    "cat": "grains"
  },
  {
    "n": "Couscous, cooked",
    "k": 112,
    "p": 3.8,
    "c": 23,
    "f": 0.2,
    "g": 180,
    "cat": "grains"
  },
  {
    "n": "Quinoa, cooked",
    "k": 120,
    "p": 4.4,
    "c": 21,
    "f": 1.9,
    "g": 180,
    "cat": "grains"
  },
  {
    "n": "Bulgur wheat, cooked",
    "k": 83,
    "p": 3,
    "c": 19,
    "f": 0.2,
    "g": 180,
    "cat": "grains"
  },
  {
    "n": "Oats, dry",
    "k": 379,
    "p": 13,
    "c": 67,
    "f": 7,
    "g": 50,
    "cat": "grains"
  },
  {
    "n": "Porridge, made with water",
    "k": 70,
    "p": 2.4,
    "c": 12,
    "f": 1.4,
    "g": 250,
    "cat": "grains"
  },
  {
    "n": "Porridge, made with milk",
    "k": 110,
    "p": 4.5,
    "c": 15,
    "f": 3.5,
    "g": 250,
    "cat": "grains"
  },
  {
    "n": "White bread (slice ~36g)",
    "k": 265,
    "p": 9,
    "c": 49,
    "f": 3.2,
    "g": 36,
    "cat": "grains"
  },
  {
    "n": "Wholemeal bread (slice ~36g)",
    "k": 247,
    "p": 10,
    "c": 41,
    "f": 3.4,
    "g": 36,
    "cat": "grains"
  },
  {
    "n": "Brown bread (slice)",
    "k": 250,
    "p": 9,
    "c": 46,
    "f": 2.5,
    "g": 36,
    "cat": "grains"
  },
  {
    "n": "Sourdough bread",
    "k": 260,
    "p": 9,
    "c": 52,
    "f": 1.5,
    "g": 50,
    "cat": "grains"
  },
  {
    "n": "Bagel",
    "k": 270,
    "p": 10,
    "c": 53,
    "f": 1.5,
    "g": 85,
    "cat": "grains"
  },
  {
    "n": "Crumpet",
    "k": 180,
    "p": 5,
    "c": 35,
    "f": 1,
    "g": 50,
    "cat": "grains"
  },
  {
    "n": "English muffin",
    "k": 230,
    "p": 9,
    "c": 44,
    "f": 2,
    "g": 60,
    "cat": "grains"
  },
  {
    "n": "Pitta bread",
    "k": 275,
    "p": 9,
    "c": 55,
    "f": 1.2,
    "g": 60,
    "cat": "grains"
  },
  {
    "n": "Naan bread",
    "k": 320,
    "p": 9,
    "c": 50,
    "f": 9,
    "g": 90,
    "cat": "grains"
  },
  {
    "n": "Tortilla wrap (1 ~60g)",
    "k": 310,
    "p": 8,
    "c": 50,
    "f": 8,
    "g": 60,
    "cat": "grains"
  },
  {
    "n": "Chapati / roti",
    "k": 300,
    "p": 8,
    "c": 46,
    "f": 9,
    "g": 60,
    "cat": "grains"
  },
  {
    "n": "Baguette",
    "k": 270,
    "p": 9,
    "c": 52,
    "f": 2.5,
    "g": 70,
    "cat": "grains"
  },
  {
    "n": "Croissant",
    "k": 405,
    "p": 8,
    "c": 45,
    "f": 21,
    "g": 60,
    "cat": "grains"
  },
  {
    "n": "Pain au chocolat",
    "k": 430,
    "p": 8,
    "c": 45,
    "f": 24,
    "g": 65,
    "cat": "grains"
  },
  {
    "n": "Cornflakes",
    "k": 380,
    "p": 7,
    "c": 84,
    "f": 0.9,
    "g": 30,
    "cat": "grains"
  },
  {
    "n": "Weetabix (2 ~38g)",
    "k": 360,
    "p": 12,
    "c": 69,
    "f": 2,
    "g": 38,
    "cat": "grains"
  },
  {
    "n": "Muesli",
    "k": 360,
    "p": 10,
    "c": 66,
    "f": 6,
    "g": 50,
    "cat": "grains"
  },
  {
    "n": "Granola",
    "k": 450,
    "p": 9,
    "c": 64,
    "f": 17,
    "g": 50,
    "cat": "grains"
  },
  {
    "n": "Pancakes",
    "k": 230,
    "p": 6,
    "c": 28,
    "f": 11,
    "g": 80,
    "cat": "grains"
  },
  {
    "n": "Waffles",
    "k": 290,
    "p": 7,
    "c": 33,
    "f": 14,
    "g": 80,
    "cat": "grains"
  },
  {
    "n": "Potato, boiled",
    "k": 87,
    "p": 1.9,
    "c": 20,
    "f": 0.1,
    "g": 200,
    "cat": "potato"
  },
  {
    "n": "Jacket potato, baked",
    "k": 93,
    "p": 2.5,
    "c": 21,
    "f": 0.1,
    "g": 250,
    "cat": "potato"
  },
  {
    "n": "Mashed potato",
    "k": 110,
    "p": 2,
    "c": 16,
    "f": 4,
    "g": 200,
    "cat": "potato"
  },
  {
    "n": "Roast potatoes",
    "k": 150,
    "p": 3,
    "c": 24,
    "f": 5,
    "g": 150,
    "cat": "potato"
  },
  {
    "n": "Chips, oven",
    "k": 190,
    "p": 3,
    "c": 30,
    "f": 6,
    "g": 150,
    "cat": "potato"
  },
  {
    "n": "Fries, fast food",
    "k": 310,
    "p": 3.4,
    "c": 41,
    "f": 15,
    "g": 120,
    "cat": "potato"
  },
  {
    "n": "Hash brown",
    "k": 230,
    "p": 3,
    "c": 26,
    "f": 13,
    "g": 50,
    "cat": "potato"
  },
  {
    "n": "Potato wedges",
    "k": 170,
    "p": 2.5,
    "c": 27,
    "f": 6,
    "g": 150,
    "cat": "potato"
  },
  {
    "n": "Sweet potato, baked",
    "k": 90,
    "p": 2,
    "c": 21,
    "f": 0.2,
    "g": 200,
    "cat": "potato"
  },
  {
    "n": "Broccoli",
    "k": 34,
    "p": 2.8,
    "c": 7,
    "f": 0.4,
    "g": 80,
    "cat": "veg",
    "cook": true
  },
  {
    "n": "Cauliflower",
    "k": 30,
    "p": 2,
    "c": 5,
    "f": 0.3,
    "g": 80,
    "cat": "veg",
    "cook": true
  },
  {
    "n": "Carrots",
    "k": 41,
    "p": 0.9,
    "c": 10,
    "f": 0.2,
    "g": 80,
    "cat": "veg"
  },
  {
    "n": "Spinach",
    "k": 23,
    "p": 2.9,
    "c": 3.6,
    "f": 0.4,
    "g": 80,
    "cat": "veg",
    "cook": true
  },
  {
    "n": "Kale",
    "k": 49,
    "p": 4.3,
    "c": 9,
    "f": 0.9,
    "g": 80,
    "cat": "veg",
    "cook": true
  },
  {
    "n": "Cabbage",
    "k": 25,
    "p": 1.3,
    "c": 6,
    "f": 0.1,
    "g": 80,
    "cat": "veg",
    "cook": true
  },
  {
    "n": "Green beans",
    "k": 31,
    "p": 1.8,
    "c": 7,
    "f": 0.2,
    "g": 80,
    "cat": "veg",
    "cook": true
  },
  {
    "n": "Courgette",
    "k": 17,
    "p": 1.2,
    "c": 3.1,
    "f": 0.3,
    "g": 80,
    "cat": "veg",
    "cook": true
  },
  {
    "n": "Aubergine",
    "k": 25,
    "p": 1,
    "c": 6,
    "f": 0.2,
    "g": 80,
    "cat": "veg",
    "cook": true
  },
  {
    "n": "Mushrooms",
    "k": 22,
    "p": 3.1,
    "c": 3.3,
    "f": 0.3,
    "g": 80,
    "cat": "veg",
    "cook": true
  },
  {
    "n": "Tomato",
    "k": 18,
    "p": 0.9,
    "c": 3.9,
    "f": 0.2,
    "g": 80,
    "cat": "veg"
  },
  {
    "n": "Cherry tomatoes",
    "k": 20,
    "p": 0.9,
    "c": 3.9,
    "f": 0.2,
    "g": 80,
    "cat": "veg"
  },
  {
    "n": "Tinned tomatoes",
    "k": 20,
    "p": 1.3,
    "c": 3.4,
    "f": 0.2,
    "g": 200,
    "cat": "veg"
  },
  {
    "n": "Passata",
    "k": 35,
    "p": 1.5,
    "c": 6,
    "f": 0.2,
    "g": 100,
    "cat": "veg"
  },
  {
    "n": "Cucumber",
    "k": 15,
    "p": 0.7,
    "c": 3.6,
    "f": 0.1,
    "g": 80,
    "cat": "veg"
  },
  {
    "n": "Lettuce",
    "k": 15,
    "p": 1.4,
    "c": 2.9,
    "f": 0.2,
    "g": 50,
    "cat": "veg"
  },
  {
    "n": "Rocket",
    "k": 25,
    "p": 2.6,
    "c": 3.7,
    "f": 0.7,
    "g": 30,
    "cat": "veg"
  },
  {
    "n": "Mixed salad leaves",
    "k": 17,
    "p": 1.4,
    "c": 2.9,
    "f": 0.2,
    "g": 50,
    "cat": "veg"
  },
  {
    "n": "Onion",
    "k": 40,
    "p": 1.1,
    "c": 9,
    "f": 0.1,
    "g": 60,
    "cat": "veg",
    "cook": true
  },
  {
    "n": "Spring onion",
    "k": 32,
    "p": 1.8,
    "c": 7,
    "f": 0.4,
    "g": 15,
    "cat": "veg"
  },
  {
    "n": "Garlic",
    "k": 149,
    "p": 6.4,
    "c": 33,
    "f": 0.5,
    "g": 5,
    "cat": "veg"
  },
  {
    "n": "Bell pepper",
    "k": 31,
    "p": 1,
    "c": 6,
    "f": 0.3,
    "g": 80,
    "cat": "veg",
    "cook": true
  },
  {
    "n": "Leek",
    "k": 31,
    "p": 1.5,
    "c": 7,
    "f": 0.3,
    "g": 80,
    "cat": "veg",
    "cook": true
  },
  {
    "n": "Celery",
    "k": 14,
    "p": 0.7,
    "c": 3,
    "f": 0.2,
    "g": 40,
    "cat": "veg"
  },
  {
    "n": "Asparagus",
    "k": 20,
    "p": 2.2,
    "c": 3.9,
    "f": 0.1,
    "g": 80,
    "cat": "veg",
    "cook": true
  },
  {
    "n": "Beetroot",
    "k": 43,
    "p": 1.6,
    "c": 10,
    "f": 0.2,
    "g": 80,
    "cat": "veg"
  },
  {
    "n": "Butternut squash",
    "k": 45,
    "p": 1,
    "c": 12,
    "f": 0.1,
    "g": 120,
    "cat": "veg",
    "cook": true
  },
  {
    "n": "Parsnip",
    "k": 75,
    "p": 1.2,
    "c": 18,
    "f": 0.3,
    "g": 80,
    "cat": "veg",
    "cook": true
  },
  {
    "n": "Brussels sprouts",
    "k": 43,
    "p": 3.4,
    "c": 9,
    "f": 0.3,
    "g": 80,
    "cat": "veg",
    "cook": true
  },
  {
    "n": "Sweetcorn, tinned",
    "k": 86,
    "p": 3,
    "c": 19,
    "f": 1.2,
    "g": 80,
    "cat": "veg"
  },
  {
    "n": "Coleslaw",
    "k": 150,
    "p": 1,
    "c": 8,
    "f": 13,
    "g": 50,
    "cat": "veg"
  },
  {
    "n": "Olives",
    "k": 145,
    "p": 1,
    "c": 6,
    "f": 15,
    "g": 30,
    "cat": "veg"
  },
  {
    "n": "Sundried tomatoes",
    "k": 210,
    "p": 5,
    "c": 24,
    "f": 11,
    "g": 20,
    "cat": "veg"
  },
  {
    "n": "Banana (1 ~118g)",
    "k": 89,
    "p": 1.1,
    "c": 23,
    "f": 0.3,
    "g": 118,
    "cat": "fruit"
  },
  {
    "n": "Apple (1 ~150g)",
    "k": 52,
    "p": 0.3,
    "c": 14,
    "f": 0.2,
    "g": 150,
    "cat": "fruit"
  },
  {
    "n": "Orange (1 ~130g)",
    "k": 47,
    "p": 0.9,
    "c": 12,
    "f": 0.1,
    "g": 130,
    "cat": "fruit"
  },
  {
    "n": "Pear",
    "k": 57,
    "p": 0.4,
    "c": 15,
    "f": 0.1,
    "g": 150,
    "cat": "fruit"
  },
  {
    "n": "Peach",
    "k": 39,
    "p": 0.9,
    "c": 10,
    "f": 0.3,
    "g": 120,
    "cat": "fruit"
  },
  {
    "n": "Plum",
    "k": 46,
    "p": 0.7,
    "c": 11,
    "f": 0.3,
    "g": 60,
    "cat": "fruit"
  },
  {
    "n": "Kiwi",
    "k": 61,
    "p": 1.1,
    "c": 15,
    "f": 0.5,
    "g": 75,
    "cat": "fruit"
  },
  {
    "n": "Pineapple",
    "k": 50,
    "p": 0.5,
    "c": 13,
    "f": 0.1,
    "g": 100,
    "cat": "fruit"
  },
  {
    "n": "Mango",
    "k": 60,
    "p": 0.8,
    "c": 15,
    "f": 0.4,
    "g": 120,
    "cat": "fruit"
  },
  {
    "n": "Melon",
    "k": 34,
    "p": 0.8,
    "c": 8,
    "f": 0.2,
    "g": 150,
    "cat": "fruit"
  },
  {
    "n": "Watermelon",
    "k": 30,
    "p": 0.6,
    "c": 8,
    "f": 0.2,
    "g": 200,
    "cat": "fruit"
  },
  {
    "n": "Strawberries",
    "k": 32,
    "p": 0.7,
    "c": 8,
    "f": 0.3,
    "g": 80,
    "cat": "fruit"
  },
  {
    "n": "Blueberries",
    "k": 57,
    "p": 0.7,
    "c": 14,
    "f": 0.3,
    "g": 80,
    "cat": "fruit"
  },
  {
    "n": "Raspberries",
    "k": 52,
    "p": 1.2,
    "c": 12,
    "f": 0.7,
    "g": 80,
    "cat": "fruit"
  },
  {
    "n": "Mixed berries",
    "k": 43,
    "p": 1.1,
    "c": 10,
    "f": 0.5,
    "g": 80,
    "cat": "fruit"
  },
  {
    "n": "Grapes",
    "k": 69,
    "p": 0.7,
    "c": 18,
    "f": 0.2,
    "g": 80,
    "cat": "fruit"
  },
  {
    "n": "Cherries",
    "k": 63,
    "p": 1.1,
    "c": 16,
    "f": 0.2,
    "g": 80,
    "cat": "fruit"
  },
  {
    "n": "Pomegranate",
    "k": 83,
    "p": 1.7,
    "c": 19,
    "f": 1.2,
    "g": 80,
    "cat": "fruit"
  },
  {
    "n": "Dates",
    "k": 277,
    "p": 1.8,
    "c": 75,
    "f": 0.2,
    "g": 25,
    "cat": "fruit"
  },
  {
    "n": "Raisins / sultanas",
    "k": 299,
    "p": 3,
    "c": 79,
    "f": 0.5,
    "g": 30,
    "cat": "fruit"
  },
  {
    "n": "Dried apricots",
    "k": 240,
    "p": 3.4,
    "c": 63,
    "f": 0.5,
    "g": 30,
    "cat": "fruit"
  },
  {
    "n": "Lemon",
    "k": 29,
    "p": 1.1,
    "c": 9,
    "f": 0.3,
    "g": 60,
    "cat": "fruit"
  },
  {
    "n": "Grapefruit",
    "k": 42,
    "p": 0.8,
    "c": 11,
    "f": 0.1,
    "g": 120,
    "cat": "fruit"
  },
  {
    "n": "Peanut butter",
    "k": 588,
    "p": 25,
    "c": 20,
    "f": 50,
    "g": 20,
    "cat": "fats"
  },
  {
    "n": "Almonds",
    "k": 579,
    "p": 21,
    "c": 22,
    "f": 50,
    "g": 25,
    "cat": "fats"
  },
  {
    "n": "Walnuts",
    "k": 654,
    "p": 15,
    "c": 14,
    "f": 65,
    "g": 25,
    "cat": "fats"
  },
  {
    "n": "Cashews",
    "k": 553,
    "p": 18,
    "c": 30,
    "f": 44,
    "g": 25,
    "cat": "fats"
  },
  {
    "n": "Pistachios",
    "k": 560,
    "p": 20,
    "c": 28,
    "f": 45,
    "g": 25,
    "cat": "fats"
  },
  {
    "n": "Mixed nuts",
    "k": 607,
    "p": 20,
    "c": 20,
    "f": 54,
    "g": 25,
    "cat": "fats"
  },
  {
    "n": "Peanuts",
    "k": 567,
    "p": 26,
    "c": 16,
    "f": 49,
    "g": 25,
    "cat": "fats"
  },
  {
    "n": "Sunflower seeds",
    "k": 584,
    "p": 21,
    "c": 20,
    "f": 51,
    "g": 15,
    "cat": "fats"
  },
  {
    "n": "Pumpkin seeds",
    "k": 559,
    "p": 30,
    "c": 11,
    "f": 49,
    "g": 15,
    "cat": "fats"
  },
  {
    "n": "Chia seeds",
    "k": 486,
    "p": 17,
    "c": 42,
    "f": 31,
    "g": 15,
    "cat": "fats"
  },
  {
    "n": "Tahini",
    "k": 595,
    "p": 17,
    "c": 21,
    "f": 54,
    "g": 15,
    "cat": "fats"
  },
  {
    "n": "Olive oil (tbsp ~14g)",
    "k": 884,
    "p": 0,
    "c": 0,
    "f": 100,
    "g": 14,
    "cat": "fats"
  },
  {
    "n": "Vegetable oil (tbsp ~14g)",
    "k": 884,
    "p": 0,
    "c": 0,
    "f": 100,
    "g": 14,
    "cat": "fats"
  },
  {
    "n": "Coconut oil (tbsp ~14g)",
    "k": 890,
    "p": 0,
    "c": 0,
    "f": 100,
    "g": 14,
    "cat": "fats"
  },
  {
    "n": "Ketchup (tbsp ~17g)",
    "k": 101,
    "p": 1.2,
    "c": 24,
    "f": 0.1,
    "g": 17,
    "cat": "sauces"
  },
  {
    "n": "Mayonnaise",
    "k": 680,
    "p": 1,
    "c": 1.3,
    "f": 75,
    "g": 15,
    "cat": "sauces"
  },
  {
    "n": "Light mayonnaise",
    "k": 290,
    "p": 0.9,
    "c": 9,
    "f": 27,
    "g": 15,
    "cat": "sauces"
  },
  {
    "n": "Brown sauce",
    "k": 120,
    "p": 1,
    "c": 28,
    "f": 0.1,
    "g": 15,
    "cat": "sauces"
  },
  {
    "n": "BBQ sauce",
    "k": 170,
    "p": 1,
    "c": 40,
    "f": 0.5,
    "g": 20,
    "cat": "sauces"
  },
  {
    "n": "Mustard",
    "k": 165,
    "p": 8,
    "c": 15,
    "f": 9,
    "g": 10,
    "cat": "sauces"
  },
  {
    "n": "Sweet chilli sauce",
    "k": 230,
    "p": 0.5,
    "c": 56,
    "f": 0.1,
    "g": 20,
    "cat": "sauces"
  },
  {
    "n": "Soy sauce (tbsp ~16g)",
    "k": 60,
    "p": 8,
    "c": 5,
    "f": 0,
    "g": 16,
    "cat": "sauces"
  },
  {
    "n": "Sriracha",
    "k": 100,
    "p": 2,
    "c": 19,
    "f": 1,
    "g": 15,
    "cat": "sauces"
  },
  {
    "n": "Pesto",
    "k": 450,
    "p": 5,
    "c": 6,
    "f": 45,
    "g": 20,
    "cat": "sauces"
  },
  {
    "n": "Gravy (made)",
    "k": 35,
    "p": 0.8,
    "c": 5,
    "f": 1.3,
    "g": 70,
    "cat": "sauces"
  },
  {
    "n": "Salad dressing / vinaigrette",
    "k": 350,
    "p": 0.5,
    "c": 8,
    "f": 35,
    "g": 15,
    "cat": "sauces"
  },
  {
    "n": "Honey (tbsp ~21g)",
    "k": 304,
    "p": 0.3,
    "c": 82,
    "f": 0,
    "g": 21,
    "cat": "sauces"
  },
  {
    "n": "Jam",
    "k": 260,
    "p": 0.4,
    "c": 64,
    "f": 0,
    "g": 15,
    "cat": "sauces"
  },
  {
    "n": "Marmalade",
    "k": 260,
    "p": 0.2,
    "c": 65,
    "f": 0,
    "g": 15,
    "cat": "sauces"
  },
  {
    "n": "Nutella",
    "k": 539,
    "p": 6,
    "c": 57,
    "f": 31,
    "g": 15,
    "cat": "sauces"
  },
  {
    "n": "Maple syrup",
    "k": 260,
    "p": 0,
    "c": 67,
    "f": 0,
    "g": 20,
    "cat": "sauces"
  },
  {
    "n": "Marmite",
    "k": 250,
    "p": 34,
    "c": 24,
    "f": 0.1,
    "g": 4,
    "cat": "sauces"
  },
  {
    "n": "Sugar (tsp ~4g)",
    "k": 387,
    "p": 0,
    "c": 100,
    "f": 0,
    "g": 4,
    "cat": "sauces"
  },
  {
    "n": "Pizza, cheese & tomato",
    "k": 250,
    "p": 11,
    "c": 30,
    "f": 9,
    "g": 250,
    "cat": "ready"
  },
  {
    "n": "Pizza, pepperoni",
    "k": 280,
    "p": 12,
    "c": 30,
    "f": 13,
    "g": 250,
    "cat": "ready"
  },
  {
    "n": "Lasagne (ready meal)",
    "k": 130,
    "p": 7,
    "c": 12,
    "f": 6,
    "g": 400,
    "cat": "ready"
  },
  {
    "n": "Shepherd's / cottage pie",
    "k": 120,
    "p": 7,
    "c": 11,
    "f": 5,
    "g": 400,
    "cat": "ready"
  },
  {
    "n": "Macaroni cheese",
    "k": 160,
    "p": 6,
    "c": 16,
    "f": 8,
    "g": 300,
    "cat": "ready"
  },
  {
    "n": "Spaghetti bolognese",
    "k": 120,
    "p": 7,
    "c": 13,
    "f": 4,
    "g": 350,
    "cat": "ready"
  },
  {
    "n": "Chicken tikka masala",
    "k": 150,
    "p": 11,
    "c": 6,
    "f": 9,
    "g": 350,
    "cat": "ready"
  },
  {
    "n": "Chicken korma",
    "k": 180,
    "p": 10,
    "c": 8,
    "f": 12,
    "g": 350,
    "cat": "ready"
  },
  {
    "n": "Beef curry",
    "k": 160,
    "p": 12,
    "c": 6,
    "f": 10,
    "g": 350,
    "cat": "ready"
  },
  {
    "n": "Chicken jalfrezi",
    "k": 120,
    "p": 12,
    "c": 7,
    "f": 5,
    "g": 350,
    "cat": "ready"
  },
  {
    "n": "Chow mein",
    "k": 130,
    "p": 6,
    "c": 18,
    "f": 4,
    "g": 350,
    "cat": "ready"
  },
  {
    "n": "Sweet & sour chicken",
    "k": 150,
    "p": 7,
    "c": 22,
    "f": 4,
    "g": 350,
    "cat": "ready"
  },
  {
    "n": "Spring roll",
    "k": 220,
    "p": 5,
    "c": 25,
    "f": 11,
    "g": 50,
    "cat": "ready"
  },
  {
    "n": "Samosa",
    "k": 260,
    "p": 5,
    "c": 28,
    "f": 14,
    "g": 60,
    "cat": "ready"
  },
  {
    "n": "Onion bhaji",
    "k": 290,
    "p": 6,
    "c": 30,
    "f": 16,
    "g": 50,
    "cat": "ready"
  },
  {
    "n": "Doner kebab meat",
    "k": 215,
    "p": 15,
    "c": 5,
    "f": 15,
    "g": 150,
    "cat": "ready"
  },
  {
    "n": "Cheeseburger, fast food",
    "k": 250,
    "p": 13,
    "c": 30,
    "f": 9,
    "g": 120,
    "cat": "ready"
  },
  {
    "n": "Chicken burger, fast food",
    "k": 240,
    "p": 13,
    "c": 26,
    "f": 10,
    "g": 150,
    "cat": "ready"
  },
  {
    "n": "Hot dog (sausage + bun)",
    "k": 250,
    "p": 10,
    "c": 22,
    "f": 14,
    "g": 100,
    "cat": "ready"
  },
  {
    "n": "Meatballs (in sauce)",
    "k": 160,
    "p": 10,
    "c": 8,
    "f": 10,
    "g": 150,
    "cat": "ready"
  },
  {
    "n": "Fish & chips",
    "k": 230,
    "p": 9,
    "c": 24,
    "f": 12,
    "g": 300,
    "cat": "ready"
  },
  {
    "n": "Sushi, salmon set",
    "k": 145,
    "p": 5,
    "c": 30,
    "f": 1,
    "g": 150,
    "cat": "ready"
  },
  {
    "n": "Tomato soup",
    "k": 55,
    "p": 1,
    "c": 8,
    "f": 2,
    "g": 300,
    "cat": "ready"
  },
  {
    "n": "Chicken soup",
    "k": 50,
    "p": 2.5,
    "c": 5,
    "f": 2.5,
    "g": 300,
    "cat": "ready"
  },
  {
    "n": "McDonald's Big Mac",
    "k": 257,
    "p": 13,
    "c": 26,
    "f": 11,
    "g": 209,
    "cat": "fastfood"
  },
  {
    "n": "McDonald's McChicken Sandwich",
    "k": 240,
    "p": 16,
    "c": 33,
    "f": 7,
    "g": 167,
    "cat": "fastfood"
  },
  {
    "n": "McDonald's Chicken McNuggets (6)",
    "k": 271,
    "p": 15,
    "c": 17,
    "f": 15,
    "g": 96,
    "cat": "fastfood"
  },
  {
    "n": "McDonald's Large Fries",
    "k": 312,
    "p": 5,
    "c": 41,
    "f": 16,
    "g": 154,
    "cat": "fastfood"
  },
  {
    "n": "McDonald's Egg McMuffin",
    "k": 221,
    "p": 17,
    "c": 28,
    "f": 11,
    "g": 136,
    "cat": "fastfood"
  },
  {
    "n": "McDonald's Filet-O-Fish",
    "k": 241,
    "p": 15,
    "c": 31,
    "f": 9,
    "g": 140,
    "cat": "fastfood"
  },
  {
    "n": "McDonald's Cheeseburger",
    "k": 261,
    "p": 15,
    "c": 32,
    "f": 9,
    "g": 115,
    "cat": "fastfood"
  },
  {
    "n": "Nando's Quarter Chicken (plain)",
    "k": 148,
    "p": 32,
    "c": 0,
    "f": 9,
    "g": 230,
    "cat": "fastfood"
  },
  {
    "n": "Nando's Half Chicken (plain)",
    "k": 148,
    "p": 32,
    "c": 0,
    "f": 9,
    "g": 460,
    "cat": "fastfood"
  },
  {
    "n": "Nando's Peri-Peri Chips",
    "k": 165,
    "p": 4,
    "c": 28,
    "f": 10,
    "g": 200,
    "cat": "fastfood"
  },
  {
    "n": "Nando's Chicken Pitta",
    "k": 171,
    "p": 27,
    "c": 27,
    "f": 5,
    "g": 287,
    "cat": "fastfood"
  },
  {
    "n": "KFC Original Recipe Chicken piece",
    "k": 250,
    "p": 22,
    "c": 13,
    "f": 16,
    "g": 152,
    "cat": "fastfood"
  },
  {
    "n": "KFC Zinger Burger",
    "k": 227,
    "p": 21,
    "c": 36,
    "f": 9,
    "g": 197,
    "cat": "fastfood"
  },
  {
    "n": "KFC Fries (regular)",
    "k": 309,
    "p": 4,
    "c": 37,
    "f": 16,
    "g": 92,
    "cat": "fastfood"
  },
  {
    "n": "Greggs Sausage Roll",
    "k": 318,
    "p": 11,
    "c": 27,
    "f": 19,
    "g": 106,
    "cat": "fastfood"
  },
  {
    "n": "Greggs Steak Bake",
    "k": 347,
    "p": 13,
    "c": 30,
    "f": 21,
    "g": 117,
    "cat": "fastfood"
  },
  {
    "n": "Greggs Cheese & Onion Bake",
    "k": 373,
    "p": 11,
    "c": 33,
    "f": 23,
    "g": 111,
    "cat": "fastfood"
  },
  {
    "n": "Greggs Yum Yum",
    "k": 384,
    "p": 5,
    "c": 44,
    "f": 22,
    "g": 81,
    "cat": "fastfood"
  },
  {
    "n": "Pot Noodle Chicken & Mushroom",
    "k": 406,
    "p": 9,
    "c": 58,
    "f": 14,
    "g": 90,
    "cat": "fastfood"
  },
  {
    "n": "Pot Noodle Beef & Tomato",
    "k": 400,
    "p": 9,
    "c": 57,
    "f": 13,
    "g": 90,
    "cat": "fastfood"
  },
  {
    "n": "Subway 6-inch Chicken Tikka",
    "k": 175,
    "p": 14.2,
    "c": 21.8,
    "f": 3.6,
    "g": 197,
    "cat": "fastfood"
  },
  {
    "n": "Subway 6-inch Italian BMT",
    "k": 278,
    "p": 14.4,
    "c": 29.5,
    "f": 11.5,
    "g": 139,
    "cat": "fastfood"
  },
  {
    "n": "Burger King Whopper",
    "k": 207,
    "p": 10.1,
    "c": 18.5,
    "f": 10.5,
    "g": 287,
    "cat": "fastfood"
  },
  {
    "n": "Burger King Chicken Royale",
    "k": 262,
    "p": 10.6,
    "c": 24,
    "f": 13.4,
    "g": 217,
    "cat": "fastfood"
  },
  {
    "n": "Domino's Margherita slice",
    "k": 225,
    "p": 9,
    "c": 31,
    "f": 7,
    "g": 97,
    "cat": "fastfood"
  },
  {
    "n": "Domino's Pepperoni slice",
    "k": 265,
    "p": 10,
    "c": 31,
    "f": 11,
    "g": 100,
    "cat": "fastfood"
  },
  {
    "n": "Crisps (bag ~25g)",
    "k": 532,
    "p": 6.6,
    "c": 53,
    "f": 34,
    "g": 25,
    "cat": "snacks"
  },
  {
    "n": "Tortilla chips",
    "k": 490,
    "p": 7,
    "c": 63,
    "f": 23,
    "g": 30,
    "cat": "snacks"
  },
  {
    "n": "Pretzels",
    "k": 380,
    "p": 10,
    "c": 80,
    "f": 3,
    "g": 30,
    "cat": "snacks"
  },
  {
    "n": "Popcorn, plain",
    "k": 387,
    "p": 13,
    "c": 78,
    "f": 4,
    "g": 20,
    "cat": "snacks"
  },
  {
    "n": "Milk chocolate (small bar ~45g)",
    "k": 535,
    "p": 7.6,
    "c": 59,
    "f": 30,
    "g": 45,
    "cat": "snacks"
  },
  {
    "n": "Dark chocolate 70% (2 squares ~20g)",
    "k": 598,
    "p": 7.8,
    "c": 46,
    "f": 43,
    "g": 20,
    "cat": "snacks"
  },
  {
    "n": "Maltesers",
    "k": 500,
    "p": 7,
    "c": 63,
    "f": 24,
    "g": 37,
    "cat": "snacks"
  },
  {
    "n": "Wine gums / Haribo",
    "k": 340,
    "p": 6.9,
    "c": 77,
    "f": 0.2,
    "g": 30,
    "cat": "snacks"
  },
  {
    "n": "Jaffa cake (1)",
    "k": 370,
    "p": 4,
    "c": 72,
    "f": 8,
    "g": 12,
    "cat": "snacks"
  },
  {
    "n": "Digestive biscuit",
    "k": 470,
    "p": 6.5,
    "c": 63,
    "f": 21,
    "g": 15,
    "cat": "snacks"
  },
  {
    "n": "Chocolate digestive",
    "k": 490,
    "p": 6,
    "c": 64,
    "f": 23,
    "g": 17,
    "cat": "snacks"
  },
  {
    "n": "Hobnob",
    "k": 470,
    "p": 7,
    "c": 64,
    "f": 21,
    "g": 18,
    "cat": "snacks"
  },
  {
    "n": "Rich tea biscuit",
    "k": 450,
    "p": 7,
    "c": 75,
    "f": 14,
    "g": 8,
    "cat": "snacks"
  },
  {
    "n": "Shortbread",
    "k": 520,
    "p": 5.5,
    "c": 60,
    "f": 29,
    "g": 20,
    "cat": "snacks"
  },
  {
    "n": "Cream cracker",
    "k": 430,
    "p": 9,
    "c": 68,
    "f": 13,
    "g": 16,
    "cat": "snacks"
  },
  {
    "n": "Oatcakes",
    "k": 430,
    "p": 10,
    "c": 60,
    "f": 18,
    "g": 30,
    "cat": "snacks"
  },
  {
    "n": "Rice cakes",
    "k": 380,
    "p": 8,
    "c": 81,
    "f": 3,
    "g": 10,
    "cat": "snacks"
  },
  {
    "n": "Flapjack",
    "k": 450,
    "p": 5,
    "c": 60,
    "f": 22,
    "g": 60,
    "cat": "snacks"
  },
  {
    "n": "Cereal bar",
    "k": 400,
    "p": 6,
    "c": 68,
    "f": 11,
    "g": 30,
    "cat": "snacks"
  },
  {
    "n": "Protein bar",
    "k": 350,
    "p": 30,
    "c": 35,
    "f": 9,
    "g": 60,
    "cat": "snacks"
  },
  {
    "n": "Doughnut",
    "k": 400,
    "p": 6,
    "c": 50,
    "f": 20,
    "g": 60,
    "cat": "snacks"
  },
  {
    "n": "Blueberry muffin",
    "k": 380,
    "p": 5,
    "c": 50,
    "f": 18,
    "g": 70,
    "cat": "snacks"
  },
  {
    "n": "Brownie",
    "k": 470,
    "p": 6,
    "c": 55,
    "f": 25,
    "g": 50,
    "cat": "snacks"
  },
  {
    "n": "Cookie",
    "k": 480,
    "p": 5,
    "c": 65,
    "f": 22,
    "g": 40,
    "cat": "snacks"
  },
  {
    "n": "Water",
    "k": 0,
    "p": 0,
    "c": 0,
    "f": 0,
    "g": 250,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "Coffee, black",
    "k": 2,
    "p": 0.1,
    "c": 0,
    "f": 0,
    "g": 240,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "Latte (with milk)",
    "k": 50,
    "p": 3,
    "c": 5,
    "f": 2,
    "g": 240,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "Cappuccino",
    "k": 40,
    "p": 2.5,
    "c": 4,
    "f": 1.8,
    "g": 180,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "Hot chocolate (with milk)",
    "k": 90,
    "p": 3.5,
    "c": 12,
    "f": 3,
    "g": 240,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "Tea, no milk",
    "k": 1,
    "p": 0,
    "c": 0.2,
    "f": 0,
    "g": 240,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "Tea with milk",
    "k": 13,
    "p": 0.7,
    "c": 1,
    "f": 0.5,
    "g": 240,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "Milkshake",
    "k": 90,
    "p": 3,
    "c": 13,
    "f": 3,
    "g": 300,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "Fruit smoothie",
    "k": 55,
    "p": 0.8,
    "c": 13,
    "f": 0.2,
    "g": 250,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "Orange juice",
    "k": 45,
    "p": 0.7,
    "c": 10,
    "f": 0.2,
    "g": 200,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "Apple juice",
    "k": 46,
    "p": 0.1,
    "c": 11,
    "f": 0.1,
    "g": 200,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "Cola",
    "k": 42,
    "p": 0,
    "c": 10.6,
    "f": 0,
    "g": 330,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "Diet cola",
    "k": 0.4,
    "p": 0,
    "c": 0,
    "f": 0,
    "g": 330,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "Lemonade",
    "k": 40,
    "p": 0,
    "c": 10,
    "f": 0,
    "g": 330,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "Energy drink",
    "k": 45,
    "p": 0,
    "c": 11,
    "f": 0,
    "g": 250,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "Sports drink",
    "k": 24,
    "p": 0,
    "c": 6,
    "f": 0,
    "g": 500,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "Squash, diluted",
    "k": 20,
    "p": 0,
    "c": 5,
    "f": 0,
    "g": 250,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "Tonic water",
    "k": 34,
    "p": 0,
    "c": 8.5,
    "f": 0,
    "g": 150,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "Lager",
    "k": 43,
    "p": 0.5,
    "c": 3.6,
    "f": 0,
    "g": 330,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "Red wine",
    "k": 85,
    "p": 0.1,
    "c": 2.6,
    "f": 0,
    "g": 175,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "White wine",
    "k": 82,
    "p": 0.1,
    "c": 2.6,
    "f": 0,
    "g": 175,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "Prosecco",
    "k": 80,
    "p": 0.2,
    "c": 3,
    "f": 0,
    "g": 125,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "Spirits, vodka/gin",
    "k": 220,
    "p": 0,
    "c": 0,
    "f": 0,
    "g": 25,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "Coca-Cola",
    "k": 42,
    "p": 0,
    "c": 10.6,
    "f": 0,
    "g": 330,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "Coca-Cola Zero Sugar",
    "k": 0.4,
    "p": 0,
    "c": 0,
    "f": 0,
    "g": 330,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "Diet Coke",
    "k": 0.4,
    "p": 0,
    "c": 0,
    "f": 0,
    "g": 330,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "Pepsi",
    "k": 43,
    "p": 0,
    "c": 10.7,
    "f": 0,
    "g": 330,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "Pepsi Max",
    "k": 0.3,
    "p": 0,
    "c": 0,
    "f": 0,
    "g": 330,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "Fanta Orange",
    "k": 44,
    "p": 0,
    "c": 11,
    "f": 0,
    "g": 330,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "Sprite",
    "k": 40,
    "p": 0,
    "c": 10,
    "f": 0,
    "g": 330,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "Irn-Bru",
    "k": 37,
    "p": 0.1,
    "c": 9,
    "f": 0,
    "g": 330,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "Lucozade Original",
    "k": 70,
    "p": 0,
    "c": 17,
    "f": 0,
    "g": 500,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "Red Bull",
    "k": 45,
    "p": 0.6,
    "c": 11,
    "f": 0,
    "g": 250,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "Monster Energy",
    "k": 46,
    "p": 0,
    "c": 11,
    "f": 0,
    "g": 500,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "Oasis",
    "k": 35,
    "p": 0,
    "c": 8.5,
    "f": 0,
    "g": 330,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "J2O",
    "k": 43,
    "p": 0.1,
    "c": 10,
    "f": 0,
    "g": 275,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "Innocent orange juice",
    "k": 44,
    "p": 0.7,
    "c": 10.5,
    "f": 0.1,
    "g": 250,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "Ribena (undiluted)",
    "k": 250,
    "p": 0.2,
    "c": 64,
    "f": 0,
    "g": 30,
    "ml": true,
    "cat": "drinks"
  },
  {
    "n": "Volvic Touch of Fruit",
    "k": 17,
    "p": 0,
    "c": 4,
    "f": 0,
    "g": 500,
    "ml": true,
    "cat": "drinks"
  }
]
