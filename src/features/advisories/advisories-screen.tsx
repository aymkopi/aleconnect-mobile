import { DataNotice, DataState } from "@/components/data-state";
import { appScrollableBottomPadding } from "@/components/floating-app-bar";
import { MainPageHeader } from "@/components/main-page-header";
import { Button } from "@/components/panelui/button";
import { Tabs } from "@/components/panelui/tabs";
import { Text } from "@/components/panelui/text";
import { PreviewLabel } from "@/components/preview-label";
import { SearchField } from "@/components/search-field";
import { useMainPageScroll } from "@/hooks/use-main-page-scroll";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useConsumerAccount } from "@/hooks/use-consumer-account";
import { useManualRefresh } from "@/hooks/use-manual-refresh";
import { useRouter } from "expo-router";
import { Megaphone, Search } from "lucide-react-native";
import { useState } from "react";
import { FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { matchesUpdate, updateRoute } from "./presentation";
import { PublisherCard } from "./publisher-card";
import { useUpdateFeed } from "./use-update-feed";
export default function AdvisoriesScreen() {
  const insets = useSafeAreaInsets(),
    router = useRouter(),
    feed = useUpdateFeed();
  const scrollRef = useMainPageScroll<FlatList>(feed.reload);
  const { session } = useAuthSession();
  const { accountContext } = useConsumerAccount();
  const { refresh, refreshing } = useManualRefresh(
    "advisories",
    feed.fixtures ? "fixture" : accountContext?.identityUserId ?? session?.user.id ?? "guest",
    () => feed.fixtures ? undefined : feed.reload(true),
    !feed.fixtures && feed.busy,
  );
  const [query, setQuery] = useState(""),
    [tab, setTab] = useState("all");
  const items = feed.items.filter((item) => matchesUpdate(item, query, tab));
  const hasData = feed.fixtures || !!feed.data;
  const filtered = !!query.trim() || tab !== "all";
  const featured = items[0],
    stories = items.slice(1);
  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <FlatList
        className="flex-1"
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        data={stories}
        keyExtractor={(item) => item.kind + item.id}
        renderItem={({ item }) => (
          <PublisherCard
            item={item}
            onPress={() => router.push(updateRoute(item))}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: appScrollableBottomPadding(insets.bottom),
        }}
        refreshing={refreshing}
        onRefresh={refresh}
        ListHeaderComponent={
          <View className="gap-3 pb-2">
            <PreviewLabel />
            <MainPageHeader title="Advisories" />
            <SearchField
              value={query}
              onChangeText={setQuery}
              placeholder="Search advisories and posts"
              isClearable={false}
            />
            <Tabs
              defaultValue="all"
              value={tab}
              onValueChange={setTab}
              variant="pill"
              size="sm"
            >
              <Tabs.List className="gap-1 min-h-12 items-center">
                {[
                  ["all", "All"],
                  ["advisories", "Advisories"],
                  ["feed", "ALECO feed"],
                ].map(([value, label]) => (
                  <Tabs.Trigger
                    key={value}
                    value={value}
                    className="min-h-8 py-1 px-3"
                  >
                    {label}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
            </Tabs>
            {query ? (
              <View className="flex-row items-center gap-2">
                <Button variant="ghost" size="sm" onPress={() => setQuery("")}>
                  Clear search
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() =>
                    router.push({
                      pathname: "/advisory/search",
                      params: { q: query },
                    })
                  }
                >
                  View matching updates
                </Button>
              </View>
            ) : null}
            {hasData &&
            (feed.data?.isStale ||
              (feed.error && feed.errorSource !== "more")) ? (
              <DataNotice
                title={
                  feed.error
                    ? "Could not refresh updates"
                    : "Showing saved updates"
                }
                description="The updates already loaded are still available. Connect and refresh for the latest notices."
                actionLabel="Refresh updates"
                busy={feed.busy}
                onAction={refresh}
              />
            ) : null}
            {featured ? (
              <>
                <PublisherCard
                  item={featured}
                  featured
                  onPress={() => router.push(updateRoute(featured))}
                />
                {stories.length ? (
                  <Text
                    weight="semibold"
                    style={{ fontSize: 16, lineHeight: 22 }}
                  >
                    Community & stories
                  </Text>
                ) : null}
              </>
            ) : !hasData && (feed.busy || feed.authLoading) ? (
              <DataState
                loading
                loadingLayout="advisory"
                title="Loading ALECO updates"
              />
            ) : feed.signIn ? (
              <DataState
                title="Sign in to see your updates"
                description="View advisories for the service accounts you can access."
                actionLabel="Sign in"
                onAction={() =>
                  router.push({
                    pathname: "/sign-in",
                    params: { returnTo: "/advisories" },
                  })
                }
              />
            ) : !hasData && feed.error ? (
              <DataState
                title="ALECO updates couldn’t load"
                description="Reconnect and try again to get the latest notices."
                actionLabel="Try again"
                onAction={refresh}
                busy={feed.busy}
              />
            ) : (
              <DataState
                icon={filtered ? Search : Megaphone}
                title={
                  filtered ? "No matching updates" : "No updates at the moment"
                }
                description={
                  feed.data?.nextCursor
                    ? "There may be matches in earlier updates. Load more to keep searching."
                    : filtered
                      ? "Try another topic or area, or choose a different tab. Clear search removes only the search text."
                      : "Public advisories and community posts will appear here when ALECO publishes them."
                }
                actionLabel={filtered ? undefined : "Explore services"}
                onAction={filtered ? undefined : () => router.push("/services")}
              />
            )}
          </View>
        }
        ListFooterComponent={
          <View className="pt-3 gap-3">
            {feed.error && feed.errorSource === "more" ? (
              <DataNotice
                title="Earlier updates couldn’t load"
                description="The updates above are still available. Retry without losing your place."
              />
            ) : null}
            {feed.data?.nextCursor && !feed.data?.isStale ? (
              <Button
                variant="outline"
                loading={feed.busy}
                onPress={() => void feed.loadMore()}
              >
                {feed.errorSource === "more"
                  ? "Retry earlier updates"
                  : "Load more updates"}
              </Button>
            ) : null}
          </View>
        }
      />
    </View>
  );
}
