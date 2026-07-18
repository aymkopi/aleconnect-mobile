import { appScrollableBottomPadding } from "@/components/floating-app-bar";
import { Button, ButtonIcon } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { ListSection, ListSectionItem } from "@/components/ui/list-section";
import { Text } from "@/components/ui/text";
import { statusBarHeight } from "@/constants";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useAppColors } from "@/hooks/use-app-colors";
import { fetchNotifications } from "@/services/notifications";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Bell,
  ChevronRight,
  FileText,
  Phone,
  UserRound,
  Zap,
} from "lucide-react-native";
import { useCallback, useState } from "react";
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
  const [accentColor, mutedColor] = useAppColors(["accent", "muted"]);
  const bottomPadding = appScrollableBottomPadding(insets.bottom);

  useFocusEffect(
    useCallback(() => {
      if (!session) {
        setUnreadCount(0);
        return;
      }

      void fetchNotifications()
        .then((response) => setUnreadCount(response.unreadCount))
        .catch(() => setUnreadCount(0));
    }, [session]),
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      await refreshSession({ forceNetwork: true });
      if (session) {
        const response = await fetchNotifications();
        setUnreadCount(response.unreadCount);
      }
    } finally {
      setIsRefreshing(false);
    }
  };
  const quickActions = [
    {
      title: "Report an issue",
      description: "File a complaint or service request.",
      icon: FileText,
      onPress: () =>
        router.push(session ? "/complaints/new" : "/sign-in"),
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
          {unreadCount > 0 ? (
            <View className="absolute -right-1 -top-1 min-h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1">
              <Text className="text-xs font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
          ) : null}
        </Button>
      </View>

      <View className="rounded-lg border border-border bg-card p-5">
        <View className="flex-row items-center gap-4">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-accent">
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
    </ScrollView>
  );
}
