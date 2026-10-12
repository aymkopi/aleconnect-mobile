import { useEffect, useState } from "react";
import { Linking, Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  CalendarClock,
  ChevronRight,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react-native";
import { ReportPage } from "@/features/reports/components/report-page";
import { Text } from "@/components/panelui/text";
import { Card } from "@/components/panelui/card";
import { Badge } from "@/components/panelui/badge";
import { Button } from "@/components/panelui/button";
import { BottomSheet } from "@/components/panelui/bottom-sheet";
import { Field } from "@/components/panelui/field";
import { DataState, DataNotice } from "@/components/data-state";
import { EmptyState } from "@/components/panelui/empty-state";
import { toast } from "@/components/panelui/toast";
import { SearchField } from "@/components/search-field";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useConsumerAccount } from "@/hooks/use-consumer-account";
import { useScopedRead } from "@/hooks/use-scoped-read";
import { useAppColors } from "@/hooks/use-app-colors";
import { useGuestAccess } from "@/context/guest-access-context";
import { useVisualPreview } from "@/context/visual-preview-context";
import { fetchActiveAdvisory } from "@/services/advisories";
import {
  fetchPublicUpdates,
  fetchGuestPublicPost,
  type MobilePublicUpdate,
} from "@/services/public-updates";
import {
  formatManilaDateTime,
  formatManilaAdvisoryInterruptionRange,
} from "@/utils/manila-time";
import {
  updateTopicLabel,
  advisoryTypeLabel,
  advisorySchedule,
  findPublicPost,
  readUpdate,
  safePublicUrl,
} from "./presentation";
import { detailFixture } from "./detail-fixtures";
import { PublicUpdatePhotos } from "./public-update-photos";

export default function AdvisoryDetailScreen() {
  return <UpdateDetailScreen kind="advisory" />;
}
export function PostDetailScreen() {
  return <UpdateDetailScreen kind="facebook_post" />;
}
function UpdateDetailScreen({ kind }: { kind: MobilePublicUpdate["kind"] }) {
  const params = useLocalSearchParams<{ id?: string; preview?: string }>(),
    router = useRouter();
  const id = typeof params.id === "string" ? params.id : "",
    preview = typeof params.preview === "string" ? params.preview : undefined;
  const { session, isLoading } = useAuthSession(),
    { accountContext } = useConsumerAccount(),
    { publicFixtures: fixtures } = useVisualPreview();
  const { guest, requestSignIn } = useGuestAccess();
  const [areas, setAreas] = useState(fixtures && preview === "areas"),
    [query, setQuery] = useState("");
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [foreground, primary] = useAppColors(["foreground", "primary"]);
  const options = {
    userId: session?.user.id ?? "guest",
    publicOnly: !session,
    identityUserId: accountContext?.identityUserId,
    accessRevision: accountContext?.accessRevision,
  };
  const scope =
    !fixtures && !isLoading
      ? JSON.stringify([
          session ? "private" : "public",
          options.userId,
          options.identityUserId,
          options.accessRevision,
          kind,
          id,
        ])
      : null;
  const read = useScopedRead(scope, async (force) => {
    let isStale = false;
    const result = await readUpdate<MobilePublicUpdate>(async () => {
      if (!id) return null;
      if (kind === "advisory")
        return {
          kind: "advisory",
          ...(await fetchActiveAdvisory(id, options)),
        };
      if (!session) return await fetchGuestPublicPost(id);
      // shortcut: no authenticated post-detail endpoint exists; read the scoped feed until its cursor is exhausted.
      return findPublicPost(id, async (cursor) => {
        const page = await fetchPublicUpdates({
          ...options,
          limit: 20,
          cursor,
          force: force || !cursor,
        });
        isStale ||= !!page.isStale;
        return page;
      });
    });
    return { ...result, isStale };
  });
  const fixtureItem = fixtures ? detailFixture(id, preview) : null;
  const item = fixtures
    ? fixtureItem?.kind === kind
      ? fixtureItem
      : null
    : read.data?.item;
  const signIn = !fixtures && !!read.data?.signIn;
  useEffect(() => { if (guest && signIn) requestSignIn("/advisories", "advisory"); }, [guest, signIn, requestSignIn]);
  const busy = fixtures
    ? preview === "loading"
    : isLoading || (read.busy && !read.data);
  const error =
    fixtures && preview === "error"
      ? "Unable to load this update. Check your connection and try again."
      : read.error;
  const unavailable = fixtures ? !item && !error : !!read.data?.unavailable;
  const back = () =>
    router.canGoBack() ? router.back() : router.replace("/advisories");
  const retry = () => {
    if (fixtures) router.setParams({ preview: undefined });
    else void read.reload(true);
  };
  const advisory = item?.kind === "advisory" ? item : null;
  const schedule = advisory ? advisorySchedule(advisory) : null;
  const post = item?.kind === "facebook_post" ? item : null;
  const title =
    advisory?.title || post?.message.split(/[.!?\n]/)[0] || "ALECO update";
  const pageTitle = kind === "advisory" ? "Advisory details" : "From ALECO";
  const body = advisory?.content ?? post?.message ?? "";
  return (
    <ReportPage title={pageTitle} onBack={back} refreshing={pullRefreshing} onRefresh={async () => {
      setPullRefreshing(true);
      try {
        if (fixtures) router.setParams({ preview: undefined });
        else await read.reload(true);
      } finally {
        setPullRefreshing(false);
      }
    }}>
      {busy ? (
        <DataState loading loadingLayout="detail" title="Loading this ALECO update" />
      ) : signIn ? (
        <EmptyState variant="card">
          <EmptyState.Title>Sign in to see your updates</EmptyState.Title>
          <EmptyState.Description>
            Advisories are matched to the service accounts you can access.
          </EmptyState.Description>
          <EmptyState.Content>
            <Button onPress={() => requestSignIn("/advisories", "advisory")}>Sign in</Button>
            <Button variant="outline" onPress={back}>
              Back to advisories
            </Button>
          </EmptyState.Content>
        </EmptyState>
      ) : unavailable ? (
        <EmptyState variant="card">
          <EmptyState.Title>This update is unavailable</EmptyState.Title>
          <EmptyState.Description>
            It may have ended, been withdrawn, or no longer be available to your
            account.
          </EmptyState.Description>
          <EmptyState.Content>
            <Button onPress={() => router.replace("/advisories")}>
              Back to advisories
            </Button>
          </EmptyState.Content>
        </EmptyState>
      ) : (
        <>
          {error ? item ? <DataNotice title="Could not refresh this update" description="The last update loaded for this account remains visible. Refresh to check for changes." actionLabel="Refresh update" busy={read.busy} onAction={retry} /> : <DataState title="This update couldn’t load" description="Reconnect and retry to get the latest notice." actionLabel="Try again" onAction={retry} /> : null}
          {item ? (
            <>
              {read.data?.isStale || (fixtures && preview === "offline") ? (
                <Text muted size="sm" accessibilityRole="alert">
                  Saved post · reconnect and refresh for the latest information.
                </Text>
              ) : null}
              {post?.photos.length ? (
                <PublicUpdatePhotos
                  photos={post.photos}
                  fixtures={fixtures}
                  hero
                />
              ) : null}
              {advisory ? (
                <Card
                  className={
                    "rounded-xl p-4 gap-3 shadow-none " +
                    (advisory.type === "restoration"
                      ? "bg-success/10"
                      : [
                            "scheduled_outage",
                            "unscheduled_outage",
                            "maintenance",
                          ].includes(advisory.type ?? "")
                        ? "bg-warning/10"
                        : "bg-card")
                  }
                >
                  <View className="flex-row flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        advisory.type === "restoration"
                          ? "success"
                          : "secondary"
                      }
                    >
                      {advisory.type === "general" && advisory.topic ? updateTopicLabel(advisory.topic) : advisoryTypeLabel(advisory.type)}
                    </Badge>
                    {["high", "critical"].includes(advisory.severity) ? (
                      <Badge variant="destructive">Important</Badge>
                    ) : null}
                  </View>
                  <Text
                    accessibilityRole="header"
                    style={{
                      fontFamily: "PlusJakartaSans_700Bold",
                      fontSize: 24,
                      lineHeight: 34,
                    }}
                  >
                    {title}
                  </Text>
                  {advisory.controlNumber ? (
                    <Text muted size="sm">
                      Control no. {advisory.controlNumber}
                    </Text>
                  ) : null}
                  {schedule ? (
                    <View className="gap-1">
                      <Text size="sm" weight="semibold">
                        {schedule.label}
                      </Text>
                      <View className="flex-row items-start gap-2">
                        <CalendarClock size={18} color={foreground} />
                        <Text size="sm" className="flex-1">
                          {schedule.label === "Restored at"
                            ? formatManilaDateTime(schedule.start!)
                            : (formatManilaAdvisoryInterruptionRange(
                                schedule.start,
                                schedule.end,
                              ) ?? "Schedule not announced")}
                        </Text>
                      </View>
                      {schedule.label === "Interruption schedule" &&
                      !schedule.end ? (
                        <Text muted size="sm">
                          No restoration estimate has been announced.
                        </Text>
                      ) : null}
                    </View>
                  ) : [
                      "scheduled_outage",
                      "unscheduled_outage",
                      "maintenance",
                    ].includes(advisory.type ?? "") ? (
                    <Text size="sm">
                      No interruption schedule has been announced.
                    </Text>
                  ) : null}
                  <Text muted size="xs">
                    Published {formatManilaDateTime(advisory.publishedAt)} ·
                    Philippine time
                  </Text>
                </Card>
              ) : (
                <View className="gap-2">
                  <Badge variant="info" className="self-start">
                    {updateTopicLabel(item.topic)}
                  </Badge>
                  <Text
                    accessibilityRole="header"
                    style={{
                      fontFamily: "PlusJakartaSans_600SemiBold",
                      fontSize: 24,
                      lineHeight: 34,
                    }}
                  >
                    {title}
                  </Text>
                  <Text muted size="sm">
                    {post?.pageName || "ALECO"} ·{" "}
                    {formatManilaDateTime(item.publishedAt)}
                  </Text>
                </View>
              )}
              {advisory?.audience ? (
                <View className="gap-2">
                  <Text
                    weight="semibold"
                    style={{ fontSize: 18, lineHeight: 26 }}
                  >
                    Affected audience
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="View affected audience"
                    onPress={() => {
                      setQuery("");
                      setAreas(true);
                    }}
                    className="rounded-xl bg-card p-4 flex-row items-center gap-2"
                  >
                    <MapPin size={18} color={primary} />
                    <View className="flex-1 gap-1">
                      <Text weight="semibold" size="sm">
                        {advisory.audience}
                      </Text>
                      <Text muted size="xs">
                        Check who this advisory is for
                      </Text>
                    </View>
                    <ChevronRight size={18} color={primary} />
                  </Pressable>
                </View>
              ) : null}
              <View className="gap-2">
                {advisory ? (
                  <Text
                    weight="semibold"
                    style={{ fontSize: 18, lineHeight: 26 }}
                  >
                    Message from ALECO
                  </Text>
                ) : null}
                <Card className="rounded-xl shadow-none">
                  <Card.Content className="p-4 gap-3">
                    {body.trim() ? (
                      body
                        .split(/\n\s*\n/)
                        .filter(Boolean)
                        .map((paragraph, index) => (
                          <Text
                            key={index}
                            style={{ fontSize: 16, lineHeight: 24 }}
                            selectable
                          >
                            {paragraph}
                          </Text>
                        ))
                    ) : (
                      <Text muted>
                        No additional message was included in this update.
                      </Text>
                    )}
                  </Card.Content>
                </Card>
              </View>
              {advisory?.photos?.length ? (
                <View className="gap-2">
                  <Text
                    weight="semibold"
                    style={{ fontSize: 18, lineHeight: 26 }}
                  >
                    Photos from ALECO
                  </Text>
                  <PublicUpdatePhotos
                    photos={advisory.photos}
                    fixtures={fixtures}
                  />
                </View>
              ) : null}
              {advisory &&
              [
                "scheduled_outage",
                "unscheduled_outage",
                "maintenance",
                "weather_advisory",
                "restoration",
              ].includes(advisory.type ?? "") ? (
                <Card className="rounded-xl p-4 gap-2 bg-muted shadow-none">
                  <View className="flex-row gap-2 items-center">
                    <ShieldCheck size={18} color={primary} />
                    <Text weight="semibold" size="sm">
                      {advisory.type === "restoration"
                        ? "Still without power?"
                        : "Keep your household safe"}
                    </Text>
                  </View>
                  <Text size="sm">
                    {advisory.type === "restoration"
                      ? "Report an issue if your service is still affected. This helps ALECO check your specific concern."
                      : "Stay away from damaged lines and electrical equipment. Contact ALECO for service concerns; use emergency services for immediate danger."}
                  </Text>
                  {advisory.type === "restoration" ||
                  advisory.type === "unscheduled_outage" ? (
                    <Button
                      size="sm"
                      onPress={() => router.push("/reports/new")}
                    >
                      Report an issue
                    </Button>
                  ) : null}
                </Card>
              ) : null}
              {post?.permalink && safePublicUrl(post.permalink) ? (
                <Button
                  variant="outline"
                  onPress={() =>
                    void Linking.openURL(post.permalink!).catch(() =>
                      toast.show({
                        variant: "destructive",
                        label:
                          "Could not open the original post. Please try again.",
                      }),
                    )
                  }
                >
                  Open original post
                </Button>
              ) : null}
              <Button
                variant="outline"
                onPress={() => router.push("/hotlines")}
              >
                <Phone size={18} color={foreground} />
                <Text>Contact ALECO</Text>
              </Button>
              <Button
                variant="ghost"
                onPress={() => router.replace("/advisories")}
              >
                View all updates
              </Button>
            </>
          ) : null}
        </>
      )}
      <BottomSheet
        open={areas && !!advisory && !signIn && !busy && !unavailable}
        onOpenChange={setAreas}
      >
        <BottomSheet.Content>
          <BottomSheet.Header
            title="Affected audience"
            description="As published by ALECO"
          />
          <BottomSheet.Body contentContainerStyle={{ gap: 12 }}>
            <Field>
              <Field.Label>Find your area or feeder</Field.Label>
              <SearchField
                value={query}
                onChangeText={setQuery}
                placeholder="Search the published audience"
              />
              <Field.Description>
                Search this advisory’s audience. Your pin or address does not
                change who receives it.
              </Field.Description>
            </Field>
            {advisory?.audience
              ?.toLocaleLowerCase()
              .includes(query.trim().toLocaleLowerCase()) ? (
              <Card className="rounded-xl p-3 gap-1 shadow-none">
                <Text weight="semibold" size="sm">
                  {advisory.audience}
                </Text>
                <Text muted size="xs">
                  Published audience · service availability is confirmed by
                  ALECO
                </Text>
              </Card>
            ) : (
              <Text muted size="sm">
                No match in the published audience. Contact ALECO if you are
                unsure.
              </Text>
            )}
          </BottomSheet.Body>
          <BottomSheet.Footer>
            <Button fullWidth onPress={() => setAreas(false)}>
              Back to advisory
            </Button>
          </BottomSheet.Footer>
        </BottomSheet.Content>
      </BottomSheet>
    </ReportPage>
  );
}
