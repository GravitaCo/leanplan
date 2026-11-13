// `npm test` for the native app: runs every "test:*" script in package.json (each stream adds its
// own, e.g. test:platform, test:scan, test:mind) and fails if any fails, so CI needs one line.
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const scripts = Object.keys(JSON.parse(readFileSync(new URL('../package.json', import.meta.url))).scripts || {})
  .filter((s) => s.startsWith('test:')).sort()
if (!scripts.length) { console.log('no test:* scripts yet'); process.exit(0) }
let failed = 0
for (const s of scripts) {
  console.log(`\n▶ npm run ${s}`)
  const r = spawnSync('npm', ['run', '-s', s], { stdio: 'inherit' })
  if (r.status !== 0) { failed++; console.log(`✖ ${s} failed`) }
}
console.log(failed ? `\n${failed} of ${scripts.length} test scripts failed` : `\nall ${scripts.length} test scripts passed`)
process.exit(failed ? 1 : 0)
