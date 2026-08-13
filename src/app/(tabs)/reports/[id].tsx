import { ChildAppBar } from "@/components/child-app-bar";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Pressable } from "@/components/ui/pressable";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { StaticLocationMap } from "@/features/maps/static-location-map";
import { EvidencePhotoViewer } from "@/features/reports/components/evidence-photo-viewer";
import {
  formatReportDate,
  formatStatus,
  shouldDisplayConsumerMessageOnTimelineItem,
  type ReportDetail,
  type ReportHistoryItem,
} from "@/features/reports/data";
import { ReportStatusBadge } from "@/features/reports/report-list";
import { ExtendedOutageStatusCard } from "@/features/reports/extended-outage-status-card";
import { useAppColors } from "@/hooks/use-app-colors";
import { fetchComplaintReportDetail } from "@/services/reports";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  CalendarClock,
  Check,
  Copy,
  FileText,
  Image as ImageIcon,
  MapPin,
  RefreshCw,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
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
      <Text className="text-xs font-bold text-muted-foreground">{label}</Text>
      <Text className="mt-1 text-sm font-semibold text-foreground">{value}</Text>
    </View>
  );
}

function TimelineItem({
  item,
  isLast,
  consumerMessage,
}: {
  item: ReportHistoryItem;
  isLast: boolean;
  consumerMessage: string | null;
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
          {formatStatus(item.toStatus)}
        </Text>
        <Text className="mt-1 text-xs font-medium text-muted-foreground">
          {formatReportDate(item.changedAt)}
        </Text>
        {item.note ? (
          <Text className="mt-2 text-sm text-muted-foreground">{item.note}</Text>
        ) : null}
        {shouldDisplayConsumerMessageOnTimelineItem(item.toStatus, consumerMessage) ? (
          <View className="mt-3 rounded-md border border-border bg-secondary/40 p-3">
            <Text className="text-xs font-bold text-muted-foreground">Service Memo update</Text>
            <Text className="mt-1 text-sm text-foreground">{consumerMessage}</Text>
          </View>
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
        <Skeleton className="mt-4 h-20 w-full rounded-xl" />
      </View>
      <View className="rounded-lg border border-border bg-card p-5">
        <Skeleton className="h-5 w-32 rounded-full" />
        <Skeleton className="mt-4 h-28 w-full rounded-xl" />
      </View>
    </View>
  );
}

export default function ReportDetailRoute() {
  const router = useRouter();
  const { id, focus } = useLocalSearchParams<{ id: string; focus?: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView | null>(null);
  const hasLoadedRef = useRef(false);
  const evidenceRefreshAttemptedRef = useRef(false);
  const bottomPadding = Math.max(insets.bottom, 16) + 20;
  const [accentColor] = useAppColors(["accent"]);
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [viewerPhotoIndex, setViewerPhotoIndex] = useState<number | null>(null);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [notificationFocus, setNotificationFocus] = useState(false);

  useEffect(() => {
    if (focus !== "notification") return;
    setNotificationFocus(true);
    const timeout = setTimeout(() => {
      setNotificationFocus(false);
      router.setParams({ focus: undefined });
    }, 2500);
    return () => clearTimeout(timeout);
  }, [focus, router]);

  const loadReport = useCallback(
    async (options?: { refreshing?: boolean }) => {
      if (!id) return;
      if (options?.refreshing) {
        setIsRefreshing(true);
      } else if (!hasLoadedRef.current) {
        setIsLoading(true);
      }

      try {
        const nextReport = await fetchComplaintReportDetail(id);
        setReport(nextReport);
        hasLoadedRef.current = true;
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

  const refreshEvidenceOnce = useCallback(async () => {
    if (!id || evidenceRefreshAttemptedRef.current) return;
    evidenceRefreshAttemptedRef.current = true;
    try {
      setReport(
        await fetchComplaintReportDetail(id, { refreshEvidence: true }),
      );
      setEvidenceError(null);
    } catch {
      setEvidenceError("Evidence photos could not be refreshed. Try again.");
    }
  }, [id]);

  useEffect(() => {
    hasLoadedRef.current = false;
    evidenceRefreshAttemptedRef.current = false;
  }, [id]);

  useEffect(() => {
    if (
      report?.imageUrlsExpiresAt &&
      Date.parse(report.imageUrlsExpiresAt) <= Date.now()
    ) {
      void refreshEvidenceOnce();
    }
  }, [refreshEvidenceOnce, report?.imageUrlsExpiresAt]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/reports");
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      void loadReport();
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          handleBack();
          return true;
        },
      );
      return () => subscription.remove();
    }, [handleBack, loadReport]),
  );

  const address = report
    ? [
        report.purok,
        report.barangayName,
        report.municipalityName,
        report.landmark,
      ]
        .filter(Boolean)
        .join(", ")
    : "";
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
  const evidencePhotos = (report?.imageUrls ?? []).map((uri, index) => ({
    id: `evidence-${index}`,
    uri,
    status: "ready" as const,
  }));

  const copyReference = async () => {
    if (!report) return;
    await Clipboard.setStringAsync(report.ticketNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1_500);
  };

  return (
    <View className="flex-1 bg-background" style={{ width }}>
      <ChildAppBar
        title="Report details"
        description="Status, location, evidence, and updates"
        onBack={handleBack}
      />
      <ScrollView
        ref={scrollRef}
        className="bg-background"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: 20,
          gap: 16,
          paddingBottom: bottomPadding,
          paddingTop: 8,
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
        {error && report ? (
          <Text className="text-sm text-destructive">{error}</Text>
        ) : null}
        {isLoading ? (
          <DetailSkeleton />
        ) : !report ? (
          <View className="items-center rounded-lg border border-border bg-card p-6">
            <Heading size="sm">Report could not be loaded</Heading>
            <Text className="mt-2 text-center text-sm text-muted-foreground">
              {error ?? "Check your connection and try again."}
            </Text>
            <Button
              className="mt-4 rounded-full"
              onPress={() => void loadReport()}
              accessibilityLabel="Retry loading report"
            >
              <ButtonIcon as={RefreshCw} height={18} width={18} />
              <ButtonText>Retry</ButtonText>
            </Button>
          </View>
        ) : (
          <>
            <View className={`items-center rounded-lg border border-border bg-card p-6 ${notificationFocus ? "ring-2 ring-primary/60" : ""}`}>
              <View className="h-14 w-14 items-center justify-center rounded-full bg-accent/15">
                <FileText size={26} color={accentColor} />
              </View>
              <Text className="mt-4 text-xs font-bold text-muted-foreground">
                Reference number
              </Text>
              <View className="mt-1 flex-row items-center gap-1">
                <Heading className="text-center text-primary" size="lg">
                  {report.ticketNumber}
                </Heading>
                <Button
                  size="icon"
                  variant="ghost"
                  className="rounded-full"
                  accessibilityLabel={
                    copied ? "Reference number copied" : "Copy reference number"
                  }
                  onPress={() => void copyReference()}
                >
                  <ButtonIcon
                    as={copied ? Check : Copy}
                    height={17}
                    width={17}
                  />
                </Button>
              </View>
              <Text className="mt-3 text-center text-sm text-muted-foreground">
                {report.title}
              </Text>
              <Text className="mt-4 text-xs font-bold text-muted-foreground">
                Report status
              </Text>
              <View className="mt-2">
                <ReportStatusBadge status={report.status} />
              </View>
            </View>

            <View className="gap-3 rounded-lg border border-border bg-card p-5">
              <View className="flex-row items-center gap-2">
                <CalendarClock size={18} color={accentColor} />
                <Heading size="sm">Report information</Heading>
              </View>
              <DetailRow label="Category" value={report.categoryTitle} />
              <DetailRow label="Type" value={report.typeTitle} />
              <DetailRow
                label="Submitted"
                value={formatReportDate(report.createdAt)}
              />
              <DetailRow
                label="Category details"
                value={report.reportDetails?.categoryDescription}
              />
              <DetailRow
                label="Report type details"
                value={report.reportDetails?.typeDescription}
              />
              <DetailRow
                label="Current registered name"
                value={
                  report.reportDetails?.kwhmTransfer?.currentRegisteredName
                }
              />
              <DetailRow
                label="Requested registered name"
                value={
                  report.reportDetails?.kwhmTransfer?.requestedRegisteredName
                }
              />
              {!report.reportDetails ? (
                <DetailRow label="Description" value={report.description} />
              ) : null}
              <DetailRow label="Action desired" value={report.actionDesired} />
              <DetailRow label="Location" value={address} />
            </View>

            {report.latitude != null && report.longitude != null ? (
              <View className="gap-3 rounded-lg border border-border bg-card p-5">
                <View className="flex-row items-center gap-2">
                  <MapPin size={18} color={accentColor} />
                  <Heading size="sm">Reported location</Heading>
                </View>
                <StaticLocationMap
                  latitude={report.latitude}
                  longitude={report.longitude}
                  label={address || "reported location"}
                />
              </View>
            ) : null}

            {report.imageUrls && report.imageUrls.length > 0 ? (
              <View className="rounded-lg border border-border bg-card p-5">
                <View className="flex-row items-center gap-2">
                  <ImageIcon size={18} color={accentColor} />
                  <Heading size="sm">Evidence</Heading>
                </View>
                <Text className="mt-1 text-sm text-muted-foreground">
                  Photos attached when this report was submitted.
                </Text>
                <View className="mt-4 flex-row gap-2">
                  {report.imageUrls.slice(0, 3).map((url, index) => (
                    <Pressable
                      key={url}
                      className="h-28 flex-1 rounded-lg bg-secondary"
                      onPress={() => setViewerPhotoIndex(index)}
                      accessibilityRole="button"
                      accessibilityLabel={`View evidence photo ${index + 1}`}
                    >
                      <Image
                        source={{ uri: url }}
                        cachePolicy="memory-disk"
                        contentFit="cover"
                        style={{ width: "100%", height: "100%", borderRadius: 8 }}
                        onError={() => {
                          if (evidenceRefreshAttemptedRef.current) {
                            setEvidenceError("An evidence photo could not be loaded.");
                          } else {
                            void refreshEvidenceOnce();
                          }
                        }}
                      />
                    </Pressable>
                  ))}
                </View>
                {evidenceError ? (
                  <Text className="mt-3 text-sm text-destructive">
                    {evidenceError}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <ExtendedOutageStatusCard updates={report.publicUpdates ?? []} />

            <View className="rounded-lg border border-border bg-card p-5">
              <View className="flex-row items-center gap-2">
                <CalendarClock size={18} color={accentColor} />
                <Heading size="sm">Updates</Heading>
              </View>
              <View className="mt-4">
                {timeline.map((item, index) => (
                  <TimelineItem
                    key={item.id}
                    item={item}
                    isLast={index === timeline.length - 1}
                    consumerMessage={report.consumerMessage}
                  />
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
      <EvidencePhotoViewer
        photos={evidencePhotos}
        initialIndex={viewerPhotoIndex ?? 0}
        open={viewerPhotoIndex != null}
        onClose={() => setViewerPhotoIndex(null)}
      />
    </View>
  );
}
