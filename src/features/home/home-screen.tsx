import { ContentSkeleton } from "@/components/content-skeleton";
import { appScrollableBottomPadding } from "@/components/floating-app-bar";
import { Button } from "@/components/panelui/button";
import { Carousel } from "@/components/panelui/carousel";
import { Text } from "@/components/panelui/text";
import { PreviewLabel } from "@/components/preview-label";
import { SearchField } from "@/components/search-field";
import { NotificationButton } from "@/components/notification-button";
import { useGuestAccess } from "@/context/guest-access-context";
import { GuideStep, useAppGuide } from "@/context/app-guide-context";
import { useVisualPreview } from "@/context/visual-preview-context";
import { updateRoute } from "@/features/advisories/presentation";
import { PublisherCard } from "@/features/advisories/publisher-card";
import { fixtureUpdates } from "@/features/main-fixtures";
import { useAppColors } from "@/hooks/use-app-colors";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useConsumerAccount } from "@/hooks/use-consumer-account";
import { useMainPageScroll } from "@/hooks/use-main-page-scroll";
import { useScopedRead } from "@/hooks/use-scoped-read";
import { fetchPublicUpdates } from "@/services/public-updates";
import { useFocusEffect, useRouter } from "expo-router";
import { ChevronRight, FileText, PlugZap, Plus } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ImageBackground,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUniwind } from "uniwind";
import { getHomeLayout } from "./home-layout";
import { AccountOutageCard } from "./account-outage-card";
import { SavedOutageAcknowledgements } from "@/features/reports/saved-outage-acknowledgements";
import { openContact } from "@/features/hotlines/contact-card";
const actions = [
  { label: "Report\nan issue", icon: Plus, route: "/reports/new" },
  { label: "Request\nBilling", icon: FileText, route: "https://web.alecoinc.com.ph/billing-inquiry.html" },
  { label: "Request\nConnection", icon: PlugZap, route: "https://web.alecoinc.com.ph/newconnection.html" },
  { label: "Explore\nservices", icon: ChevronRight, route: "/services" },
] as const;
export default function HomeScreen() {
  const { guide } = useAppGuide();
  const { theme } = useUniwind();
  const insets = useSafeAreaInsets(),
    { height, width, fontScale } = useWindowDimensions(),
    router = useRouter();
  const { session } = useAuthSession(),
    { accountContext, selectedServiceAccountId } = useConsumerAccount(),
    { publicFixtures: fixtures } = useVisualPreview();
  const { guest, openFeature } = useGuestAccess();

  const [focused, setFocused] = useState(false);
  const [hasSavedOutage, setHasSavedOutage] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const [foreground] = useAppColors(["foreground"]);
  const userId = session?.user.id,
    scope = !fixtures
      ? [
          userId ? "private" : "public",
          userId,
          accountContext?.identityUserId,
          accountContext?.accessRevision,
        ].join(":")
      : null;
  const updates = useScopedRead(scope, (force) =>
    fetchPublicUpdates({
      userId: userId ?? "guest",
      publicOnly: !session,
      identityUserId: accountContext?.identityUserId,
      accessRevision: accountContext?.accessRevision,
      limit: 5,
      force,
    }),
  );
  const scrollRef = useMainPageScroll<ScrollView>(updates.reload);
  const items = fixtures ? fixtureUpdates : (updates.data?.items ?? []);
  const name = fixtures
    ? "ka-ALECO"
    : (session?.user.name?.split(" ")[0] ?? "there");

  const hour = new Date().getHours();

  const timeOfDay: "umaga" | "tanghali" | "hapon" | "gabi" =
    hour >= 5 && hour < 11
      ? "umaga"
      : hour >= 11 && hour < 13
        ? "tanghali"
        : hour >= 13 && hour < 18
          ? "hapon"
          : "gabi";

  const bottom = appScrollableBottomPadding(insets.bottom);
  const layout = getHomeLayout({
    height,
    top: insets.top,
    bottom,
    fontScale,
    preview: fixtures,
  });
  const carouselCardHeight = layout.cardHeight;
  const refreshFailed = items.length > 0 && Boolean(updates.error);
  const savedUpdates = Boolean(updates.data?.isStale);
  const outageAccountId = selectedServiceAccountId ?? accountContext?.defaultServiceAccountId;
  const showOutage = !guest && !fixtures && Boolean(userId && accountContext?.capabilities.areaOutageStatus && outageAccountId);
  return (
    <View className="flex-1 bg-background">
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        scrollEnabled={layout.scrollRequired || showOutage || hasSavedOutage}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          minHeight: height,
          paddingBottom: bottom,
          gap: layout.gap,
        }}
      >
        <ImageBackground
          source={require("../../../assets/aleconnect/mayon.jpeg")}
          imageStyle={{
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28,
          }}
          style={{
            height: layout.headerHeight + insets.top,
            overflow: "hidden",
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28,
          }}
        >
          <View
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: theme === "dark" ? "#00060FAE" : "#0B2B43AE",
            }}
          />
          <View
            style={{
              paddingTop: insets.top + 10,
              paddingHorizontal: 16,
              paddingBottom: 8,
              flex: 1,
              justifyContent: "space-between",
              gap: 6,
            }}
          >
            <View
              className="flex-row items-center justify-between"
              style={{ height: 44 }}
            >
              <Text
                numberOfLines={1}
                className="flex-1 mr-3"
                style={{
                  color: "#FFFFFF",
                  fontSize: layout.denseHeader ? 18 : 12,
                  lineHeight: layout.denseHeader ? 24 : 18,
                  fontFamily: layout.denseHeader
                    ? "PlusJakartaSans_600SemiBold"
                    : "Inter_600SemiBold",
                  letterSpacing: layout.denseHeader ? 0 : 0.3,
                }}
              >
                {layout.denseHeader
                  ? guest
                    ? "Discover ALEConnect."
                    : "Hello, " + name + "."
                  : "ALEConnect"}
              </Text>
              <NotificationButton overImage />
            </View>
            {!layout.denseHeader ? (
              <View className="gap-1">
                <Text
                  numberOfLines={layout.compactHeader ? 1 : 2}
                  style={{
                    color: "#FFFFFF",
                    fontFamily: "PlusJakartaSans_600SemiBold",
                    fontSize: layout.compactHeader ? 21 : 27,
                    lineHeight: layout.compactHeader ? 26 : 33,
                  }}
                >
                  {guest
                    ? "Discover ALEConnect."
                    : layout.compactHeader
                      ? "Hello, " + name + "."
                      : "Magandang " + timeOfDay + ", \n" + name + "."}
                </Text>
                {!layout.compactHeader ? (
                  <Text
                    style={{ color: "#FFFFFF", fontSize: 13, lineHeight: 18 }}
                  >
                    {guest
                      ? "Public updates and help, within reach."
                      : "How can we help today?"}
                  </Text>
                ) : null}
              </View>
            ) : null}
            <GuideStep chapter="home" target="search" onActivate={() => scrollRef.current?.scrollTo({ y: 0, animated: false })}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Search services, reports and hotlines"
              onPress={() => router.push("/search")}
            >
              <View
                pointerEvents="none"
                importantForAccessibility="no-hide-descendants"
              >
                <SearchField
                  value=""
                  onChangeText={() => {}}
                  compact
                  placeholder={
                    guest
                      ? "Search services, updates, hotlines"
                      : "Search services, reports, hotlines"
                  }
                />
              </View>
            </Pressable>
            </GuideStep>
          </View>
        </ImageBackground>
        {showOutage && accountContext && userId && outageAccountId ? <AccountOutageCard key={`${userId}:${accountContext.identityUserId}:${accountContext.accessRevision}:${outageAccountId}`} scope={{ principalId: userId, identityUserId: accountContext.identityUserId, accessRevision: accountContext.accessRevision, serviceAccountId: outageAccountId }} accountLabel={accountContext.accounts.find(account => account.id === outageAccountId)?.accountNumber ?? "Selected ALECO account"} /> : null}
        {!guest && !fixtures && accountContext && userId && outageAccountId ? <SavedOutageAcknowledgements key={`saved:${userId}:${accountContext.identityUserId}:${accountContext.accessRevision}:${outageAccountId}`} className="mx-4" onVisibilityChange={setHasSavedOutage} scope={{ principalId: userId, identityUserId: accountContext.identityUserId, accessRevision: accountContext.accessRevision, authorizedServiceAccountIds: accountContext.authorizedServiceAccountIds }} serviceAccountId={outageAccountId} accountLabel={accountContext.accounts.find(account => account.id === outageAccountId)?.accountNumber ?? "Selected ALECO account"} canRetry={accountContext.capabilities.outageAcknowledgements === true} /> : null}
        <GuideStep chapter="home" target="shortcuts" className="px-4" style={{ gap: layout.gap }} onActivate={() => scrollRef.current?.scrollTo({ y: layout.scrollRequired ? layout.headerHeight : 0, animated: false })}>
          <PreviewLabel />
          <Text weight="semibold" style={{ fontSize: 16, lineHeight: 22 }}>
            Quick Actions
          </Text>
          <View
            style={{
              paddingVertical: layout.gridPadding,
              paddingHorizontal: 4,
            }}
          >
            <View
              className="flex-row flex-wrap"
              style={{ rowGap: layout.rowGap }}
            >
              {actions.map(({ label, icon: Icon, route }) => (
                <View key={label} style={{ width: "50%", paddingHorizontal: 4 }}>
                <Pressable
                  className="rounded-xl bg-card"
                  accessibilityRole="button"
                  accessibilityLabel={label.replace("\n", " ")}
                  onPress={() => route.startsWith("https://") ? void openContact(route) : openFeature(route, true)}
                  style={{
                    flexDirection: "row",
                    paddingHorizontal: width < 360 ? 8 : 12,
                    height: layout.tileHeight,
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: 8,
                  }}
                >
                  <View
                    style={{
                      height: width < 360 ? 40 : layout.iconTileSize,
                      width: width < 360 ? 40 : layout.iconTileSize,
                      borderRadius: 10,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    className="bg-surface-secondary"
                  >
                    <Icon size={32} color={foreground} />
                  </View>
                  <Text
                    weight="medium"
                    numberOfLines={2}
                    style={{
                      flex: 1,
                      fontSize: width < 360 ? 12 : 13,
                      lineHeight: 18,
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
                </View>
              ))}
            </View>
          </View>
        </GuideStep>
        <GuideStep chapter="home" target="updates" style={{ gap: 8 }} onActivate={() => scrollRef.current?.scrollToEnd({ animated: false })}>
          <View
            className="px-4 flex-row items-center justify-between"
            style={{ height: layout.headingHeight }}
          >
            <View className="flex-row items-center gap-2 flex-1">
              <Text weight="semibold" style={{ fontSize: 16, lineHeight: 22 }}>
                From ALECO
              </Text>
              {refreshFailed || savedUpdates ? (
                <Text muted size="xs" numberOfLines={1} className="flex-1">
                  {refreshFailed ? "Refresh failed" : "Saved"}
                </Text>
              ) : null}
            </View>
            <Button
              variant="ghost"
              size="xs"
              loading={refreshFailed && updates.busy}
              accessibilityLabel={
                refreshFailed
                  ? "Retry loading ALECO updates"
                  : "View all ALECO updates"
              }
              onPress={() =>
                refreshFailed
                  ? void updates.reload(true)
                  : router.navigate("/advisories")
              }
            >
              <Text size="xs" className="text-primary" weight="semibold">
                {refreshFailed ? "Retry" : "View all"}
              </Text>
            </Button>
          </View>
          {items.length ? (
            <View>
              <Carousel
                accessibilityLabel="From ALECO updates"
                itemSize={width - 32}
                gap={24}
                loop
                autoplay={focused && guide?.id !== "home"}
                autoplayInterval={3000}
              >
                <Carousel.Content style={{ height: carouselCardHeight }}>
                  {items.map((item) => (
                    <Carousel.Item key={item.kind + item.id}>
                      <PublisherCard
                        item={item}
                        height={carouselCardHeight}
                        onPress={() => router.push(updateRoute(item))}
                      />
                    </Carousel.Item>
                  ))}
                </Carousel.Content>
              </Carousel>
            </View>
          ) : updates.busy ? (
            <View
              className="mx-4"
              style={{ height: carouselCardHeight, overflow: "hidden" }}
            >
              <ContentSkeleton
                layout="advisory"
                count={1}
                label="Loading ALECO updates"
              />
            </View>
          ) : (
            <View
              className="mx-4 rounded-xl bg-card p-3 flex-row items-center gap-3 overflow-hidden"
              style={{ height: carouselCardHeight }}
            >
              <View className="flex-1 gap-1">
                <Text size="sm" weight="semibold" numberOfLines={2}>
                  {updates.busy
                    ? "Loading ALECO updates"
                    : updates.error
                      ? "Updates couldn’t load"
                      : "No updates at the moment"}
                </Text>
                {!updates.busy ? (
                  <Text muted size="xs" numberOfLines={1}>
                    {updates.error
                      ? "Reconnect, then try again."
                      : "New public notices will appear here."}
                  </Text>
                ) : null}
              </View>
              {updates.error ? (
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => void updates.reload(true)}
                >
                  Try again
                </Button>
              ) : null}
            </View>
          )}
        </GuideStep>
        <View
          className="mx-4 rounded-xl bg-card px-3 py-2 flex-row items-center justify-between gap-3"
          style={{ minHeight: layout.ctaHeight }}
        >
          <Text
            weight="semibold"
            size="sm"
            className="flex-1"
            style={{ fontSize: 12, lineHeight: 16 }}
          >
            {guest
              ? "Connect your\nALECO account"
              : "Need help with\nyour service?"}
          </Text>
          <Button
            size="sm"
            style={{ minHeight: 40, paddingHorizontal: 24 }}
            onPress={() =>
              router.push(
                guest
                  ? {
                      pathname: "/sign-in",
                      params: { returnTo: "/profile" },
                    }
                  : "/reports/new",
              )
            }
          >
            {guest ? "Sign in" : "Create report"}
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}
