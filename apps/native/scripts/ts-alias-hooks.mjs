/**
 * Node module hooks for running native-side TypeScript tests with Node's own type stripping (no
 * bundler, no web node_modules), as CI does: `@/…` resolves to the repo's src/ (as Metro and the
 * tsconfig paths do), extensionless relative imports find their .ts file, and packages imported
 * from shared code resolve from this app's node_modules (as Metro does).
 *   node --import ./scripts/ts-alias-hooks.mjs <test.ts>
 */
import { register } from 'node:module'
import { existsSync, statSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

if (!globalThis.__tsAliasHooks) {
  globalThis.__tsAliasHooks = true
  register(import.meta.url)
}

const APP = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(APP, '../../src')
const EXTS = ['.ts', '.tsx', '.js', '.mjs', '/index.ts', '/index.js']
const file = (p) => { try { return statSync(p).isFile() } catch { return false } }
const withExt = (p) => (file(p) ? p : EXTS.map((e) => p + e).find(file))

export async function resolve(spec, ctx, next) {
  if (spec.startsWith('@/')) {
    const p = withExt(join(SRC, spec.slice(2)))
    if (p) return { url: pathToFileURL(p).href, shortCircuit: true }
  }
  if ((spec.startsWith('./') || spec.startsWith('../')) && ctx.parentURL?.startsWith('file:')) {
    const base = join(dirname(fileURLToPath(ctx.parentURL)), spec)
    if (!existsSync(base) || !file(base)) {
      const p = withExt(base)
      if (p) return { url: pathToFileURL(p).href, shortCircuit: true }
    }
  }
  try {
    return await next(spec, ctx)
  } catch (e) {
    // a package imported from shared src/ code: resolve it from this app, as Metro does
    if (!spec.startsWith('.') && !spec.startsWith('/') && !spec.startsWith('node:')) return next(spec, { ...ctx, parentURL: pathToFileURL(join(APP, 'package.json')).href })
    throw e
  }
}

/** Vite's `import.meta.env` in shared code: empty here (the web defaults), as the web's npm test defines it. */
export async function load(url, ctx, next) {
  const r = await next(url, ctx)
  if (!/\.(m?ts|tsx)$/.test(new URL(url).pathname) || r.source == null) return r
  const src = String(r.source)
  return src.includes('import.meta.env') ? { ...r, source: src.replaceAll('import.meta.env', '({})') } : r
}
