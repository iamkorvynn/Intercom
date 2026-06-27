import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@intercom/transmission_log";
const LAST_SEEN_KEY = "@intercom/history_last_seen";
const MAX_ENTRIES = 100;

export interface TransmissionEntry {
  id: string;
  from: string;
  partnerName: string;
  timestamp: number;
}

export async function addMissedTransmission(
  notificationId: string,
  from: string,
  partnerName: string
): Promise<void> {
  const existing = await getTransmissionLog();
  if (existing.some((e) => e.id === notificationId)) return; // deduplicate
  const entry: TransmissionEntry = {
    id: notificationId,
    from,
    partnerName: partnerName || from,
    timestamp: Date.now(),
  };
  const updated = [entry, ...existing].slice(0, MAX_ENTRIES);
  await AsyncStorage.setItem(KEY, JSON.stringify(updated));
}

export async function getTransmissionLog(): Promise<TransmissionEntry[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as TransmissionEntry[];
  } catch {
    return [];
  }
}

export async function clearTransmissionLog(): Promise<void> {
  await AsyncStorage.multiRemove([KEY, LAST_SEEN_KEY]);
}

/** Returns count of entries newer than the last time history was opened. */
export async function getUnreadCount(): Promise<number> {
  const [raw, lastSeen] = await AsyncStorage.multiGet([KEY, LAST_SEEN_KEY]);
  const entries: TransmissionEntry[] = raw[1]
    ? (JSON.parse(raw[1]) as TransmissionEntry[])
    : [];
  const ts = lastSeen[1] ? parseInt(lastSeen[1], 10) : 0;
  return entries.filter((e) => e.timestamp > ts).length;
}

/** Call when the history screen is focused to mark all as read. */
export async function markHistorySeen(): Promise<void> {
  await AsyncStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
}
