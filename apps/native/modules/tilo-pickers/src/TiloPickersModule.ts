import { NativeModule, requireOptionalNativeModule } from 'expo'

declare class TiloPickersModule extends NativeModule<{}> {}

/** null in a build without the module (Expo Go, web, Android). */
export default requireOptionalNativeModule<TiloPickersModule>('TiloPickers')
