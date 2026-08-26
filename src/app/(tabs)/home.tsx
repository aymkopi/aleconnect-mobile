import { appScrollableBottomPadding } from "@/components/floating-app-bar";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { ListSection, ListSectionItem } from "@/components/ui/list-section";
import { Text } from "@/components/ui/text";
import { statusBarHeight } from "@/constants";
import { AdvisoryListItem } from "@/features/advisories/advisory-list-item";
import { useAppColors } from "@/hooks/use-app-colors";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useConsumerAccount } from "@/hooks/use-consumer-account";
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
  const { accountContext } = useConsumerAccount();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [advisories, setAdvisories] = useState<MobileAdvisory[]>([]);
  const [loadedScopeKey, setLoadedScopeKey] = useState<string | null>(null);
  const currentScopeKey = accountContext?.cacheKey ?? (session ? `${session.user.id}:0` : null);
  const activeScopeKeyRef = useRef(currentScopeKey);
  activeScopeKeyRef.current = currentScopeKey;
  const hasCurrentUserData = loadedScopeKey === currentScopeKey;
  const visibleAdvisories = hasCurrentUserData ? advisories : [];
  const visibleUnreadCount = hasCurrentUserData ? unreadCount : 0;
  const [accentColor, mutedColor] = useAppColors(["accent", "muted"]);
  const bottomPadding = appScrollableBottomPadding(insets.bottom);

  useFocusEffect(
    useCallback(() => {
      if (!session) {
        setUnreadCount(0);
        setAdvisories([]);
        setLoadedScopeKey(null);
        return;
      }

      const userId = session.user.id;
      const scopeKey = currentScopeKey;
      let isActive = true;
      const load = () =>
        void Promise.all([
          fetchNotifications({
            userId,
            identityUserId: accountContext?.identityUserId,
            accessRevision: accountContext?.accessRevision,
          }),
          fetchActiveAdvisories({ userId, identityUserId: accountContext?.identityUserId, accessRevision: accountContext?.accessRevision, limit: 3 }),
        ])
          .then(([notifications, advisoryPage]) => {
            if (!isActive || activeScopeKeyRef.current !== scopeKey) return;
            setUnreadCount(notifications.unreadCount);
            setAdvisories(advisoryPage.advisories);
            setLoadedScopeKey(scopeKey);
          })
          .catch(() => undefined);
      load();
      const unsubscribe = subscribeNotificationsChanged(load);
      return () => {
        isActive = false;
        unsubscribe();
      };
    }, [accountContext?.accessRevision, accountContext?.identityUserId, currentScopeKey, session]),
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      const nextSession = await refreshSession({ forceNetwork: true });
      if (nextSession) {
        const userId = nextSession.user.id;
        const scopeKey = accountContext?.cacheKey ?? `${userId}:0`;
        const [notifications, advisoryPage] = await Promise.all([
          fetchNotifications({
            userId,
            identityUserId: accountContext?.identityUserId,
            accessRevision: accountContext?.accessRevision,
            force: true,
          }),
          fetchActiveAdvisories({
            userId,
            identityUserId: accountContext?.identityUserId,
            accessRevision: accountContext?.accessRevision,
            limit: 3,
            force: true,
          }),
        ]);
        if (activeScopeKeyRef.current !== scopeKey) return;
        setUnreadCount(notifications.unreadCount);
        setAdvisories(advisoryPage.advisories);
        setLoadedScopeKey(scopeKey);
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
      onPress: () => router.push(session ? "/reports/new" : "/sign-in"),
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
          <Heading size="2xl">Home</Heading>
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
        <View className="gap-2">
          <View className="flex-row items-center justify-between px-1">
            <Heading size="sm">Active advisories</Heading>

            <Button
              size="sm"
              variant="ghost"
              accessibilityLabel="View all advisories"
              onPress={() => router.push("/advisories")}
            >
              <ButtonText>View all</ButtonText>

              <ButtonIcon as={ChevronRight} height={18} width={18} />
            </Button>
          </View>

          {visibleAdvisories.length > 0 ? (
            <View className="gap-2">
              {visibleAdvisories.map((advisory) => (
                <AdvisoryListItem
                  key={advisory.id}
                  advisory={advisory}
                  onPress={() =>
                    router.push({
                      pathname: "/advisory/[id]",
                      params: {
                        id: advisory.id,
                      },
                    })
                  }
                />
              ))}
            </View>
          ) : (
            <ListSection>
              <ListSectionItem
                description="New service notices for your area will appear here."
                showDivider={false}
                title="No active advisories"
              />
            </ListSection>
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}
