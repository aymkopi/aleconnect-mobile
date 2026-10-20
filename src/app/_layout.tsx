import { VisualPreviewProvider } from "@/context/visual-preview-context";
import { GuestAccessProvider } from "@/context/guest-access-context";
import { AppGuideProvider } from "@/context/app-guide-context";
import { PANELUI_PREVIEW } from "@/constants/panelui-preview";
import NetInfo from "@react-native-community/netinfo";
import { useFonts } from "expo-font";
import { type Href, Stack, DarkTheme, DefaultTheme, ThemeProvider, useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import type * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import { AppStatusBar } from "@/components/app-status-bar";
import { useCallback, useEffect, useRef } from "react";
import { AppState, View } from "react-native";

import { PanelUIProvider } from "@/components/panelui/panel-ui-provider";
import { useUniwind } from "uniwind";
import { useAppColors } from "@/hooks/use-app-colors";
import { Toast, toast } from "@/components/panelui/toast";
import { PushNotificationsReceiver } from "@/components/push-notifications-receiver";
import { AuthSessionProvider } from "@/context/auth-session-context";
import { ConsumerAccountProvider } from "@/context/consumer-account-context";
import { ReportQueueProvider } from "@/context/report-queue-context";
import { useAuthSession } from "@/hooks/use-auth-session";
import { authResumeRoute } from "@/features/auth/auth-state";
import { useConsumerAccount } from "@/hooks/use-consumer-account";
import { consumeForcedLogoutReason } from "@/services/api";
import { clearAdvisoryCache } from "@/services/advisories";
import { clearPublicUpdatesCache } from "@/services/public-updates";
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

export { ErrorBoundary } from "@/features/recovery/recovery-screen";

void SplashScreen.preventAutoHideAsync();

function AppToast({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action: "success" | "error" | "info";
}) {
  return (
    <Toast variant={action === "error" ? "destructive" : action}>
      <Toast.Indicator />
      <Toast.Content>
        <Toast.Title numberOfLines={1} className="text-popover-foreground">{title}</Toast.Title>
        <Toast.Description numberOfLines={2} className="text-popover-foreground">{message}</Toast.Description>
      </Toast.Content>
    </Toast>
  );
}

function PushTokenBridge() {
  const router = useRouter();
  const { session, signOut } = useAuthSession();
  const { accountContext } = useConsumerAccount();

  const pendingToken = useRef<string | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const wasOfflineRef = useRef<boolean | null>(null);
  const userId = session?.user.id;

  const flushToken = useCallback(
    (token: string) => {
      pendingToken.current = token;
      if (PANELUI_PREVIEW || !userId) return;

      void registerDevicePushToken(token).catch((error) => {
        console.warn("Failed to save push token", error);
      });
    },
    [userId],
  );

  const openNotificationTarget = useCallback(
    (response: Notifications.NotificationResponse) => {
      if (PANELUI_PREVIEW) return;
      const data = response.notification.request.content.data;
      const accountLink = accountLinkingPushFromData(data);
      if (accountLink) {
        if (accountLink.decision === "approved") {
          // The approved link replaces the account session. Use the ordinary
          // sign-out path so tokens and private providers are invalidated.
          pendingToken.current = null;
          void Promise.all([
            userId ? clearReportListCache(userId) : Promise.resolve(),
            userId
              ? clearAdvisoryCache({
                  userId,
                  identityUserId: accountContext?.identityUserId,
                  accessRevision: accountContext?.accessRevision,
                })
              : Promise.resolve(),
            userId
              ? clearPublicUpdatesCache({
                  userId,
                  identityUserId: accountContext?.identityUserId,
                  accessRevision: accountContext?.accessRevision,
                })
              : Promise.resolve(),
            userId ? invalidateNotifications(userId) : Promise.resolve(),
          ]).finally(() =>
            signOut().finally(() =>
              router.replace({
                pathname: "/sign-in",
                params: { mode: "email", linked: "1" },
              }),
            ),
          );
        } else if (userId) {
          router.push("/profile/accounts" as Href);
        } else {
          router.push({
            pathname: "/sign-in",
            params: {
              mode: "email",
              accountLinkRequestId: accountLink.requestId,
            },
          });
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
          params: {
            id: ticketId,
            focus: "notification",
            ...(ticket?.serviceAccountId
              ? { serviceAccountId: ticket.serviceAccountId }
              : {}),
          },
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
    [
      accountContext?.accessRevision,
      accountContext?.identityUserId,
      router,
      signOut,
      userId,
    ],
  );

  const handleForegroundNotification = useCallback(
    (notification: Notifications.Notification) => {
      const data = notification.request.content.data;
      if (userId) {
        void Promise.all([
          clearAdvisoryCache({
            userId,
            identityUserId: accountContext?.identityUserId,
            accessRevision: accountContext?.accessRevision,
          }),
          clearPublicUpdatesCache({
            userId,
            identityUserId: accountContext?.identityUserId,
            accessRevision: accountContext?.accessRevision,
          }),
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
        label: "ALEConnect",
        component: () => (
          <AppToast title={title} message={message} action="info" />
        ),
      });
    },
    [
      accountContext?.accessRevision,
      accountContext?.identityUserId,
      toast,
      userId,
    ],
  );

  useEffect(() => {
    if (PANELUI_PREVIEW || !userId || !pendingToken.current) return;

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
  const router = useRouter(), pathname = usePathname();
  const params = useGlobalSearchParams<{ returnTo?: string | string[]; linking?: string | string[] }>();
  const { isLoading, session } = useAuthSession();
  const latest = useRef({ isLoading, session, pathname, params });
  latest.current = { isLoading, session, pathname, params };

  useEffect(() => {
    if (isLoading || session) return;
    let active = true;
    const returnTo = authResumeRoute(latest.current.pathname, latest.current.params);
    const linking = latest.current.params.linking === "1";
    void consumeForcedLogoutReason().then((reason) => {
      // Storage can resolve after a newer session has already been restored.
      if (!reason || !active || latest.current.isLoading || latest.current.session) return;
      router.replace({ pathname: "/sign-in", params: {
        context: "session-ended", returnTo, ...(linking ? { linking: "1" } : {}),
      } });
      toast.show({
        placement: "top",
        duration: 5000,
        label: "ALEConnect",
        component: () => (
          <AppToast title="Session ended" message={reason} action="error" />
        ),
      });
    }).catch(() => null);
    return () => { active = false; };
  }, [isLoading, router, session]);

  return null;
}

function ComplaintSubmissionToastHost() {
  useEffect(() => {
    const unsubscribe = subscribeComplaintSubmissionToast((nextToast) => {
      const isSuccess = nextToast.status === "success";
      const isInfo = nextToast.status === "info";
      toast.show({
        placement: "top",
        duration: 5000,
        label: "ALEConnect",
        component: () => (
          <AppToast
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

export default function RootLayout() {
  const { theme } = useUniwind();
  const [background, card, text, border, primary, notification] = useAppColors(["background", "card", "foreground", "border", "primary", "destructive"]);
  const navigationTheme = {
    ...(theme === "dark" ? DarkTheme : DefaultTheme),
    colors: { background, card, text, border, primary, notification },
  };
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ context?: string }>();
  const photo = pathname === "/home" || (pathname === "/sign-in" && params.context !== "session-ended");
  const [loaded, error] = useFonts({
    Inter_400Regular: require("../../assets/fonts/Inter_400Regular.ttf"),
    Inter_500Medium: require("../../assets/fonts/Inter_500Medium.ttf"),
    Inter_600SemiBold: require("../../assets/fonts/Inter_600SemiBold.ttf"),
    Inter_700Bold: require("../../assets/fonts/Inter_700Bold.ttf"),
    PlusJakartaSans_600SemiBold: require("../../assets/fonts/PlusJakartaSans_600SemiBold.ttf"),
    PlusJakartaSans_700Bold: require("../../assets/fonts/PlusJakartaSans_700Bold.ttf"),
  });
  useEffect(() => {
    if (loaded || error) void SplashScreen.hideAsync();
  }, [loaded, error]);
  if (!loaded && !error) return null;
  return (
    <ThemeProvider value={navigationTheme}>
    <PanelUIProvider>
      <VisualPreviewProvider>
        <AuthSessionProvider>
          <ConsumerAccountProvider>
            <ReportQueueProvider syncEnabled={!PANELUI_PREVIEW}>
              <GuestAccessProvider>
              <AppGuideProvider>
              <ForcedLogoutRedirect />
              <ComplaintSubmissionToastHost />
              <PushTokenBridge />
              <View className="flex-1 bg-background">
                <Stack screenOptions={{ headerShown: false, animation: "none", contentStyle: { backgroundColor: background } }} />
                <AppStatusBar photo={photo} />
              </View>
              </AppGuideProvider>
              </GuestAccessProvider>
            </ReportQueueProvider>
          </ConsumerAccountProvider>
        </AuthSessionProvider>
      </VisualPreviewProvider>
    </PanelUIProvider>
    </ThemeProvider>
  );
}
