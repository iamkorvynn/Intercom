import * as Haptics from "expo-haptics";
import React, { useEffect } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import colors from "@/constants/colors";
import { ConnectionState } from "@/context/IntercomContext";

interface PushToTalkButtonProps {
  connectionState: ConnectionState;
  isTransmitting: boolean;
  isMuted: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
}

const C = colors.dark;
const BUTTON_SIZE = 200;
const RING_SIZE = BUTTON_SIZE + 60;

export function PushToTalkButton({
  connectionState,
  isTransmitting,
  isMuted,
  onPressIn,
  onPressOut,
}: PushToTalkButtonProps) {
  const scale = useSharedValue(1);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const borderOpacity = useSharedValue(0.3);

  function triggerHapticStart() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  }

  function triggerHapticEnd() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  useEffect(() => {
    if (connectionState === "connected" && !isTransmitting) {
      ringScale.value = withRepeat(
        withSequence(
          withTiming(1.25, { duration: 2000 }),
          withTiming(1, { duration: 2000 })
        ),
        -1,
        false
      );
      ringOpacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 2000 }),
          withTiming(0.25, { duration: 2000 })
        ),
        -1,
        false
      );
      glowOpacity.value = withTiming(0.2, { duration: 500 });
      borderOpacity.value = withTiming(0.7, { duration: 500 });
    } else if (isTransmitting) {
      ringScale.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 500 }),
          withTiming(1.1, { duration: 500 })
        ),
        -1,
        false
      );
      ringOpacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 500 }),
          withTiming(0.7, { duration: 500 })
        ),
        -1,
        false
      );
      glowOpacity.value = withTiming(0.6, { duration: 200 });
      borderOpacity.value = withTiming(1, { duration: 200 });
    } else {
      ringScale.value = withTiming(1, { duration: 300 });
      ringOpacity.value = withTiming(0, { duration: 300 });
      glowOpacity.value = withTiming(0, { duration: 500 });
      borderOpacity.value = withTiming(0.2, { duration: 500 });
    }
  }, [connectionState, isTransmitting]);

  const gesture = Gesture.LongPress()
    .minDuration(0)
    .onBegin(() => {
      if (connectionState !== "connected" || isMuted) return;
      scale.value = withSpring(0.92, { damping: 15, stiffness: 300 });
      runOnJS(triggerHapticStart)();
      runOnJS(onPressIn)();
    })
    .onFinalize(() => {
      scale.value = withSpring(1, { damping: 12, stiffness: 200 });
      runOnJS(triggerHapticEnd)();
      runOnJS(onPressOut)();
    });

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(0, 255, 65, ${borderOpacity.value})`,
  }));

  const isDisabled = connectionState !== "connected" || isMuted;
  const buttonLabel = isTransmitting
    ? "TRANSMITTING"
    : isMuted
      ? "MUTED"
      : connectionState === "connecting"
        ? "CONNECTING..."
        : connectionState === "poor"
          ? "POOR SIGNAL"
          : connectionState === "connected"
            ? "HOLD TO TALK"
            : "OFFLINE";

  return (
    <View style={styles.container}>
      {/* Outer glow */}
      <Animated.View
        style={[
          styles.glow,
          { width: RING_SIZE + 40, height: RING_SIZE + 40, borderRadius: (RING_SIZE + 40) / 2 },
          glowStyle,
        ]}
        pointerEvents="none"
      />

      {/* Pulse ring */}
      <Animated.View
        style={[
          styles.ring,
          { width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2 },
          ringStyle,
        ]}
        pointerEvents="none"
      />

      <GestureDetector gesture={gesture}>
        <Animated.View style={[buttonStyle]}>
          <Animated.View
            style={[
              styles.button,
              {
                width: BUTTON_SIZE,
                height: BUTTON_SIZE,
                borderRadius: BUTTON_SIZE / 2,
              },
              borderStyle,
              isDisabled && styles.buttonDisabled,
            ]}
          >
            <View style={styles.micIcon}>
              <View style={styles.micBody} />
              <View style={styles.micBase} />
              <View style={styles.micStand} />
            </View>
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      <Text
        style={[styles.label, isTransmitting && styles.labelActive]}
      >
        {buttonLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    backgroundColor: C.green,
  },
  ring: {
    position: "absolute",
    borderWidth: 2,
    borderColor: C.green,
    backgroundColor: "transparent",
  },
  button: {
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: `rgba(0, 255, 65, 0.3)`,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  micIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  micBody: {
    width: 32,
    height: 48,
    borderRadius: 16,
    backgroundColor: C.green,
    marginBottom: 0,
  },
  micBase: {
    width: 48,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: C.green,
    marginTop: 8,
  },
  micStand: {
    width: 3,
    height: 12,
    borderRadius: 1.5,
    backgroundColor: C.green,
    marginTop: 0,
  },
  label: {
    marginTop: 32,
    color: C.mutedForeground,
    fontSize: 11,
    fontWeight: "600" as const,
    letterSpacing: 3,
    fontFamily: "Inter_600SemiBold",
  },
  labelActive: {
    color: C.green,
  },
});
