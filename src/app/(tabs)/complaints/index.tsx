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
  Surface,
  useThemeColor,
} from "heroui-native";
import { Bell, FileText, Plus, Search, X } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function formatStatus(status: string) {
  return status
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function ComplaintsRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const bottomPadding = appScrollableBottomPadding(insets.bottom);
  const [accentColor, foregroundColor] = useThemeColor([
    "accent",
    "foreground",
  ]);
  const [meta, setMeta] = useState<ComplaintMeta>(emptyComplaintMeta);
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      Promise.all([fetchComplaintMeta(), fetchComplaintReports()])
        .then(([nextMeta, nextReports]) => {
          if (!isMounted) {
            return;
          }

          setMeta(nextMeta);
          setReports(nextReports);
          setError(null);
        })
        .catch((nextError) => {
          if (isMounted) {
            setError(
              nextError instanceof Error
                ? nextError.message
                : "Failed to load complaints.",
            );
          }
        });

      return () => {
        isMounted = false;
      };
    }, []),
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

  const openCreate = () => router.push("/complaints/new");

  return (
    <View className="flex-1 bg-background" style={{ width }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        className="bg-background"
        contentContainerStyle={{
          paddingHorizontal: 20,
          gap: 12,
          paddingBottom: bottomPadding,
        }}
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
              <Text className="text-white text-[32px] font-black leading-9">
                Complaints
              </Text>
              <Text className="mt-1 text-[15px] font-medium leading-5 text-white/85">
                Track service reports and follow ticket updates.
              </Text>
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
              <Text className="text-xs font-bold uppercase text-white/70">
                Reports filed
              </Text>
              <Text className="text-[30px] font-black leading-9 text-white">
                {reports.length}
              </Text>
            </View>
            <Button variant="secondary" onPress={openCreate} size="sm">
              <Plus size={16} color={accentColor} />
              <Button.Label>New report</Button.Label>
            </Button>
          </View>
        </View>

        <Animated.View
          layout={LinearTransition.duration(220)}
          className="flex-row items-center gap-2"
        >
          {isSearchOpen ? (
            <Animated.View
              entering={FadeIn.duration(180)}
              exiting={FadeOut.duration(120)}
              className="flex-1"
            >
              <Input
                value={query}
                onChangeText={setQuery}
                placeholder="Search reports"
                autoFocus
              />
            </Animated.View>
          ) : (
            <Animated.View
              entering={FadeIn.duration(180)}
              exiting={FadeOut.duration(120)}
              className="flex-1"
            >
              <Text className="text-foreground text-[22px] font-black leading-7">
                Recent reports
              </Text>
            </Animated.View>
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
        </Animated.View>

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
                <Text
                  className={`text-sm font-bold ${
                    isActive ? "text-white" : "text-foreground"
                  }`}
                >
                  {filter.title}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {error ? <Text className="text-danger text-sm">{error}</Text> : null}

        {filteredReports.length === 0 ? (
          <Surface className="items-center rounded-[22px] p-6">
            <FileText size={28} color={accentColor} />
            <Text className="text-foreground mt-3 text-center text-base font-bold">
              No reports yet
            </Text>
            <Text className="text-muted mt-1 text-center text-sm leading-5">
              New complaints and service reports will appear here.
            </Text>
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
                    <Text className="text-accent mt-1 text-xs font-black">
                      {report.ticketNumber}
                    </Text>
                  </ListGroup.ItemContent>
                  <ListGroup.ItemSuffix>
                    <Text className="text-foreground rounded-full bg-default px-3 py-1 text-xs font-bold">
                      {formatStatus(report.status)}
                    </Text>
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
