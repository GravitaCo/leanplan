/** `npm run check:foods` — validates the built-in food database. Fails on errors. */
import { FOODS } from '@/core/data/foods'
import { validateFoods } from '@/core/data/validate'

const r = validateFoods(FOODS)
const sourced = FOODS.length - r.unsourced.length
console.log(`${FOODS.length} foods · ${sourced} with a cited source · ${r.unsourced.length} not yet checked`)
if (r.warnings.length) console.log(`\n${r.warnings.length} warning(s):\n  ` + r.warnings.join('\n  '))
if (r.errors.length) {
  console.error(`\n${r.errors.length} error(s):\n  ` + r.errors.join('\n  '))
  process.exit(1)
}
console.log('\nOK')
