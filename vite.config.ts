import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// During migration the new app is published at /leanplan/app/ so the existing LeanPlan
// stays live at /leanplan/. At cutover, change this to '/leanplan/' and drop legacy/.
export default defineConfig({
  base: '/leanplan/app/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
