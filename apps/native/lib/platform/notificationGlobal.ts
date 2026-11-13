/**
 * The browser's `Notification` permission, for the shared store (store.ts setMindReminder reads
 * `Notification.permission` and calls `Notification.requestPermission()`), backed by the phone's
 * own notification permission. Installed by ./install.ts on iPhone only: elsewhere there's no
 * `Notification`, pushSupported() is false and the store answers 'unsupported' before reading it.
 *
 * `permission` is read synchronously, so it's a copy refreshed at launch and each time the app comes
 * back to the front (the person may have changed it in Settings meanwhile).
 * Imports nothing from the shared code: it loads before storage is in place.
 */
import { AppState, Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import { ASK, permFrom, type Perm } from './pushRules'

export function installNotificationGlobal(g: Record<string, any>): void {
  if (Platform.OS !== 'ios' || g.Notification) return
  let perm: Perm = 'default'
  const refresh = () => Notifications.getPermissionsAsync().then((s) => { perm = permFrom(s) }, () => undefined)
  void refresh()
  AppState.addEventListener('change', (s) => { if (s === 'active') void refresh() })
  g.Notification = {
    get permission(): Perm { return perm },
    async requestPermission(): Promise<Perm> {
      try { perm = permFrom(await Notifications.requestPermissionsAsync(ASK)) } catch { /* keep the last known answer */ }
      return perm
    },
  }
}
