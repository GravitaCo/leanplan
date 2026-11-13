/**
 * The Food screens' words (src/screens/FoodScreen.tsx and src/screens/food/*, scanning aside), read
 * by the web and native Food screens alike so the two apps say the same thing. Onboarding 9's food
 * words (FOOD9) stay in onboardingApp.ts; meal names are MEAL_LABEL in core/domain/insights.
 */
import type { MealSlot } from '@/core/types'

/** The Food tab */
export const FOOD = {
  title: 'Food',
  addFood: 'Add food',
  daySoFar: 'Day so far',
  kcalEaten: 'kcal eaten',
  aboutEstimate: 'About this estimate',
  range: (lo: string, hi: string) => `Range ${lo}–${hi}`,
  yourRecipes: 'Your recipes',
  manage: 'Manage',
  servings: (serv: string, n: number) => `${serv} serving${n !== 1 ? 's' : ''}`,
  addsTo: (meal: string) => `adds to ${meal.toLowerCase()}`,
  addTo: (meal: string) => `Add to ${meal.toLowerCase()}`,
  other: 'Other',
  quicker: 'Quicker ways to log',
  sameAsYesterday: 'Same as yesterday',
  copyAMeal: 'Copy a meal in one tap',
  whatCanIMake: 'What can I make?',
  whatCanIMakeS: 'Recipes that fit what you have',
  quickEstimate: 'Quick estimate',
  quickEstimateS: "When you don't know the exact food",
  createFood: 'Create a food',
  saveAsRecipe: 'Save as recipe',
  saveAsRecipeOne: (meal: string) => `${meal}: log all of this in one tap next time`,
  saveAsRecipeMany: 'Log a whole meal in one tap next time',
  foot: 'Numbers marked ≈ are estimates. Your day total shows a ± margin so it stays honest about what it knows.',
} as const

/** About this estimate (the ± on the day total) */
export const MARGIN = {
  title: 'About this estimate',
  done: 'Done',
  todaysMargin: "today's margin",
  p1: 'No food log is exact. Portions are guessed, labels round, and cooking changes things. Instead of pretending, Tilo shows how sure it is.',
  p2: 'Weighed food is very close. Servings and your usual portions are close. Hand estimates and quick estimates are rougher. The margin combines them all.',
  biggest: 'Biggest source today:',
  biggestWhat: (source: string) => `${source.toLowerCase()} entries.`,
  context: 'For context, careful manual logging typically misses 20% or more. Roughly right every day beats precise now and then.',
} as const

/** The Add food sheet (its scan entry points' words are N6's, in src/copy/scan.ts) */
export const ADD_FOOD = {
  title: 'Add food',
  searchPlaceholder: (n: string) => `Search ${n} foods and your recipes`,
  searchLabel: 'Search foods',
  yourRecipes: 'Your recipes',
  yourUsual: (meal: string) => `Your usual ${meal.toLowerCase()}`,
  oneTap: 'one tap',
  recent: 'Recent',
  myFoods: 'My foods',
  common: 'Common',
  foods: 'Foods',
  mine: 'Mine',
  logServing: (serv: string, name: string) => `Log ${serv} serving of ${name}`,
  deleteFood: (name: string) => `Delete ${name}`,
  deleteFoodAsk: (name: string) => `Delete "${name}" from your foods?`,
  pairFoot: 'Shown only while two saved foods look alike. Merging or “They’re different” clears it.',
  nothingMatches: (q: string) => `Nothing matches “${q}”.`,
  eatingOut: 'Eating out? A quick estimate is better than nothing.',
  quickEstimate: 'Quick estimate',
  quickEstimateS: 'Restaurant or unknown food',
  createFood: 'Create a food',
  createFoodS: 'From the label on the packet',
} as const

/** A food's portion */
export const PORTION = {
  add: 'Add',
  source: 'Source:',
  sourceUnchecked: 'Source not yet checked',
  howMuch: 'How much?',
  servings: 'Servings',
  grams: 'Grams',
  millilitres: 'Millilitres',
  hands: 'Hands',
  weighRaw: 'Weigh it before cooking: raw weight, not cooked.',
  perItem: (maker: string) => `Values are for one item, as ${maker} publishes them.`,
  theMaker: 'the maker',
  oneServing: (amount: string) => `One serving is ${amount}.`,
  howMany: 'How many?',
  fewer: 'Fewer',
  more: 'More',
  handIs: (hand: string, grams: number, unit: string) => `For you, one ${hand.toLowerCase()} ≈ ${grams} ${unit}. Calibrate in Profile.`,
  amountIn: (unit: string) => `Amount in ${unit}`,
  amountSlider: 'Amount slider',
  yourUsual: (amount: string) => `Your usual is ${amount}.`,
  useIt: 'Use it',
  howCooked: 'How was it cooked?',
  fatAdded: "Cooking fat is the part food logs miss most, so it's added separately and you can change it.",
  fatSkipped: 'Cooking fat is the part food logs miss most. Skip it and nothing is added, we just widen the margin.',
  addTo: (meal: string) => `Add to ${meal}`,
  added: (name: string) => `${name} added`,
} as const

/** Edit an entry */
export const EDIT_ENTRY = {
  done: 'Done',
  portionSize: 'Portion size',
  asLogged: 'As logged',
  logged: 'Logged',
  flagged: 'This is one of the bigger uncertainties in your day.',
  looksRight: 'Looks right',
  delete: 'Delete entry',
} as const

/** Quick estimate */
export const QUICK = {
  title: 'Quick estimate',
  add: 'Add',
  intro: (pct: number) => `For meals out or anything without a label. It's logged as an estimate (± ${pct}%) so your total stays honest.`,
  name: 'Name', namePh: 'Pub lunch',
  calories: 'Calories', required: 'Required',
  protein: 'Protein', carbs: 'Carbs', fat: 'Fat', optional: 'Optional',
  meal: 'Meal',
  needCalories: 'Enter the calories',
  added: 'Estimate added',
} as const

/** Create a food */
export const CREATE_FOOD = {
  title: 'Create a food',
  save: 'Save',
  barcode: (code: string) => ` Barcode ${code}.`,
  intro: (unit: string, barcode: boolean) => `Copy the “per 100 ${unit}” column from the packet. Saved foods appear in search from now on${barcode ? ', and open when you scan this barcode' : ''}.`,
  grams: 'Grams', millilitres: 'Millilitres',
  name: 'Name', namePh: "Mum's chilli",
  serving: 'Serving',
  per100: (unit: string) => `Per 100 ${unit}`,
  calories: 'Calories', protein: 'Protein', carbs: 'Carbs', fat: 'Fat',
  addsUp: 'Adds up: the calories match the protein, carbs and fat.',
  needName: 'Give it a name',
  checkNote: 'Check the note below, or tap Save again to keep these numbers',
  labelPhoto: 'Photo of the label',
} as const

/** Recipes: the list, the builder, logging one */
export const RECIPES = {
  title: 'Recipes',
  done: 'Done',
  intro: 'Cooked it yourself? You know exactly what went in. Build it once, then log a bowl in one tap.',
  servingsLine: (n: number) => `${n} servings · `,
  perServing: (protein: number | string) => `${protein} g protein per serving`,
  log: 'Log',
  edit: 'Edit',
  none: 'No recipes yet. Build one from its ingredients below.',
  new: 'New recipe',
  editTitle: 'Edit recipe',
  back: 'Recipes',
  save: 'Save',
  fromMeal: "Everything you logged, cooking fat included. Name it once and next time it's one tap.",
  name: 'Name', namePh: 'Chicken curry',
  servings: 'Servings',
  ingredients: 'Ingredients',
  cooked: 'Cooked weight',
  amountOf: (name: string) => `${name} amount`,
  remove: (name: string) => `Remove ${name}`,
  empty: "Add what went in. Don't forget the oil. It's the part photos never see.",
  wholeRecipe: 'Whole recipe',
  perServingLabel: 'Per serving',
  allGood: 'Every ingredient has an amount and its values add up.',
  addIngredients: 'Add ingredients',
  searchPh: 'Search foods',
  searchLabel: 'Search ingredients',
  delete: 'Delete recipe',
  needName: 'Give the recipe a name',
  needItems: 'Add at least one ingredient',
  nameTaken: 'You already have a recipe with that name',
  // logging a recipe
  add: 'Add',
  makes: (n: number) => `The recipe makes ${n} serving${n !== 1 ? 's' : ''}. It's worked out from its ingredients, so it's more accurate than a photo of the plate.`,
  addTo: (meal: string) => `Add to ${meal}`,
} as const

/** What can I make? */
export const SUGGEST = {
  title: 'What can I make?',
  done: 'Done',
  noRecipes: "Suggestions come from your recipes. Save a meal you've logged as a recipe, or build one from its ingredients.",
  recipes: 'Recipes',
  iHave: 'I have…',
  addPh: 'Add something else',
  addLabel: 'Add an ingredient you have',
  assumed: 'Salt, pepper, oil, stock and dried herbs and spices are assumed. No amounts needed.',
  yourRecipes: (diet?: string) => `Your recipes${diet ? ` · ${diet}` : ''}`,
  haveAll: 'You have everything',
  missing: (names: string[]) => `Missing: ${names.slice(0, 3).join(', ')}${names.length > 3 ? ` +${names.length - 3}` : ''}`,
  ranked: 'Ranked by what you have. Swaps use the same weight (oil for butter a little less). Edit the recipe to use one.',
} as const

/** Duplicate saved foods (boards dup-1 to dup-4); figures and titles come from duplicateModel */
export const DUP = {
  barcodeLead: 'You’ve saved this barcode before. This is what would change.',
  changes: (per: string) => `Changes, ${per}`,
  name: 'Name', was: 'Was', now: 'Now',
  changesTo: 'changes to',
  noChange: 'No change',
  followFoot: 'Your logs and usuals follow the food. Days you’ve already logged keep their numbers.',
  updateIt: 'Update it',
  keepMine: 'Keep mine',
  yours: 'Yours',
  tableLabel: (theirs: string, per: string) => `Yours and the ${theirs.toLowerCase()} one, ${per}`,
  keepYours: 'Keep yours',
  useTheirs: (theirs: string) => `Use the ${theirs.toLowerCase()} one`,
  saveAsNew: 'Save as new',
  keepsName: (theirs: string) => `Using the ${theirs.toLowerCase()} one keeps your name, so usuals and Same as yesterday still find it.`,
  looksSame: '2 foods look the same',
  sameTitle: 'Same food?',
  pick: 'Pick the one to keep',
  pickLead: 'Anything you’ve logged with the other one moves to the one you keep.',
  foodToKeep: 'Food to keep',
  whatHappens: 'What happens',
  otherBarcode: 'Use the other barcode',
  offBarcode: 'Its barcode came from Open Food Facts, so scanning the pack finds this food.',
  keepThis: 'Keep this one',
  different: 'They’re different',
} as const

/** The meal picker: "Snack" fits the segment where the heading says "Snacks" */
export const mealOption = (m: MealSlot, label: string): string => (m === 'snack' ? 'Snack' : label)
