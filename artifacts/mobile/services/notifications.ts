import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

/**
 * How notifications appear when the app is in the foreground.
 * We suppress the alert (user is already in the app) but keep sound/vibration
 * so the PTT "ping" still gets through.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

const CHANNEL_ID = "intercom";

/**
 * Requests notification permission, creates the Android channel, and returns
 * an Expo push token string — or null if permission was denied or the platform
 * is web (notifications are irrelevant in the browser preview).
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  const settings = await Notifications.getPermissionsAsync();
  let status = (settings as any).status;
  if (status !== "granted") {
    const askedSettings = await Notifications.requestPermissionsAsync();
    status = (askedSettings as any).status;
  }
  if (status !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Intercom Transmissions",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 80, 180, 80],
      lightColor: "#00FF41",
      sound: "default",
      enableVibrate: true,
    });
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch {
    // EAS project not configured — graceful no-op for web / simulator
    return null;
  }
}

export type NotificationSubscription = Notifications.EventSubscription;

/** Listen for a notification that arrives while the app is foregrounded. */
export function onNotificationReceived(
  handler: (n: Notifications.Notification) => void
): NotificationSubscription {
  return Notifications.addNotificationReceivedListener(handler);
}

/** Listen for the user tapping a notification (from background/killed state). */
export function onNotificationResponse(
  handler: (r: Notifications.NotificationResponse) => void
): NotificationSubscription {
  return Notifications.addNotificationResponseReceivedListener(handler);
}
