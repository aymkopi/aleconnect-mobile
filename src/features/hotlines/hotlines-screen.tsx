import { DataNotice, DataState } from "@/components/data-state";
import { appScrollableBottomPadding } from "@/components/floating-app-bar";
import { MainPageHeader } from "@/components/main-page-header";
import { BottomSheet } from "@/components/panelui/bottom-sheet";
import { Button } from "@/components/panelui/button";
import { Checkbox } from "@/components/panelui/checkbox";
import { Text } from "@/components/panelui/text";
import { toast } from "@/components/panelui/toast";
import { PreviewLabel } from "@/components/preview-label";
import { SearchField } from "@/components/search-field";
import { useGuestAccess } from "@/context/guest-access-context";
import { useVisualPreview } from "@/context/visual-preview-context";
import { fixtureHotlines } from "@/features/main-fixtures";
import { useAppColors } from "@/hooks/use-app-colors";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useMainPageScroll } from "@/hooks/use-main-page-scroll";
import { useManualRefresh } from "@/hooks/use-manual-refresh";
import { useScopedRead } from "@/hooks/use-scoped-read";
import { fetchHotlines, type HotlineCategory } from "@/services/hotlines";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Building2, Flame, Hospital, ShieldCheck } from "lucide-react-native";
import { useEffect, useState } from "react";
import { RefreshControl, ScrollView, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ContactCard } from "./contact-card";
import { EmergencyCard } from "./emergency-card";
export default function HotlinesScreen() {
  const insets = useSafeAreaInsets(),
    { session } = useAuthSession(),
    { publicFixtures: fixtures } = useVisualPreview(),
    [primary] = useAppColors(["primary"]),
    router = useRouter(),
    { width } = useWindowDimensions();
  const { guest, requestSignIn } = useGuestAccess();
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState<HotlineCategory | null>(null),
    [contactQuery, setContactQuery] = useState(""),
    [customize, setCustomize] = useState(false),
    [pinned, setPinned] = useState<{ key: string; ids: string[] } | null>(null);
  const data = useScopedRead(fixtures ? null : "hotlines", (force) =>
    fetchHotlines({ force }),
  );
  const scrollRef = useMainPageScroll<ScrollView>(data.reload);
  const { refresh, refreshing } = useManualRefresh(
    "hotlines", fixtures ? "fixture" : session?.user.id ?? "guest",
    () => fixtures ? undefined : data.reload(true),
    !fixtures && data.busy,
  );
  const categories = fixtures ? fixtureHotlines : (data.data?.categories ?? []),
    agencies = categories.flatMap((c) => c.agencies);
  const aleco = agencies.find((a) => /aleco|albay electric/i.test(a.name)),
    others = categories.filter(
      (c) => !aleco || !c.agencies.some((a) => a.id === aleco.id),
    );
  const key = "hotlines_pinned_categories_v1:" + (session?.user.id ?? "guest");
  useEffect(() => {
    if (guest || fixtures) return;
    let active = true;
    void AsyncStorage.getItem(key)
      .then((value) => {
        if (!active) return;
        try {
          const ids = JSON.parse(value ?? "null");
          setPinned({
            key,
            ids: Array.isArray(ids)
              ? ids.filter((x): x is string => typeof x === "string")
              : others.slice(0, 4).map((c) => c.id),
          });
        } catch {
          setPinned({ key, ids: others.slice(0, 4).map((c) => c.id) });
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [guest, fixtures, key, others.map((c) => c.id).join("|")]);
  const ids =
    !guest && pinned?.key === key
      ? pinned.ids
      : others.slice(0, 4).map((c) => c.id);
  function toggle(id: string, checked: boolean) {
    if (guest) {
      setCustomize(false);
      requestSignIn("/hotlines", "account");
      return;
    }
    const next = checked
      ? [...new Set([...ids, id])]
      : ids.filter((x) => x !== id);
    setPinned({ key, ids: next });
    if (!fixtures)
      void AsyncStorage.setItem(key, JSON.stringify(next)).catch(() =>
        toast.show({
          variant: "destructive",
          label: "Pins could not be saved",
        }),
      );
  }
  const matches = agencies.filter((a) =>
    (
      a.name +
      " " +
      a.description +
      " " +
      a.address +
      " " +
      a.contacts.map((c) => c.number).join(" ")
    )
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const sheetAgencies = (category?.agencies ?? []).filter((agency) =>
    [
      agency.name,
      agency.description,
      agency.address,
      ...agency.contacts.flatMap((contact) => [
        contact.number,
        contact.label,
        contact.type,
      ]),
    ]
      .join(" ")
      .toLowerCase()
      .includes(contactQuery.trim().toLowerCase()),
  );
  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ScrollView
        className="flex-1"
        ref={scrollRef}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: appScrollableBottomPadding(insets.bottom),
          gap: 12,
        }}
      >
        <PreviewLabel />
        <MainPageHeader title="Hotlines" />
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder="Search a hotline or category"
        />
        <EmergencyCard />
        {!fixtures && !data.data && data.busy ? (
          <DataState
            loading
            loadingLayout="contact"
            title="Loading the hotline directory"
          />
        ) : !fixtures && !data.data && data.error ? (
          <DataState
            title="The directory couldn’t load"
            description="Reconnect and try again to get agency contacts. For an emergency, you can still hold to call 911."
            actionLabel="Try again"
            onAction={refresh}
          />
        ) : query ? (
          matches.length ? (
            matches.map((a) => (
              <ContactCard key={a.id} agency={a} disableActions={fixtures} />
            ))
          ) : (
            <DataState
              title="No matching hotlines"
              description="Try another name, number or category."
              actionLabel="Clear search"
              onAction={() => setQuery("")}
            />
          )
        ) : aleco ? (
          <ContactCard agency={aleco} disableActions={fixtures} />
        ) : (
          <DataState
            title="No ALECO contacts published yet"
            description="Browse other agencies below. Emergency calling is still available above."
          />
        )}
        {data.data && (data.error || data.data.isStale) ? (
          <DataNotice
            title={
              data.error
                ? "Could not refresh contacts"
                : "Showing saved contacts"
            }
            description="The directory may have changed. Connect and refresh to check current contact details."
            actionLabel="Refresh directory"
            busy={data.busy}
            onAction={refresh}
          />
        ) : null}
        <View className="flex-row items-center justify-between">
          <Text weight="semibold" style={{ fontSize: 16, lineHeight: 22 }}>
            {guest ? "Browse categories" : "Pinned categories"}
          </Text>
          <Button
            size="sm"
            variant="ghost"
            onPress={() =>
              guest ? requestSignIn("/hotlines", "account") : setCustomize(true)
            }
          >
            <Text className="text-primary" size="xs" weight="semibold">
              {guest ? "Sign in to pin" : "Customize"}
            </Text>
          </Button>
        </View>
        <View className="flex-row flex-wrap gap-3">
          {others
            .filter(
              (c) =>
                ids.includes(c.id) &&
                (c.name.toLowerCase().includes(query.toLowerCase()) || !query),
            )
            .map((c) => {
              const Icon = /police/i.test(c.name)
                ? ShieldCheck
                : /fire/i.test(c.name)
                  ? Flame
                  : /hospital|health/i.test(c.name)
                    ? Hospital
                    : Building2;
              return (
                <Button
                  key={c.id}
                  variant="secondary"
                  className="rounded-xl bg-card"
                  style={{
                    width: Math.floor((width - 44) / 2),
                    minHeight: 68,
                    justifyContent: "flex-start",
                    paddingHorizontal: 12,
                  }}
                  onPress={() => setCategory(c)}
                  startContent={<Icon size={22} color={primary} />}
                  labelClassName="text-sm"
                >
                  {c.name}
                </Button>
              );
            })}
        </View>
        <Button
          variant="outline"
          fullWidth
          onPress={() => router.push("/hotline-directory")}
        >
          View all hotlines
        </Button>
      </ScrollView>

      <BottomSheet
        open={!!category}
        onOpenChange={(open) => {
          if (!open) {
            setCategory(null);
            setContactQuery("");
          }
        }}
      >
        <BottomSheet.Content size="auto">
          <BottomSheet.Header>
            <Text size="lg" weight="semibold">
              {category?.name}
            </Text>
          </BottomSheet.Header>
          <BottomSheet.Body className="gap-3">
            {category?.description ? (
              <Text muted size="sm">
                {category.description}
              </Text>
            ) : null}
            <SearchField
              value={contactQuery}
              onChangeText={setContactQuery}
              placeholder={
                category?.name === "ALECO contacts"
                  ? "Search ALECO contact"
                  : "Search contact name or number"
              }
            />
            {sheetAgencies.map((a) => (
              <ContactCard key={a.id} agency={a} disableActions={fixtures} />
            ))}
            {!sheetAgencies.length ? (
              <Text muted>
                {contactQuery
                  ? "No contacts match your search."
                  : "No contacts published in this category."}
              </Text>
            ) : null}
          </BottomSheet.Body>
        </BottomSheet.Content>
      </BottomSheet>
      <BottomSheet open={customize} onOpenChange={setCustomize}>
        <BottomSheet.Content>
          <BottomSheet.Header>
            <Text size="lg" weight="semibold">
              Pin your categories
            </Text>
          </BottomSheet.Header>
          <BottomSheet.Body className="gap-2">
            {others.map((c) => (
              <Checkbox
                key={c.id}
                checked={ids.includes(c.id)}
                onCheckedChange={(checked) => toggle(c.id, checked)}
                label={c.name}
                className="min-h-12"
              />
            ))}
          </BottomSheet.Body>
          <BottomSheet.Footer>
            <Button fullWidth onPress={() => setCustomize(false)}>
              Done
            </Button>
          </BottomSheet.Footer>
        </BottomSheet.Content>
      </BottomSheet>
    </View>
  );
}
