import { appScrollableBottomPadding } from "@/components/floating-app-bar";
import { Button, ButtonIcon } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { statusBarHeight } from "@/constants";
import {
  formatReportDate,
  formatStatus,
  type ReportDetail,
  type ReportHistoryItem,
} from "@/features/complaints/data";
import { ReportStatusBadge } from "@/features/complaints/report-list";
import { useAppColors } from "@/hooks/use-app-colors";
import { fetchComplaintReportDetail } from "@/services/complaints";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { CalendarClock, ChevronLeft, FileText, Image as ImageIcon, MapPin } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import {
  Image,
  RefreshControl,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;

  return (
    <View className="border-border border-t pt-3">
      <Text className="text-xs font-bold text-muted-foreground">
        {label}
      </Text>
      <Text className="mt-1 text-sm font-semibold text-foreground">
        {value}
      </Text>
    </View>
  );
}

function TimelineItem({
  item,
  isLast,
}: {
  item: ReportHistoryItem;
  isLast: boolean;
}) {
  const [accentColor] = useAppColors(["accent"]);

  return (
    <View className="flex-row gap-3">
      <View className="items-center">
        <View
          className="h-4 w-4 rounded-full"
          style={{ backgroundColor: accentColor }}
        />
        {!isLast ? <View className="w-0.5 flex-1 bg-border" /> : null}
      </View>
      <View className="flex-1 pb-5">
        <Text className="text-sm font-bold text-foreground">
          {item.fromStatus
            ? `${formatStatus(item.fromStatus)} to ${formatStatus(item.toStatus)}`
            : formatStatus(item.toStatus)}
        </Text>
        <Text className="mt-1 text-xs font-medium text-muted-foreground">
          {formatReportDate(item.changedAt)}
        </Text>
        {item.note ? (
          <Text className="mt-2 text-sm text-muted-foreground">
            {item.note}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function DetailSkeleton() {
  return (
    <View className="gap-4">
      <View className="rounded-lg border border-border bg-card p-5">
        <Skeleton className="h-4 w-28 rounded-full" />
        <Skeleton className="mt-3 h-8 w-3/4 rounded-full" />
        <Skeleton className="mt-4 h-20 w-full rounded-2xl" />
      </View>
      <View className="rounded-lg border border-border bg-card p-5">
        <Skeleton className="h-5 w-32 rounded-full" />
        <Skeleton className="mt-4 h-28 w-full rounded-2xl" />
      </View>
    </View>
  );
}

export default function ComplaintDetailRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView | null>(null);
  const bottomPadding = appScrollableBottomPadding(insets.bottom);
  const [accentColor] = useAppColors(["accent"]);
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadReport = useCallback(
    async (options?: { refreshing?: boolean }) => {
      if (!id) return;
      if (options?.refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        setReport(await fetchComplaintReportDetail(id));
        setError(null);
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Failed to load report.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [id],
  );

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      void loadReport();
    }, [loadReport]),
  );

  const address = report
    ? [
        report.purok,
        report.barangayName ?? report.barangayPsgc,
        report.municipalityName,
        report.landmark,
      ]
        .filter(Boolean)
        .join(", ")
    : "";
  const coordinates =
    report?.latitude != null && report.longitude != null
      ? `${report.latitude.toFixed(6)}, ${report.longitude.toFixed(6)}`
      : null;
  const timeline =
    report && report.history.length > 0
      ? report.history
      : report
        ? [
            {
              id: "created",
              fromStatus: null,
              toStatus: report.status,
              note: "Report received.",
              changedAt: report.createdAt,
            },
          ]
        : [];

  return (
    <View className="flex-1 bg-background" style={{ width }}>
      <ScrollView
        ref={scrollRef}
        className="bg-background"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: 20,
          gap: 16,
          paddingBottom: bottomPadding,
          paddingTop: statusBarHeight + 18,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadReport({ refreshing: true })}
            tintColor={accentColor}
            colors={[accentColor]}
          />
        }
      >
        <View className="flex-row items-center gap-3">
          <Button
            size="icon"
            variant="secondary"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/complaints")
            }
            accessibilityLabel="Back to reports"
          >
            <ButtonIcon as={ChevronLeft} height={21} width={21} />
          </Button>
          <View className="flex-1">
            <Heading size="xl">
              Ticket details
            </Heading>
            <Text className="text-xs font-medium text-muted-foreground">
              Necessary report updates only.
            </Text>
          </View>
        </View>

        {error ? (
          <Text className="text-sm text-destructive">
            {error}
          </Text>
        ) : null}

        {isLoading || !report ? (
          <DetailSkeleton />
        ) : (
          <>
            <View className="items-center rounded-lg border border-border bg-card p-6">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-accent/15">
                <FileText size={26} color={accentColor} />
              </View>
              <Text className="mt-4 text-xs font-bold text-muted-foreground">
                Reference number
              </Text>
              <Heading className="mt-1 text-center text-primary" size="lg">
                {report.ticketNumber}
              </Heading>
              <Text className="mt-3 text-center text-sm text-muted-foreground">
                {report.title}
              </Text>
              <View className="mt-4">
                <ReportStatusBadge status={report.status} />
              </View>
            </View>

            <View className="gap-3 rounded-lg border border-border bg-card p-5">
              <View className="flex-row items-center gap-2">
                <CalendarClock size={18} color={accentColor} />
                <Heading size="sm">
                  Report
                </Heading>
              </View>
              <DetailRow label="Type" value={report.typeTitle} />
              <DetailRow label="Submitted" value={formatReportDate(report.createdAt)} />
              <DetailRow label="Description" value={report.description} />
              <DetailRow label="Action desired" value={report.actionDesired} />
              <DetailRow label="Address" value={address} />
              <DetailRow label="Coordinates" value={coordinates} />
            </View>

            <View className="rounded-lg border border-border bg-card p-5">
              <View className="flex-row items-center gap-2">
                <MapPin size={18} color={accentColor} />
                <Heading size="sm">
                  Timeline
                </Heading>
              </View>
              <View className="mt-4">
                {timeline.map((item, index) => (
                  <TimelineItem
                    key={item.id}
                    item={item}
                    isLast={index === timeline.length - 1}
                  />
                ))}
              </View>
            </View>

            {report.imageUrls && report.imageUrls.length > 0 ? (
              <View className="rounded-lg border border-border bg-card p-5">
                <View className="flex-row items-center gap-2">
                  <ImageIcon size={18} color={accentColor} />
                  <Heading size="sm">
                    Evidence
                  </Heading>
                </View>
                <View className="mt-4 flex-row gap-2">
                  {report.imageUrls.slice(0, 3).map((url) => (
                    <Image
                      key={url}
                      source={{ uri: url }}
                      className="h-24 flex-1 rounded-2xl bg-surface-secondary"
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}
