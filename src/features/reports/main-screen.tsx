import { ContentSkeleton } from "@/components/content-skeleton";
import { DataNotice, DataState } from "@/components/data-state";
import { appScrollableBottomPadding } from "@/components/floating-app-bar";
import { MainPageHeader } from "@/components/main-page-header";
import { Badge } from "@/components/panelui/badge";
import { BottomSheet } from "@/components/panelui/bottom-sheet";
import { Button } from "@/components/panelui/button";
import { Kpi } from "@/components/panelui/kpi";
import { Label } from "@/components/panelui/label";
import { Select } from "@/components/panelui/select";
import { Skeleton } from "@/components/panelui/skeleton";
import { Tabs } from "@/components/panelui/tabs";
import { Text } from "@/components/panelui/text";
import { PreviewLabel } from "@/components/preview-label";
import { SearchField } from "@/components/search-field";
import { SoftRadial } from "@/components/soft-radial";
import { useVisualPreview } from "@/context/visual-preview-context";
import {
  fixtureReportAccounts,
  fixtureReports,
} from "@/features/main-fixtures";
import { useAppColors } from "@/hooks/use-app-colors";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useConsumerAccount } from "@/hooks/use-consumer-account";
import { useMainPageScroll } from "@/hooks/use-main-page-scroll";
import { useManualRefresh } from "@/hooks/use-manual-refresh";
import { useScopedRead } from "@/hooks/use-scoped-read";
import {
  subscribeReportRevalidationRequested,
  subscribeReportStatusChanged,
} from "@/services/report-sync-events";
import {
  fetchComplaintMeta,
  fetchComplaintReportPage,
} from "@/services/reports";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useIsFocused } from "expo-router/react-navigation";
import {
  ArrowDownUp,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Clock3,
  CreditCard,
  FileText,
  Plus,
  SlidersHorizontal,
  Tag,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  compareFixtureReports,
  defaultBrowseFilters,
  fetchedReportDateBounds,
  filterBrowseReports,
  reportPeriodLabels,
  type BrowseFilters,
} from "./browse-filter";
import {
  filterReportTab,
  getReportTabCounts,
  type ReportTab,
} from "./main-filter";
import { ReportCard } from "./report-card";
import { CONSUMER_TICKET_STATUSES, consumerTicketStatusLabel } from "./status";

const sortLabels = {
  newest: "Newest first",
  oldest: "Oldest first",
  updated: "Recently updated",
  status: "Status",
};
const filterTitles = {
  filters: "Filter reports",
  account: "Service account",
  status: "Report status",
  type: "Report type",
  sort: "Sort by",
};
type FilterView = keyof typeof filterTitles;
export default function ReportsScreen() {
  const focused = useIsFocused();
  const router = useRouter();
  const insets = useSafeAreaInsets(),
    { session } = useAuthSession(),
    { accountContext } = useConsumerAccount(),
    { fixtures } = useVisualPreview();
  const params = useLocalSearchParams<{
    period?: string;
    start?: string;
    end?: string;
  }>();
  const period =
    typeof params.period === "string" &&
    Object.keys(reportPeriodLabels).includes(params.period)
      ? params.period
      : "all";
  const start = typeof params.start === "string" ? params.start : "";
  const end = typeof params.end === "string" ? params.end : "";
  const [applied, setApplied] = useState(defaultBrowseFilters);
  const [draft, setDraft] = useState(defaultBrowseFilters);
  const [query, setQuery] = useState(""),
    [search, setSearch] = useState("");
  const [tab, setTab] = useState<ReportTab>("all");
  const [filters, setFilters] = useState(false),
    [filterView, setFilterView] = useState<FilterView>("filters");
  const [primary, buttonForeground, muted, feature] = useAppColors([
    "primary",
    "primary-foreground",
    "muted-foreground",
    "feature",
  ]);
  const userId = session?.user.id;
  const refreshConsumerId = fixtures ? "fixture" : accountContext?.identityUserId ?? userId ?? null;
  const accounts = fixtures
    ? fixtureReportAccounts
    : (accountContext?.accounts ?? []);
  const serviceAccountId =
    applied.account === "all" ? undefined : applied.account;
  const scope =
    !fixtures && userId
      ? JSON.stringify([
          userId,
          accountContext?.identityUserId,
          accountContext?.accessRevision,
          applied.account,
          search,
          applied.sort,
        ])
      : null;
  const options = {
    userId,
    identityUserId: accountContext?.identityUserId,
    accessRevision: accountContext?.accessRevision,
    serviceAccountId,
    query: search,
    sort: applied.sort,
    limit: 25,
  };
  const reports = useScopedRead(scope, (force) =>
    fetchComplaintReportPage({ ...options, force, revalidate: force }),
  );
  const { refresh, refreshing } = useManualRefresh(
    "reports", refreshConsumerId,
    () => fixtures ? undefined : reports.reload(true),
    !fixtures && reports.busy,
  );
  const scrollRef = useMainPageScroll<FlatList>(reports.reload);
  const reloadReports = reports.reload;
  useEffect(() => {
    if (!userId || fixtures) return;
    const reload = (principal: string) => {
      if (principal === userId) void reloadReports(true);
    };
    const first = subscribeReportRevalidationRequested(reload);
    const second = subscribeReportStatusChanged((event) =>
      reload(event.userId),
    );
    return () => {
      first();
      second();
    };
  }, [userId, fixtures, reloadReports]);
  const meta = useScopedRead(
    !fixtures && userId
      ? JSON.stringify([
          "report-types",
          userId,
          accountContext?.identityUserId,
          accountContext?.accessRevision,
        ])
      : null,
    (force) => fetchComplaintMeta({ force }),
  );
  const { refresh: refreshTypes } = useManualRefresh(
    "reports", refreshConsumerId,
    () => fixtures ? undefined : meta.reload(true),
    !fixtures && (reports.busy || meta.busy),
  );
  const loaded = fixtures
    ? fixtureReports
        .filter((r) =>
          (r.title + r.ticketNumber + r.displayAddress)
            .toLowerCase()
            .includes(search.toLowerCase()),
        )
        .sort((a, b) => compareFixtureReports(a, b, applied.sort))
    : (reports.data?.reports ?? []);
  const hasData = fixtures || !!reports.data;
  const dateBounds = fetchedReportDateBounds(loaded);
  const filteredView =
    !!search ||
    tab !== "all" ||
    applied.account !== "all" ||
    applied.type !== "all" ||
    applied.status !== "all" ||
    loaded.length > 0 ||
    !!reports.data?.nextCursor;
  const periodRows = filterBrowseReports(loaded, {
    ...applied,
    account: fixtures ? applied.account : "all",
    period,
    start,
    end,
  });
  const counts = getReportTabCounts(periodRows),
    rows = filterReportTab(periodRows, tab);
  const types = [
    ...new Map([
      ...loaded
        .filter((r) => r.typeId)
        .map(
          (r) =>
            [
              r.typeId,
              { id: r.typeId, title: r.typeTitle || r.title },
            ] as const,
        ),
      ...(meta.data?.types ?? []).map((t) => [t.id, t] as const),
    ]).values(),
  ];
  const values = {
    account:
      draft.account === "all"
        ? "All linked accounts"
        : (() => {
            const a = accounts.find((a) => a.id === draft.account);
            return a
              ? a.registeredName
              : "Linked account";
          })(),
    status:
      draft.status === "all"
        ? "All statuses"
        : consumerTicketStatusLabel(draft.status),
    type:
      draft.type === "all"
        ? "All report types"
        : types.find((t) => t.id === draft.type)?.title || "Report type",
    sort: sortLabels[draft.sort],
  };
  const header = (
    <View className="gap-3">
      <PreviewLabel />
      <MainPageHeader
        title="Reports"
        action={
          <Button
            size="sm"
            startContent={<Plus size={18} color={buttonForeground} />}
            onPress={() => router.push("/reports/new")}
          >
            New report
          </Button>
        }
      />
      <View
        className="rounded-xl overflow-hidden p-4 gap-3"
        style={{ backgroundColor: feature }}
      >
        <SoftRadial />
        <Kpi.Group separated={false}>
          {[
            { label: "Reports", value: counts.all, Icon: FileText },
            { label: "Resolved", value: counts.resolved, Icon: CheckCircle2 },
            { label: "Open", value: counts.open, Icon: Clock3 },
          ].map(({ label, value, Icon }) => (
            <Kpi key={label} surface={false}>
              <Kpi.Stat>
                {!hasData && reports.busy ? (
                  <Skeleton
                    animated={focused}
                    label={"Loading " + label.toLowerCase() + " count"}
                    style={{ width: 54, height: 34 }}
                  />
                ) : (
                  <Kpi.Value className="text-white text-[28px] leading-[34px]">
                    {hasData ? value : "—"}
                  </Kpi.Value>
                )}
                <View className="flex-row gap-1.5 items-center">
                  <Icon size={16} color="#E5E7EB" />
                  <Kpi.Title className="text-white/90 text-xs">
                    {label}
                  </Kpi.Title>
                </View>
              </Kpi.Stat>
            </Kpi>
          ))}
        </Kpi.Group>
        <Text size="xs" className="text-white/80">
          Counts reflect fetched reports matching this period and filters. Not your complete history.
        </Text>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1 gap-1">
          <Label>Service account</Label>
          <Select
            value={applied.account}
            onValueChange={(account) => setApplied((f) => ({ ...f, account }))}
            triggerClassName="min-h-12 py-2 rounded-xl bg-card"
            valueClassName="text-sm"
          >
            <Select.Item value="all" label="All accounts" />
            {accounts.map((a) => (
              <Select.Item
                key={a.id}
                value={a.id}
                label={a.registeredName}
                description={a.accountNumber || "Number unavailable"}
              />
            ))}
          </Select>
        </View>
        <View className="flex-1 gap-1">
          <Label>Reporting period</Label>
          <Button
            variant="outline"
            className="bg-card rounded-xl min-h-12 justify-between"
            labelClassName="flex-1 text-left text-sm"
            accessibilityLabel="Reporting period"
            endContent={<CalendarDays size={18} color={primary} />}
            onPress={() =>
              router.push({
                pathname: "/reports/period",
                params: {
                  period,
                  start,
                  end,
                  firstReportDate: dateBounds?.start ?? "",
                },
              })
            }
          >
            {reportPeriodLabels[period]}
          </Button>
        </View>
      </View>
      <View className="flex-row items-center gap-3">
        <View className="flex-1">
          <SearchField
            value={query}
            onChangeText={setQuery}
            placeholder="Search your reports"
          />
        </View>
        <Button
          variant="outline"
          size="icon"
          style={{ width: 48, height: 48 }}
          accessibilityLabel="Report filters"
          onPress={() => {
            setDraft(applied);
            setFilterView("filters");
            setFilters(true);
          }}
        >
          <SlidersHorizontal size={18} color={primary} />
        </Button>
      </View>
      {query !== search ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={reports.busy}
          onPress={() => setSearch(query.trim())}
        >
          Search reports
        </Button>
      ) : null}
      <Tabs
        defaultValue="all"
        value={tab}
        onValueChange={(v) => setTab(v as ReportTab)}
        variant="pill"
        size="sm"
      >
        <Tabs.List className="gap-1 min-h-12 items-center">
          {(["all", "open", "resolved"] as const).map((value) => (
            <Tabs.Trigger
              key={value}
              value={value}
              className="min-h-8 py-1 px-3"
              badge={
                <Badge
                  variant="secondary"
                  size="xs"
                  count={hasData ? counts[value] : undefined}
                  accessibilityLabel={
                    hasData
                      ? `${counts[value]} reports`
                      : "Report count unavailable"
                  }
                  className="self-center h-5 min-w-5 items-center justify-center px-1 py-0"
                  labelClassName="text-[10px] leading-[14px]"
                >
                  {hasData ? null : "—"}
                </Badge>
              }
            >
              {value === "all" ? "All" : value === "open" ? "Open" : "Resolved"}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs>
      <View className="flex-row justify-between items-center">
        <Text weight="semibold" style={{ fontSize: 16, lineHeight: 22 }}>
          Your reports
        </Text>
        <Button
          variant="ghost"
          size="sm"
          onPress={() =>
            router.push({
              pathname: "/reports/list",
              params: { ...applied, period, start, end, query: search },
            })
          }
        >
          <Text className="text-primary" size="xs" weight="semibold">
            View all
          </Text>
        </Button>
      </View>
      {hasData &&
      (reports.data?.isStale ||
        (reports.error && reports.errorSource !== "more")) ? (
        <DataNotice
          title={
            reports.error
              ? "Could not refresh reports"
              : "Showing saved reports"
          }
          description="Your loaded reports are still available. Connect and refresh to confirm current statuses."
          actionLabel="Refresh reports"
          busy={reports.busy}
          onAction={refresh}
        />
      ) : null}
    </View>
  );
  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <FlatList
        className="flex-1"
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        data={rows}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <ReportCard
            report={item}
            onPress={() =>
              router.push({
                pathname: "/reports/[id]",
                params: {
                  id: item.id,
                  ...(item.serviceAccountId
                    ? { serviceAccountId: item.serviceAccountId }
                    : {}),
                },
              })
            }
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: appScrollableBottomPadding(insets.bottom),
          // Rows have one 12px separator; headers keep their own spacing.
        }}
        ListHeaderComponent={<View className="pb-2">{header}</View>}
        ListEmptyComponent={
          !session && !fixtures ? (
            <DataState
              title="Sign in to see your reports"
              description="Reports belong to your signed-in account."
              actionLabel="Sign in"
              onAction={() =>
                router.push({
                  pathname: "/sign-in",
                  params: { returnTo: "/reports" },
                })
              }
            />
          ) : !hasData && reports.busy ? (
            <DataState loading title="Loading your reports" />
          ) : !hasData && reports.error ? (
            <DataState
              title="Your reports couldn’t load"
              description="Reconnect and try again. This does not mean you have no reports."
              actionLabel="Try again"
              onAction={refresh}
            />
          ) : (
            <DataState
              icon={FileText}
              title={filteredView ? "No matching reports" : "No reports yet"}
              description={
                reports.data?.nextCursor
                  ? "There may be matches in later pages. Load more reports to keep searching."
                  : filteredView
                    ? "Try another search or reset the account, period and status filters."
                    : "Report an issue with your service and follow its progress here."
              }
              actionLabel={filteredView ? "Reset filters" : "Create a report"}
              onAction={() => {
                if (filteredView) {
                  setApplied(defaultBrowseFilters);
                  setQuery("");
                  setSearch("");
                  setTab("all");
                  router.replace("/reports");
                } else router.push("/reports/new");
              }}
            />
          )
        }
        refreshing={refreshing}
        onRefresh={refresh}
        ListFooterComponent={
          <View className="pt-3 gap-3">
            {reports.error && reports.errorSource === "more" ? (
              <DataNotice
                title="More reports couldn’t load"
                description="The reports above are still available. Retry without losing your place."
              />
            ) : null}
            {reports.data?.nextCursor && !reports.data.isStale ? (
              <Button
                variant="outline"
                loading={reports.busy}
                onPress={() =>
                  void reports.append(
                    () =>
                      fetchComplaintReportPage({
                        ...options,
                        cursor: reports.data!.nextCursor,
                      }),
                    (before, next) => ({
                      ...next,
                      reports: [
                        ...new Map(
                          [...before.reports, ...next.reports].map((r) => [
                            r.id,
                            r,
                          ]),
                        ).values(),
                      ],
                    }),
                  )
                }
              >
                {reports.errorSource === "more"
                  ? "Retry more reports"
                  : "Load more reports"}
              </Button>
            ) : null}
          </View>
        }
      />

      <BottomSheet open={filters} onOpenChange={setFilters}>
        <BottomSheet.Content
          className="px-4"
          size="auto"
          onBack={
            filterView === "filters"
              ? undefined
              : () => setFilterView("filters")
          }
        >
          <BottomSheet.Header>
            <View className="flex-row items-center gap-2">
              {filterView !== "filters" ? (
                <Button
                  variant="ghost"
                  size="icon"
                  accessibilityLabel="Back to report filters"
                  onPress={() => setFilterView("filters")}
                >
                  <ChevronLeft size={20} color={primary} />
                </Button>
              ) : null}
              <Text weight="semibold" size="lg" accessibilityRole="header">
                {filterTitles[filterView]}
              </Text>
            </View>
          </BottomSheet.Header>
          <BottomSheet.Body
            className="gap-3"
            showsVerticalScrollIndicator={false}
          >
            {filterView === "filters" ? (
              <>
                <Text muted size="sm">
                  Filter by service account, status or report type. Status and
                  type apply to loaded reports.
                </Text>
                {(["account", "status", "type", "sort"] as const).map((key) => {
                  const Icon = {
                    account: CreditCard,
                    status: Check,
                    type: Tag,
                    sort: ArrowDownUp,
                  }[key];
                  return (
                    <View key={key} className="gap-1">
                      <Label>{filterTitles[key]}</Label>
                      <Button
                        variant="outline"
                        className="justify-between rounded-xl min-h-12"
                        labelClassName="flex-1 text-left"
                        accessibilityRole="combobox"
                        accessibilityLabel={filterTitles[key]}
                        accessibilityValue={{ text: values[key] }}
                        startContent={<Icon size={18} color={muted} />}
                        endContent={<ChevronDown size={18} color={muted} />}
                        onPress={() => setFilterView(key)}
                      >
                        {values[key]}
                      </Button>
                    </View>
                  );
                })}
              </>
            ) : (
              <Select
                presentation="content"
                searchable={filterView === "account" || filterView === "type"}
                value={draft[filterView]}
                onValueChange={(value) => {
                  setDraft(
                    (d) => ({ ...d, [filterView]: value }) as BrowseFilters,
                  );
                  setFilterView("filters");
                }}
              >
                {filterView === "account" ? (
                  <>
                    <Select.Item value="all" label="All linked accounts" />
                    {accounts.map((a) => (
                      <Select.Item
                        key={a.id}
                        value={a.id}
                        label={a.registeredName}
                        description={a.accountNumber || "Number unavailable"}
                      />
                    ))}
                  </>
                ) : filterView === "status" ? (
                  <>
                    <Select.Item value="all" label="All statuses" />
                    {CONSUMER_TICKET_STATUSES.map((value) => (
                      <Select.Item
                        key={value}
                        value={value}
                        label={consumerTicketStatusLabel(value)}
                      />
                    ))}
                    <Select.Item
                      value="pending"
                      label="Status update pending"
                    />
                  </>
                ) : filterView === "type" ? (
                  <>
                    <Select.Item value="all" label="All report types" />
                    {types.map((t) => (
                      <Select.Item key={t.id} value={t.id} label={t.title} />
                    ))}
                    {meta.busy && types.length === 0 ? (
                      <ContentSkeleton
                        layout="selection"
                        label="Loading report types"
                      />
                    ) : null}
                    {meta.error ? (
                      <Button
                        variant="outline"
                        onPress={refreshTypes}
                      >
                        Reload report types
                      </Button>
                    ) : null}
                  </>
                ) : (
                  Object.entries(sortLabels).map(([value, label]) => (
                    <Select.Item key={value} value={value} label={label} />
                  ))
                )}
              </Select>
            )}
          </BottomSheet.Body>
          {filterView === "filters" ? (
            <BottomSheet.Footer>
              <Button
                fullWidth
                onPress={() => {
                  setApplied(draft);
                  setTab("all");
                  setFilters(false);
                }}
              >
                Show reports
              </Button>
              <Button
                variant="ghost"
                fullWidth
                onPress={() => setDraft(defaultBrowseFilters)}
              >
                Reset filters
              </Button>
            </BottomSheet.Footer>
          ) : null}
        </BottomSheet.Content>
      </BottomSheet>
    </View>
  );
}
