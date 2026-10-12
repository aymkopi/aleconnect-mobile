import { useEffect, useRef, useState } from "react";
import { FlatList, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowDownUp,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  Plus,
  Tag,
} from "lucide-react-native";
import { ReportCalendar } from "./components/report-calendar";
import { ReportPage } from "./components/report-page";
import { ReportCard } from "./report-card";
import { Button } from "@/components/panelui/button";
import { Text } from "@/components/panelui/text";
import { Label } from "@/components/panelui/label";
import { Badge } from "@/components/panelui/badge";
import { Tabs } from "@/components/panelui/tabs";
import { Select } from "@/components/panelui/select";
import { BottomSheet } from "@/components/panelui/bottom-sheet";
import { ContentSkeleton } from "@/components/content-skeleton";
import { DataState, DataNotice } from "@/components/data-state";
import { Input } from "@/components/panelui/input";
import { SearchField } from "@/components/search-field";
import { useAppColors } from "@/hooks/use-app-colors";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useConsumerAccount } from "@/hooks/use-consumer-account";
import { useScopedRead } from "@/hooks/use-scoped-read";
import { useVisualPreview } from "@/context/visual-preview-context";
import { useReportQueue } from "@/context/report-queue-context";
import {
  fetchComplaintMeta,
  fetchComplaintReportPage,
} from "@/services/reports";
import {
  subscribeReportRevalidationRequested,
  subscribeReportStatusChanged,
} from "@/services/report-sync-events";
import { isQueuedReportVisible } from "@/services/report-queue-access";
import { CONSUMER_TICKET_STATUSES, consumerTicketStatusLabel } from "./status";
import {
  filterReportTab,
  getReportTabCounts,
  type ReportTab,
} from "./main-filter";
import {
  browseFixtureReports,
  defaultBrowseFilters,
  compareFixtureReports,
  filterBrowseReports,
  manilaDateKey,
  reportBrowseScope,
  validDateRange,
  type BrowseFilters,
} from "./browse-filter";
import { parseApiInstant } from "@/utils/manila-time";

type FilterView =
  | "filters"
  | "account"
  | "status"
  | "type"
  | "sort"
  | "period"
  | "start"
  | "end"
  | "preview";
const sortLabels = {
  newest: "Newest first",
  oldest: "Oldest first",
  updated: "Recently updated",
  status: "Status",
};
const periodLabels: Record<string, string> = {
  all: "All dates",
  month: "This month",
  "last-month": "Last month",
  quarter: "Last 3 months",
  year: "This year",
  custom: "Custom dates",
};
const fixtureAccounts = [
  { id: "fixture-home", registeredName: "Home", accountNumber: "10004821" },
  { id: "fixture-shop", registeredName: "Shop", accountNumber: "10006822" },
];
function Field({
  label,
  value,
  icon,
  onPress,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  const [muted] = useAppColors(["muted-foreground"]);
  return (
    <View className="gap-1">
      <Label>{label}</Label>
      <Button
        variant="outline"
        className="justify-between rounded-xl min-h-12"
        labelClassName="flex-1 text-left"
        startContent={icon}
        endContent={<ChevronDown size={18} color={muted} />}
        accessibilityRole="combobox"
        accessibilityLabel={label}
        accessibilityValue={{ text: value }}
        onPress={onPress}
      >
        {value}
      </Button>
    </View>
  );
}
export default function AllReportsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    query?: string;
    account?: string;
    status?: string;
    type?: string;
    period?: string;
    sort?: string;
    start?: string;
    end?: string;
  }>();
  const { session } = useAuthSession();
  const { accountContext } = useConsumerAccount();
  const { fixtures } = useVisualPreview();
  const queue = useReportQueue();
  const [primary, muted, buttonForeground] = useAppColors([
    "primary",
    "muted-foreground",
    "primary-foreground",
  ]);
  const [query, setQuery] = useState(params.query || "");
  const [search, setSearch] = useState(query);
  const [filters, setFilters] = useState<BrowseFilters>({
    ...defaultBrowseFilters,
    account: params.account || "all",
    status:
      params.status &&
      ([...CONSUMER_TICKET_STATUSES, "pending"] as readonly string[]).includes(
        params.status,
      )
        ? params.status
        : "all",
    type: params.type || "all",
    period:
      params.period && periodLabels[params.period] ? params.period : "all",
    start: params.start || "",
    end: params.end || "",
    sort:
      params.sort === "oldest" || params.sort === "status" || params.sort === "updated"
        ? params.sort
        : "newest",
  });
  const [draft, setDraft] = useState(filters);
  const [view, setView] = useState<FilterView>("filters");
  const [sheet, setSheet] = useState(false);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [tab, setTab] = useState<ReportTab>("all");
  const [fixtureState, setFixtureState] = useState("loaded");
  const accounts = fixtures ? fixtureAccounts : accountContext?.accounts || [];
  const account =
    filters.account === "all" || accounts.some((a) => a.id === filters.account)
      ? filters.account
      : "all";
  const effective = { ...filters, account };
  const scope =
    !fixtures && session
      ? reportBrowseScope(
          session.user.id,
          accountContext?.identityUserId,
          accountContext?.accessRevision,
          search,
          effective,
        )
      : null;
  const fixtureScope = JSON.stringify([search, effective]);
  const [fixturePage, setFixturePage] = useState({
    scope: fixtureScope,
    count: 3,
  });
  const options = {
    userId: session?.user.id,
    identityUserId: accountContext?.identityUserId,
    accessRevision: accountContext?.accessRevision,
    serviceAccountId: account === "all" ? undefined : account,
    query: search,
    sort: filters.sort,
    limit: 25,
  };
  const reports = useScopedRead(scope, (force) =>
    fetchComplaintReportPage({ ...options, force, revalidate: force }),
  );
  const meta = useScopedRead(
    !fixtures && session
      ? JSON.stringify([
          session.user.id,
          accountContext?.identityUserId,
          accountContext?.accessRevision,
          "report-meta",
        ])
      : null,
    (force) => fetchComplaintMeta({ force }),
  );
  const list = useRef<FlatList>(null);
  const reloadReports = reports.reload;
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    list.current?.scrollToOffset({ offset: 0, animated: false });
  }, [scope, fixtureScope, tab]);
  useEffect(() => {
    if (!session || fixtures) return;
    const reload = (userId: string) => {
      if (userId === session.user.id) void reloadReports(true);
    };
    const first = subscribeReportRevalidationRequested(reload);
    const second = subscribeReportStatusChanged((event) =>
      reload(event.userId),
    );
    return () => {
      first();
      second();
    };
  }, [session, fixtures, reloadReports]);
  const fixtureMatches = browseFixtureReports
    .filter((r) =>
      [r.ticketNumber, r.title, r.typeTitle, r.displayAddress]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .sort((a, b) => compareFixtureReports(a, b, filters.sort));
  const fixtureCount =
    fixturePage.scope === fixtureScope ? fixturePage.count : 3;
  const loaded = fixtures
    ? ["loading", "error", "empty"].includes(fixtureState)
      ? []
      : fixtureMatches.slice(0, fixtureCount)
    : reports.data?.reports || [];
  const busy = fixtures ? fixtureState === "loading" : reports.busy;
  const error = fixtures
    ? fixtureState === "error"
      ? "Fixture: reports could not be loaded. Try again."
      : null
    : reports.error;
  const hasData = fixtures ? !["loading", "error"].includes(fixtureState) : !!reports.data;
  const stale = fixtures ? fixtureState === "offline" : reports.data?.isStale;
  // The endpoint owns account/query/sort; status/type/date filter the pages loaded so far.
  const filtered = filterBrowseReports(loaded, {
    ...effective,
    account: fixtures ? account : "all",
  });
  const rows = filterReportTab(filtered, tab);
  const counts = getReportTabCounts(filtered);
  const hasMore = fixtures
    ? !["loading", "error", "empty"].includes(fixtureState) &&
      fixtureCount < fixtureMatches.length
    : !!reports.data?.nextCursor;
  const types = meta.data?.types.length
    ? meta.data.types
    : [
        ...new Map(
          (fixtures ? browseFixtureReports : loaded).map((r) => [
            r.typeId,
            { id: r.typeId, title: r.typeTitle },
          ]),
        ).values(),
      ];
  const queueScope = session
    ? {
        identityUserId: accountContext?.identityUserId ?? session.user.id,
        authorizedServiceAccountIds:
          accountContext?.authorizedServiceAccountIds ?? [session.user.id],
        accessRevision: accountContext?.accessRevision ?? 0,
      }
    : null;
  const savedCount = fixtures
    ? 1
    : queue.items.filter(
        (item) =>
          queueScope &&
          isQueuedReportVisible(item, queueScope) &&
          item.status !== "submitted",
      ).length;
  const filterCount = [
    account !== "all",
    filters.status !== "all",
    filters.type !== "all",
    filters.period !== "all",
  ].filter(Boolean).length;
  function openFilters(nextView: FilterView = "filters") {
    setDraft(effective);
    setView(nextView);
    setSheet(true);
  }
  function select(key: keyof BrowseFilters, value: string) {
    setDraft((d) => ({ ...d, [key]: value }));
    setView("filters");
  }
  async function more() {
    if (busy) return;
    if (fixtures) {
      setFixturePage({ scope: fixtureScope, count: fixtureCount + 3 });
      return;
    }
    if (!reports.data?.nextCursor) return;
    await reports.append(
      () =>
        fetchComplaintReportPage({
          ...options,
          cursor: reports.data!.nextCursor,
        }),
      (before, next) => ({
        ...next,
        reports: [
          ...new Map(
            [...before.reports, ...next.reports].map((r) => [r.id, r]),
          ).values(),
        ],
      }),
    );
  }
  const header = (
    <View className="gap-3 pb-3">
      <Button
        fullWidth
        startContent={<Plus size={18} color={buttonForeground} />}
        onPress={() => router.push("/reports/new")}
      >
        New report
      </Button>
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Search reference, issue or location"
      />
      <View className="flex-row gap-3">
        <Button
          variant="outline"
          className="flex-1 rounded-xl min-h-12"
          endContent={<ChevronDown size={16} color={muted} />}
          onPress={() => openFilters()}
        >
          Filter · {filterCount || "All"}
        </Button>
        <Button
          variant="outline"
          className="flex-1 rounded-xl min-h-12"
          endContent={<ChevronDown size={16} color={muted} />}
          onPress={() => openFilters("sort")}
        >
          {sortLabels[filters.sort]}
        </Button>
      </View>
      <Tabs
        defaultValue="all"
        value={tab}
        onValueChange={(v) => setTab(v as ReportTab)}
      >
        <Tabs.List>
          {(["all", "open", "resolved"] as const).map((t) => (
            <Tabs.Trigger
              key={t}
              value={t}
              className="min-h-11 flex-1"
              badge={
                <Badge
                  count={counts[t]}
                  variant="secondary"
                  accessibilityLabel={`${counts[t]} ${t} reports loaded`}
                  labelClassName="text-[10px]"
                />
              }
            >
              {t === "all" ? "All" : t === "open" ? "Open" : "Resolved"}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs>
      <Text muted size="xs">
        {rows.length} matching report{rows.length === 1 ? "" : "s"} loaded
        {hasMore ? " · More reports available" : ""}. Status, type and period
        apply to loaded reports.
      </Text>
      {search ? (
        <Text weight="semibold">Reports matching “{search}”</Text>
      ) : null}
      {savedCount ? (
        <Button
          variant="outline"
          className="rounded-xl min-h-16 justify-start"
          labelClassName="flex-1 text-left"
          startContent={<FileText size={20} color={primary} />}
          endContent={<ChevronRight size={18} color={primary} />}
          onPress={() => router.push("/reports/queue")}
        >
          <View className="flex-1 gap-0.5">
            <Text weight="semibold" size="sm">
              Saved on this device
            </Text>
            <Text muted size="xs">
              {savedCount} report{savedCount === 1 ? "" : "s"} awaiting
              confirmation
            </Text>
          </View>
        </Button>
      ) : null}
      {stale ? (
        <View className="rounded-xl border border-border bg-card p-3 gap-2">
          <Text weight="semibold" size="sm">
            Saved reports · updates may be delayed
          </Text>
          <Text muted size="sm">
            This saved view may be out of date. Connect and refresh to confirm
            current statuses.
          </Text>
          <Button
            variant="outline"
            size="sm"
            loading={busy}
            onPress={() =>
              fixtures ? setFixtureState("loaded") : void reports.reload(true)
            }
          >
            Refresh reports
          </Button>
        </View>
      ) : null}
      {hasData && error && reports.errorSource !== "more" ? <DataNotice title="Could not refresh reports" description="Your loaded reports are still available. Connect and refresh for current statuses." actionLabel="Refresh reports" busy={busy} onAction={() => fixtures ? setFixtureState("loaded") : void reports.reload(true)} /> : null}
    </View>
  );
  const title = query ? "Search reports" : "All reports";
  const pickTitle =
    view === "account"
      ? "Service account"
      : view === "status"
        ? "Report status"
        : view === "type"
          ? "Report type"
          : view === "sort"
            ? "Sort reports"
            : view === "period"
              ? "Report period"
              : view === "start"
                ? "Choose a start date"
                : view === "end"
                  ? "Choose an end date"
                  : view === "preview"
                    ? "Fixture browse states"
                    : "Filter reports";
  return (
    <ReportPage
      title={title}
      scroll={false}
      headerAction={
        fixtures ? (
          <Button
            variant="ghost"
            size="sm"
            accessibilityLabel="Choose fixture browse state"
            onPress={() => {
              setView("preview");
              setSheet(true);
            }}
          >
            Preview
          </Button>
        ) : undefined
      }
    >
      <FlatList
        ref={list}
        data={rows}
        keyExtractor={(r) => r.id}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: 24 }}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item, index }) => {
          const instant = parseApiInstant(item.createdAt);
          const group = instant
            ? new Intl.DateTimeFormat("en-PH", {
                timeZone: "Asia/Manila",
                month: "long",
                year: "numeric",
              }).format(instant)
            : "Date unavailable";
          const before = index
            ? parseApiInstant(rows[index - 1].createdAt)
            : null;
          const showGroup =
            !before ||
            !instant ||
            manilaDateKey(before).slice(0, 7) !==
              manilaDateKey(instant).slice(0, 7);
          return (
            <View className="gap-3">
              {showGroup ? (
                <Text muted size="xs" className="uppercase">
                  {group}
                </Text>
              ) : null}
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
            </View>
          );
        }}
        ListEmptyComponent={
          !hasData && busy ? <DataState loading title="Loading your reports" />
          : !session && !fixtures ? <DataState title="Sign in to see your reports" description="Reports belong to your signed-in account." actionLabel="Sign in" onAction={() => router.push({ pathname: "/sign-in", params: { returnTo: "/reports/list" } })} />
          : !hasData && error ? <DataState title="Your reports couldn’t load" description="Reconnect and retry. Your search and filters are kept in place." actionLabel="Try again" onAction={() => fixtures ? setFixtureState("loaded") : void reports.reload(true)} />
          : <DataState icon={FileText} title="No matching reports" description={hasMore ? "There may be matches in later pages. Load more reports or review your filters." : "Try another reference, issue or location, or review your filters."} actionLabel="Review filters" onAction={openFilters} />
        }
        refreshing={pullRefreshing}
        onRefresh={async () => {
          setPullRefreshing(true);
          try {
            if (fixtures) setFixturePage({ scope: fixtureScope, count: 3 });
            else await reports.reload(true);
          } finally { setPullRefreshing(false); }
        }}
        ListFooterComponent={
          <View className="py-4 gap-2">
            {reports.error && reports.errorSource === "more" ? <DataNotice title="More reports couldn’t load" description="The reports above are still available. Retry without losing your place." /> : null}
            {hasMore && !stale ? (
              <Button
                variant="outline"
                loading={busy}
                onPress={() => void more()}
              >
                {reports.errorSource === "more" ? "Retry more reports" : "Load more reports"}
              </Button>
            ) : loaded.length ? (
              <Text muted size="xs" className="text-center">
                End of loaded results
              </Text>
            ) : null}
          </View>
        }
      />
      <BottomSheet open={sheet} onOpenChange={setSheet}>
        <BottomSheet.Content
          className="px-4"
          size="auto"
          onBack={
            view === "filters"
              ? undefined
              : () =>
                  setView(
                    view === "start" || view === "end" ? "period" : "filters",
                  )
          }
        >
          <BottomSheet.Header>
            <View className="flex-row items-center gap-2">
              {view !== "filters" ? (
                <Button
                  size="icon"
                  variant="ghost"
                  accessibilityLabel="Back to filters"
                  onPress={() =>
                    setView(
                      view === "start" || view === "end" ? "period" : "filters",
                    )
                  }
                >
                  <ChevronLeft color={primary} size={20} />
                </Button>
              ) : null}
              <Text weight="semibold" size="lg">
                {pickTitle}
              </Text>
            </View>
          </BottomSheet.Header>
          <BottomSheet.Body
            className="gap-3"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {view === "preview" ? (
              <>
                <Text muted size="sm">
                  These states use memory only; no account, report or device
                  queue is changed.
                </Text>
                <Select
                  presentation="content"
                  value={fixtureState}
                  onValueChange={(value) => {
                    setFixtureState(value);
                    setSheet(false);
                  }}
                >
                  <Select.Item
                    value="loaded"
                    label="Loaded reports and pagination"
                  />
                  <Select.Item value="loading" label="Loading reports" />
                  <Select.Item
                    value="error"
                    label="Loading failed with retry"
                  />
                  <Select.Item
                    value="offline"
                    label="Saved reports while offline"
                  />
                  <Select.Item value="empty" label="No matching reports" />
                </Select>
              </>
            ) : view === "filters" ? (
              <>
                <Text muted size="sm">
                  Filter by service account, status or report type.
                </Text>
                <Field
                  label="Service account"
                  value={
                    draft.account === "all"
                      ? "All linked accounts"
                      : accounts.find((a) => a.id === draft.account)
                          ?.registeredName || "All linked accounts"
                  }
                  icon={<CreditCard size={18} color={muted} />}
                  onPress={() => setView("account")}
                />
                <Field
                  label="Report status"
                  value={
                    draft.status === "all"
                      ? "All statuses"
                      : consumerTicketStatusLabel(draft.status)
                  }
                  icon={<Check size={18} color={muted} />}
                  onPress={() => setView("status")}
                />
                <Field
                  label="Report type"
                  value={
                    draft.type === "all"
                      ? "All report types"
                      : types.find((t) => t.id === draft.type)?.title ||
                        "Report type"
                  }
                  icon={<Tag size={18} color={muted} />}
                  onPress={() => setView("type")}
                />
                <Field
                  label="Report period"
                  value={
                    draft.period === "custom"
                      ? `${draft.start || "Start"} — ${draft.end || "End"}`
                      : periodLabels[draft.period]
                  }
                  icon={<CalendarDays size={18} color={muted} />}
                  onPress={() => setView("period")}
                />
                <Field
                  label="Sort by"
                  value={sortLabels[draft.sort]}
                  icon={<ArrowDownUp size={18} color={muted} />}
                  onPress={() => setView("sort")}
                />
              </>
            ) : view === "period" ? (
              <>
                <Select
                  presentation="content"
                  value={draft.period}
                  onValueChange={(v) => {
                    setDraft((d) => ({ ...d, period: v }));
                    if (v !== "custom") setView("filters");
                  }}
                >
                  <Select.Item value="all" label="All dates" />
                  <Select.Item value="month" label="This month" />
                  <Select.Item value="last-month" label="Last month" />
                  <Select.Item value="quarter" label="Last 3 months" />
                  <Select.Item value="year" label="This year" />
                  <Select.Item value="custom" label="Custom dates" />
                </Select>
                {draft.period === "custom" ? (
                  <>
                    <Input
                      label="Start date"
                      value={draft.start}
                      placeholder="YYYY-MM-DD"
                      onChangeText={(start) =>
                        setDraft((d) => ({ ...d, start }))
                      }
                      startContent={<CalendarDays size={18} color={muted} />}
                      interactiveContent={false}
                      autoCapitalize="none"
                    />
                    <Button variant="outline" onPress={() => setView("start")}>
                      Choose a start date
                    </Button>
                    <Input
                      label="End date"
                      value={draft.end}
                      placeholder="YYYY-MM-DD"
                      onChangeText={(end) => setDraft((d) => ({ ...d, end }))}
                      startContent={<CalendarDays size={18} color={muted} />}
                      interactiveContent={false}
                      autoCapitalize="none"
                    />
                    <Button variant="outline" onPress={() => setView("end")}>
                      Choose an end date
                    </Button>
                    {!validDateRange(draft.start, draft.end) ? (
                      <Text size="sm" accessibilityRole="alert">
                        Choose valid dates with the end on or after the start.
                      </Text>
                    ) : null}
                    <Button
                      disabled={!validDateRange(draft.start, draft.end)}
                      onPress={() => setView("filters")}
                    >
                      Use these dates
                    </Button>
                  </>
                ) : null}
              </>
            ) : view === "start" || view === "end" ? (
              <ReportCalendar
                key={view}
                value={draft[view]}
                onSelect={(date) => {
                  setDraft((d) => ({ ...d, [view]: date, period: "custom" }));
                  setView("period");
                }}
              />
            ) : (
              <Select
                presentation="content"
                searchable={view === "type" || view === "account"}
                value={draft[view]}
                onValueChange={(v) => select(view, v)}
              >
                {view === "account" ? (
                  <>
                    <Select.Item value="all" label="All linked accounts" />
                    {accounts.map((a) => (
                      <Select.Item
                        key={a.id}
                        value={a.id}
                        label={`${a.registeredName} · ••${a.accountNumber?.slice(-4) || "—"}`}
                      />
                    ))}
                  </>
                ) : view === "status" ? (
                  <>
                    <Select.Item value="all" label="All statuses" />
                    {CONSUMER_TICKET_STATUSES.map((s) => (
                      <Select.Item
                        key={s}
                        value={s}
                        label={consumerTicketStatusLabel(s)}
                      />
                    ))}
                    <Select.Item
                      value="pending"
                      label="Status update pending"
                    />
                  </>
                ) : view === "type" ? (
                  <>
                    <Select.Item value="all" label="All report types" />
                    {types.map((t) => (
                      <Select.Item key={t.id} value={t.id} label={t.title} />
                    ))}
                    {meta.busy && types.length === 0 ? <ContentSkeleton layout="selection" label="Loading report types" /> : null}
                    {meta.error ? (
                      <Button
                        variant="outline"
                        onPress={() => void meta.reload(true)}
                      >
                        Reload report types
                      </Button>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Select.Item value="newest" label="Newest first" />
                    <Select.Item value="oldest" label="Oldest first" />
                    <Select.Item value="status" label="Status" />
                  </>
                )}
              </Select>
            )}
          </BottomSheet.Body>
          {view === "filters" ? (
            <BottomSheet.Footer>
              <Button
                fullWidth
                disabled={
                  draft.period === "custom" &&
                  !validDateRange(draft.start, draft.end)
                }
                onPress={() => {
                  setFilters(draft);
                  setTab("all");
                  setSheet(false);
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
    </ReportPage>
  );
}
