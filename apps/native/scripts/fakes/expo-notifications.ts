import { notifications } from './state'
export const { getPermissionsAsync, requestPermissionsAsync, getDevicePushTokenAsync, unregisterForNotificationsAsync, scheduleNotificationAsync, cancelScheduledNotificationAsync, dismissNotificationAsync } = notifications
export enum SchedulableTriggerInputTypes { TIME_INTERVAL = 'timeInterval' }
