import { appScrollableBottomPadding } from "@/components/floating-app-bar";
import { statusBarHeight } from "@/constants";
import {
  emptyComplaintMeta,
  type ComplaintMeta,
  type Report,
} from "@/features/complaints/data";
import { ReportListGroup } from "@/features/complaints/report-list";
import {
  fetchComplaintMeta,
  fetchComplaintReports,
} from "@/services/complaints";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Button,
  Skeleton,
  Surface,
  Typography,
  useThemeColor,
} from "heroui-native";
import { Bell, CalendarDays, ChevronRight, FileText, Plus } from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function isThisMonth(value: string) {
  const date = new Date(value);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

function ReportsSkeleton() {
  return (
    <View className="gap-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Surface key={index} className="rounded-3xl p-4">
          <View className="flex-row gap-3">
            <Skeleton className="h-12 w-12 rounded-2xl" />
            <View className="flex-1 gap-2">
              <Skeleton className="h-3 w-24 rounded-full" />
              <Skeleton className="h-5 w-4/5 rounded-full" />
              <Skeleton className="h-3 w-3/5 rounded-full" />
            </View>
          </View>
        </Surface>
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
  const [accentColor] = useThemeColor(["accent"]);
  const [meta, setMeta] = useState<ComplaintMeta>(emptyComplaintMeta);
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadComplaints = useCallback(async (options?: { force?: boolean }) => {
    if (options?.force) {
      setIsRefreshing(true);
    } else if (!hasLoadedRef.current) {
      setIsLoading(true);
    }

    try {
      const [nextMeta, nextReports] = await Promise.all([
        fetchComplaintMeta(options),
        fetchComplaintReports(options),
      ]);
      setMeta(nextMeta);
      setReports(nextReports);
      setError(null);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Failed to load complaints.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      hasLoadedRef.current = true;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      void loadComplaints();
    }, [loadComplaints]),
  );

  const monthReports = useMemo(
    () =>
      reports
        .filter((report) => isThisMonth(report.createdAt))
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    [reports],
  );

  const openReport = (report: Report) => {
    router.push({ pathname: "/complaints/[id]", params: { id: report.id } });
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
          className="bg-accent rounded-b-[28px]"
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
              <Typography.Heading type="h1" weight="bold" className="text-white">
                Complaints
              </Typography.Heading>
              <Typography.Paragraph
                type="body-sm"
                weight="medium"
                className="mt-1 text-white/85"
              >
                File reports and track active service tickets.
              </Typography.Paragraph>
            </View>
            <Button
              isIconOnly
              variant="ghost"
              accessibilityLabel="Notifications"
            >
              <Bell size={21} color="white" />
              <View className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-danger" />
            </Button>
          </View>

          <View className="flex-row items-end justify-between gap-3">
            <View className="flex-row gap-3">
              <Surface className="rounded-3xl bg-white/15 px-4 py-3">
                <Typography type="body-xs" weight="bold" className="text-white/75">
                  This month
                </Typography>
                <Typography.Heading type="h3" weight="bold" className="text-white">
                  {monthReports.length}
                </Typography.Heading>
              </Surface>
              <Surface className="rounded-3xl bg-white/15 px-4 py-3">
                <Typography type="body-xs" weight="bold" className="text-white/75">
                  All reports
                </Typography>
                <Typography.Heading type="h3" weight="bold" className="text-white">
                  {reports.length}
                </Typography.Heading>
              </Surface>
            </View>
            <Button variant="secondary" onPress={() => router.push("/complaints/new")} size="sm">
              <Plus size={16} color={accentColor} />
              <Button.Label>New</Button.Label>
            </Button>
          </View>
        </View>

        <View className="flex-row items-center justify-between">
          <View>
            <Typography.Heading type="h4" weight="bold">
              Recent this month
            </Typography.Heading>
            <Typography type="body-xs" color="muted" weight="medium">
              Latest reports only. Full history lives in archive.
            </Typography>
          </View>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => router.push("/complaints/list")}
          >
            <Button.Label>View all</Button.Label>
            <ChevronRight size={16} color={accentColor} />
          </Button>
        </View>

        {error ? (
          <Typography.Paragraph type="body-sm" className="text-danger">
            {error}
          </Typography.Paragraph>
        ) : null}

        {isLoading ? (
          <ReportsSkeleton />
        ) : monthReports.length === 0 ? (
          <Surface className="items-center rounded-3xl p-6">
            <CalendarDays size={28} color={accentColor} />
            <Typography.Heading type="h6" weight="bold" align="center" className="mt-3">
              No reports this month
            </Typography.Heading>
            <Typography.Paragraph type="body-sm" color="muted" align="center" className="mt-1">
              Older tickets are still available in your report archive.
            </Typography.Paragraph>
            <Button
              variant="secondary"
              className="mt-4"
              onPress={() => router.push("/complaints/list")}
            >
              <FileText size={16} color={accentColor} />
              <Button.Label>Open archive</Button.Label>
            </Button>
          </Surface>
        ) : (
          <ReportListGroup
            reports={monthReports.slice(0, 5)}
            getColor={(report) =>
              meta.categories.find((item) => item.id === report.categoryId)?.color
            }
            onPress={openReport}
          />
        )}
      </ScrollView>
    </View>
  );
}
