import { ContentSkeleton } from "@/components/content-skeleton";
import { appScrollableBottomPadding } from "@/components/floating-app-bar";
import { Button } from "@/components/panelui/button";
import { Carousel } from "@/components/panelui/carousel";
import { Text } from "@/components/panelui/text";
import { PreviewLabel } from "@/components/preview-label";
import { SearchField } from "@/components/search-field";
import { useGuestAccess } from "@/context/guest-access-context";
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
import {
  Bell,
  BellRing,
  ChevronRight,
  CreditCard,
  FileText,
  Link,
  Link2,
  ListChecks,
  Megaphone,
  Phone,
  PlugZap,
  Plus,
  ShieldCheck,
  UserRound,
  Zap,
} from "lucide-react-native";
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
const actions = [
  {
    label: "Report\nan issue",
    icon: Plus,
    route: "/reports/new",
  },
  {
    label: "Track\nreports",
    icon: FileText,
    route: "/reports",
  },
  { label: "Call\nALECO", icon: Phone, route: "/hotlines" },
  {
    label: "Latest\nUpdates",
    icon: Megaphone,
    route: "/advisories",
  },
  { label: "My\nAccount", icon: Link, route: "/profile" },
  {
    label: "Emergency\nHelp",
    icon: ShieldCheck,
    route: "/hotlines",
  },
  {
    label: "Service\nRequests",
    icon: Zap,
    route: "/services/requests",
  },
  {
    label: "Request\nConnection",
    icon: PlugZap,
    route: "/services/connection",
  },
  { label: "Pay\nBills", icon: CreditCard, route: "/services/payment" },
  { label: "Notifications", icon: Bell, route: "/notifications" },
  { label: "Report\nHistory", icon: ListChecks, route: "/reports/list" },
  { label: "Link an\naccount", icon: Link2, route: "/profile/link-account" },
  { label: "Link\nrequests", icon: FileText, route: "/profile/link-requests" },
  {
    label: "Personal\ninformation",
    icon: UserRound,
    route: "/profile/details",
  },
  { label: "Alert\nsettings", icon: BellRing, route: "/notification-settings" },
  {
    label: "Explore\nservices",
    icon: ChevronRight,
    route: "/services",
  },
] as const;
export default function HomeScreen() {
  const { theme } = useUniwind();
  const insets = useSafeAreaInsets(),
    { height, width, fontScale } = useWindowDimensions(),
    router = useRouter();
  const { session } = useAuthSession(),
    { accountContext } = useConsumerAccount(),
    { publicFixtures: fixtures } = useVisualPreview();
  const { guest, openFeature } = useGuestAccess();

  const [focused, setFocused] = useState(false);
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
    ? "Justine"
    : (session?.user.name?.split(" ")[0] ?? "there");
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
  const visibleActions = [
    ...actions.slice(0, layout.rows * 4 - 1),
    actions[actions.length - 1],
  ];
  return (
    <View className="flex-1 bg-background">
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        scrollEnabled={layout.scrollRequired}
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
              <Button
                size="icon"
                variant="ghost"
                className="rounded-full bg-white/20"
                style={{ width: 44, height: 44 }}
                accessibilityLabel="Notifications"
                onPress={() => openFeature("/notifications")}
              >
                <Bell size={20} color="#FFFFFF" />
              </Button>
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
                      : "Magandang umaga,\n" + name + "."}
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
          </View>
        </ImageBackground>
        <View className="px-4" style={{ gap: layout.gap }}>
          <PreviewLabel />
          <Text weight="semibold" style={{ fontSize: 16, lineHeight: 22 }}>
            Quick Actions
          </Text>
          <View
            className="rounded-xl bg-card"
            style={{
              paddingVertical: layout.gridPadding,
              paddingHorizontal: 8,
            }}
          >
            <View
              className="flex-row flex-wrap"
              style={{ rowGap: layout.rowGap }}
            >
              {visibleActions.map(({ label, icon: Icon, route }) => (
                <Pressable
                  key={label}
                  accessibilityRole="button"
                  accessibilityLabel={label.replace("\n", " ")}
                  onPress={() => openFeature(route, true)}
                  style={{
                    width: "25%",
                    height: layout.tileHeight,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                  }}
                >
                  <View
                    style={{
                      height: layout.iconTileSize,
                      width: layout.iconTileSize,
                      borderRadius: 10,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    className="bg-surface-secondary"
                  >
                    <Icon size={24} color={foreground} />
                  </View>
                  <Text
                    weight="medium"
                    numberOfLines={2}
                    style={{
                      fontSize: 11,
                      lineHeight: 14,
                      textAlign: "center",
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
        <View style={{ gap: 8 }}>
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
                autoplay={focused}
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
        </View>
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
