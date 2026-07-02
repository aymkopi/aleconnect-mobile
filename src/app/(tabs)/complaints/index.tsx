import { appScrollableBottomPadding } from "@/components/floating-app-bar";
import { statusBarHeight } from "@/constants";
import {
  emptyComplaintMeta,
  formatComplaintCategoryTitle,
  formatReportDate,
  type ComplaintMeta,
  type Report,
} from "@/features/complaints/data";
import {
  fetchComplaintMeta,
  fetchComplaintReports,
} from "@/services/complaints";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Button,
  Input,
  ListGroup,
  Separator,
  Skeleton,
  Surface,
  Typography,
  useThemeColor,
} from "heroui-native";
import { Bell, FileText, Plus, Search, X } from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function formatStatus(status: string) {
  return status
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ReportsSkeleton() {
  return (
    <Surface className="rounded-[22px] p-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <View
          key={index}
          className={`flex-row items-center gap-3 ${
            index > 0 ? "border-t border-separator pt-4" : ""
          } ${index < 3 ? "pb-4" : ""}`}
        >
          <Skeleton className="h-11 w-11 rounded-2xl" />
          <View className="flex-1 gap-2">
            <Skeleton className="h-4 w-4/5 rounded-full" />
            <Skeleton className="h-3 w-3/5 rounded-full" />
          </View>
          <Skeleton className="h-7 w-16 rounded-full" />
        </View>
      ))}
    </Surface>
  );
}

export default function ComplaintsRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView | null>(null);
  const hasLoadedRef = useRef(false);
  const bottomPadding = appScrollableBottomPadding(insets.bottom);
  const [accentColor, foregroundColor] = useThemeColor([
    "accent",
    "foreground",
  ]);
  const [meta, setMeta] = useState<ComplaintMeta>(emptyComplaintMeta);
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

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

  const filteredReports = useMemo(
    () =>
      reports
        .filter((report) =>
          selectedFilter === "all" ? true : report.categoryId === selectedFilter,
        )
        .filter((report) =>
          query
            ? `${report.title} ${report.typeTitle} ${report.ticketNumber}`
                .toLowerCase()
                .includes(query.toLowerCase())
            : true,
        )
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    [query, reports, selectedFilter],
  );

  const openCreate = () => {
    if (__DEV__) {
      console.log("[nav] complaints open new");
    }
    router.push("/complaints/new");
  };

  return (
    <View className="flex-1 bg-background" style={{ width }}>
      <ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="automatic"
        className="bg-background"
        contentContainerStyle={{
          paddingHorizontal: 20,
          gap: 12,
          paddingBottom: bottomPadding,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void loadComplaints({ force: true });
            }}
            tintColor={accentColor}
            colors={[accentColor]}
          />
        }
      >
        <View
          className="bg-accent rounded-b-[28px]"
          style={{
            marginHorizontal: -20,
            minHeight: 188,
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
                Track service reports and follow ticket updates.
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

          <View className="flex-row items-end justify-between">
            <View>
              <Typography type="body-xs" weight="bold" className="uppercase text-white/70">
                Reports filed
              </Typography>
              <Typography.Heading type="h2" weight="bold" className="text-white">
                {reports.length}
              </Typography.Heading>
            </View>
            <Button variant="secondary" onPress={openCreate} size="sm">
              <Plus size={16} color={accentColor} />
              <Button.Label>New report</Button.Label>
            </Button>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          {isSearchOpen ? (
            <View className="flex-1">
              <Input
                value={query}
                onChangeText={setQuery}
                placeholder="Search reports"
                autoFocus
              />
            </View>
          ) : (
            <View className="flex-1">
              <Typography.Heading type="h4" weight="bold">
                Recent reports
              </Typography.Heading>
            </View>
          )}
          <Button
            isIconOnly
            variant="secondary"
            size="lg"
            onPress={() => {
              setIsSearchOpen((current) => !current);
              if (isSearchOpen) {
                setQuery("");
              }
            }}
            accessibilityLabel={isSearchOpen ? "Close search" : "Search"}
          >
            {isSearchOpen ? (
              <X size={20} color={foregroundColor} />
            ) : (
              <Search size={20} color={foregroundColor} />
            )}
          </Button>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          className="flex-row -mx-4"
          contentContainerClassName="px-4"
        >
          {[
            { id: "all" as const, title: "All" },
            ...meta.categories.map((category) => ({
              id: category.id,
              title: formatComplaintCategoryTitle(category.title),
            })),
          ].map((filter) => {
            const isActive = selectedFilter === filter.id;
            return (
              <Pressable
                key={filter.id}
                onPress={() => setSelectedFilter(filter.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                className={`min-h-11 justify-center rounded-full px-4 ${
                  isActive ? "bg-accent" : "bg-surface"
                }`}
              >
                <Typography
                  type="body-sm"
                  weight="bold"
                  className={`text-sm font-bold ${
                    isActive ? "text-white" : "text-foreground"
                  }`}
                >
                  {filter.title}
                </Typography>
              </Pressable>
            );
          })}
        </ScrollView>

        {error ? (
          <Typography.Paragraph type="body-sm" className="text-danger">
            {error}
          </Typography.Paragraph>
        ) : null}

        {isLoading ? (
          <ReportsSkeleton />
        ) : filteredReports.length === 0 ? (
          <Surface className="items-center rounded-[22px] p-6">
            <FileText size={28} color={accentColor} />
            <Typography.Heading
              type="h6"
              weight="bold"
              align="center"
              className="mt-3"
            >
              No reports yet
            </Typography.Heading>
            <Typography.Paragraph
              type="body-sm"
              color="muted"
              align="center"
              className="mt-1"
            >
              New complaints and service reports will appear here.
            </Typography.Paragraph>
          </Surface>
        ) : (
          <ListGroup>
            {filteredReports.map((report, index) => {
            const category = meta.categories.find(
              (item) => item.id === report.categoryId,
            );
            return (
              <View key={report.id}>
                {index > 0 ? <Separator className="mx-4" /> : null}
                <ListGroup.Item>
                  <ListGroup.ItemPrefix>
                    <View
                      className="h-11 w-11 items-center justify-center rounded-2xl"
                      style={{
                        backgroundColor: category?.color ?? accentColor,
                      }}
                    >
                      <FileText size={19} color="white" />
                    </View>
                  </ListGroup.ItemPrefix>
                  <ListGroup.ItemContent>
                    <ListGroup.ItemTitle className="font-bold">
                      {report.title}
                    </ListGroup.ItemTitle>
                    <ListGroup.ItemDescription>
                      {report.typeTitle} - {formatReportDate(report.createdAt)}
                    </ListGroup.ItemDescription>
                    <Typography type="body-xs" weight="bold" className="mt-1 text-accent">
                      {report.ticketNumber}
                    </Typography>
                  </ListGroup.ItemContent>
                  <ListGroup.ItemSuffix>
                    <Typography
                      type="body-xs"
                      weight="bold"
                      className="rounded-full bg-default px-3 py-1"
                    >
                      {formatStatus(report.status)}
                    </Typography>
                  </ListGroup.ItemSuffix>
                </ListGroup.Item>
              </View>
            );
            })}
          </ListGroup>
        )}
      </ScrollView>
    </View>
  );
}
