import React from "react";
import { StyleSheet, Text, View } from "react-native";
import colors from "@/constants/colors";
import { ConnectionState } from "@/context/IntercomContext";

const C = colors.dark;

interface SignalIndicatorProps {
  connectionState: ConnectionState;
}

function SignalBars({ strength }: { strength: number }) {
  const barCount = 4;
  return (
    <View style={styles.barsContainer}>
      {Array.from({ length: barCount }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.signalBar,
            { height: 6 + i * 4 },
            i < strength ? styles.signalBarActive : styles.signalBarInactive,
          ]}
        />
      ))}
    </View>
  );
}

function getSignalStrength(state: ConnectionState): number {
  switch (state) {
    case "connected": return 4;
    case "poor": return 2;
    case "connecting": return 1;
    default: return 0;
  }
}

export function SignalIndicator({ connectionState }: SignalIndicatorProps) {
  const strength = getSignalStrength(connectionState);
  const latency = connectionState === "connected" ? "42ms" : connectionState === "poor" ? "280ms" : "—";

  return (
    <View style={styles.container}>
      <SignalBars strength={strength} />
      <Text style={styles.latency}>{latency}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 4,
  },
  barsContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    height: 18,
  },
  signalBar: {
    width: 4,
    borderRadius: 1,
  },
  signalBarActive: {
    backgroundColor: C.green,
  },
  signalBarInactive: {
    backgroundColor: C.border,
  },
  latency: {
    color: C.mutedForeground,
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
  },
});
