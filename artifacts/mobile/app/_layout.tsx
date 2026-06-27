import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { IntercomProvider } from "@/context/IntercomContext";
import colors from "@/constants/colors";
import {
  onNotificationReceived,
  onNotificationResponse,
  type NotificationSubscription,
} from "@/services/notifications";
import { addMissedTransmission } from "@/services/transmissionLog";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();
const C = colors.dark;

function NotificationListeners() {
  const receivedSub = useRef<NotificationSubscription | null>(null);
  const responseSub = useRef<NotificationSubscription | null>(null);

  useEffect(() => {
    // Notification arrives while app is foregrounded (partner transmitted)
    receivedSub.current = onNotificationReceived((notification) => {
      const data = notification.request.content.data as Record<string, string> | null;
      if (data?.type === "intercom-ptt") {
        addMissedTransmission(
          notification.request.identifier,
          data.from ?? "",
          data.senderName ?? data.from ?? ""
        ).catch(() => {});
      }
    });

    // User taps a notification from background / killed state
    responseSub.current = onNotificationResponse((response) => {
      const data = response.notification.request.content.data as Record<string, string> | null;
      if (data?.type === "intercom-ptt") {
        addMissedTransmission(
          response.notification.request.identifier,
          data.from ?? "",
          data.senderName ?? data.from ?? ""
        ).catch(() => {});
      }
    });

    return () => {
      receivedSub.current?.remove();
      responseSub.current?.remove();
    };
  }, []);

  return null;
}

function RootLayoutNav() {
  return (
    <IntercomProvider>
      <NotificationListeners />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: C.surface },
          headerTintColor: C.foreground,
          headerTitleStyle: {
            fontFamily: "Inter_600SemiBold",
            letterSpacing: 1,
            fontSize: 14,
          },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: C.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="pair" options={{ headerShown: false }} />
        <Stack.Screen name="main" options={{ headerShown: false }} />
        <Stack.Screen
          name="settings"
          options={{
            title: "SETTINGS",
            presentation: "modal",
            headerStyle: { backgroundColor: C.surface },
          }}
        />
        <Stack.Screen
          name="history"
          options={{
            title: "LOG",
            headerStyle: { backgroundColor: C.surface },
            headerTitleStyle: {
              fontFamily: "Inter_600SemiBold",
              letterSpacing: 4,
              fontSize: 11,
            },
          }}
        />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </IntercomProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <RootLayoutNav />
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
