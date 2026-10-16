import { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { ReportPage } from "@/features/reports/components/report-page";
import { SearchField } from "@/components/search-field";
import { Select } from "@/components/panelui/select";
import { Text } from "@/components/panelui/text";
import { DataState, DataNotice } from "@/components/data-state";
import { Phone, Search } from "lucide-react-native";
import { Field } from "@/components/panelui/field";
import { useScopedRead } from "@/hooks/use-scoped-read";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useManualRefresh } from "@/hooks/use-manual-refresh";
import { useVisualPreview } from "@/context/visual-preview-context";
import { fixtureHotlines } from "@/features/main-fixtures";
import { fetchHotlines } from "@/services/hotlines";
import { ContactCard } from "./contact-card";
import { EmergencyCard } from "./emergency-card";
export default function HotlineDirectoryScreen() {
  const router = useRouter(),
    { session } = useAuthSession(),
    { publicFixtures: fixtures } = useVisualPreview();
  const params = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(
      typeof params.q === "string" ? params.q : "",
    ),
    [category, setCategory] = useState("all"),
    [sort, setSort] = useState("az");
  const data = useScopedRead(fixtures ? null : "hotline-directory", (force) =>
    fetchHotlines({ force }),
  );
  const { refresh, refreshing } = useManualRefresh(
    "hotlines", fixtures ? "fixture" : session?.user.id ?? "guest",
    () => fixtures ? undefined : data.reload(true),
    !fixtures && data.busy,
  );
  const categories = fixtures ? fixtureHotlines : (data.data?.categories ?? []);
  const groups = categories
    .filter((c) => category === "all" || c.id === category)
    .map((c) => ({
      ...c,
      agencies: c.agencies
        .filter((a) =>
          [
            c.name,
            a.name,
            a.description,
            a.address,
            ...a.contacts.map((p) => p.number),
          ]
            .join(" ")
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
        )
        .sort((a, b) =>
          sort === "za"
            ? b.name.localeCompare(a.name)
            : a.name.localeCompare(b.name),
        ),
    }))
    .filter((c) => c.agencies.length);
  return (
    <ReportPage
      title="All hotlines"
      refreshing={refreshing}
      onRefresh={refresh}
      onBack={() =>
        router.canGoBack() ? router.back() : router.replace("/hotlines")
      }
    >
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Search name, number or category"
      />
      <View className="flex-row gap-3">
        <Field className="flex-1">
          <Field.Label>Category</Field.Label>
          <Select value={category} onValueChange={setCategory}>
            <Select.Item value="all" label="All categories" />
            {categories.map((c) => (
              <Select.Item key={c.id} value={c.id} label={c.name} />
            ))}
          </Select>
        </Field>
        <Field className="flex-1">
          <Field.Label>Sort</Field.Label>
          <Select value={sort} onValueChange={setSort}>
            <Select.Item value="az" label="A–Z" />
            <Select.Item value="za" label="Z–A" />
          </Select>
        </Field>
      </View>
      {category === "all" && !query ? (
        <>
          <Text muted size="xs">
            EMERGENCY
          </Text>
          <EmergencyCard />
        </>
      ) : null}
      {!fixtures && !data.data && data.busy ? <DataState loading loadingLayout="contact" title="Loading the hotline directory" /> : null}
      {!fixtures && !data.data && data.error ? <DataState title="The directory couldn’t load" description="Reconnect and try again to get agency contacts. Emergency calling is still available on Hotlines." actionLabel="Try again" onAction={refresh} /> : null}
      {data.data && (data.error || data.data.isStale) ? <DataNotice title={data.error ? "Could not refresh contacts" : "Showing saved contacts"} description="The directory may have changed. Connect and refresh to check current contact details." actionLabel="Refresh directory" onAction={refresh} busy={data.busy} /> : null}
      {groups.map((c) => (
        <View className="gap-2" key={c.id}>
          <Text muted size="xs">
            {c.name.toUpperCase()}
          </Text>
          {c.agencies.map((a) => (
            <ContactCard key={a.id} agency={a} disableActions={fixtures} />
          ))}
        </View>
      ))}
      {(fixtures || data.data) && !groups.length ? <DataState icon={query || category !== "all" ? Search : Phone}
        title={query || category !== "all" ? "No matching hotlines" : "No contacts published yet"}
        description={query || category !== "all" ? "Try another name or number, or reset the category filter." : "ALECO has not published contacts in this directory. Emergency calling is still available on Hotlines."}
        actionLabel={query || category !== "all" ? "Clear filters" : "Back to Hotlines"}
        onAction={() => { if (query || category !== "all") { setCategory("all"); setQuery(""); } else router.replace("/hotlines"); }} /> : null}
    </ReportPage>
  );
}
