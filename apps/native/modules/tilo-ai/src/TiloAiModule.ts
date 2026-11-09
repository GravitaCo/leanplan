import { NativeModule, requireOptionalNativeModule } from 'expo'

declare class TiloAiModule extends NativeModule<{}> {
  availability(): Promise<string>
  respond(instructions: string, prompt: string): Promise<string>
}

/** null in a build without the module (Expo Go, web). */
export default requireOptionalNativeModule<TiloAiModule>('TiloAi')
