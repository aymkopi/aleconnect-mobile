import { ContentSkeleton } from "@/components/content-skeleton";
import { DataNotice } from "@/components/data-state";
import { appScrollableBottomPadding } from "@/components/floating-app-bar";
import { MainPageHeader } from "@/components/main-page-header";
import { BottomSheet } from "@/components/panelui/bottom-sheet";
import { Button } from "@/components/panelui/button";
import { Dialog } from "@/components/panelui/dialog";
import { Text } from "@/components/panelui/text";
import { ThemeSelector } from "@/components/panelui/theme-selector";
import { toast } from "@/components/panelui/toast";
import { PreviewLabel } from "@/components/preview-label";
import { useGuestAccess } from "@/context/guest-access-context";
import { GuideStep } from "@/context/app-guide-context";
import { useVisualPreview } from "@/context/visual-preview-context";
import { useAppColors } from "@/hooks/use-app-colors";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useConsumerAccount } from "@/hooks/use-consumer-account";
import { useConsumerProfile } from "@/hooks/use-consumer-profile";
import { useMainPageScroll } from "@/hooks/use-main-page-scroll";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Info,
  KeyRound,
  LifeBuoy,
  Link,
  Moon,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Uniwind, useUniwind } from "uniwind";
import { accountProfileIdentifier } from "./profile-state";
const profileChildRoutes = {
  "Personal information": "/profile/details",
  "ALECO accounts": "/profile/accounts",
  "Change password": "/profile/change-password",
  "Alerts & notifications": "/notification-settings",
  "Help & support": "/profile/help",
  "Privacy & terms": "/profile/privacy",
  "About ALEConnect": "/profile/about",
} as const;
export function maskAccountNumber(value: string | null | undefined) {
  return value ? "••" + value.slice(-4) : "Not available";
}
function Setting({
  label,
  Icon,
  value,
  onPress,
}: {
  label: string;
  Icon: LucideIcon;
  value?: string;
  onPress: () => void;
}) {
  const [muted] = useAppColors(["muted-foreground"]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label + (value ? ", " + value : "")}
      onPress={onPress}
      className="flex-row items-center gap-3 px-4"
      style={{ minHeight: 56 }}
    >
      <Icon size={20} color={muted} />
      <Text className="flex-1" size="sm">
        {label}
      </Text>
      {value ? (
        <Text muted size="xs">
          {value}
        </Text>
      ) : null}
      <ChevronRight size={18} color={muted} />
    </Pressable>
  );
}
export default function AccountScreen() {
  const insets = useSafeAreaInsets(),
    router = useRouter(),
    { session, signOut } = useAuthSession(),
    { accountContext, isLoading: accountsLoading } = useConsumerAccount(),
    {
      profile,
      isLoading: profileLoading,
      error,
      reload,
    } = useConsumerProfile(),
    { fixtures, setFixtures } = useVisualPreview();
  const { guest, openFeature } = useGuestAccess();
  const params = useLocalSearchParams<{ appearance?: string }>();
  const { theme, hasAdaptiveThemes } = useUniwind(),
    appearance = hasAdaptiveThemes ? "system" : theme;
  const scrollRef = useMainPageScroll<ScrollView>(
    useCallback(() => {
      if (!fixtures && session) void reload({ forceNetwork: true });
    }, [fixtures, session, reload]),
  );
  const [logoutOpen, setLogoutOpen] = useState(false),
    [signingOut, setSigningOut] = useState(false);
  const settingsOffset = useRef(0);
  async function logout() {
    setSigningOut(true);
    try {
      await signOut();
      setLogoutOpen(false);
      router.replace("/sign-in");
    } catch {
      toast.show({
        variant: "destructive",
        label: "Could not sign out",
        description: "Try again.",
      });
    } finally {
      setSigningOut(false);
    }
  }
  const [sheet, setSheet] = useState(false),
    [primary, primaryForeground] = useAppColors(["primary", "primary-foreground"]);
  const name = guest
    ? "Guest"
    : fixtures
      ? "Justine Dela Cruz"
      : (profile?.fullName ?? session?.user.name ?? "Guest");
  const account = accountContext?.accounts.find(
      (a) => a.id === accountContext.defaultServiceAccountId,
    ),
    count = fixtures ? 2 : (accountContext?.accounts.length ?? 0);
  const identifier = guest ? null : fixtures ? "justine@example.com" : accountProfileIdentifier(count, session?.user.email, account?.accountNumber);
  useEffect(() => {
    if (guest) {
      setSheet(false);
      setLogoutOpen(false);
    } else if (params.appearance === "1") {
      setSheet(true);
      router.setParams({ appearance: undefined });
    }
  }, [guest, params.appearance, router]);
  const groups = [
    {
      title: "Account & security",
      rows: [
        ["ALECO accounts", Link],
        ["Change password", KeyRound],
      ],
    },
    {
      title: "Preferences",
      rows: [
        ["Alerts & notifications", Bell],
        ["Appearance", Moon],
      ],
    },
    {
      title: "About & support",
      rows: [
        ["Help & support", LifeBuoy],
        ["Privacy & terms", ShieldCheck],
        ["About ALEConnect", Info],
      ],
    },
  ] as const;
  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ScrollView
        className="flex-1"
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: appScrollableBottomPadding(insets.bottom),
          gap: 12,
        }}
      >
        <PreviewLabel />
        <MainPageHeader title="Account" />
        <GuideStep chapter="account" target="profile" onActivate={() => scrollRef.current?.scrollTo({ y: 0, animated: false })}>
        {!guest && !fixtures && profileLoading && !profile ? (
          <ContentSkeleton
            layout="identity"
            count={1}
            label="Loading your profile"
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Account information"
            accessibilityHint={
              guest ? "Sign in to view your profile details" : undefined
            }
            onPress={() => openFeature("/profile/details")}
            className="flex-row items-center gap-3 p-4 rounded-xl bg-card"
          >
            {!guest && !fixtures && profile?.avatarUrl ? (
              <Image
                source={{ uri: profile.avatarUrl }}
                style={{ width: 64, height: 64, borderRadius: 32 }}
                accessibilityLabel="Profile photo"
              />
            ) : (
              <View
                className="rounded-full items-center justify-center"
                style={{ width: 64, height: 64, backgroundColor: primary }}
              >
                <Text
                  style={{
                    color: primaryForeground,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 24,
                  }}
                >
                  {name
                    .split(" ")
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join("")}
                </Text>
              </View>
            )}
            <View className="flex-1 gap-1">
              <Text weight="semibold" style={{ fontSize: 18, lineHeight: 25 }}>
                {name}
              </Text>
              <Text muted size="sm">
                {guest ? "Browsing without signing in" : identifier ?? (accountsLoading ? "Loading account…" : "Account details unavailable")}
              </Text>
              <Text size="sm" className="text-primary">
                {guest
                  ? "Sign in to view your details"
                  : "Account information"}
              </Text>
            </View>
            <ChevronRight size={18} color={primary} />
          </Pressable>
        )}
        </GuideStep>
        {error && !guest && !fixtures ? (
          <DataNotice
            title={
              profile
                ? "Could not refresh your profile"
                : "Profile details unavailable"
            }
            description={
              profile
                ? "Your loaded profile is still available. Connect and refresh for current information."
                : "Reconnect and retry to load your personal and service details."
            }
            actionLabel="Refresh profile"
            onAction={() => void reload({ forceNetwork: true })}
          />
        ) : null}
        {groups.map((group) => (
          <GuideStep key={group.title} chapter="account" target={group.title === "Preferences" ? "settings" : group.title === "About & support" ? "help" : "service-accounts"} className="gap-2" onLayout={(event) => { if (group.title === "Preferences") settingsOffset.current = event.nativeEvent.layout.y; }} onActivate={() => group.title === "About & support" ? scrollRef.current?.scrollToEnd({ animated: false }) : scrollRef.current?.scrollTo({ y: settingsOffset.current, animated: false })}>
            <Text muted size="xs" weight="medium">
              {group.title}
            </Text>
            <View className="rounded-xl bg-card overflow-hidden">
              {group.rows.map(([label, Icon]) => (
                <Setting
                  key={label}
                  label={label}
                  Icon={Icon}
                  value={
                    guest && group.title !== "About & support"
                      ? "Sign in"
                      : label === "Appearance"
                        ? appearance === "system"
                          ? "System"
                          : appearance === "dark"
                            ? "Dark"
                            : "Light"
                        : label === "ALECO accounts"
                          ? !fixtures && accountsLoading && !accountContext
                            ? "Loading…"
                            : count + " linked"
                          : undefined
                  }
                  onPress={() =>
                    label === "Appearance"
                      ? guest
                        ? openFeature("/profile?appearance=1")
                        : setSheet(true)
                      : openFeature(profileChildRoutes[label])
                  }
                />
              ))}
            </View>
          </GuideStep>
        ))}
        {!session && !fixtures ? (
          <Button
            variant="outline"
            onPress={() =>
              router.push({
                pathname: "/sign-in",
                params: { returnTo: "/profile" },
              })
            }
          >
            Sign in
          </Button>
        ) : null}
        {session && !fixtures ? (
          <Button variant="secondary" onPress={() => setLogoutOpen(true)}>
            Sign out
          </Button>
        ) : null}
        {fixtures ? (
          <Button
            variant="outline"
            onPress={() => {
              setFixtures(false);
              router.replace("/home");
            }}
          >
            Exit visual fixtures
          </Button>
        ) : null}
      </ScrollView>

      <BottomSheet open={!guest && sheet} onOpenChange={setSheet}>
        <BottomSheet.Content>
          <BottomSheet.Header>
            <View className="flex-row items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                style={{ width: 48, height: 48 }}
                accessibilityLabel="Back to Account"
                onPress={() => setSheet(false)}
              >
                <ChevronLeft size={20} color={primary} />
              </Button>
              <Text weight="semibold" size="lg" accessibilityRole="header">
                Color theme
              </Text>
            </View>
          </BottomSheet.Header>
          <BottomSheet.Body>
            <Text size="sm" className="font-medium">
              Choose your color theme
            </Text>
            <View className="w-full gap-3 items-center">
              <ThemeSelector
                value={appearance}
                variant="card"
                applyTheme={false}
                onValueChange={(value) => {
                  Uniwind.setTheme(value as "system" | "light" | "dark");
                  setSheet(false);
                }}
              />
            </View>
            <Text muted size="xs">
              System follows your device light or dark appearance.
            </Text>
          </BottomSheet.Body>
        </BottomSheet.Content>
      </BottomSheet>
      <Dialog open={!guest && logoutOpen} onOpenChange={setLogoutOpen}>
        <Dialog.Content dismissible={!signingOut}>
          <Dialog.Title>Sign out of ALEConnect?</Dialog.Title>
          <Dialog.Description>
            Your saved reports and evidence stay on this device.
          </Dialog.Description>
          <Dialog.Footer>
            <Button
              variant="outline"
              disabled={signingOut}
              onPress={() => setLogoutOpen(false)}
            >
              Cancel
            </Button>
            <Button loading={signingOut} onPress={() => void logout()}>
              Sign out
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    </View>
  );
}
