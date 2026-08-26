import NetInfo from "@react-native-community/netinfo";
import { useFonts } from "expo-font";
import { type Href, Stack, useRouter } from "expo-router";
import type * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef } from "react";
import {
  AppState,
  Text,
  TextInput,
  useWindowDimensions,
} from "react-native";
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
import { ConsumerAccountProvider } from "@/context/consumer-account-context";
import { ReportQueueProvider } from "@/context/report-queue-context";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useConsumerAccount } from "@/hooks/use-consumer-account";
import { consumeForcedLogoutReason } from "@/services/api";
import { clearAdvisoryCache } from "@/services/advisories";
import { registerDevicePushToken } from "@/services/notification-settings";
import {
  advisoryIdFromPushData,
  accountLinkingPushFromData,
  ticketIdFromPushData,
  ticketStatusChangedEventFromPushData,
} from "@/services/notification-navigation";
import { invalidateNotifications } from "@/services/notifications";
import { clearReportListCache } from "@/services/reports";
import "@/services/report-background-sync";
import {
  handleReportStatusPush,
  requestReportRevalidation,
} from "@/services/report-sync-events";
import { subscribeComplaintSubmissionToast } from "@/services/report-submission-events";
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
  const { width } = useWindowDimensions();

  return (
    <Toast
      nativeID={`app-toast-${id}`}
      action={action}
      variant="solid"
      className="gap-0.5 border-border bg-popover shadow-lg"
      style={{
        width: Math.min(width - 32, 420),
        borderRadius: 12,
        padding: 12,
      }}
    >
      <ToastTitle
        numberOfLines={1}
        size="sm"
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
      <ToastDescription
        numberOfLines={2}
        size="xs"
        className="text-popover-foreground"
      >
        {message}
      </ToastDescription>
    </Toast>
  );
}

function PushTokenBridge() {
  const router = useRouter();
  const { session, signOut } = useAuthSession();
  const { accountContext } = useConsumerAccount();
  const toast = useToast();
  const pendingToken = useRef<string | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const wasOfflineRef = useRef<boolean | null>(null);
  const userId = session?.user.id;

  const flushToken = useCallback(
    (token: string) => {
      pendingToken.current = token;
      if (!userId) return;

      void registerDevicePushToken(token).catch((error) => {
        console.warn("Failed to save push token", error);
      });
    },
    [userId],
  );

  const openNotificationTarget = useCallback(
    (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;
      const accountLink = accountLinkingPushFromData(data);
      if (accountLink) {
        if (accountLink.decision === "approved") {
          // The approved link replaces the account session. Use the ordinary
          // sign-out path so tokens and private providers are invalidated.
          pendingToken.current = null;
          void Promise.all([
            userId ? clearReportListCache(userId) : Promise.resolve(),
            userId ? clearAdvisoryCache({ userId, identityUserId: accountContext?.identityUserId, accessRevision: accountContext?.accessRevision }) : Promise.resolve(),
            userId ? invalidateNotifications(userId) : Promise.resolve(),
          ]).finally(() => signOut().finally(() => router.replace({ pathname: "/sign-in", params: { mode: "email", linked: "1" } })));
        } else if (userId) {
          router.push("/profile/accounts" as Href);
        } else {
          router.push({ pathname: "/sign-in", params: { mode: "email", accountLinkRequestId: accountLink.requestId } });
        }
        return;
      }
      const ticketId = ticketIdFromPushData(data);

      if (ticketId) {
        if (userId) {
          if (ticketStatusChangedEventFromPushData(data)) {
            void handleReportStatusPush(data, userId).catch(() => {
              requestReportRevalidation(userId);
            });
          } else {
            requestReportRevalidation(userId);
          }
        }
        const ticket = ticketStatusChangedEventFromPushData(data);
        router.push({
          pathname: "/report/[id]",
          params: { id: ticketId, focus: "notification", ...(ticket?.serviceAccountId ? { serviceAccountId: ticket.serviceAccountId } : {}) },
        });
        return;
      }

      const advisoryId = advisoryIdFromPushData(data);
      if (advisoryId) {
        router.push({
          pathname: "/advisory/[id]",
          params: { id: advisoryId, focus: "notification" },
        });
        return;
      }

      router.push("/notifications");
    },
    [accountContext?.accessRevision, accountContext?.identityUserId, router, signOut, userId],
  );

  const handleForegroundNotification = useCallback(
    (notification: Notifications.Notification) => {
      const data = notification.request.content.data;
      if (userId) {
        void Promise.all([
          clearAdvisoryCache({ userId, identityUserId: accountContext?.identityUserId, accessRevision: accountContext?.accessRevision }),
          handleReportStatusPush(data, userId),
        ]).then(() => invalidateNotifications(userId));
      }

      const title = notification.request.content.title ?? "New update";
      const message =
        notification.request.content.body ??
        "Open notifications to view the latest update.";
      toast.show({
        placement: "top",
        duration: 5000,
        render: ({ id }) => (
          <AppToast
            id={String(id)}
            title={title}
            message={message}
            action="info"
          />
        ),
      });
    },
    [accountContext?.accessRevision, accountContext?.identityUserId, toast, userId],
  );

  useEffect(() => {
    if (!userId || !pendingToken.current) return;

    void registerDevicePushToken(pendingToken.current).catch((error) => {
      console.warn("Failed to save push token", error);
    });
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    requestReportRevalidation(userId);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const subscription = AppState.addEventListener("change", (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;
      if (previousState !== "active" && nextState === "active") {
        requestReportRevalidation(userId);
      }
    });

    return () => subscription.remove();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline =
        state.isConnected === false || state.isInternetReachable === false;
      const previousOffline = wasOfflineRef.current;
      wasOfflineRef.current = offline;
      if (previousOffline === true && !offline) {
        requestReportRevalidation(userId);
      }
    });

    return unsubscribe;
  }, [userId]);

  return (
    <PushNotificationsReceiver
      onNotificationReceived={handleForegroundNotification}
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
            <ConsumerAccountProvider>
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
                  name="email-setup"
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
                <Stack.Screen
                  name="notification-settings"
                  options={{
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="advisories"
                  options={{
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="advisory/[id]"
                  options={{
                    headerShown: false,
                  }}
                />
                </Stack>
              </ReportQueueProvider>
            </ConsumerAccountProvider>
          </AuthSessionProvider>
        </AppUIProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
