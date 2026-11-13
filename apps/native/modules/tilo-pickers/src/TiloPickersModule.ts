import { NativeModule, requireOptionalNativeModule } from 'expo'

declare class TiloPickersModule extends NativeModule<{}> {
  formatTime(hhmm: string): string
}

/** null in a build without the module (Expo Go, web, Android). */
export default requireOptionalNativeModule<TiloPickersModule>('TiloPickers')
