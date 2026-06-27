import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AppState, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import colors from "@/constants/colors";
import { PartnerDisplay } from "@/components/PartnerDisplay";
import { PushToTalkButton } from "@/components/PushToTalkButton";
import { SignalIndicator } from "@/components/SignalIndicator";
import { WaveformVisualizer } from "@/components/WaveformVisualizer";
import { useIntercom } from "@/context/IntercomContext";
import { getUnreadCount } from "@/services/transmissionLog";

const C = colors.dark;

export default function MainScreen() {
  const {
    partner,
    connectionState,
    isTransmitting,
    partnerTransmitting,
    isMuted,
    isSpeakerOn,
    startTransmitting,
    stopTransmitting,
    toggleMute,
    toggleSpeaker,
  } = useIntercom();

  const [unreadCount, setUnreadCount] = useState(0);
  const appStateRef = useRef(AppState.currentState);

  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  // Refresh badge when app comes to foreground
  useEffect(() => {
    const refresh = () => {
      getUnreadCount().then(setUnreadCount).catch(() => {});
    };
    refresh();
    const sub = AppState.addEventListener("change", (next) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        next === "active"
      ) {
        refresh();
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, []);

  const waveformActive = isTransmitting || partnerTransmitting;
  const waveformColor =
    partnerTransmitting && !isTransmitting ? "#888888" : C.green;

  const handleHistoryPress = () => {
    setUnreadCount(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/history");
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: topPad, paddingBottom: bottomPad },
      ]}
    >
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.appName}>INTERCOM</Text>
        <SignalIndicator connectionState={connectionState} />
      </View>

      {/* Partner section */}
      <View style={styles.partnerSection}>
        <PartnerDisplay
          partner={partner}
          connectionState={connectionState}
          partnerTransmitting={partnerTransmitting}
        />
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* PTT section */}
      <View style={styles.pttSection}>
        {/* Waveform */}
        <View style={styles.waveformContainer}>
          <WaveformVisualizer isActive={waveformActive} color={waveformColor} />
          {isTransmitting && (
            <Text style={styles.transmittingLabel}>LIVE</Text>
          )}
          {partnerTransmitting && !isTransmitting && (
            <Text style={styles.receivingLabel}>RECEIVING</Text>
          )}
        </View>

        {/* PTT Button */}
        <PushToTalkButton
          connectionState={connectionState}
          isTransmitting={isTransmitting}
          isMuted={isMuted}
          onPressIn={startTransmitting}
          onPressOut={stopTransmitting}
        />
      </View>

      {/* Bottom controls: 4 buttons */}
      <View style={styles.bottomControls}>
        <Pressable
          style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
          onPress={() => {
            toggleMute();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Feather
            name={isMuted ? "mic-off" : "mic"}
            size={20}
            color={isMuted ? C.green : C.mutedForeground}
          />
          <Text
            style={[styles.controlLabel, isMuted && styles.controlLabelActive]}
          >
            {isMuted ? "UNMUTE" : "MUTE"}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.controlBtn, isSpeakerOn && styles.controlBtnActive]}
          onPress={() => {
            toggleSpeaker();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Feather
            name={isSpeakerOn ? "volume-2" : "volume-x"}
            size={20}
            color={isSpeakerOn ? C.green : C.mutedForeground}
          />
          <Text
            style={[
              styles.controlLabel,
              isSpeakerOn && styles.controlLabelActive,
            ]}
          >
            {isSpeakerOn ? "SPEAKER" : "EARPIECE"}
          </Text>
        </Pressable>

        {/* History with unread badge */}
        <Pressable style={styles.controlBtn} onPress={handleHistoryPress}>
          <View style={styles.iconWrap}>
            <Feather name="inbox" size={20} color={unreadCount > 0 ? C.green : C.mutedForeground} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            )}
          </View>
          <Text
            style={[
              styles.controlLabel,
              unreadCount > 0 && styles.controlLabelActive,
            ]}
          >
            LOG
          </Text>
        </Pressable>

        <Pressable
          style={styles.controlBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/settings");
          }}
        >
          <Feather name="settings" size={20} color={C.mutedForeground} />
          <Text style={styles.controlLabel}>SETTINGS</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
    paddingHorizontal: 24,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 8,
  },
  appName: {
    color: `rgba(0, 255, 65, 0.6)`,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 5,
  },
  partnerSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 8,
  },
  pttSection: {
    flex: 2,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  waveformContainer: {
    alignItems: "center",
    gap: 8,
    height: 72,
    justifyContent: "flex-end",
  },
  transmittingLabel: {
    color: C.green,
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 3,
  },
  receivingLabel: {
    color: C.mutedForeground,
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 3,
  },
  bottomControls: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    gap: 6,
  },
  controlBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: C.card,
    gap: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  controlBtnActive: {
    borderColor: `rgba(0, 255, 65, 0.3)`,
    backgroundColor: C.greenDim,
  },
  controlLabel: {
    color: C.mutedForeground,
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
  },
  controlLabelActive: {
    color: C.green,
  },
  iconWrap: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -8,
    backgroundColor: C.green,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: C.background,
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    lineHeight: 12,
  },
});
