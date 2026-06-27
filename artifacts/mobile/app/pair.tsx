import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors from "@/constants/colors";
import { useIntercom } from "@/context/IntercomContext";

const C = colors.dark;

type Step = "welcome" | "pairing" | "connecting" | "success";

export default function PairScreen() {
  const { myCode, pair } = useIntercom();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("welcome");
  const [partnerCode, setPartnerCode] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);

  const dotOpacity = useSharedValue(1);
  const successScale = useSharedValue(0);

  useEffect(() => {
    dotOpacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      false
    );
  }, []);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
  }));

  const successStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
    opacity: successScale.value,
  }));

  async function handlePair() {
    const code = partnerCode.trim();
    const name = partnerName.trim() || "Partner";

    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setError("Please enter a valid 6-digit code");
      return;
    }
    if (code === myCode) {
      setError("You cannot pair with your own code");
      return;
    }

    setError("");
    setStep("connecting");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    await pair(code, name);

    setStep("success");
    successScale.value = withSequence(
      withTiming(1.1, { duration: 300 }),
      withTiming(1, { duration: 200 })
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setTimeout(() => {
      router.replace("/main");
    }, 1500);
  }

  function handleCodeChange(text: string) {
    const digits = text.replace(/\D/g, "").slice(0, 6);
    setPartnerCode(digits);
    setError("");
    if (digits.length === 6) {
      nameRef.current?.focus();
    }
  }

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  if (step === "connecting") {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <View style={styles.centeredContent}>
          <ActivityIndicator color={C.green} size="large" />
          <Text style={styles.connectingText}>ESTABLISHING LINK</Text>
          <Animated.View style={[styles.connectingDot, dotStyle]} />
        </View>
      </View>
    );
  }

  if (step === "success") {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <Animated.View style={[styles.centeredContent, successStyle]}>
          <View style={styles.successRing}>
            <View style={styles.successInner}>
              <Text style={styles.successCheck}>✓</Text>
            </View>
          </View>
          <Text style={styles.successText}>LINKED</Text>
          <Text style={styles.successSub}>
            Connection established with {partnerName || "Partner"}
          </Text>
        </Animated.View>
      </View>
    );
  }

  if (step === "welcome") {
    return (
      <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad }]}>
        <View style={styles.header}>
          <Text style={styles.logo}>INTERCOM</Text>
          <Animated.View style={[styles.liveDot, dotStyle]} />
        </View>

        <View style={styles.welcomeContent}>
          <Text style={styles.tagline}>
            Always connected.{"\n"}No calls. No waiting.
          </Text>
          <Text style={styles.subtitle}>
            Pair with one person.{"\n"}Press to talk. Instantly.
          </Text>
        </View>

        <View style={styles.myCodeBox}>
          <Text style={styles.myCodeLabel}>YOUR CODE</Text>
          <Text style={styles.myCodeValue}>{myCode}</Text>
          <Text style={styles.myCodeHint}>Share this with your partner</Text>
        </View>

        <Pressable
          style={styles.primaryButton}
          onPress={() => {
            setStep("pairing");
            setTimeout(() => inputRef.current?.focus(), 300);
          }}
        >
          <Text style={styles.primaryButtonText}>PAIR WITH PARTNER</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: topPad, paddingBottom: bottomPad + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          style={styles.backButton}
          onPress={() => {
            setStep("welcome");
            setPartnerCode("");
            setPartnerName("");
            setError("");
          }}
        >
          <Text style={styles.backText}>← BACK</Text>
        </Pressable>

        <Text style={styles.pairTitle}>ENTER PARTNER CODE</Text>
        <Text style={styles.pairSubtitle}>
          Ask your partner for their 6-digit code
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>PARTNER CODE</Text>
          <TextInput
            ref={inputRef}
            style={styles.codeInput}
            value={partnerCode}
            onChangeText={handleCodeChange}
            keyboardType="numeric"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor={C.border}
            returnKeyType="next"
            onSubmitEditing={() => nameRef.current?.focus()}
            selectionColor={C.green}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>PARTNER NAME (OPTIONAL)</Text>
          <TextInput
            ref={nameRef}
            style={styles.nameInput}
            value={partnerName}
            onChangeText={setPartnerName}
            placeholder="Enter a name"
            placeholderTextColor={C.border}
            returnKeyType="done"
            onSubmitEditing={handlePair}
            selectionColor={C.green}
            autoCapitalize="words"
          />
        </View>

        {error !== "" && <Text style={styles.errorText}>{error}</Text>}

        <Pressable
          style={[
            styles.primaryButton,
            { marginTop: 24 },
            partnerCode.length !== 6 && styles.buttonDisabled,
          ]}
          onPress={handlePair}
          disabled={partnerCode.length !== 6}
        >
          <Text style={styles.primaryButtonText}>LINK UP</Text>
        </Pressable>

        <View style={styles.myCodeBox}>
          <Text style={styles.myCodeLabel}>YOUR CODE</Text>
          <Text style={styles.myCodeValue}>{myCode}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
    paddingHorizontal: 28,
    justifyContent: "center",
  },
  centeredContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 48,
  },
  logo: {
    color: C.green,
    fontSize: 15,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    letterSpacing: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: C.green,
  },
  welcomeContent: {
    gap: 12,
    marginBottom: 48,
  },
  tagline: {
    color: C.foreground,
    fontSize: 34,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    lineHeight: 40,
  },
  subtitle: {
    color: C.mutedForeground,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    lineHeight: 24,
  },
  myCodeBox: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `rgba(0, 255, 65, 0.2)`,
    padding: 20,
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
  },
  myCodeLabel: {
    color: C.mutedForeground,
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 3,
  },
  myCodeValue: {
    color: C.green,
    fontSize: 36,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    letterSpacing: 10,
  },
  myCodeHint: {
    color: C.mutedForeground,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.5,
  },
  primaryButton: {
    backgroundColor: C.green,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.3,
  },
  primaryButtonText: {
    color: C.primaryForeground,
    fontSize: 13,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    letterSpacing: 3,
  },
  backButton: {
    marginBottom: 32,
    alignSelf: "flex-start",
  },
  backText: {
    color: C.mutedForeground,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
  },
  pairTitle: {
    color: C.foreground,
    fontSize: 22,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    marginBottom: 8,
  },
  pairSubtitle: {
    color: C.mutedForeground,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginBottom: 36,
  },
  inputGroup: {
    gap: 8,
    marginBottom: 20,
  },
  inputLabel: {
    color: C.mutedForeground,
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2.5,
  },
  codeInput: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 18,
    color: C.foreground,
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: 12,
    textAlign: "center",
  },
  nameInput: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 16,
    color: C.foreground,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  errorText: {
    color: C.red,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  connectingText: {
    color: C.green,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 3,
    marginTop: 16,
  },
  connectingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.green,
  },
  successRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: `rgba(0, 255, 65, 0.4)`,
    alignItems: "center",
    justifyContent: "center",
  },
  successInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.greenDim,
    alignItems: "center",
    justifyContent: "center",
  },
  successCheck: {
    color: C.green,
    fontSize: 32,
    fontWeight: "700" as const,
  },
  successText: {
    color: C.green,
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    letterSpacing: 6,
  },
  successSub: {
    color: C.mutedForeground,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
