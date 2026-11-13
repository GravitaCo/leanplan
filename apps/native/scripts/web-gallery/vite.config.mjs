// The web twin of the native component gallery, served by the web app's own Vite and React (the
// repo root's node_modules), with the web's style sheets. Used by scripts/e2e-gallery-parity.cjs:
//   (repo root) npx vite --config apps/native/scripts/web-gallery/vite.config.mjs --port 4179
import { defineConfig } from 'vite'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(here, '../../../..')
const require = createRequire(path.join(repo, 'package.json'))
const react = require('@vitejs/plugin-react').default
const mod = (m) => path.join(repo, 'node_modules', m)

export default defineConfig({
  root: here,
  publicDir: path.join(repo, 'public'),
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^@\//, replacement: path.join(repo, 'src') + '/' },
      // the web's React 18 and libraries, never the native app's copies next to this folder
      { find: /^react$/, replacement: mod('react') },
      { find: /^react\/(.*)$/, replacement: mod('react') + '/$1' },
      { find: /^react-dom$/, replacement: mod('react-dom') },
      { find: /^react-dom\/(.*)$/, replacement: mod('react-dom') + '/$1' },
      { find: /^zustand(.*)$/, replacement: mod('zustand') + '$1' },
      { find: /^immer$/, replacement: mod('immer') },
      { find: /^@supabase\/supabase-js$/, replacement: mod('@supabase/supabase-js') },
    ],
  },
  cacheDir: path.join(repo, 'node_modules/.vite-gallery'),
  server: { fs: { allow: [repo] } },
})
