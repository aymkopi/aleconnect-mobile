import { appScrollableBottomPadding } from "@/components/floating-app-bar";
import { Button, ButtonIcon } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { ListSection, ListSectionItem } from "@/components/ui/list-section";
import { Text } from "@/components/ui/text";
import { AdvisoryListItem } from "@/features/advisories/advisory-list-item";
import { statusBarHeight } from "@/constants";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useAppColors } from "@/hooks/use-app-colors";
import {
  fetchActiveAdvisories,
  type MobileAdvisory,
} from "@/services/advisories";
import {
  fetchNotifications,
  subscribeNotificationsChanged,
} from "@/services/notifications";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Bell,
  ChevronRight,
  FileText,
  Phone,
  UserRound,
  Zap,
} from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { session, refreshSession } = useAuthSession();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [advisories, setAdvisories] = useState<MobileAdvisory[]>([]);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const activeUserIdRef = useRef(session?.user.id);
  activeUserIdRef.current = session?.user.id;
  const hasCurrentUserData = loadedUserId === session?.user.id;
  const visibleAdvisories = hasCurrentUserData ? advisories : [];
  const visibleUnreadCount = hasCurrentUserData ? unreadCount : 0;
  const [accentColor, mutedColor] = useAppColors(["accent", "muted"]);
  const bottomPadding = appScrollableBottomPadding(insets.bottom);

  useFocusEffect(
    useCallback(() => {
      if (!session) {
        setUnreadCount(0);
        setAdvisories([]);
        setLoadedUserId(null);
        return;
      }

      const userId = session.user.id;
      let isActive = true;
      const load = () =>
        void Promise.all([
          fetchNotifications({ userId }),
          fetchActiveAdvisories({ userId, limit: 3 }),
        ])
          .then(([notifications, advisoryPage]) => {
            if (!isActive || activeUserIdRef.current !== userId) return;
            setUnreadCount(notifications.unreadCount);
            setAdvisories(advisoryPage.advisories);
            setLoadedUserId(userId);
          })
          .catch(() => undefined);
      load();
      const unsubscribe = subscribeNotificationsChanged(load);
      return () => {
        isActive = false;
        unsubscribe();
      };
    }, [session]),
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      const nextSession = await refreshSession({ forceNetwork: true });
      if (nextSession) {
        const userId = nextSession.user.id;
        const [notifications, advisoryPage] = await Promise.all([
          fetchNotifications({ userId, force: true }),
          fetchActiveAdvisories({
            userId,
            limit: 3,
            force: true,
          }),
        ]);
        if (activeUserIdRef.current !== userId) return;
        setUnreadCount(notifications.unreadCount);
        setAdvisories(advisoryPage.advisories);
        setLoadedUserId(userId);
      }
    } finally {
      setIsRefreshing(false);
    }
  };
  const quickActions = [
    {
      title: "Report an issue",
      description: "Send a report or service request.",
      icon: FileText,
      onPress: () =>
        router.push(session ? "/reports/new" : "/sign-in"),
    },
    {
      title: "Call support",
      description: "Open ALECO hotline contacts.",
      icon: Phone,
      onPress: () => router.push("/hotlines"),
    },
    {
      title: session ? "View account" : "Sign in",
      description: session
        ? "Check account and service details."
        : "Use your account number to unlock services.",
      icon: UserRound,
      onPress: () => router.push(session ? "/profile" : "/sign-in"),
    },
  ];

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ width }}
      className="bg-background"
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: statusBarHeight + 22,
        gap: 16,
        paddingBottom: bottomPadding,
      }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => {
            void handleRefresh();
          }}
          tintColor={accentColor}
          colors={[accentColor]}
        />
      }
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-4">
          <Heading size="2xl">
            Home
          </Heading>
          <Text className="mt-1 text-sm text-muted-foreground">
            Your ALECO account, reports, and support in one place.
          </Text>
        </View>
        <Button
          size="icon"
          variant="secondary"
          accessibilityLabel="Alerts"
          onPress={() => router.push(session ? "/notifications" : "/sign-in")}
        >
          <ButtonIcon as={Bell} height={20} width={20} />
          {visibleUnreadCount > 0 ? (
            <View className="absolute -right-1 -top-1 min-h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1">
              <Text className="text-xs font-bold text-white">
                {visibleUnreadCount > 9 ? "9+" : visibleUnreadCount}
              </Text>
            </View>
          ) : null}
        </Button>
      </View>

      <View className="rounded-lg border border-border bg-card p-5">
        <View className="flex-row items-center gap-4">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-accent">
            <Zap size={23} color="white" />
          </View>
          <View className="flex-1">
            <Heading size="sm">
              {session ? "Service dashboard" : "Guest mode"}
            </Heading>
            <Text className="mt-1 text-sm text-muted-foreground">
              {session
                ? "Track your reports and account updates."
                : "Sign in to see account-specific updates."}
            </Text>
          </View>
        </View>
      </View>

      <ListSection title="Quick actions">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <ListSectionItem
                key={action.title}
                description={action.description}
                leading={<Icon size={20} color={accentColor} />}
                onPress={action.onPress}
                showDivider={index < quickActions.length - 1}
                title={action.title}
                trailing={<ChevronRight size={18} color={mutedColor} />}
              />
            );
          })}
      </ListSection>

      {session ? (
        <ListSection
          title={
            <View className="flex-row items-center justify-between px-1">
              <Heading size="sm">Active advisories</Heading>
              <Button
                size="sm"
                variant="ghost"
                accessibilityLabel="View all advisories"
                onPress={() => router.push("/advisories")}
              >
                <Text className="font-semibold text-accent">View all</Text>
              </Button>
            </View>
          }
        >
          {visibleAdvisories.length > 0 ? (
            visibleAdvisories.map((advisory, index) => (
              <AdvisoryListItem
                key={advisory.id}
                advisory={advisory}
                onPress={() =>
                  router.push({
                    pathname: "/advisory/[id]",
                    params: { id: advisory.id },
                  })
                }
                showDivider={index < visibleAdvisories.length - 1}
              />
            ))
          ) : (
            <ListSectionItem
              description="New service notices for your area will appear here."
              showDivider={false}
              title="No active advisories"
            />
          )}
        </ListSection>
      ) : null}
    </ScrollView>
  );
}
