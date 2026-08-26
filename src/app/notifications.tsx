import { ChildAppBar } from "@/components/child-app-bar";
import { Alert, AlertText } from "@/components/ui/alert";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { ListSection, ListSectionItem } from "@/components/ui/list-section";
import { SearchField } from "@/components/ui/search-field";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useAppColors } from "@/hooks/use-app-colors";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useConsumerAccountContext } from "@/context/consumer-account-context";
import { notificationDestinationFromNotification } from "@/services/notification-navigation";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationsRead,
  subscribeNotificationsChanged,
  type MobileNotification,
  type MobileNotificationCategory,
} from "@/services/notifications";
import {
  formatManilaDateTime,
  manilaNotificationGroupTitle,
} from "@/utils/manila-time";
import { type Href, Redirect, useFocusEffect, useRouter } from "expo-router";
import {
  CheckCheck,
  ChevronRight,
  FileText,
  Settings,
  Sparkles,
  Zap,
} from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  RefreshControl,
  ScrollView,
  SectionList,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Notice = {
  status: "danger" | "success";
  title: string;
  description: string;
};

const categoryFilters: {
  label: string;
  value: MobileNotificationCategory | null;
}[] = [
  { label: "All", value: null },
  { label: "Report updates", value: "report_updates" },
  { label: "Area incidents", value: "area_incidents" },
  { label: "Advisories", value: "advisories" },
  { label: "System", value: "system" },
];

function severityTone(severity: string) {
  const normalized = severity.toLowerCase();
  if (normalized.includes("critical") || normalized.includes("high")) {
    return {
      label: severity,
      kind: "danger" as const,
      backgroundClass: "bg-danger/15",
      textClass: "text-danger",
    };
  }
  if (normalized.includes("medium") || normalized.includes("moderate")) {
    return {
      label: severity,
      kind: "warning" as const,
      backgroundClass: "bg-warning/15",
      textClass: "text-warning",
    };
  }
  if (normalized.includes("low")) {
    return {
      label: severity,
      kind: "success" as const,
      backgroundClass: "bg-success/15",
      textClass: "text-success",
    };
  }
  return {
    label: "Info",
    kind: "accent" as const,
    backgroundClass: "bg-accent/15",
    textClass: "text-accent",
  };
}

function searchableText(notification: MobileNotification) {
  return [
    notification.title,
    notification.description,
    notification.entityType,
    notification.ticketNumber,
    notification.severity,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function NotificationDescription({
  notification,
  showAccountLabel,
}: {
  notification: MobileNotification;
  showAccountLabel: boolean;
}) {
  const [accentColor, mutedColor] = useAppColors(["accent", "muted"]);
  const description =
    notification.description?.trim() ||
    (notification.entityType === "advisory"
      ? "A new power advisory is available."
      : "A report update is available.");

  return (
    <Text
      className="mt-1 text-sm"
      numberOfLines={3}
      style={{ color: mutedColor, fontFamily: "Satoshi_400Regular" }}
    >
      {notification.ticketNumber ? (
        <Text style={{ color: accentColor, fontFamily: "Satoshi_700Bold" }}>
          {notification.ticketNumber}{" "}
        </Text>
      ) : null}
      {description}
      {showAccountLabel && !notification.identityLevel && (notification.accountNumber || notification.accountName) ? ` · ${[notification.accountNumber, notification.accountName].filter(Boolean).join(" · ")}` : ""}
    </Text>
  );
}

function NotificationRow({
  notification,
  onOpen,
  showDivider,
  showAccountLabel,
}: {
  notification: MobileNotification;
  onOpen: (notification: MobileNotification) => void;
  showDivider: boolean;
  showAccountLabel: boolean;
}) {
  const [
    foregroundColor,
    mutedColor,
    dangerColor,
    warningColor,
    successColor,
    accentColor,
  ] = useAppColors([
    "foreground",
    "muted",
    "danger",
    "warning",
    "success",
    "accent",
  ]);
  const tone = severityTone(notification.severity);
  const toneColor = {
    danger: dangerColor,
    warning: warningColor,
    success: successColor,
    accent: accentColor,
  }[tone.kind];
  const Icon = notification.entityType === "advisory" ? Zap : FileText;
  const hasDestination = Boolean(
    notification.ticketId ||
    (notification.entityType === "advisory" && notification.entityId) ||
    notification.entityType === "account_linking",
  );
  const actionLabel = notification.ticketId
    ? "View report"
    : notification.entityType === "advisory" && notification.entityId
      ? "View advisory"
      : notification.entityType === "account_linking"
        ? "View account request"
      : !notification.isRead
        ? "Mark as read"
        : null;
  const isActionable = hasDestination || !notification.isRead;

  return (
    <ListSectionItem
      accessibilityLabel={
        hasDestination
          ? `Open notification: ${notification.title}`
          : !notification.isRead
            ? `Mark notification as read: ${notification.title}`
            : notification.title
      }
      description={
        <View className="min-w-0">
          <NotificationDescription notification={notification} showAccountLabel={showAccountLabel} />
          <View className="mt-2 flex-row flex-wrap items-center gap-2">
            <View className={`rounded-full px-2 py-1 ${tone.backgroundClass}`}>
              <Text className={`text-xs font-semibold ${tone.textClass}`}>
                {tone.label}
              </Text>
            </View>
            <Text className="text-xs font-medium text-muted-foreground">
              {formatManilaDateTime(notification.createdAt)}
            </Text>
            {actionLabel ? (
              <Text className="text-xs font-bold text-primary">
                {actionLabel}
              </Text>
            ) : null}
          </View>
        </View>
      }
      leading={
        <View
          className={`h-11 w-11 items-center justify-center rounded-full ${tone.backgroundClass}`}
        >
          <Icon size={19} color={toneColor} />
        </View>
      }
      onPress={isActionable ? () => onOpen(notification) : undefined}
      showDivider={showDivider}
      title={
        <View className="flex-row items-center gap-2">
          {!notification.isRead ? (
            <View className="h-2 w-2 rounded-full bg-primary" />
          ) : null}
          <Text
            className="flex-1 font-semibold text-foreground"
            numberOfLines={2}
          >
            {notification.title}
          </Text>
        </View>
      }
      trailing={
        hasDestination ? (
          <ChevronRight
            size={18}
            color={notification.isRead ? mutedColor : foregroundColor}
          />
        ) : undefined
      }
    />
  );
}

function EmptyState({
  filtered,
  onClear,
  onExplore,
}: {
  filtered: boolean;
  onClear: () => void;
  onExplore: () => void;
}) {
  const [accentColor] = useAppColors(["accent"]);
  return (
    <View className="items-center rounded-lg border border-border bg-card p-6">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-accent-soft">
        <Sparkles size={24} color={accentColor} />
      </View>
      <Heading className="mt-4 text-center" size="md">
        {filtered ? "No matching notifications" : "No notifications yet"}
      </Heading>
      <Text className="mt-2 text-center text-sm text-muted-foreground">
        {filtered
          ? "Try another filter or clear the current selection."
          : "Report updates and power advisories will appear here."}
      </Text>
      <Button className="mt-5" onPress={filtered ? onClear : onExplore}>
        <ButtonText>{filtered ? "Clear filters" : "Explore home"}</ButtonText>
      </Button>
    </View>
  );
}

function LoadingState() {
  return (
    <View className="gap-3">
      <Skeleton className="h-20 rounded-xl" />
      <Skeleton className="h-20 rounded-xl" />
      <Skeleton className="h-20 rounded-xl" />
    </View>
  );
}

export default function NotificationsRoute() {
  const router = useRouter();
  const { session, isLoading: isSessionLoading } = useAuthSession();
  const { accountContext } = useConsumerAccountContext();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [accentColor] = useAppColors(["accent"]);
  const [notifications, setNotifications] = useState<MobileNotification[]>([]);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [query, setQuery] = useState("");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<MobileNotificationCategory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [serviceAccountId, setServiceAccountId] = useState<string | null>(null);
  const isMultiAccount = (accountContext?.accounts.length ?? 0) > 1;
  const activeUserIdRef = useRef(session?.user.id);
  activeUserIdRef.current = session?.user.id;
  const activeFilterKey = `${showUnreadOnly}:${selectedCategory ?? "all"}:${serviceAccountId ?? "all"}:${accountContext?.accessRevision ?? 0}`;
  const activeFilterKeyRef = useRef(activeFilterKey);
  activeFilterKeyRef.current = activeFilterKey;
  const bottomPadding = Math.max(insets.bottom, 16) + 20;

  const load = useCallback(
    async (force = false) => {
      if (!session) {
        setIsLoading(false);
        return;
      }
      const userId = session.user.id;
      const requestedFilterKey = activeFilterKey;
      const next = await fetchNotifications({
        userId,
        identityUserId: accountContext?.identityUserId,
        accessRevision: accountContext?.accessRevision,
        serviceAccountId,
        force,
        unread: showUnreadOnly,
        categories: selectedCategory ? [selectedCategory] : undefined,
      });
      if (
        activeUserIdRef.current !== userId ||
        activeFilterKeyRef.current !== requestedFilterKey
      )
        return;
      setNotifications(next.notifications);
      setLoadedUserId(userId);
      setNextCursor(next.nextCursor);
      setUnreadCount(next.unreadCount);
      setNotice(
        next.isStale
          ? {
              status: "danger",
              title: "Showing saved notifications",
              description: "Connect to the internet to check for new updates.",
            }
          : null,
      );
      setIsLoading(false);
    },
    [accountContext?.accessRevision, accountContext?.identityUserId, activeFilterKey, selectedCategory, serviceAccountId, session, showUnreadOnly],
  );

  const loadMore = useCallback(async () => {
    if (!session || !nextCursor || isLoadingMore || query.trim()) return;
    const userId = session.user.id;
    const requestedFilterKey = activeFilterKey;
    setIsLoadingMore(true);
    try {
      const next = await fetchNotifications({
        userId,
        identityUserId: accountContext?.identityUserId,
        accessRevision: accountContext?.accessRevision,
        serviceAccountId,
        cursor: nextCursor,
        unread: showUnreadOnly,
        categories: selectedCategory ? [selectedCategory] : undefined,
      });
      if (
        activeUserIdRef.current !== userId ||
        activeFilterKeyRef.current !== requestedFilterKey
      )
        return;
      setNotifications((current) => [
        ...current,
        ...next.notifications.filter(
          (item) => !current.some((existing) => existing.id === item.id),
        ),
      ]);
      setLoadedUserId(userId);
      setNextCursor(next.nextCursor);
      setUnreadCount(next.unreadCount);
    } catch (error) {
      if (activeUserIdRef.current !== userId) return;
      setNotice({
        status: "danger",
        title: "Unable to load more notifications",
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      if (activeUserIdRef.current === userId) setIsLoadingMore(false);
    }
  }, [
    activeFilterKey,
    isLoadingMore,
    nextCursor,
    query,
    selectedCategory,
    serviceAccountId,
    accountContext?.accessRevision,
    accountContext?.identityUserId,
    session,
    showUnreadOnly,
  ]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/home");
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const refreshFromPush = () => {
        void load(true).catch(() => undefined);
      };
      const unsubscribe = subscribeNotificationsChanged(refreshFromPush);
      void load().catch((error) => {
        setIsLoading(false);
        setNotice({
          status: "danger",
          title: "Unable to load notifications",
          description: error instanceof Error ? error.message : "Try again.",
        });
      });

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          handleBack();
          return true;
        },
      );

      return () => {
        subscription.remove();
        unsubscribe();
      };
    }, [handleBack, load]),
  );

  const visibleNotifications = useMemo(() => {
    if (loadedUserId !== session?.user.id) return [];
    const normalized = query.trim().toLowerCase();
    return notifications.filter((notification) => {
      if (showUnreadOnly && notification.isRead) return false;
      if (selectedCategory && notification.category !== selectedCategory)
        return false;
      return !normalized || searchableText(notification).includes(normalized);
    });
  }, [
    loadedUserId,
    notifications,
    query,
    selectedCategory,
    session?.user.id,
    showUnreadOnly,
  ]);

  const groups = useMemo(() => {
    const grouped = new Map<string, MobileNotification[]>();
    for (const notification of visibleNotifications) {
      const title = manilaNotificationGroupTitle(notification.createdAt);
      grouped.set(title, [...(grouped.get(title) ?? []), notification]);
    }
    return Array.from(grouped.entries()).map(([title, data]) => ({
      title,
      data,
    }));
  }, [visibleNotifications]);

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await load(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  const markAllRead = async () => {
    setIsMarkingRead(true);
    try {
      const next = await markAllNotificationsRead(session!.user.id, { identityUserId: accountContext?.identityUserId, accessRevision: accountContext?.accessRevision });
      setNotifications((current) =>
        current.map((notification) => ({ ...notification, isRead: true })),
      );
      setUnreadCount(next.unreadCount);
      setNotice({
        status: "success",
        title: "Marked as read",
        description: "All notifications are now marked as read.",
      });
    } catch (error) {
      setNotice({
        status: "danger",
        title: "Unable to update notifications",
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setIsMarkingRead(false);
    }
  };

  const openNotification = async (notification: MobileNotification) => {
    if (!notification.isRead) {
      try {
        const next = await markNotificationsRead(
          [notification.id],
          session!.user.id,
          { identityUserId: accountContext?.identityUserId, accessRevision: accountContext?.accessRevision },
        );
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, isRead: true } : item,
          ),
        );
        setUnreadCount(next.unreadCount);
      } catch {
        // Navigation remains available even when the read-state request is offline.
      }
    }

    const destination = notificationDestinationFromNotification(notification);
    if (destination) router.push(destination as Href);
  };

  if (!isSessionLoading && !session) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <View className="flex-1 bg-background" style={{ width }}>
      <ChildAppBar
        title="Notifications"
        description={
          unreadCount > 0
            ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}`
            : "All caught up"
        }
        onBack={handleBack}
        rightActions={
          <Button
            size="icon"
            variant="ghost"
            className="rounded-full"
            accessibilityLabel="Notification settings"
            onPress={() => router.push("/notification-settings")}
          >
            <ButtonIcon as={Settings} height={19} width={19} />
          </Button>
        }
      />
      <SectionList
        className="bg-background"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: bottomPadding,
        }}
        sections={groups}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.35}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void refresh();
            }}
            tintColor={accentColor}
            colors={[accentColor]}
          />
        }
        ListHeaderComponent={
          <View className="mb-4 gap-3">
            <SearchField
              accessibilityLabel="Search notifications"
              onChangeText={setQuery}
              onClear={() => setQuery("")}
              placeholder="Search notifications"
              value={query}
            />
            <View className="flex-row gap-2" accessibilityRole="tablist">
              <Button
                size="sm"
                variant={!showUnreadOnly ? "default" : "outline"}
                accessibilityRole="tab"
                accessibilityState={{ selected: !showUnreadOnly }}
                onPress={() => setShowUnreadOnly(false)}
              >
                <ButtonText>All</ButtonText>
              </Button>
              <Button
                size="sm"
                variant={showUnreadOnly ? "default" : "outline"}
                accessibilityRole="tab"
                accessibilityState={{ selected: showUnreadOnly }}
                onPress={() => setShowUnreadOnly(true)}
              >
                <ButtonText>Unread</ButtonText>
              </Button>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-2"
              accessibilityRole="tablist"
              accessibilityLabel="Notification categories"
            >
              {categoryFilters.map((category) => {
                const selected = selectedCategory === category.value;
                return (
                  <Button
                    key={category.value ?? "all"}
                    size="sm"
                    variant={selected ? "secondary" : "outline"}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    onPress={() => setSelectedCategory(category.value)}
                  >
                    <ButtonText>{category.label}</ButtonText>
                  </Button>
                );
              })}
            </ScrollView>
            {isMultiAccount ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2" accessibilityLabel="Notification account filter"><Button size="sm" variant={!serviceAccountId ? "secondary" : "outline"} onPress={() => setServiceAccountId(null)}><ButtonText>All accounts</ButtonText></Button>{accountContext!.accounts.map((account) => <Button key={account.id} size="sm" variant={serviceAccountId === account.id ? "secondary" : "outline"} onPress={() => setServiceAccountId(account.id)}><ButtonText>{[account.accountNumber, account.registeredName].filter(Boolean).join(" · ")}</ButtonText></Button>)}</ScrollView> : null}
            {notice ? (
              <Alert
                variant={notice.status === "danger" ? "destructive" : "default"}
              >
                <View className="flex-1 gap-1">
                  <AlertText className="font-bold">{notice.title}</AlertText>
                  <AlertText>{notice.description}</AlertText>
                </View>
              </Alert>
            ) : null}
            <View className="flex-row items-center justify-between px-2">
              <Text className="text-sm text-muted-foreground">Updates</Text>
              <Button
                variant="ghost"
                size="sm"
                onPress={markAllRead}
                isDisabled={unreadCount === 0 || isMarkingRead}
                accessibilityLabel="Mark all notifications as read"
              >
                <ButtonIcon as={CheckCheck} height={16} width={16} />
                <ButtonText>{isMarkingRead ? "Marking..." : "Read"}</ButtonText>
              </Button>
            </View>
            {isLoading ? <LoadingState /> : null}
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              filtered={Boolean(
                query.trim() || showUnreadOnly || selectedCategory,
              )}
              onClear={() => {
                setQuery("");
                setShowUnreadOnly(false);
                setSelectedCategory(null);
              }}
              onExplore={() => router.replace("/home")}
            />
          ) : null
        }
        ListFooterComponent={
          isLoadingMore ? (
            <ActivityIndicator className="my-5" color={accentColor} />
          ) : null
        }
        renderSectionHeader={({ section }) => (
          <Text className="mb-2 ml-2 mt-1 text-sm font-semibold text-muted-foreground">
            {section.title}
          </Text>
        )}
        renderItem={({ item, index, section }) => (
          <View className={index === section.data.length - 1 ? "mb-5" : ""}>
            <ListSection>
              <NotificationRow
                notification={item}
                onOpen={openNotification}
                showDivider={false}
                showAccountLabel={isMultiAccount}
              />
            </ListSection>
            {index < section.data.length - 1 ? <View className="h-2" /> : null}
          </View>
        )}
      />
    </View>
  );
}
