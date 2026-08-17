import { appScrollableBottomPadding } from "@/components/floating-app-bar";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { statusBarHeight } from "@/constants";
import { type Report } from "@/features/reports/data";
import { ReportListGroup } from "@/features/reports/report-list";
import { useAppColors } from "@/hooks/use-app-colors";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useUnreadNotificationCount } from "@/hooks/use-unread-notification-count";
import {
  hasPendingReportRevalidation,
  subscribeReportRevalidationRequested,
  subscribeReportStatusChanged,
} from "@/services/report-sync-events";
import { fetchComplaintReportPage } from "@/services/reports";
import { isInManilaMonth, parseApiInstant } from "@/utils/manila-time";
import { useFocusEffect, useRouter } from "expo-router";
import { Bell, CalendarDays, ChevronRight, Plus } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type LoadComplaintOptions = {
  force?: boolean;
  revalidate?: boolean;
};

function ReportsSkeleton() {
  return (
    <View className="gap-2">
      {Array.from({ length: 3 }).map((_, index) => (
        <View
          key={index}
          className="rounded-lg border border-border bg-card px-4 py-3"
        >
          <View className="gap-2">
            <View className="flex-row items-center justify-between gap-3">
              <Skeleton className="h-3 w-24 rounded-sm" />
              <Skeleton className="h-6 w-16 rounded-md" />
            </View>

            <Skeleton className="h-5 w-3/5 rounded-sm" />

            <View className="gap-1">
              <Skeleton className="h-3 w-32 rounded-sm" />
              <Skeleton className="h-3 w-4/5 rounded-sm" />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function ComplaintsRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView | null>(null);
  const hasLoadedRef = useRef(false);
  const loadGenerationRef = useRef(0);
  const loadComplaintsRef = useRef<
    (options?: LoadComplaintOptions) => Promise<void>
  >(async () => undefined);
  const bottomPadding = appScrollableBottomPadding(insets.bottom);
  const [accentColor] = useAppColors(["accent"]);
  const unreadCount = useUnreadNotificationCount();
  const { session } = useAuthSession();
  const userId = session?.user.id;
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadComplaints = useCallback(
    async (options?: LoadComplaintOptions) => {
      const generation = ++loadGenerationRef.current;
      if (options?.force) {
        setIsRefreshing(true);
      } else if (!hasLoadedRef.current && !options?.revalidate) {
        setIsLoading(true);
      }

      try {
        const page = await fetchComplaintReportPage({
          force: options?.force,
          revalidate: options?.revalidate,
          userId,
        });

        if (generation !== loadGenerationRef.current) {
          return;
        }

        setReports(page.reports);
        setError(null);

        if (page.isStale && !options?.revalidate && !options?.force) {
          queueMicrotask(() => {
            void loadComplaintsRef.current({ revalidate: true });
          });
        }
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Failed to load reports.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        hasLoadedRef.current = true;
      }
    },
    [userId],
  );

  useEffect(() => {
    loadComplaintsRef.current = loadComplaints;
  }, [loadComplaints]);

  useEffect(() => {
    if (!userId) return;

    const unsubscribeStatus = subscribeReportStatusChanged((event) => {
      if (event.userId !== userId) return;
      setReports((current) =>
        current.map((report) =>
          report.id === event.ticketId
            ? { ...report, status: event.status }
            : report,
        ),
      );
    });

    const unsubscribeRevalidation = subscribeReportRevalidationRequested(
      (changedUserId) => {
        if (changedUserId !== userId) return;
        void loadComplaintsRef.current({ revalidate: true });
      },
    );

    return () => {
      unsubscribeStatus();
      unsubscribeRevalidation();
    };
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({
        y: 0,
        animated: false,
      });

      const mustRevalidate = userId
        ? hasPendingReportRevalidation(userId)
        : false;

      void loadComplaintsRef.current(
        mustRevalidate ? { revalidate: true } : undefined,
      );
    }, [userId]),
  );

  const monthReports = useMemo(
    () =>
      reports
        .filter((report) => isInManilaMonth(report.createdAt))
        .sort(
          (a, b) =>
            (parseApiInstant(b.createdAt)?.getTime() ??
              Number.NEGATIVE_INFINITY) -
            (parseApiInstant(a.createdAt)?.getTime() ??
              Number.NEGATIVE_INFINITY),
        ),
    [reports],
  );

  const openReport = (report: Report) => {
    router.push({ pathname: "/report/[id]", params: { id: report.id } });
  };

  return (
    <View className="flex-1 bg-background" style={{ width }}>
      <ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="automatic"
        className="bg-background"
        contentContainerStyle={{
          paddingHorizontal: 20,
          gap: 16,
          paddingBottom: bottomPadding,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadComplaints({ force: true })}
            tintColor={accentColor}
            colors={[accentColor]}
          />
        }
      >
        <View
          className="rounded-b-xl bg-accent"
          style={{
            marginHorizontal: -20,
            minHeight: 200,
            padding: 22,
            paddingTop: statusBarHeight + 24,
            justifyContent: "space-between",
          }}
        >
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Heading className="text-white" size="2xl">
                Reports
              </Heading>
              <Text className="mt-1 text-sm font-medium text-white/85">
                File reports and track active service tickets.
              </Text>
            </View>
            <View className="flex-row gap-1">
              <Button
                className="relative rounded-full"
                size="icon"
                variant="ghost"
                accessibilityLabel="Notifications"
                onPress={() => router.push("/notifications")}
              >
                <ButtonIcon
                  as={Bell}
                  className="text-white"
                  height={21}
                  width={21}
                />
                {unreadCount > 0 ? (
                  <View className="absolute -right-1 -top-1 min-h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1">
                    <Text className="text-xs font-bold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Text>
                  </View>
                ) : null}
              </Button>
            </View>
          </View>

          <View className="flex-row items-end justify-between gap-3">
            <View className="flex-row gap-3">
              <View className="rounded-lg bg-white/15 px-4 py-3">
                <Text className="text-xs font-bold text-white/75">
                  This month
                </Text>
                <Heading className="text-white" size="lg">
                  {monthReports.length}
                </Heading>
              </View>
              <View className="rounded-lg bg-white/15 px-4 py-3">
                <Text className="text-xs font-bold text-white/75">
                  All reports
                </Text>
                <Heading className="text-white" size="lg">
                  {reports.length}
                </Heading>
              </View>
            </View>
            <Button
              variant="secondary"
              onPress={() => router.push("/reports/new")}
              size="default"
            >
              <ButtonIcon as={Plus} height={16} width={16} />
              <ButtonText>New</ButtonText>
            </Button>
          </View>
        </View>

        <View className="flex-row items-center justify-between">
          <View>
            <Heading size="md">Recent this month</Heading>
            <Text className="text-xs font-medium text-muted-foreground">
              Latest reports only. Full history lives in archive.
            </Text>
          </View>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => router.push("/reports/list")}
          >
            <ButtonText>Archive</ButtonText>
            <ButtonIcon as={ChevronRight} height={16} width={16} />
          </Button>
        </View>

        {error ? (
          <Text className="text-sm text-destructive">{error}</Text>
        ) : null}

        {isLoading ? (
          <ReportsSkeleton />
        ) : monthReports.length === 0 ? (
          <View className="items-center rounded-lg border border-border bg-card p-6">
            <CalendarDays size={28} color={accentColor} />
            <Heading className="mt-3 text-center" size="sm">
              No reports this month
            </Heading>
            <Text className="mt-1 text-center text-sm text-muted-foreground">
              Your submitted reports and saved drafts will appear here.
            </Text>
          </View>
        ) : (
          <ReportListGroup
            reports={monthReports.slice(0, 5)}
            onPress={openReport}
          />
        )}
      </ScrollView>
    </View>
  );
}
