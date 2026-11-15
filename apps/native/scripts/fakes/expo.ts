/** Just enough of 'expo' for the local modules: no native module in this test (as on Android or web). */
export class NativeModule<_T = unknown> {}
export function requireOptionalNativeModule<T>(_name: string): T | null { return null }
