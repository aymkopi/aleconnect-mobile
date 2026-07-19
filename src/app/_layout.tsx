import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import type * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef } from "react";
import { Text, TextInput } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { useUniwind } from "uniwind";

import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import {
  Toast,
  ToastDescription,
  ToastTitle,
  useToast,
} from "@/components/ui/toast";
import { PushNotificationsReceiver } from "@/components/push-notifications-receiver";
import { AuthSessionProvider } from "@/context/auth-session-context";
import { ReportQueueProvider } from "@/context/report-queue-context";
import { useAuthSession } from "@/hooks/use-auth-session";
import { consumeForcedLogoutReason } from "@/services/api";
import { subscribeComplaintSubmissionToast } from "@/services/report-submission-events";
import { clearComplaintCache } from "@/services/reports";
import { registerDevicePushToken } from "@/services/notification-settings";
import { ticketIdFromPushData } from "@/services/notification-navigation";
import "../../global.css";

void SplashScreen.preventAutoHideAsync();

function AppToast({
  id,
  title,
  message,
  action,
}: {
  id: string;
  title: string;
  message: string;
  action: "success" | "error" | "info";
}) {
  return (
    <Toast
      nativeID={`app-toast-${id}`}
      action={action}
      variant="solid"
      className="border-border bg-popover shadow-lg"
      style={{ width: "90%", maxWidth: 560 }}
    >
      <ToastTitle
        className={
          action === "error"
            ? "text-destructive"
            : action === "info"
              ? "text-accent"
              : "text-success"
        }
      >
        {title}
      </ToastTitle>
      <ToastDescription className="text-popover-foreground">
        {message}
      </ToastDescription>
    </Toast>
  );
}

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
      const ticketId = ticketIdFromPushData(
        response.notification.request.content.data,
      );

      if (ticketId) {
        void clearComplaintCache();
        router.push({
          pathname: "/report/[id]",
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
  const toast = useToast();

  useEffect(() => {
    if (isLoading || session) return;

    void consumeForcedLogoutReason().then((reason) => {
      if (!reason) return;

      router.replace("/sign-in");
      toast.show({
        placement: "top",
        duration: 5000,
        render: ({ id }) => (
          <AppToast
            id={String(id)}
            title="Logged out"
            message={reason}
            action="error"
          />
        ),
      });
    });
  }, [isLoading, router, session, toast]);

  return null;
}

function ComplaintSubmissionToastHost() {
  const toast = useToast();

  useEffect(() => {
    const unsubscribe = subscribeComplaintSubmissionToast((nextToast) => {
      const isSuccess = nextToast.status === "success";
      const isInfo = nextToast.status === "info";
      toast.show({
        placement: "top",
        duration: 5000,
        render: ({ id }) => (
          <AppToast
            id={String(id)}
            title={
              isInfo
                ? "Report queued"
                : isSuccess
                  ? "Report submitted"
                  : "Report failed"
            }
            message={nextToast.message}
            action={isInfo ? "info" : isSuccess ? "success" : "error"}
          />
        ),
      });
    });
    return () => {
      unsubscribe();
    };
  }, [toast]);

  return null;
}

function AppUIProvider({ children }: { children: React.ReactNode }) {
  const { theme, hasAdaptiveThemes } = useUniwind();
  const mode = hasAdaptiveThemes
    ? "system"
    : theme === "dark"
      ? "dark"
      : "light";

  return (
    <GluestackUIProvider mode={mode}>{children}</GluestackUIProvider>
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
        <AppUIProvider>
          <AuthSessionProvider>
            <ReportQueueProvider>
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
            </ReportQueueProvider>
          </AuthSessionProvider>
        </AppUIProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
