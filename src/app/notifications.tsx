import { appScrollableBottomPadding } from "@/components/floating-app-bar";
import { statusBarHeight } from "@/constants";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationsRead,
  type MobileNotification,
} from "@/services/notifications";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Alert,
  Button,
  Label,
  ListGroup,
  SearchField,
  Separator,
  Skeleton,
  Surface,
  Typography,
  useThemeColor,
} from "heroui-native";
import {
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  FileText,
  Settings,
  Sparkles,
  Zap,
} from "lucide-react-native";
import { Fragment, useCallback, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Notice = {
  status: "danger" | "success";
  title: string;
  description: string;
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayDiff(value: string) {
  const today = startOfDay(new Date()).getTime();
  const target = startOfDay(new Date(value)).getTime();
  return Math.floor((today - target) / 86_400_000);
}

function groupTitle(value: string) {
  const diff = dayDiff(value);
  const day = new Date(value).getDay();
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff <= 7 && (day === 0 || day === 6)) return "Last weekend";
  if (diff <= 7) return "This week";
  if (diff <= 14) return "Last week";
  if (diff <= 31) return "Last month";
  return "Older";
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function severityTone(severity: string) {
  const normalized = severity.toLowerCase();
  if (normalized.includes("critical") || normalized.includes("high")) {
    return { label: severity, color: "#DC2626", backgroundColor: "#FEE2E2" };
  }
  if (normalized.includes("medium") || normalized.includes("moderate")) {
    return { label: severity, color: "#B45309", backgroundColor: "#FEF3C7" };
  }
  if (normalized.includes("low")) {
    return { label: severity, color: "#15803D", backgroundColor: "#DCFCE7" };
  }
  return { label: "Info", color: "#1769E0", backgroundColor: "#DBEAFE" };
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
}: {
  notification: MobileNotification;
}) {
  const [accentColor, mutedColor] = useThemeColor(["accent", "muted"]);
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
    </Text>
  );
}

function NotificationRow({
  notification,
  onOpen,
}: {
  notification: MobileNotification;
  onOpen: (notification: MobileNotification) => void;
}) {
  const [foregroundColor, mutedColor] = useThemeColor(["foreground", "muted"]);
  const tone = severityTone(notification.severity);
  const Icon = notification.entityType === "advisory" ? Zap : FileText;
  const actionLabel = notification.ticketId ? "View report" : null;

  return (
    <ListGroup.Item onPress={() => onOpen(notification)}>
      <ListGroup.ItemPrefix>
        <View
          className="h-11 w-11 items-center justify-center rounded-2xl"
          style={{ backgroundColor: tone.backgroundColor }}
        >
          <Icon size={19} color={tone.color} />
        </View>
      </ListGroup.ItemPrefix>
      <ListGroup.ItemContent>
        <View className="min-w-0">
          <View className="flex-row items-center gap-2">
            {!notification.isRead ? (
              <View className="h-2 w-2 rounded-full bg-accent" />
            ) : null}
            <ListGroup.ItemTitle numberOfLines={2}>
              {notification.title}
            </ListGroup.ItemTitle>
          </View>
          <NotificationDescription notification={notification} />
          <View className="mt-2 flex-row flex-wrap items-center gap-2">
            <View
              className="rounded-full px-2 py-1"
              style={{ backgroundColor: tone.backgroundColor }}
            >
              <Text
                style={{ color: tone.color }}
              >
                {tone.label}
              </Text>
            </View>
            <Typography type="body-xs" color="muted" weight="medium">
              {formatTime(notification.createdAt)}
            </Typography>
          </View>
          {actionLabel ? (
            <Button
              variant="secondary"
              size="sm"
              className="mt-3 self-start"
              onPress={() => onOpen(notification)}
            >
              <Button.Label>{actionLabel}</Button.Label>
            </Button>
          ) : null}
        </View>
      </ListGroup.ItemContent>
      <ListGroup.ItemSuffix>
        <ChevronRight
          size={18}
          color={notification.isRead ? mutedColor : foregroundColor}
        />
      </ListGroup.ItemSuffix>
    </ListGroup.Item>
  );
}

function EmptyState({ onExplore }: { onExplore: () => void }) {
  const [accentColor] = useThemeColor(["accent"]);
  return (
    <Surface className="items-center rounded-3xl p-6">
      <View className="h-14 w-14 items-center justify-center rounded-3xl bg-accent-soft">
        <Sparkles size={24} color={accentColor} />
      </View>
      <Typography.Heading type="h5" weight="bold" className="mt-4 text-center">
        No notifications yet
      </Typography.Heading>
      <Typography.Paragraph
        type="body-sm"
        color="muted"
        className="mt-2 text-center"
      >
        Report updates and power advisories will appear here.
      </Typography.Paragraph>
      <Button variant="primary" className="mt-5" onPress={onExplore}>
        <Button.Label>Explore home</Button.Label>
      </Button>
    </Surface>
  );
}

function LoadingState() {
  return (
    <View className="gap-3">
      <Skeleton className="h-20 rounded-3xl" />
      <Skeleton className="h-20 rounded-3xl" />
      <Skeleton className="h-20 rounded-3xl" />
    </View>
  );
}

export default function NotificationsRoute() {
  const router = useRouter();
  const { session, isLoading: isSessionLoading } = useAuthSession();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [accentColor, foregroundColor] = useThemeColor(["accent", "foreground"]);
  const [notifications, setNotifications] = useState<MobileNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const bottomPadding = appScrollableBottomPadding(insets.bottom);

  const load = useCallback(async () => {
    if (!session) {
      setIsLoading(false);
      return;
    }
    const next = await fetchNotifications();
    setNotifications(next.notifications);
    setUnreadCount(next.unreadCount);
    setIsLoading(false);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      void load().catch((error) => {
        setIsLoading(false);
        setNotice({
          status: "danger",
          title: "Unable to load notifications",
          description: error instanceof Error ? error.message : "Try again.",
        });
      });
    }, [load]),
  );

  const visibleNotifications = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return notifications;
    return notifications.filter((notification) =>
      searchableText(notification).includes(normalized),
    );
  }, [notifications, query]);

  const groups = useMemo(() => {
    const grouped = new Map<string, MobileNotification[]>();
    for (const notification of visibleNotifications) {
      const title = groupTitle(notification.createdAt);
      grouped.set(title, [...(grouped.get(title) ?? []), notification]);
    }
    return Array.from(grouped.entries());
  }, [visibleNotifications]);

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await load();
    } finally {
      setIsRefreshing(false);
    }
  };

  const markAllRead = async () => {
    setIsMarkingRead(true);
    try {
      const next = await markAllNotificationsRead();
      setNotifications(next.notifications);
      setUnreadCount(next.unreadCount);
      setNotice({
        status: "success",
        title: "Marked as read",
        description: "All visible notifications were cleared.",
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
      void markNotificationsRead([notification.id])
        .then((next) => {
          setNotifications(next.notifications);
          setUnreadCount(next.unreadCount);
        })
        .catch(() => undefined);
    }

    if (notification.ticketId) {
      router.push({
        pathname: "/complaints/[id]",
        params: { id: notification.ticketId },
      });
    }
  };

  if (!isSessionLoading && !session) {
    return (
      <View className="flex-1 justify-center bg-background px-5" style={{ width }}>
        <EmptyState onExplore={() => router.replace("/home")} />
      </View>
    );
  }

  return (
    <ScrollView
      className="bg-background"
      contentInsetAdjustmentBehavior="automatic"
      style={{ width }}
      contentContainerStyle={{
        flexGrow: 1,
        gap: 14,
        paddingHorizontal: 20,
        paddingTop: statusBarHeight + 18,
        paddingBottom: bottomPadding,
      }}
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
    >
      <View className="flex-row items-center justify-between">
        <Button
          isIconOnly
          variant="ghost"
          accessibilityLabel="Go back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/home"))}
        >
          <ChevronLeft size={22} color={foregroundColor} />
        </Button>
        <View className="flex-1 px-3">
          <Typography.Heading type="h2" weight="bold" className="text-center">
            Notifications
          </Typography.Heading>
          <Typography.Paragraph
            type="body-xs"
            color="muted"
            className="mt-1 text-center"
          >
            {unreadCount > 0 ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}` : "All caught up"}
          </Typography.Paragraph>
        </View>
        <Button
          isIconOnly
          variant="secondary"
          accessibilityLabel="Notification settings"
          onPress={() => router.push("/profile/push-notifications")}
        >
          <Settings size={19} color={foregroundColor} />
        </Button>
      </View>

      <SearchField value={query} onChange={setQuery}>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Search notifications" />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>

      {notice ? (
        <Alert status={notice.status}>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{notice.title}</Alert.Title>
            <Alert.Description>{notice.description}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <View className="flex-row items-center justify-between px-2">
        <Label className="text-sm text-muted">Updates</Label>
        <Button
          variant="ghost"
          size="sm"
          onPress={markAllRead}
          isDisabled={unreadCount === 0 || isMarkingRead}
          accessibilityLabel="Mark all notifications as read"
        >
          <CheckCheck size={16} color={accentColor} />
          <Button.Label>{isMarkingRead ? "Marking..." : "Read"}</Button.Label>
        </Button>
      </View>

      {isLoading ? <LoadingState /> : null}

      {!isLoading && visibleNotifications.length === 0 ? (
        <EmptyState onExplore={() => router.replace("/home")} />
      ) : null}

      {!isLoading && groups.length > 0 ? (
        <View className="gap-5">
          {groups.map(([title, items]) => (
            <View key={title} className="gap-2">
              <Label className="ml-2 text-sm font-semibold text-muted">
                {title}
              </Label>
              <ListGroup>
                {items.map((notification, index) => (
                  <Fragment key={notification.id}>
                    {index > 0 ? <Separator className="mx-4" /> : null}
                    <NotificationRow
                      notification={notification}
                      onOpen={openNotification}
                    />
                  </Fragment>
                ))}
              </ListGroup>
            </View>
          ))}
        </View>
      ) : null}

      {!isLoading && notifications.length > 0 ? (
        <Surface className="rounded-3xl p-4">
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-accent-soft">
              <Bell size={18} color={accentColor} />
            </View>
            <View className="flex-1">
              <Typography type="body-sm" weight="bold">
                Sound alerts are severity-based
              </Typography>
              <Typography.Paragraph type="body-xs" color="muted" className="mt-1">
                Critical, info, and routine notices use separate bundled sounds after the next native rebuild.
              </Typography.Paragraph>
            </View>
          </View>
        </Surface>
      ) : null}
    </ScrollView>
  );
}
