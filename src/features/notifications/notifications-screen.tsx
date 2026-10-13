import { useRef, useState } from "react";
import { SectionList, View } from "react-native";
import { useRouter } from "expo-router";
import { Bell, ChevronLeft, ChevronRight, FileText, Link, MapPin, Megaphone, Search, Settings, SlidersHorizontal, X } from "lucide-react-native";
import { Badge } from "@/components/panelui/badge";
import { BottomSheet } from "@/components/panelui/bottom-sheet";
import { Button } from "@/components/panelui/button";
import { RadioGroup } from "@/components/panelui/radio-group";
import { InputGroup } from "@/components/panelui/input-group";
import { DataState, DataNotice } from "@/components/data-state";
import { Text } from "@/components/panelui/text";
import { ReportPage } from "@/features/reports/components/report-page";
import { useAppColors } from "@/hooks/use-app-colors";
import type { MobileNotification, MobileNotificationCategory } from "@/services/notifications";
import { notificationFixtureNow } from "./fixtures";
import { groupNotifications, matchesNotification, notificationCategories, notificationContext, notificationRoute, notificationTime } from "./presentation";
import { NotificationGate, NotificationNotice } from "./notification-ui";
import { useNotificationAccess, useNotifications, type NotificationAccess } from "./use-notifications";

export default function NotificationsScreen() {
  const access = useNotificationAccess();
  return <NotificationGate access={access}><NotificationInbox key={access.key} access={access} /></NotificationGate>;
}

function NotificationInbox({ access }: { access: NotificationAccess }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | MobileNotificationCategory>("all");
  const [selectedAccount, setSelectedAccount] = useState("all");
  const [unread, setUnread] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [view, setView] = useState("filters");
  const [fixtureState, setFixtureState] = useState("loaded");
  const [draft, setDraft] = useState({ category, account: selectedAccount });
  const [retryItem, setRetryItem] = useState<MobileNotification | null>(null);
  const [primary, muted] = useAppColors(["primary", "muted-foreground"]);
  const accountId = selectedAccount === "all" || access.account?.authorizedServiceAccountIds.includes(selectedAccount) ? selectedAccount : "all";
  const feed = useNotifications(access, category, accountId, unread);
  const list = useRef<SectionList<MobileNotification>>(null);
  const preview = access.fixtures ? fixtureState : "loaded";
  const rows = preview === "empty" || preview === "loading" || preview === "error" ? [] : feed.rows.filter((row) => matchesNotification(row, query));
  const busy = feed.busy || preview === "loading";
  const stale = feed.data?.isStale || preview === "offline";
  const more = Boolean(feed.data?.nextCursor) && !stale;
  const error = preview === "error" ? "Notifications could not load. Try again." : feed.error;
  const hasData = access.fixtures ? !["loading", "error"].includes(preview) : !!feed.data;
  const pageError = preview === "page-error" || feed.errorSource === "more";
  const openFilters = () => { setDraft({ category, account: accountId }); setView("filters"); setSheet(true); };
  const refresh = () => access.fixtures ? setFixtureState("loaded") : void feed.reload(true);
  const open = async (item: MobileNotification) => {
    if (feed.mutation.busy) return;
    setRetryItem(item);
    if (access.fixtures && preview === "read-error") { setFixtureState("read-error-shown"); return; }
    const destination = access.account && notificationRoute(item, access.account);
    if (!destination) return;
    if (!item.isRead && !stale && !(await feed.mutate(item))) return;
    if (access.isCurrent()) router.push(destination);
  };
  const count = !hasData || preview === "empty" ? 0 : feed.unreadCount;
  const notice = feed.mutation.notice;
  return <ReportPage title="Notifications" scroll={false} onBack={() => router.canGoBack() ? router.back() : router.replace("/home")}
    headerAction={<Button variant="ghost" size="icon" style={{ width: 44, height: 44 }} hitSlop={2} accessibilityLabel="Alerts settings" onPress={() => router.push("/notification-settings")}><Settings size={20} color={muted} /></Button>}>
    <View className="gap-2 pb-3" style={{ marginTop: -4 }}>
      <View className="flex-row items-center justify-between" style={{ minHeight: 44 }}>
        <Text size="xs" muted weight="medium">{!hasData ? busy ? "Checking for updates…" : "Updates unavailable" : count ? `${count} unread update${count === 1 ? "" : "s"}` : "All caught up"}</Text>
        <Button variant="ghost" size="sm" className="min-h-11 px-2" labelClassName="text-xs text-primary" disabled={!hasData || !count || busy || stale || feed.readOnly || feed.data?.accessDenied} loading={feed.mutation.busy}
          onPress={() => { setRetryItem(null); if (preview === "read-error") setFixtureState("read-error-shown"); else void feed.mutate(); }}>Mark all read</Button>
      </View>
      <InputGroup>
        <InputGroup.Prefix isDecorative><Search size={18} color={muted} /></InputGroup.Prefix>
        <InputGroup.Input accessibilityLabel="Search notifications" placeholder="Search notifications" value={query} onChangeText={setQuery} autoCorrect={false} className="min-h-12 rounded-xl bg-card text-sm" style={{ height: 48 }} />
        {query ? <InputGroup.Suffix><Button variant="ghost" size="icon" style={{ width: 48, height: 48 }} accessibilityLabel="Clear notification search" onPress={() => setQuery("")}><X size={18} color={muted} /></Button></InputGroup.Suffix> : null}
      </InputGroup>
      <View className="flex-row gap-2">
        <View accessibilityRole="tablist" accessibilityLabel="Notification read status" className="flex-1 flex-row items-center rounded-xl bg-card px-1" style={{ minHeight: 44 }}>
          {[false, true].map((value) => <Button key={String(value)} variant="ghost" size="sm" className="flex-1 px-1 min-h-11" role="tab" accessibilityRole="tab" aria-selected={unread === value} accessibilityState={{ selected: unread === value }} onPress={() => { setUnread(value); if (rows.length) list.current?.scrollToLocation({ sectionIndex: 0, itemIndex: 0, animated: false }); }}>
            <View className={unread === value ? "w-full flex-row items-center justify-center gap-1 rounded-xl bg-accent px-2" : "w-full flex-row items-center justify-center gap-1 px-2"} style={{ minHeight: 36 }}><Text size="xs" weight="semibold" className="text-foreground">{value ? "Unread" : "All"}</Text>{value && count > 0 ? <Badge variant="secondary" className="self-center rounded-md px-1 py-0" labelClassName="text-xs">{count}</Badge> : null}</View>
          </Button>)}
        </View>
        <Button variant="outline" size="sm" className="min-h-11 rounded-xl px-4" labelClassName="text-xs" startContent={<SlidersHorizontal size={16} color={muted} />} onPress={openFilters}>Filters{category !== "all" || accountId !== "all" ? " · active" : ""}</Button>
      </View>
    </View>
    <SectionList ref={list} sections={groupNotifications(rows, access.fixtures ? notificationFixtureNow : new Date())} keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} stickySectionHeadersEnabled={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingBottom: 24 }}
      refreshing={!access.fixtures && feed.busy && !feed.loadingMore && Boolean(feed.data)} onRefresh={refresh}
      renderSectionHeader={({ section }) => <Text size="xs" weight="semibold" muted className="pb-2 pt-4">{section.title}</Text>}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      ListHeaderComponent={<View className="gap-3">
        {feed.readOnly ? <NotificationNotice title="Read-only preview">Viewing live inbox rows is allowed; read actions are paused in this preview.</NotificationNotice> : null}
        {access.fixtures ? <Button variant="ghost" size="sm" onPress={() => { setView("preview"); setSheet(true); }}>Choose fixture state</Button> : null}
        {query && more ? <Text size="xs" muted>Search covers loaded notifications. Load earlier updates to search more.</Text> : null}
        {stale ? <View className="rounded-xl bg-warning-subtle p-3 gap-1"><Text size="sm" weight="semibold">Showing saved notifications</Text><Text size="xs">Connect to the internet to check for new updates.</Text><Button variant="ghost" size="sm" onPress={refresh}>Refresh notifications</Button></View> : null}
        {feed.data?.accessDenied ? <><NotificationNotice title="Notification access changed">Sign in with the intended account or refresh account access before viewing private updates.</NotificationNotice><Button onPress={() => router.push("/sign-in")}>Sign in</Button><Button variant="outline" onPress={() => void access.refreshConsumerAccount().then(() => feed.reload(true)).catch(() => undefined)}>Refresh account access</Button></> : null}
        {hasData && error && !pageError ? <DataNotice title="Could not refresh notifications" description="Your loaded updates are still available. Connect and refresh for the latest activity." actionLabel="Refresh notifications" onAction={refresh} busy={busy} /> : null}
        {feed.mutation.error || preview === "read-error-shown" ? <><NotificationNotice title="Read status could not be saved" danger>{feed.mutation.error || "Your notification is still unread. Connect and try again."}</NotificationNotice><Button variant="outline" onPress={() => { setFixtureState("loaded"); if (retryItem) void open(retryItem); else void feed.mutate(); }}>Retry read action</Button></> : null}
        {notice ? <Text accessibilityLiveRegion="polite" size="xs" className="text-primary">{notice}</Text> : null}
      </View>}
      renderItem={({ item }) => {
        const Icon = item.entityType === "account_linking" ? Link : item.category === "area_incidents" ? MapPin : item.category === "report_updates" ? FileText : item.category === "advisories" && !/billing|collection|payment/i.test(item.title) ? Megaphone : Bell;
        return <Button variant="ghost" className={item.isRead ? "items-start justify-start gap-2.5 rounded-xl bg-card p-3" : "items-start justify-start gap-2.5 rounded-xl bg-primary/5 p-3"} style={{ minHeight: 44 }} accessibilityLabel={`${item.isRead ? "Read" : "Unread"}: ${item.title}. ${notificationContext(item)}`} disabled={feed.mutation.busy} onPress={() => void open(item)}>
          <View className={item.isRead ? "items-center justify-center rounded-xl bg-muted" : "items-center justify-center rounded-xl bg-card"} style={{ width: 32, height: 32 }}><Icon size={20} color={primary} /></View>
          <View className="flex-1 gap-1"><Text weight="semibold" style={{ fontSize: 14, lineHeight: 20 }}>{item.title}</Text>{item.description ? <Text style={{ fontSize: 13, lineHeight: 20 }}>{item.description}</Text> : null}<Text size="xs" weight="medium" className="text-primary">{notificationContext(item)}</Text><View className="flex-row items-center gap-2"><Text muted style={{ fontSize: 11, lineHeight: 16.5 }}>{notificationTime(item, access.fixtures ? notificationFixtureNow : new Date())}</Text>{item.severity === "High" || item.severity === "Critical" ? <Badge variant="destructive" className="rounded-md bg-destructive/10 px-1.5 py-0.5" labelClassName="text-destructive text-xs">{item.severity}</Badge> : null}</View></View>
          <View className="items-center gap-3 pt-1" style={{ width: 16 }}>{!item.isRead ? <View className="rounded-full bg-primary" style={{ width: 6, height: 6 }} /> : null}<ChevronRight size={16} color={muted} /></View>
        </Button>;
      }}
      ListEmptyComponent={!hasData && busy ? <DataState loading loadingLayout="notification" title="Loading your updates" /> : !hasData && error ? <DataState title="Updates couldn’t be loaded" description="Check your connection and try again. This does not mean your inbox is empty." actionLabel="Try again" onAction={refresh} /> : !feed.data?.accessDenied && hasData ? <DataState icon={Bell}
        title={query ? "No search results" : unread ? "You’re all caught up" : category !== "all" || accountId !== "all" ? "No matching notifications" : "Your updates will appear here"}
        description={more ? "There may be matches in earlier pages. Load earlier updates to keep searching." : query ? "Try another title, report reference or account." : unread ? "Your earlier updates are still available under All." : "Report activity and ALECO announcements will be collected in this inbox."}
        actionLabel={query ? "Clear search" : unread ? "View all notifications" : category !== "all" || accountId !== "all" ? "Reset filters" : "Browse advisories"}
        onAction={() => { if (query) setQuery(""); else if (unread) setUnread(false); else if (category !== "all" || accountId !== "all") { setCategory("all"); setSelectedAccount("all"); } else router.push("/advisories"); }} /> : null}
      ListFooterComponent={<View className="py-4 gap-3">{pageError ? <DataNotice title="Earlier updates couldn’t load" description="The updates above are still available. Retry without losing your place." /> : null}
        {more || preview === "page-error" ? <Button variant="outline" disabled={feed.mutation.busy} loading={busy} onPress={() => access.fixtures ? setFixtureState("loaded") : void feed.loadMore()}>{pageError ? "Retry earlier updates" : "Load earlier updates"}</Button> : rows.length ? <Text muted size="xs" className="text-center">{stale ? "Saved inbox · refresh when connected" : "End of notifications"}</Text> : null}</View>}
    />
    <BottomSheet open={sheet} onOpenChange={setSheet}><BottomSheet.Content className="px-4" size="auto" onBack={view === "preview" ? () => setView("filters") : undefined}>
      <BottomSheet.Header><View className="flex-row items-center gap-2">{view === "preview" ? <Button variant="ghost" size="icon" accessibilityLabel="Back to filters" onPress={() => setView("filters")}><ChevronLeft size={20} color={primary} /></Button> : null}<Text size="lg" weight="semibold">{view === "preview" ? "Fixture notification states" : "Filter notifications"}</Text></View></BottomSheet.Header>
      <BottomSheet.Body className="gap-3" showsVerticalScrollIndicator={false}>
        {view === "preview" ? <><Text muted size="sm">Sample content and actions stay in memory. No live notification changes.</Text>{["loaded", "empty", "loading", "offline", "error", "read-error", "page-error"].map((state) => <Button key={state} variant="ghost" className="justify-start min-h-11" onPress={() => { setFixtureState(state); setSheet(false); }}>{state}</Button>)}</> : <>
          <Text muted size="xs" weight="semibold">Category</Text>
          <RadioGroup variant="card" value={draft.category} accessibilityLabel="Notification category" onValueChange={value => setDraft(before => ({ ...before, category: value as typeof category }))}>
            {notificationCategories.map(({ value, label }) => <RadioGroup.Item key={value} value={value} label={label} />)}
          </RadioGroup>
          <Text muted size="xs" weight="semibold">Service account</Text>
          <RadioGroup variant="card" value={draft.account} accessibilityLabel="Notification service account" onValueChange={value => setDraft(before => ({ ...before, account: value }))}>
            <RadioGroup.Item value="all" label="All accounts" />
            {access.account?.accounts.filter(account => access.account!.authorizedServiceAccountIds.includes(account.id)).map(account => <RadioGroup.Item key={account.id} value={account.id} label={`${account.registeredName}${account.accountNumber ? ` · ••${account.accountNumber.slice(-4)}` : ""}`} />)}
          </RadioGroup>
        </>}
      </BottomSheet.Body>
      {view === "filters" ? <BottomSheet.Footer className="flex-row gap-2"><Button variant="outline" className="rounded-2xl min-h-12" onPress={() => setDraft({ category: "all", account: "all" })}>Reset</Button><Button className="flex-1 rounded-2xl min-h-12" onPress={() => { setCategory(draft.category); setSelectedAccount(draft.account); setSheet(false); }}>Show notifications</Button></BottomSheet.Footer> : null}
    </BottomSheet.Content></BottomSheet>
  </ReportPage>;
}
