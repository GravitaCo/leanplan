import { NativeModule, requireOptionalNativeModule } from 'expo'

declare class TiloNotifyModule extends NativeModule<{}> {
  takeDelivered(): unknown[]
  clear(): void
}

/** null in a build without the module (Android, web, Expo Go). */
export default requireOptionalNativeModule<TiloNotifyModule>('TiloNotify')
