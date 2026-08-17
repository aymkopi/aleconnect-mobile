import { ChildAppBar } from "@/components/child-app-bar";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { ListSection, ListSectionItem } from "@/components/ui/list-section";
import { Menu, MenuItem, MenuItemLabel } from "@/components/ui/menu";
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/modal";
import { SearchField } from "@/components/ui/search-field";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useReportQueue } from "@/context/report-queue-context";
import {
  emptyComplaintMeta,
  formatComplaintCategoryTitle,
  formatReportDate,
  type ComplaintMeta,
  type Report,
} from "@/features/reports/data";
import { ReportListGroup } from "@/features/reports/report-list";
import { useAppColors } from "@/hooks/use-app-colors";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { ReportQueueItem } from "@/services/report-queue";
import {
  subscribeReportRevalidationRequested,
  subscribeReportStatusChanged,
} from "@/services/report-sync-events";
import {
  fetchComplaintMeta,
  fetchComplaintReportPage,
  type ComplaintReportSort,
} from "@/services/reports";
import { formatManilaWeekRange, manilaWeekStartKey } from "@/utils/manila-time";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ArrowDownNarrowWide,
  Check,
  Clock3,
  CloudOff,
  Copy,
  Filter,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  RefreshControl,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ArchiveRow =
  | { kind: "week"; key: string; title: string }
  | { kind: "report"; key: string; report: Report };

function queuedReportStatus(item: ReportQueueItem) {
  if (item.status === "submitting") {
    return { label: "Sending now", Icon: RefreshCw, tone: "accent" as const };
  }
  if (item.status === "failed") {
    return {
      label: "Needs attention",
      Icon: CloudOff,
      tone: "danger" as const,
    };
  }
  return { label: "Waiting to submit", Icon: Clock3, tone: "muted" as const };
}

function ArchiveSkeleton() {
  return (
    <View className="gap-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <View
          key={index}
          className="rounded-xl border border-border bg-card p-4"
        >
          <View className="flex-row gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <View className="flex-1 gap-2">
              <Skeleton className="h-3 w-20 rounded-full" />
              <Skeleton className="h-5 w-4/5 rounded-full" />
              <Skeleton className="h-3 w-2/3 rounded-full" />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function ReportArchiveRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<ArchiveRow> | null>(null);
  const hasLoadedRef = useRef(false);
  const queueSnapshotRef = useRef<string | null>(null);
  const loadGenerationRef = useRef(0);
  const [accentColor, mutedColor, dangerColor] = useAppColors([
    "accent",
    "muted",
    "danger",
  ]);
  const { session } = useAuthSession();
  const userId = session?.user.id;
  const {
    items: queuedItems,
    isSyncing,
    sync,
    retry,
    remove,
  } = useReportQueue();
  const [meta, setMeta] = useState<ComplaintMeta>(emptyComplaintMeta);
  const [reports, setReports] = useState<Report[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [sortMode, setSortMode] = useState<ComplaintReportSort>("newest");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discardItem, setDiscardItem] = useState<ReportQueueItem | null>(null);

  const loadReports = useCallback(
    async (options?: {
      force?: boolean;
      revalidate?: boolean;
      append?: boolean;
      cursor?: string | null;
    }) => {
      if (!userId) return;
      const append = Boolean(options?.append);
      const generation = append
        ? loadGenerationRef.current
        : ++loadGenerationRef.current;
      if (append) setIsLoadingMore(true);
      else if (options?.force) setIsRefreshing(true);
      else if (!options?.revalidate) setIsLoading(true);

      try {
        const [nextMeta, page] = await Promise.all([
          append
            ? Promise.resolve(null)
            : fetchComplaintMeta(options?.force ? { force: true } : undefined),
          fetchComplaintReportPage({
            userId,
            force: options?.force,
            revalidate: options?.revalidate,
            cursor: options?.cursor,
            query,
            categoryId,
            sort: sortMode,
          }),
        ]);
        if (generation !== loadGenerationRef.current) return;
        if (nextMeta) setMeta(nextMeta);
        setReports((current) =>
          append
            ? [
                ...current,
                ...page.reports.filter(
                  (report) =>
                    !current.some((existing) => existing.id === report.id),
                ),
              ]
            : page.reports,
        );
        setNextCursor(page.nextCursor);
        setIsStale(Boolean(page.isStale));
        setError(null);
        if (
          page.isStale &&
          !options?.revalidate &&
          !options?.force &&
          !append
        ) {
          queueMicrotask(() => {
            void loadReportsRef.current({ revalidate: true });
          });
        }
      } catch (nextError) {
        if (generation !== loadGenerationRef.current) return;
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Failed to load reports.",
        );
      } finally {
        if (generation !== loadGenerationRef.current) return;
        hasLoadedRef.current = true;
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [categoryId, query, sortMode, userId],
  );
  const loadReportsRef = useRef(loadReports);
  useEffect(() => {
    loadReportsRef.current = loadReports;
  }, [loadReports]);

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
        void loadReportsRef.current({ revalidate: true });
      },
    );

    return () => {
      unsubscribeStatus();
      unsubscribeRevalidation();
    };
  }, [userId]);

  const pendingReports = useMemo(
    () => queuedItems.filter((item) => item.status !== "submitted"),
    [queuedItems],
  );
  const queueSnapshot = useMemo(
    () =>
      pendingReports
        .map((item) => `${item.id}:${item.status}:${item.updatedAt}`)
        .join("|"),
    [pendingReports],
  );

  useEffect(() => {
    if (queueSnapshotRef.current === null) {
      queueSnapshotRef.current = queueSnapshot;
      return;
    }
    if (queueSnapshotRef.current !== queueSnapshot) {
      queueSnapshotRef.current = queueSnapshot;
      void loadReportsRef.current({
        revalidate: true,
      });
    }
  }, [queueSnapshot]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      void loadReports();
    }, 350);
    return () => clearTimeout(timer);
  }, [categoryId, loadReports, query, sortMode]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/reports");
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      void loadReportsRef.current();
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          handleBack();
          return true;
        },
      );
      return () => subscription.remove();
    }, [handleBack]),
  );

  const archiveRows = useMemo(() => {
    const groups = new Map<string, Report[]>();
    reports.forEach((report) => {
      const key = manilaWeekStartKey(report.createdAt) ?? "unavailable";
      groups.set(key, [...(groups.get(key) ?? []), report]);
    });
    return Array.from(groups.entries()).flatMap<ArchiveRow>(
      ([key, groupedReports]) => [
        { kind: "week", key: `week:${key}`, title: formatManilaWeekRange(key) },
        ...groupedReports.map((report) => ({
          kind: "report" as const,
          key: report.id,
          report,
        })),
      ],
    );
  }, [reports]);

  const loadMore = useCallback(() => {
    if (!nextCursor || isLoadingMore || isLoading) return;
    void loadReports({ append: true, cursor: nextCursor });
  }, [isLoading, isLoadingMore, loadReports, nextCursor]);

  const controls = (
    <View className="gap-4">
      <View className="flex-row items-end gap-2">
        <View className="flex-1">
          <SearchField
            accessibilityLabel="Search reports"
            onChangeText={setQuery}
            onClear={() => setQuery("")}
            placeholder="Search reports"
            value={query}
          />
        </View>
        <Menu
          placement="bottom right"
          offset={6}
          selectionMode="single"
          selectedKeys={new Set([sortMode])}
          trigger={(triggerProps) => (
            <Button
              {...triggerProps}
              size="icon"
              variant="secondary"
              accessibilityLabel="Sort reports"
            >
              <ButtonIcon as={ArrowDownNarrowWide} height={18} width={18} />
            </Button>
          )}
        >
          {[
            ["newest", "Newest first"],
            ["oldest", "Oldest first"],
            ["status", "Status"],
          ].map(([value, label]) => (
            <MenuItem
              key={value}
              textValue={label}
              accessibilityState={{ selected: sortMode === value }}
              onPress={() => setSortMode(value as ComplaintReportSort)}
            >
              <View className="w-5">
                {sortMode === value ? (
                  <Check size={16} color={accentColor} />
                ) : null}
              </View>
              <MenuItemLabel>{label}</MenuItemLabel>
            </MenuItem>
          ))}
        </Menu>
        <Menu
          placement="bottom right"
          offset={6}
          selectionMode="single"
          selectedKeys={new Set([categoryId])}
          trigger={(triggerProps) => (
            <Button
              {...triggerProps}
              size="icon"
              variant="secondary"
              accessibilityLabel="Filter reports"
            >
              <ButtonIcon as={Filter} height={18} width={18} />
            </Button>
          )}
        >
          {[
            { id: "all", title: "All categories" },
            ...meta.categories.map((category) => ({
              id: category.id,
              title: formatComplaintCategoryTitle(category.title),
            })),
          ].map((category) => (
            <MenuItem
              key={category.id}
              textValue={category.title}
              accessibilityState={{ selected: categoryId === category.id }}
              onPress={() => setCategoryId(category.id)}
            >
              <View className="w-5">
                {categoryId === category.id ? (
                  <Check size={16} color={accentColor} />
                ) : null}
              </View>
              <MenuItemLabel>{category.title}</MenuItemLabel>
            </MenuItem>
          ))}
        </Menu>
      </View>

      {pendingReports.length > 0 ? (
        <View className="gap-2">
          <View className="flex-row items-center justify-between px-2">
            <View className="flex-1 pr-3">
              <Heading size="sm">Saved on this device</Heading>
              <Text className="mt-0.5 text-xs text-muted-foreground">
                {pendingReports.length} report
                {pendingReports.length === 1 ? "" : "s"} will send automatically
                when connected.
              </Text>
            </View>
            <Button
              size="icon"
              variant="ghost"
              accessibilityLabel="Send saved reports"
              isDisabled={isSyncing}
              onPress={() => void sync()}
            >
              <ButtonIcon as={RefreshCw} height={17} width={17} />
            </Button>
          </View>
          <ListSection>
            {pendingReports.map((item, index) => {
              const status = queuedReportStatus(item);
              const StatusIcon = status.Icon;
              const statusColor =
                status.tone === "danger"
                  ? dangerColor
                  : status.tone === "muted"
                    ? mutedColor
                    : accentColor;
              return (
                <ListSectionItem
                  key={item.id}
                  showDivider={index < pendingReports.length - 1}
                  title={item.title}
                  description={
                    <View className="mt-1 gap-1">
                      <View className="flex-row items-center gap-1.5">
                        <StatusIcon size={14} color={statusColor} />
                        <Text className="text-xs text-muted-foreground">
                          {status.label} - {formatReportDate(item.createdAt)}
                        </Text>
                      </View>
                      {item.lastError ? (
                        <Text className="text-xs text-danger">
                          {item.lastError}
                        </Text>
                      ) : null}
                    </View>
                  }
                  leading={
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-secondary">
                      <StatusIcon size={18} color={statusColor} />
                    </View>
                  }
                  trailing={
                    <View className="flex-row items-center gap-1">
                      {item.diagnosticId ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          accessibilityLabel="Copy diagnostic code"
                          accessibilityHint="Copies a support code without copying your report data"
                          onPress={() =>
                            void Clipboard.setStringAsync(item.diagnosticId!)
                          }
                        >
                          <ButtonIcon as={Copy} height={17} width={17} />
                        </Button>
                      ) : null}
                      {item.status === "failed" || item.lastError ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          accessibilityLabel="Retry saved report"
                          onPress={() => void retry(item.id)}
                        >
                          <ButtonIcon as={RefreshCw} height={17} width={17} />
                        </Button>
                      ) : null}
                      {item.status !== "submitting" ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          accessibilityLabel="Discard saved report"
                          onPress={() => setDiscardItem(item)}
                        >
                          <ButtonIcon as={Trash2} height={17} width={17} />
                        </Button>
                      ) : null}
                    </View>
                  }
                />
              );
            })}
          </ListSection>
        </View>
      ) : null}

      <View className="flex-row items-center justify-between">
        <Heading size="sm">Official reports</Heading>
        <Text className="text-xs font-semibold text-muted-foreground">
          {reports.length}
          {nextCursor ? "+" : ""}
        </Text>
      </View>
      {isStale ? (
        <Text className="text-sm text-warning">
          Showing saved reports while the network is unavailable.
        </Text>
      ) : null}
      {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
      {isLoading ? <ArchiveSkeleton /> : null}
      {!isLoading && reports.length === 0 ? (
        <View className="items-center rounded-xl border border-border bg-card p-6">
          <Search size={28} color={accentColor} />
          <Heading className="mt-3 text-center" size="sm">
            No matching reports
          </Heading>
          <Text className="mt-1 text-center text-sm text-muted-foreground">
            Try another search term or category.
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View className="flex-1 bg-background" style={{ width }}>
      <ChildAppBar
        title="Report archive"
        description="Search, filter, and review all reports"
        onBack={handleBack}
        backAccessibilityLabel="Back to reports"
      />
      <FlatList
        ref={listRef}
        className="bg-background"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 16) + 20,
        }}
        data={archiveRows}
        keyExtractor={(item) => item.key}
        ListHeaderComponent={<View className="mb-4">{controls}</View>}
        ListFooterComponent={
          isLoadingMore ? (
            <ActivityIndicator className="my-5" color={accentColor} />
          ) : null
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.35}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadReports({ force: true })}
            tintColor={accentColor}
            colors={[accentColor]}
          />
        }
        renderItem={({ item }) =>
          item.kind === "week" ? (
            <Text className="mb-1.5 ml-1 mt-1 text-xs font-semibold text-muted-foreground">
              {item.title}
            </Text>
          ) : (
            <View className="mb-2">
              <ReportListGroup
                reports={[item.report]}
                onPress={(report) =>
                  router.push({
                    pathname: "/report/[id]",
                    params: { id: report.id },
                  })
                }
              />
            </View>
          )
        }
      />

      <Modal
        isOpen={Boolean(discardItem)}
        onClose={() => setDiscardItem(null)}
        size="sm"
      >
        <ModalBackdrop />
        <ModalContent className="rounded-xl">
          <ModalHeader>
            <Heading size="md">Discard saved report?</Heading>
          </ModalHeader>
          <ModalBody>
            <Text className="text-sm text-muted-foreground">
              This removes the local report and its evidence photos. This cannot
              be undone.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onPress={() => setDiscardItem(null)}>
              <ButtonText>Keep report</ButtonText>
            </Button>
            <Button
              variant="destructive"
              onPress={() => {
                if (discardItem) void remove(discardItem.id);
                setDiscardItem(null);
              }}
            >
              <ButtonText>Discard</ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </View>
  );
}
