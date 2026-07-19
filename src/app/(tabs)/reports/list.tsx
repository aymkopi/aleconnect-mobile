import { ChildAppBar } from "@/components/child-app-bar";
import { Button, ButtonIcon } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Menu, MenuItem, MenuItemLabel } from "@/components/ui/menu";
import { SearchField } from "@/components/ui/search-field";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import {
  emptyComplaintMeta,
  formatComplaintCategoryTitle,
  formatStatus,
  type ComplaintMeta,
  type Report,
} from "@/features/reports/data";
import { ReportListGroup } from "@/features/reports/report-list";
import { useAppColors } from "@/hooks/use-app-colors";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  fetchComplaintMeta,
  fetchComplaintReports,
} from "@/services/reports";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ArrowDownNarrowWide,
  Check,
  Filter,
  Search,
} from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  BackHandler,
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
        <View
          key={index}
          className="rounded-lg border border-border bg-card p-4"
        >
          <View className="flex-row gap-3">
            <Skeleton className="h-12 w-12 rounded-2xl" />
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

export default function ComplaintArchiveRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView | null>(null);
  const hasLoadedRef = useRef(false);
  const bottomPadding = Math.max(insets.bottom, 16) + 20;
  const [accentColor] = useAppColors(["accent"]);
  const { session } = useAuthSession();
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
  }, [session?.user.id]);

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
      void loadComplaints();

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          handleBack();
          return true;
        },
      );

      return () => subscription.remove();
    }, [handleBack, loadComplaints]),
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
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        }
        if (sortMode === "status") {
          return formatStatus(a.status).localeCompare(formatStatus(b.status));
        }
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
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
    router.push({ pathname: "/report/[id]", params: { id: report.id } });
  };

  return (
    <View className="flex-1 bg-background" style={{ width }}>
      <ChildAppBar
        title="Report archive"
        description="Search, filter, and review all tickets"
        onBack={handleBack}
        backAccessibilityLabel="Back to reports"
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
            onRefresh={() => void loadComplaints({ force: true })}
            tintColor={accentColor}
            colors={[accentColor]}
          />
        }
      >
        <View className="flex-row items-end gap-2">
          <View className="flex-1">
            <SearchField
              accessibilityLabel="Search tickets"
              onChangeText={setQuery}
              onClear={() => setQuery("")}
              placeholder="Search tickets"
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
                onPress={() => setSortMode(value as SortMode)}
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

        <View className="flex-row items-center justify-between">
          <Heading size="sm">{visibleReports.length} reports</Heading>
        </View>

        {error ? (
          <Text className="text-sm text-destructive">{error}</Text>
        ) : null}

        {isLoading ? (
          <ArchiveSkeleton />
        ) : visibleReports.length === 0 ? (
          <View className="items-center rounded-lg border border-border bg-card p-6">
            <Search size={28} color={accentColor} />
            <Heading className="mt-3 text-center" size="sm">
              No matching reports
            </Heading>
            <Text className="mt-1 text-center text-sm text-muted-foreground">
              Try another search term or category.
            </Text>
          </View>
        ) : (
          <View className="gap-5">
            {groupedReports.map((group) => (
              <View key={group.key} className="gap-2">
                <Text className="ml-2 text-xs font-bold text-muted-foreground">
                  {group.title}
                </Text>
                <ReportListGroup
                  reports={group.reports}
                  getColor={(report) =>
                    meta.categories.find(
                      (item) => item.id === report.categoryId,
                    )?.color
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
