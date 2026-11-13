import { notifications } from './state'
export const {
  getPermissionsAsync, requestPermissionsAsync, getDevicePushTokenAsync, unregisterForNotificationsAsync, scheduleNotificationAsync,
  cancelScheduledNotificationAsync, dismissNotificationAsync, setNotificationHandler, clearLastNotificationResponse, getLastNotificationResponse,
  getPresentedNotificationsAsync, addNotificationResponseReceivedListener, addPushTokenListener,
} = notifications
export const DEFAULT_ACTION_IDENTIFIER = 'expo.modules.notifications.actions.DEFAULT'
export enum SchedulableTriggerInputTypes { TIME_INTERVAL = 'timeInterval' }
