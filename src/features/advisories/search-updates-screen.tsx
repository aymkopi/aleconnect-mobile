import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ReportPage } from "@/features/reports/components/report-page";
import { Field } from "@/components/panelui/field";
import { SearchField } from "@/components/search-field";
import { Text } from "@/components/panelui/text";
import { Tabs } from "@/components/panelui/tabs";
import { Button } from "@/components/panelui/button";
import { EmptyState } from "@/components/panelui/empty-state";
import { DataState, DataNotice } from "@/components/data-state";
import { Search } from "lucide-react-native";
import { PublisherCard } from "./publisher-card";
import { useUpdateFeed } from "./use-update-feed";
import { matchesUpdate, updateRoute } from "./presentation";
export default function SearchUpdatesScreen() {
  const params = useLocalSearchParams<{ q?: string }>(),
    router = useRouter(),
    feed = useUpdateFeed();
  const [query, setQuery] = useState(
      typeof params.q === "string" ? params.q : "",
    ),
    [tab, setTab] = useState("all");
  const items = feed.items.filter((item) => matchesUpdate(item, query, tab));
  const back = () =>
    router.canGoBack() ? router.back() : router.replace("/advisories");
  return (
    <ReportPage
      title="Search updates"
      onBack={back}
      footer={
        <>
          <Text muted size="xs">Clear the search text. Your selected tab stays active.</Text>
          <Button
            variant="outline"
            fullWidth
            disabled={!query}
            onPress={() => setQuery("")}
          >
            Clear search
          </Button>
        </>
      }
    >
      <Field>
        <Field.Label>Search updates</Field.Label>
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder="Topic, area or control number"
          isClearable={false}
        />
        <Field.Description>
          Search loaded advisories and posts. Load older updates to search
          further back.
        </Field.Description>
      </Field>
      <Tabs
        defaultValue="all"
        value={tab}
        onValueChange={setTab}
        variant="pill"
      >
        <Tabs.List className="min-h-12 gap-1 items-center">
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
      {feed.authLoading || (feed.busy && !feed.data && !feed.fixtures) ? (
        <DataState loading loadingLayout="advisory" title="Searching ALECO updates" />
      ) : feed.signIn ? (
        <EmptyState variant="card">
          <EmptyState.Title>Sign in to search your updates</EmptyState.Title>
          <EmptyState.Description>
            View advisories for the service accounts you can access.
          </EmptyState.Description>
          <EmptyState.Content>
            <Button onPress={() => router.push({ pathname: "/sign-in", params: { returnTo: "/advisories" } })}>Sign in</Button>
          </EmptyState.Content>
        </EmptyState>
      ) : feed.error && !feed.data ? (
        <DataState title="Updates couldn’t load" description="Reconnect and retry. Your search is kept in place." actionLabel="Try again" busy={feed.busy} onAction={() => void feed.reload(true)} />
      ) : (
        <>
          {feed.data && (feed.data.isStale || feed.error && feed.errorSource !== "more") ? <DataNotice title={feed.error ? "Could not refresh updates" : "Showing saved updates"} description="Your loaded updates are still available. Connect and refresh for the latest notices." actionLabel="Refresh updates" busy={feed.busy} onAction={() => void feed.reload(true)} /> : null}
          <Text weight="semibold" style={{ fontSize: 18, lineHeight: 26 }}>
            Matching updates
          </Text>
          {items.length ? (
            items.map((item) => (
              <PublisherCard
                key={item.kind + item.id}
                item={item}
                onPress={() => router.push(updateRoute(item))}
              />
            ))
          ) : (
            <DataState icon={Search} title="No matching updates" description={feed.data?.nextCursor ? "There may be matches in earlier pages. Load older updates to keep searching." : "Try another topic or area, or choose a different tab. Use Clear search below to remove the search text."} />
          )}
          {feed.error && feed.errorSource === "more" ? <DataNotice title="Earlier updates couldn’t load" description="The updates above are still available. Retry without losing your place." /> : null}
          {feed.data?.nextCursor && !feed.data.isStale ? <Button variant="outline" loading={feed.busy} onPress={() => void feed.loadMore()}>{feed.errorSource === "more" ? "Retry earlier updates" : "Load older updates"}</Button> : null}
          {!feed.fixtures ? (
            <Button
              variant="ghost"
              loading={feed.busy}
              onPress={() => void feed.reload(true)}
            >
              Refresh updates
            </Button>
          ) : null}
        </>
      )}
    </ReportPage>
  );
}
