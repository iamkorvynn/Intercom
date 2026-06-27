import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors from "@/constants/colors";
import { useIntercom } from "@/context/IntercomContext";

const C = colors.dark;

function SettingsRow({
  label,
  sublabel,
  right,
  onPress,
  destructive,
}: {
  label: string;
  sublabel?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && onPress && styles.rowPressed]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.rowLeft}>
        <Text style={[styles.rowLabel, destructive && styles.destructiveLabel]}>
          {label}
        </Text>
        {sublabel && <Text style={styles.rowSublabel}>{sublabel}</Text>}
      </View>
      {right && <View style={styles.rowRight}>{right}</View>}
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

export default function SettingsScreen() {
  const { myCode, partner, isMuted, isSpeakerOn, toggleMute, toggleSpeaker, unpair } =
    useIntercom();
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  function confirmUnpair() {
    Alert.alert(
      "Remove Partner",
      `Are you sure you want to remove ${partner?.name ?? "your partner"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await unpair();
            router.replace("/pair");
          },
        },
      ]
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 24 }]}
    >
      <Section title="MY DEVICE">
        <SettingsRow
          label="My Code"
          sublabel="Share with your partner to pair"
          right={<Text style={styles.codeValue}>{myCode}</Text>}
        />
      </Section>

      {partner && (
        <Section title="PARTNER">
          <SettingsRow
            label={partner.name}
            sublabel={`Code: ${partner.code}`}
            right={<Feather name="link" size={16} color={C.green} />}
          />
          <View style={styles.separator} />
          <SettingsRow
            label="Remove Partner"
            destructive
            onPress={confirmUnpair}
            right={<Feather name="trash-2" size={16} color={C.red} />}
          />
        </Section>
      )}

      <Section title="AUDIO">
        <SettingsRow
          label="Mute Microphone"
          right={
            <Switch
              value={isMuted}
              onValueChange={toggleMute}
              trackColor={{ false: C.border, true: C.greenDim }}
              thumbColor={isMuted ? C.green : C.mutedForeground}
            />
          }
        />
        <View style={styles.separator} />
        <SettingsRow
          label="Speaker Mode"
          sublabel="Route audio to loudspeaker"
          right={
            <Switch
              value={isSpeakerOn}
              onValueChange={toggleSpeaker}
              trackColor={{ false: C.border, true: C.greenDim }}
              thumbColor={isSpeakerOn ? C.green : C.mutedForeground}
            />
          }
        />
      </Section>

      <Section title="ABOUT">
        <SettingsRow label="Version" right={<Text style={styles.valueText}>1.0.0</Text>} />
        <View style={styles.separator} />
        <SettingsRow
          label="End-to-End Encrypted"
          right={<Feather name="shield" size={16} color={C.green} />}
        />
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 0,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: C.mutedForeground,
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
  },
  rowPressed: {
    backgroundColor: C.secondary,
  },
  rowLeft: {
    flex: 1,
    gap: 2,
  },
  rowRight: {
    marginLeft: 12,
  },
  rowLabel: {
    color: C.foreground,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  rowSublabel: {
    color: C.mutedForeground,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  destructiveLabel: {
    color: C.red,
  },
  separator: {
    height: 1,
    backgroundColor: C.border,
    marginLeft: 16,
  },
  codeValue: {
    color: C.green,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: 4,
  },
  valueText: {
    color: C.mutedForeground,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
