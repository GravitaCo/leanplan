// Vite's `import.meta.env`, as the shared code reads it; babel.config.js fills it on native.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_ONBOARDING?: string
  readonly VITE_WELLBEING?: string
  readonly VITE_MIND_REVIEWED?: string
  readonly VITE_SUPP_NAMES?: string
  readonly PROD?: boolean
  readonly BASE_URL?: string
}
interface ImportMeta { readonly env: ImportMetaEnv }
