import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// Served from https://<user>.github.io/leanplan/. The previous LeanPlan build is parked
// at /leanplan/legacy/ as a fallback and can be removed once the new app is settled.
export default defineConfig({
  base: '/leanplan/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
