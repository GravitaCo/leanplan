/**
 * Native twin of platform.ts (picked by Metro for iOS and Android; the web build never sees it).
 * `localStorage` here is the MMKV-backed store apps/native installs before anything loads, with
 * Supabase's `sb-*` session keys in its encrypted part (apps/native/lib/platform/storage.ts).
 */
import { AppState } from 'react-native'

/** supabase-js doesn't save a session outside a browser unless it's given storage. */
export const AUTH_OPTIONS = {
  auth: { storage: globalThis.localStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
}

/** Runs `fn` each time the app comes back to the foreground. */
export function onForeground(fn: () => void): void {
  AppState.addEventListener('change', (s) => { if (s === 'active') fn() })
}
