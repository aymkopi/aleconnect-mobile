import { appScrollableBottomPadding } from "@/components/floating-app-bar";
import { statusBarHeight } from "@/constants";
import {
  emptyComplaintMeta,
  formatComplaintCategoryTitle,
  formatStatus,
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
  Menu,
  SearchField,
  Skeleton,
  Surface,
  Typography,
  useThemeColor,
} from "heroui-native";
import {
  ArrowDownNarrowWide,
  Check,
  ChevronLeft,
  Filter,
  Search,
} from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SortMode = "newest" | "oldest" | "status";

function weekKey(value: string) {
  const date = new Date(value);
  const first = new Date(date);
  first.setDate(date.getDate() - date.getDay());
  first.setHours(0, 0, 0, 0);
  return first.toISOString();
}

function weekLabel(value: string) {
  const start = new Date(value);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const month = new Intl.DateTimeFormat("en", { month: "short" });
  return `${month.format(start)} ${start.getDate()} - ${month.format(end)} ${end.getDate()}`;
}

function ArchiveSkeleton() {
  return (
    <View className="gap-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <Surface key={index} className="rounded-3xl p-4">
          <View className="flex-row gap-3">
            <Skeleton className="h-12 w-12 rounded-2xl" />
            <View className="flex-1 gap-2">
              <Skeleton className="h-3 w-20 rounded-full" />
              <Skeleton className="h-5 w-4/5 rounded-full" />
              <Skeleton className="h-3 w-2/3 rounded-full" />
            </View>
          </View>
        </Surface>
      ))}
    </View>
  );
}

export default function ComplaintArchiveRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView | null>(null);
  const hasLoadedRef = useRef(false);
  const bottomPadding = appScrollableBottomPadding(insets.bottom);
  const [accentColor] = useThemeColor(["accent"]);
  const [meta, setMeta] = useState<ComplaintMeta>(emptyComplaintMeta);
  const [reports, setReports] = useState<Report[]>([]);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const visibleReports = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports
      .filter((report) =>
        categoryId === "all" ? true : report.categoryId === categoryId,
      )
      .filter((report) =>
        q
          ? [
              report.ticketNumber,
              report.title,
              report.typeTitle,
              report.categoryTitle,
              formatStatus(report.status),
            ]
              .join(" ")
              .toLowerCase()
              .includes(q)
          : true,
      )
      .sort((a, b) => {
        if (sortMode === "oldest") {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortMode === "status") {
          return formatStatus(a.status).localeCompare(formatStatus(b.status));
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [categoryId, query, reports, sortMode]);

  const groupedReports = useMemo(() => {
    const groups = new Map<string, Report[]>();
    visibleReports.forEach((report) => {
      const key = weekKey(report.createdAt);
      groups.set(key, [...(groups.get(key) ?? []), report]);
    });
    return Array.from(groups.entries()).map(([key, items]) => ({
      key,
      title: weekLabel(key),
      reports: items,
    }));
  }, [visibleReports]);

  const openReport = (report: Report) => {
    router.push({ pathname: "/complaints/[id]", params: { id: report.id } });
  };

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
            onRefresh={() => void loadComplaints({ force: true })}
            tintColor={accentColor}
            colors={[accentColor]}
          />
        }
      >
        <View className="flex-row items-center gap-3">
          <Button
            isIconOnly
            variant="secondary"
            onPress={() => router.back()}
            accessibilityLabel="Back to complaints"
          >
            <ChevronLeft size={21} color={accentColor} />
          </Button>
          <View className="flex-1">
            <Typography.Heading type="h2" weight="bold">
              Report archive
            </Typography.Heading>
            <Typography type="body-xs" color="muted" weight="medium">
              Search, filter, and review all recent tickets.
            </Typography>
          </View>
        </View>

        <View className="flex-row items-end gap-2">
          <View className="flex-1">
            <SearchField value={query} onChange={setQuery}>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search tickets" />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
          </View>
          <Menu>
            <Menu.Trigger asChild>
              <Button isIconOnly variant="secondary" accessibilityLabel="Sort reports">
                <ArrowDownNarrowWide size={18} color={accentColor} />
              </Button>
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Overlay />
              <Menu.Content presentation="popover" width={220}>
                <Menu.Label>Sort by</Menu.Label>
                {[
                  ["newest", "Newest first"],
                  ["oldest", "Oldest first"],
                  ["status", "Status"],
                ].map(([value, label]) => (
                  <Menu.Item key={value} onPress={() => setSortMode(value as SortMode)}>
                    <View className="w-5">
                      {sortMode === value ? <Check size={16} color={accentColor} /> : null}
                    </View>
                    <Menu.ItemTitle>{label}</Menu.ItemTitle>
                  </Menu.Item>
                ))}
              </Menu.Content>
            </Menu.Portal>
          </Menu>
          <Menu>
            <Menu.Trigger asChild>
              <Button isIconOnly variant="secondary" accessibilityLabel="Filter reports">
                <Filter size={18} color={accentColor} />
              </Button>
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Overlay />
              <Menu.Content presentation="popover" width={280}>
                <Menu.Label>Category</Menu.Label>
                {[
                  { id: "all", title: "All categories" },
                  ...meta.categories.map((category) => ({
                    id: category.id,
                    title: formatComplaintCategoryTitle(category.title),
                  })),
                ].map((category) => (
                  <Menu.Item key={category.id} onPress={() => setCategoryId(category.id)}>
                    <View className="w-5">
                      {categoryId === category.id ? (
                        <Check size={16} color={accentColor} />
                      ) : null}
                    </View>
                    <Menu.ItemTitle>{category.title}</Menu.ItemTitle>
                  </Menu.Item>
                ))}
              </Menu.Content>
            </Menu.Portal>
          </Menu>
        </View>

        <View className="flex-row items-center justify-between">
          <Typography.Heading type="h5" weight="bold">
            {visibleReports.length} reports
          </Typography.Heading>
        </View>

        {error ? (
          <Typography.Paragraph type="body-sm" className="text-danger">
            {error}
          </Typography.Paragraph>
        ) : null}

        {isLoading ? (
          <ArchiveSkeleton />
        ) : visibleReports.length === 0 ? (
          <Surface className="items-center rounded-3xl p-6">
            <Search size={28} color={accentColor} />
            <Typography.Heading type="h6" weight="bold" align="center" className="mt-3">
              No matching reports
            </Typography.Heading>
            <Typography.Paragraph type="body-sm" color="muted" align="center" className="mt-1">
              Try another search term or category.
            </Typography.Paragraph>
          </Surface>
        ) : (
          <View className="gap-5">
            {groupedReports.map((group) => (
              <View key={group.key} className="gap-2">
                <Typography type="body-xs" color="muted" weight="bold" className="ml-2">
                  {group.title}
                </Typography>
                <ReportListGroup
                  reports={group.reports}
                  getColor={(report) =>
                    meta.categories.find((item) => item.id === report.categoryId)
                      ?.color
                  }
                  onPress={openReport}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
