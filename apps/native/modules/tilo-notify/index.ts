/**
 * Mind reminder deliveries recorded by the Notification Service Extension (iPhone), read and emptied
 * by the app. Never throws: no module (Android, web, an older build) or any error reads as none.
 */
import TiloNotify from './src/TiloNotifyModule'

export function takeExtensionDeliveries(): unknown[] {
  try { return TiloNotify ? TiloNotify.takeDelivered() : [] } catch { return [] }
}

export function clearExtensionDeliveries(): void {
  try { TiloNotify?.clear() } catch { /* unavailable */ }
}
