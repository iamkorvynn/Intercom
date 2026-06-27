import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import colors from "@/constants/colors";
import { ConnectionState, Partner } from "@/context/IntercomContext";

const C = colors.dark;

const STATE_LABELS: Record<ConnectionState, string> = {
  disconnected: "OFFLINE",
  connecting: "CONNECTING",
  connected: "CONNECTED",
  offline: "PARTNER OFFLINE",
  poor: "POOR SIGNAL",
};

const STATE_COLORS: Record<ConnectionState, string> = {
  disconnected: C.mutedForeground,
  connecting: C.amber,
  connected: C.green,
  offline: C.red,
  poor: C.amber,
};

interface PartnerDisplayProps {
  partner: Partner | null;
  connectionState: ConnectionState;
  partnerTransmitting: boolean;
}

function StatusDot({ state }: { state: ConnectionState }) {
  const dotOpacity = useSharedValue(1);
  const color = STATE_COLORS[state];

  useEffect(() => {
    if (state === "connecting") {
      dotOpacity.value = withRepeat(
        withSequence(
          withTiming(0.2, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        false
      );
    } else {
      dotOpacity.value = withTiming(1, { duration: 300 });
    }
  }, [state]);

  const style = useAnimatedStyle(() => ({ opacity: dotOpacity.value }));

  return (
    <Animated.View
      style={[styles.dot, { backgroundColor: color }, style]}
    />
  );
}

export function PartnerDisplay({
  partner,
  connectionState,
  partnerTransmitting,
}: PartnerDisplayProps) {
  const initials = partner?.name
    ? partner.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

  const avatarScale = useSharedValue(1);
  const avatarBorderOpacity = useSharedValue(0.2);

  useEffect(() => {
    if (partnerTransmitting) {
      avatarScale.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 400 }),
          withTiming(1, { duration: 400 })
        ),
        -1,
        false
      );
      avatarBorderOpacity.value = withTiming(1, { duration: 200 });
    } else {
      avatarScale.value = withTiming(1, { duration: 300 });
      avatarBorderOpacity.value = withTiming(0.2, { duration: 300 });
    }
  }, [partnerTransmitting]);

  const avatarStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarScale.value }],
    borderColor: `rgba(0, 255, 65, ${avatarBorderOpacity.value})`,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.avatar, avatarStyle]}>
        <Text style={styles.initials}>{initials}</Text>
      </Animated.View>

      <Text style={styles.name}>
        {partner?.name ?? "No Partner"}
      </Text>

      <View style={styles.statusRow}>
        <StatusDot state={connectionState} />
        <Text style={[styles.statusText, { color: STATE_COLORS[connectionState] }]}>
          {STATE_LABELS[connectionState]}
        </Text>
      </View>

      {partnerTransmitting && (
        <View style={styles.transmittingBadge}>
          <Text style={styles.transmittingText}>INCOMING</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: `rgba(0, 255, 65, 0.2)`,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: C.green,
    fontSize: 28,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  name: {
    color: C.foreground,
    fontSize: 20,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2.5,
  },
  transmittingBadge: {
    backgroundColor: C.greenDim,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `rgba(0, 255, 65, 0.3)`,
  },
  transmittingText: {
    color: C.green,
    fontSize: 10,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
});
