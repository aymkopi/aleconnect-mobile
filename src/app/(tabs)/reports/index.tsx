import { appScrollableBottomPadding } from "@/components/floating-app-bar";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { statusBarHeight } from "@/constants";
import {
  emptyComplaintMeta,
  type ComplaintMeta,
  type Report,
} from "@/features/reports/data";
import { ReportListGroup } from "@/features/reports/report-list";
import { useAppColors } from "@/hooks/use-app-colors";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useUnreadNotificationCount } from "@/hooks/use-unread-notification-count";
import { fetchComplaintMeta, fetchComplaintReports } from "@/services/reports";
import { isInManilaMonth, parseApiInstant } from "@/utils/manila-time";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  Plus,
} from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function ReportsSkeleton() {
  return (
    <View className="gap-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <View
          key={index}
          className="rounded-lg border border-border bg-card p-4"
        >
          <View className="flex-row gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <View className="flex-1 gap-2">
              <Skeleton className="h-3 w-24 rounded-full" />
              <Skeleton className="h-5 w-4/5 rounded-full" />
              <Skeleton className="h-3 w-3/5 rounded-full" />
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
  const bottomPadding = appScrollableBottomPadding(insets.bottom);
  const [accentColor] = useAppColors(["accent"]);
  const unreadCount = useUnreadNotificationCount();
  const { session } = useAuthSession();
  const [meta, setMeta] = useState<ComplaintMeta>(emptyComplaintMeta);
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadComplaints = useCallback(
    async (options?: { force?: boolean }) => {
      if (options?.force) {
        setIsRefreshing(true);
      } else if (!hasLoadedRef.current) {
        setIsLoading(true);
      }

      try {
        const [nextMeta, nextReports] = await Promise.all([
          fetchComplaintMeta(options),
          fetchComplaintReports({ ...options, userId: session?.user.id }),
        ]);
        setMeta(nextMeta);
        setReports(nextReports);
        setError(null);
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
    [session?.user.id],
  );

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      void loadComplaints();
    }, [loadComplaints]),
  );

  const monthReports = useMemo(
    () =>
      reports
        .filter((report) => isInManilaMonth(report.createdAt))
        .sort(
          (a, b) =>
            (parseApiInstant(b.createdAt)?.getTime() ?? Number.NEGATIVE_INFINITY) -
            (parseApiInstant(a.createdAt)?.getTime() ?? Number.NEGATIVE_INFINITY),
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
            getColor={(report) =>
              meta.categories.find((item) => item.id === report.categoryId)
                ?.color
            }
            onPress={openReport}
          />
        )}
      </ScrollView>
    </View>
  );
}
