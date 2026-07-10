import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import type * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { Alert as HeroAlert, HeroUINativeProvider } from "heroui-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { PushNotificationsReceiver } from "@/components/push-notifications-receiver";
import { AuthSessionProvider } from "@/context/auth-session-context";
import { useAuthSession } from "@/hooks/use-auth-session";
import { consumeForcedLogoutReason } from "@/services/api";
import { subscribeComplaintSubmissionToast } from "@/services/complaint-submission-events";
import { registerDevicePushToken } from "@/services/notification-settings";
import "../../global.css";

void SplashScreen.preventAutoHideAsync();

function PushTokenBridge() {
  const router = useRouter();
  const { session } = useAuthSession();
  const pendingToken = useRef<string | null>(null);

  const flushToken = useCallback(
    (token: string) => {
      pendingToken.current = token;
      if (!session) return;

      void registerDevicePushToken(token).catch((error) => {
        console.warn("Failed to save push token", error);
      });
    },
    [session],
  );

  const openNotificationTarget = useCallback(
    (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as Record<
        string,
        unknown
      >;
      const ticketId =
        typeof data.ticketId === "string"
          ? data.ticketId
          : typeof data.entityId === "string" && data.context === "ticket"
            ? data.entityId
            : null;

      if (ticketId) {
        router.push({
          pathname: "/complaints/[id]",
          params: { id: ticketId },
        });
        return;
      }

      router.push("/notifications");
    },
    [router],
  );

  useEffect(() => {
    if (!session || !pendingToken.current) return;

    void registerDevicePushToken(pendingToken.current).catch((error) => {
      console.warn("Failed to save push token", error);
    });
  }, [session]);

  return (
    <PushNotificationsReceiver
      onPushTokenReceived={flushToken}
      onNotificationResponseReceived={openNotificationTarget}
    />
  );
}

function ForcedLogoutRedirect() {
  const router = useRouter();
  const { isLoading, session } = useAuthSession();
  const [logoutMessage, setLogoutMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || session) return;

    void consumeForcedLogoutReason().then((reason) => {
      if (!reason) return;

      router.replace("/sign-in");
      setLogoutMessage(reason);
      setTimeout(() => setLogoutMessage(null), 5000);
    });
  }, [isLoading, router, session]);

  if (!logoutMessage) return null;

  return (
    <View
      className="absolute inset-x-0 top-0 z-50 px-5"
      style={{ paddingTop: 54, pointerEvents: "box-none" }}
    >
      <HeroAlert status="danger">
        <HeroAlert.Indicator />
        <HeroAlert.Content>
          <HeroAlert.Title>Logged out</HeroAlert.Title>
          <HeroAlert.Description>{logoutMessage}</HeroAlert.Description>
        </HeroAlert.Content>
      </HeroAlert>
    </View>
  );
}

function ComplaintSubmissionToastHost() {
  const [toast, setToast] = useState<{
    message: string;
    status: "success" | "danger";
  } | null>(null);

  useEffect(
    () => {
      const unsubscribe = subscribeComplaintSubmissionToast((nextToast) => {
        setToast(nextToast);
        setTimeout(() => setToast(null), 5000);
      });
      return () => {
        unsubscribe();
      };
    },
    [],
  );

  if (!toast) return null;

  return (
    <View
      className="absolute inset-x-0 top-0 z-50 px-5"
      style={{ paddingTop: 54, pointerEvents: "box-none" }}
    >
      <HeroAlert status={toast.status}>
        <HeroAlert.Indicator />
        <HeroAlert.Content>
          <HeroAlert.Title>
            {toast.status === "success" ? "Report submitted" : "Report failed"}
          </HeroAlert.Title>
          <HeroAlert.Description>{toast.message}</HeroAlert.Description>
        </HeroAlert.Content>
      </HeroAlert>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Satoshi_400Regular: require("../../assets/fonts/Satoshi-Regular.ttf"),
    Satoshi_500Medium: require("../../assets/fonts/Satoshi-Medium.ttf"),
    Satoshi_700Bold: require("../../assets/fonts/Satoshi-Bold.ttf"),
    Satoshi_900Black: require("../../assets/fonts/Satoshi-Black.ttf"),
  });
  const didApplyDefaultFonts = useRef(false);
  useEffect(() => {
    if (!fontsLoaded) {
      return;
    }

    if (!didApplyDefaultFonts.current) {
      const TextHost = Text as unknown as {
        defaultProps?: { style?: unknown };
      };
      const TextInputHost = TextInput as unknown as {
        defaultProps?: { style?: unknown };
      };

      TextHost.defaultProps = TextHost.defaultProps ?? {};
      TextHost.defaultProps.style = [
        TextHost.defaultProps.style,
        { fontFamily: "Satoshi_400Regular" },
      ];

      TextInputHost.defaultProps = TextInputHost.defaultProps ?? {};
      TextInputHost.defaultProps.style = [
        TextInputHost.defaultProps.style,
        { fontFamily: "Satoshi_400Regular" },
      ];

      didApplyDefaultFonts.current = true;
    }

    void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <HeroUINativeProvider>
          <AuthSessionProvider>
            <ForcedLogoutRedirect />
            <ComplaintSubmissionToastHost />
            <PushTokenBridge />
            <StatusBar style="auto" />
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="sign-in"
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="notifications"
                options={{
                  headerShown: false,
                }}
              />
            </Stack>
          </AuthSessionProvider>
        </HeroUINativeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
