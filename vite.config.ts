import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// Served from the custom domain https://tali.fit/ (GitHub Pages). Base is '/' because the
// app now lives at the domain root, not under a /leanplan/ project path. The previous
// LeanPlan build is parked at /legacy/ and can be removed once the new app is settled.
export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
