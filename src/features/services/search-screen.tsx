import { useEffect, useState } from "react";
import { useGuestAccess } from "@/context/guest-access-context";
import { openContact } from "@/features/hotlines/contact-card";
import { useRouter, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { ReportPage } from "@/features/reports/components/report-page";
import { Text } from "@/components/panelui/text";
import { Button } from "@/components/panelui/button";
import { ContentSkeleton } from "@/components/content-skeleton";
import { DataNotice } from "@/components/data-state";
import { SearchField } from "@/components/search-field";
import { useScopedRead } from "@/hooks/use-scoped-read";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useConsumerAccount } from "@/hooks/use-consumer-account";
import { useVisualPreview } from "@/context/visual-preview-context";
import { fetchHotlines } from "@/services/hotlines";
import { fetchComplaintReportPage } from "@/services/reports";
import { fixtureHotlines, fixtureReports } from "@/features/main-fixtures";
import { searchServices } from "./catalog";
import { ServiceRow } from "./service-row";
export default function SearchScreen() {
  const router = useRouter(),
    params = useLocalSearchParams<{ q?: string }>();
  const { openFeature } = useGuestAccess();
  const [query, setQuery] = useState(
      typeof params.q === "string" ? params.q : "",
    ),
    [term, setTerm] = useState(query.trim());
  const { session } = useAuthSession(),
    { accountContext } = useConsumerAccount(),
    { fixtures, publicFixtures } = useVisualPreview();
  useEffect(() => {
    const timer = setTimeout(() => setTerm(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);
  const contacts = useScopedRead(publicFixtures ? null : "search-hotlines", (force) =>
    fetchHotlines({ force }),
  );
  const reportKey =
    !fixtures && session && term
      ? JSON.stringify([
          "search-reports",
          session.user.id,
          accountContext?.identityUserId,
          accountContext?.accessRevision,
          term,
        ])
      : null;
  const reports = useScopedRead(reportKey, (force) =>
    fetchComplaintReportPage({
      userId: session?.user.id,
      identityUserId: accountContext?.identityUserId,
      accessRevision: accountContext?.accessRevision,
      query: term,
      limit: 20,
      revalidate: true,
      force,
    }),
  );
  const catalog = term ? searchServices(term) : [];
  const hotlines = (
    publicFixtures ? fixtureHotlines : (contacts.data?.categories ?? [])
  )
    .flatMap((c) => c.agencies)
    .filter((a) =>
      [a.name, a.description, a.address, ...a.contacts.map((p) => p.number)]
        .join(" ")
        .toLowerCase()
        .includes(term.toLowerCase()),
    );
  const rows = fixtures
    ? fixtureReports.filter((r) =>
        [r.title, r.ticketNumber, r.displayAddress]
          .join(" ")
          .toLowerCase()
          .includes(term.toLowerCase()),
      )
    : (reports.data?.reports ?? []);
  return (
    <ReportPage
      title="Search"
      onBack={() =>
        router.canGoBack() ? router.back() : router.replace("/home")
      }
      footer={
        <Button variant="outline" onPress={() => setQuery("")}>
          Clear search
        </Button>
      }
    >
      <Text weight="semibold" size="lg">
        Find what you need
      </Text>
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Search services, reports or hotlines"
      />
      {!term ? (
        <Text muted size="sm">
          Search for a service, report number, agency or contact number.
        </Text>
      ) : (
        <>
          <Text muted size="xs">
            SERVICES
          </Text>
          <View className="gap-2">
            {catalog.map((s) => (
              <ServiceRow
                key={s.id}
                title={s.title}
                description={s.description}
                icon={s.icon}
                onPress={() => s.route.startsWith("https://") ? void openContact(s.route) : openFeature(s.route, true)}
              />
            ))}
          </View>
          {!catalog.length ? (
            <Text muted size="sm">
              No matching services.
            </Text>
          ) : null}
          {session || fixtures ? (
            <>
              <Text muted size="xs">
                YOUR REPORTS
              </Text>
              {reports.busy && !reports.data ? <ContentSkeleton layout="report" count={2} label="Searching reports" /> : null}
              {reports.error ? <DataNotice title="Reports search couldn’t load" description="Other search results remain available. Reconnect and retry this search." actionLabel="Retry reports search" busy={reports.busy} onAction={() => void reports.reload(true)} /> : null}
              {rows.map((r) => (
                <ServiceRow
                  key={r.id}
                  title={r.ticketNumber + " · " + r.title}
                  description={r.displayAddress ?? undefined}
                  onPress={() =>
                    router.push({
                      pathname: "/reports/[id]",
                      params: { id: r.id },
                    })
                  }
                />
              ))}
              {!reports.busy && !reports.error && !rows.length ? (
                <Text muted size="sm">
                  No matching reports.
                </Text>
              ) : null}
              {reports.data?.nextCursor ? (
                <Button
                  variant="ghost"
                  onPress={() =>
                    router.push({
                      pathname: "/reports/list",
                      params: { query: term },
                    })
                  }
                >
                  View all matching reports
                </Button>
              ) : null}
            </>
          ) : (
            <ServiceRow
              title="Sign in to search your reports"
              description="Reports are private to your account."
              icon="account"
              onPress={() => openFeature("/reports")}
            />
          )}
          <Text muted size="xs">
            HOTLINES
          </Text>
          {contacts.busy && !contacts.data ? <ContentSkeleton layout="contact" count={2} label="Searching hotlines" /> : null}
          {contacts.error ? <DataNotice title="Hotlines search couldn’t load" description="Other search results remain available. Reconnect and retry to find contacts." actionLabel="Retry hotlines search" busy={contacts.busy} onAction={() => void contacts.reload(true)} /> : null}
          {hotlines.map((a) => (
            <ServiceRow
              key={a.id}
              title={a.name}
              description={a.description ?? a.address ?? undefined}
              icon="phone"
              onPress={() =>
                router.push({
                  pathname: "/hotline-directory",
                  params: { q: a.name },
                })
              }
            />
          ))}
          {!contacts.busy && !contacts.error && !hotlines.length ? (
            <Text muted size="sm">
              No matching contacts.
            </Text>
          ) : null}
          <ServiceRow
            title="Search ALECO updates"
            description={"Advisories and posts matching “" + term + "”"}
            icon="updates"
            onPress={() =>
              router.push({ pathname: "/advisory/search", params: { q: term } })
            }
          />
        </>
      )}
    </ReportPage>
  );
}
