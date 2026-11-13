/**
 * Native twin of push.ts (picked by Metro for iOS and Android; the web build and its tsconfig never
 * see it). The same functions, so the shared store calls them unchanged: reminders on a phone come
 * through Apple's push service with a device token instead of a browser's Web Push subscription.
 * The phone side lives with the app (apps/native/lib/platform/push.ts, native-build-plan N12).
 */
export { askPushPermission, pushPermission, pushSupported, resubscribePush, subscribePush, unsubscribePush, type PushPermission } from '../../apps/native/lib/platform/push'
