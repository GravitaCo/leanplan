import TiloHealth from './src/TiloHealthModule'
export type { SleepSample, Span } from './src/TiloHealthModule'

export const healthModuleAvailable = (): boolean => !!TiloHealth && TiloHealth.isAvailable()

function mod() {
  if (!TiloHealth) throw new Error('Apple Health is not available in this build')
  return TiloHealth
}

export const requestHealthAuthorization = () => mod().requestAuthorization()
export const sleepSamples = (start: Date, end: Date) => mod().sleepSamples(start.getTime(), end.getTime())
export const stepSum = (start: Date, end: Date) => mod().stepSum(start.getTime(), end.getTime())
export const walkingWorkouts = (start: Date, end: Date) => mod().walkingWorkouts(start.getTime(), end.getTime())
