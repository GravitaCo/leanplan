/** `npm run check:foods` — validates the built-in food database. Fails on errors. */
import { FOODS } from '@/core/data/foods'
import { validateFoods } from '@/core/data/validate'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const r = validateFoods(FOODS)

// Sourced values are locked to the audit record that justified them: a CoFID/USDA food must
// still hold exactly the reference values recorded in docs/data (kcal whole, macros to 0.1 g).
// Changing one means re-auditing it, not editing the number.
type Row = { n: string; ref: { source: string; code: string | null; k: number | null; p: number | null; c: number | null; f: number | null } }
// every docs/data/food-audit*.json (run from the repo root, as npm does)
const dir = 'docs/data'
const audit: Row[] = readdirSync(dir).filter((f) => /^food-audit.*\.json$/.test(f)).sort()
  .flatMap((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Row[])
const byName = new Map<string, Row>()
for (const a of audit) {
  if (byName.has(a.n)) r.errors.push(`${a.n}: audited more than once in docs/data`)
  byName.set(a.n, a)
}
const r1 = (x: number | null) => Math.round((x ?? 0) * 10) / 10
for (const f of FOODS) {
  const key = f.src?.split(':')[0]
  if (key !== 'cofid' && key !== 'usda') continue
  const a = byName.get(f.n)
  if (!a || a.ref.k == null) { r.errors.push(`${f.n}: cites ${f.src} but has no audit record`); continue }
  const want = { k: Math.round(a.ref.k), p: r1(a.ref.p), c: r1(a.ref.c), f: r1(a.ref.f) }
  const diff = (['k', 'p', 'c', 'f'] as const).filter((m) => f[m] !== want[m])
  if (diff.length) r.errors.push(`${f.n}: differs from its audited ${f.src} values (${diff.map((m) => `${m} ${f[m]} vs ${want[m]}`).join(', ')})`)
}

const sourced = FOODS.length - r.unsourced.length
const withRef = FOODS.filter((f) => f.ref).length
console.log(`${FOODS.length} foods · ${sourced} with a cited source · ${withRef} checked against a published figure · ${r.unsourced.length} not yet checked`)
if (r.warnings.length) console.log(`\n${r.warnings.length} warning(s):\n  ` + r.warnings.join('\n  '))
if (r.errors.length) {
  console.error(`\n${r.errors.length} error(s):\n  ` + r.errors.join('\n  '))
  process.exit(1)
}
console.log('\nOK')
