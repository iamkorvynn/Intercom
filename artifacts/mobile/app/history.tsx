import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import colors from "@/constants/colors";
import {
  clearTransmissionLog,
  getTransmissionLog,
  markHistorySeen,
  type TransmissionEntry,
} from "@/services/transmissionLog";

const C = colors.dark;

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function groupByDay(
  entries: TransmissionEntry[]
): Array<{ title: string; data: TransmissionEntry[] }> {
  const groups: Record<string, TransmissionEntry[]> = {};
  for (const entry of entries) {
    const key = formatDate(entry.timestamp);
    if (!groups[key]) groups[key] = [];
    groups[key].push(entry);
  }
  return Object.entries(groups).map(([title, data]) => ({ title, data }));
}

interface EntryRowProps {
  entry: TransmissionEntry;
}

function EntryRow({ entry }: EntryRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIconWrap}>
        <Feather name="radio" size={16} color={C.green} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowName}>{entry.partnerName || entry.from}</Text>
        <Text style={styles.rowSub}>Tried to reach you</Text>
      </View>
      <Text style={styles.rowTime}>{timeAgo(entry.timestamp)}</Text>
    </View>
  );
}

export default function HistoryScreen() {
  const [entries, setEntries] = useState<TransmissionEntry[]>([]);
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const load = useCallback(async () => {
    const log = await getTransmissionLog();
    setEntries(log);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Mark history as seen whenever the screen is focused
  useFocusEffect(
    useCallback(() => {
      markHistorySeen();
      load();
    }, [load])
  );

  const handleClear = () => {
    Alert.alert(
      "Clear History",
      "Remove all missed transmissions? This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await clearTransmissionLog();
            setEntries([]);
          },
        },
      ]
    );
  };

  const groups = groupByDay(entries);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: topPad + 8, paddingBottom: bottomPad },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>MISSED TRANSMISSIONS</Text>
          <Text style={styles.headerCount}>
            {entries.length === 0
              ? "Nothing yet"
              : `${entries.length} logged`}
          </Text>
        </View>
        {entries.length > 0 && (
          <Pressable style={styles.clearBtn} onPress={handleClear}>
            <Feather name="trash-2" size={14} color={C.mutedForeground} />
            <Text style={styles.clearBtnText}>CLEAR</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.divider} />

      {entries.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="inbox" size={36} color={C.border} />
          <Text style={styles.emptyTitle}>All clear</Text>
          <Text style={styles.emptySubtitle}>
            When your partner presses PTT while you're offline, it'll appear
            here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.title}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: group }) => (
            <View style={styles.group}>
              <Text style={styles.groupLabel}>{group.title}</Text>
              {group.data.map((entry) => (
                <EntryRow key={entry.id} entry={entry} />
              ))}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  headerLabel: {
    color: `rgba(0, 255, 65, 0.6)`,
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 4,
    marginBottom: 4,
  },
  headerCount: {
    color: C.mutedForeground,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.5,
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  clearBtnText: {
    color: C.mutedForeground,
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginBottom: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: C.foreground,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
  emptySubtitle: {
    color: C.mutedForeground,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  list: {
    paddingBottom: 24,
  },
  group: {
    marginTop: 8,
  },
  groupLabel: {
    color: C.mutedForeground,
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
    marginBottom: 8,
    marginTop: 8,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 12,
  },
  rowIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: `rgba(0, 255, 65, 0.08)`,
    borderWidth: 1,
    borderColor: `rgba(0, 255, 65, 0.15)`,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    color: C.foreground,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.3,
  },
  rowSub: {
    color: C.mutedForeground,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  rowTime: {
    color: C.mutedForeground,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
