import { NativeModule, requireOptionalNativeModule } from 'expo'

declare class TiloStoreModule extends NativeModule<{}> {
  get(ns: string, key: string): string | null
  set(ns: string, key: string, value: string): void
  remove(ns: string, key: string): void
  keys(ns: string): string[]
  clear(ns: string): void
}

/** null where the module isn't built in (the web render, Android until its Kotlin twin exists). */
export default requireOptionalNativeModule<TiloStoreModule>('TiloStore')
