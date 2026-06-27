import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors from "@/constants/colors";
import { PartnerDisplay } from "@/components/PartnerDisplay";
import { PushToTalkButton } from "@/components/PushToTalkButton";
import { SignalIndicator } from "@/components/SignalIndicator";
import { WaveformVisualizer } from "@/components/WaveformVisualizer";
import { useIntercom } from "@/context/IntercomContext";

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

  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const waveformActive = isTransmitting || partnerTransmitting;
  const waveformColor = partnerTransmitting && !isTransmitting ? "#888888" : C.green;

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <Text style={styles.appName}>INTERCOM</Text>
        </View>
        <View style={styles.topRight}>
          <SignalIndicator connectionState={connectionState} />
        </View>
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

      {/* Bottom controls */}
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
            size={22}
            color={isMuted ? C.green : C.mutedForeground}
          />
          <Text style={[styles.controlLabel, isMuted && styles.controlLabelActive]}>
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
            size={22}
            color={isSpeakerOn ? C.green : C.mutedForeground}
          />
          <Text style={[styles.controlLabel, isSpeakerOn && styles.controlLabelActive]}>
            {isSpeakerOn ? "SPEAKER" : "EARPIECE"}
          </Text>
        </Pressable>

        <Pressable
          style={styles.controlBtn}
          onPress={() => router.push("/settings")}
        >
          <Feather name="settings" size={22} color={C.mutedForeground} />
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
  topLeft: {},
  topRight: {},
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
    gap: 8,
  },
  controlBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
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
});
