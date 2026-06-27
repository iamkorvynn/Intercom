import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import colors from "@/constants/colors";

const C = colors.dark;
const BAR_COUNT = 9;
const BAR_WIDTH = 4;
const BAR_GAP = 6;
const MIN_HEIGHT = 4;
const MAX_HEIGHT = 44;

interface WaveformVisualizerProps {
  isActive: boolean;
  color?: string;
}

function WaveformBar({
  index,
  isActive,
  color,
}: {
  index: number;
  isActive: boolean;
  color: string;
}) {
  const height = useSharedValue(MIN_HEIGHT);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    if (isActive) {
      const delay = index * 80;
      const duration = 280 + Math.random() * 200;
      const targetH = MIN_HEIGHT + Math.random() * (MAX_HEIGHT - MIN_HEIGHT);

      setTimeout(() => {
        height.value = withRepeat(
          withSequence(
            withTiming(targetH, { duration }),
            withTiming(MIN_HEIGHT + Math.random() * 12, { duration: duration * 0.7 }),
            withTiming(MAX_HEIGHT * (0.4 + Math.random() * 0.5), { duration }),
            withTiming(MIN_HEIGHT, { duration: duration * 0.5 })
          ),
          -1,
          false
        );
        opacity.value = withTiming(0.9, { duration: 200 });
      }, delay);
    } else {
      height.value = withTiming(MIN_HEIGHT, { duration: 400 });
      opacity.value = withTiming(0.3, { duration: 400 });
    }
  }, [isActive, index]);

  const style = useAnimatedStyle(() => ({
    height: height.value,
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        { width: BAR_WIDTH, backgroundColor: color },
        style,
      ]}
    />
  );
}

export function WaveformVisualizer({
  isActive,
  color = C.green,
}: WaveformVisualizerProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <WaveformBar key={i} index={i} isActive={isActive} color={color} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: BAR_GAP,
    height: MAX_HEIGHT + 8,
    paddingHorizontal: 8,
  },
  bar: {
    borderRadius: BAR_WIDTH / 2,
  },
});
