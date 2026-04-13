import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge:  false,
  }),
});

export async function registerForPushNotifications() {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('fika-reminders', {
      name:       'Fika Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6BCB77',
    });
  }

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

/**
 * Schedule all daily shift reminders.
 * Call once on first login.
 */
export async function scheduleShiftReminders(role) {
  // Cancel all existing before re-scheduling
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (role === 'barista_am') {
    // 5:50 AM daily
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time to open Fika! ☕',
        body:  'Your morning shift starts in 10 minutes. Open the checklist when you arrive.',
        data:  { screen: 'ShiftForm' },
      },
      trigger: {
        hour: 5, minute: 50,
        repeats: true,
        channelId: 'fika-reminders',
      },
    });
  }

  if (role === 'barista_pm') {
    // 11:50 AM daily
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Fika shift starting soon! ☕',
        body:  'Your afternoon shift starts in 10 minutes. Check in when you arrive.',
        data:  { screen: 'ShiftForm' },
      },
      trigger: {
        hour: 11, minute: 50,
        repeats: true,
        channelId: 'fika-reminders',
      },
    });
  }

  if (role === 'owner') {
    // 9:00 PM daily
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Check today's shifts 📋",
        body:  'Reminder: review AM and PM shift submissions before end of day.',
        data:  { screen: 'Shifts' },
      },
      trigger: {
        hour: 21, minute: 0,
        repeats: true,
        channelId: 'fika-reminders',
      },
    });
  }
}
