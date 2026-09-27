import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

/**
 * Lists the build's lazily loaded assets (the barcode scanner's decoder and its .wasm) in a
 * <meta name="tali-lazy"> tag. The service worker doesn't precache them (most people never open
 * the scanner), but it keeps them once fetched instead of pruning them as "not in this shell",
 * so scanning keeps working offline after its first use. See public/sw.js.
 */
function lazyAssetList(): Plugin {
  return {
    name: 'tali-lazy-assets',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html
        const lazy = Object.keys(ctx.bundle).filter((f) => f.startsWith('assets/') && !f.endsWith('.map') && !html.includes(f))
        return lazy.length ? html.replace('</head>', `  <meta name="tali-lazy" content="${lazy.join(' ')}" />\n  </head>`) : html
      },
    },
  }
}

// Served from the custom domain https://app.tali.fit/ (GitHub Pages). Base is '/' because the
// app now lives at the domain root, not under a /leanplan/ project path. The previous
// LeanPlan build is parked at /legacy/ and can be removed once the new app is settled.
export default defineConfig({
  base: '/',
  plugins: [react(), lazyAssetList()],
  // local preview only: lets a phone reach it through an https tunnel (camera needs https);
  // see docs/local-preview.md. Doesn't affect the built site.
  preview: { allowedHosts: ['.trycloudflare.com'] },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
