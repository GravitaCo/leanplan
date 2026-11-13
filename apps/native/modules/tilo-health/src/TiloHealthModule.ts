import { NativeModule, requireOptionalNativeModule } from 'expo'

export interface SleepSample { start: number; end: number; value: number }
export interface Span { start: number; end: number }

declare class TiloHealthModule extends NativeModule<{}> {
  isAvailable(): boolean
  requestAuthorization(): Promise<boolean>
  sleepSamples(startMs: number, endMs: number): Promise<SleepSample[]>
  stepSum(startMs: number, endMs: number): Promise<number | null>
  walkingWorkouts(startMs: number, endMs: number): Promise<Span[]>
}

/** null where the module isn't built in (the web render; Android uses Health Connect later). */
export default requireOptionalNativeModule<TiloHealthModule>('TiloHealth')
