/**
 * Sign in with Apple on iOS: AuthenticationServices, no outside library (modules/tilo-auth/ios).
 * Android and web have no Apple sign-in in Tilo (the web app offers email and Google).
 */
import TiloAuth, { type AppleCredential } from './src/TiloAuthModule'

export { AppleButton, type AppleButtonProps } from './src/AppleButton'
export type { AppleCredential }

export const appleAvailable = (): boolean => !!TiloAuth && TiloAuth.isAvailable()

/** Apple's sheet; `nonceSha256` is the hex SHA-256 of the app's raw nonce. Null when cancelled. */
export async function appleSignInNative(nonceSha256: string): Promise<AppleCredential | null> {
  if (!TiloAuth) throw new Error('Sign in with Apple is not available here')
  return TiloAuth.signIn(nonceSha256)
}
