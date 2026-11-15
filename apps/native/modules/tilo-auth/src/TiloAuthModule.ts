import { NativeModule, requireOptionalNativeModule } from 'expo'

export interface AppleCredential {
  identityToken: string
  /** a short-lived code; the server exchanges it to revoke Apple's tokens when the account is deleted */
  authorizationCode?: string
  /** Apple's stable id for this person and app */
  user: string
  /** only on the first sign-in, and possibly a private relay address (Hide My Email) */
  email?: string
}

declare class TiloAuthModule extends NativeModule<Record<never, never>> {
  isAvailable(): boolean
  signIn(nonceSha256: string): Promise<AppleCredential | null>
}

/** null in a build without the module (Expo Go, web, Android). */
export default requireOptionalNativeModule<TiloAuthModule>('TiloAuth')
