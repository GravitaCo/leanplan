import { NativeModule, requireOptionalNativeModule } from 'expo'

type Events = { onChange: (e: { online: boolean }) => void }

declare class TiloNetworkModule extends NativeModule<Events> {
  isOnline(): boolean
}

/** null where the module isn't built in (web render, Android until its Kotlin twin exists). */
export default requireOptionalNativeModule<TiloNetworkModule>('TiloNetwork')
