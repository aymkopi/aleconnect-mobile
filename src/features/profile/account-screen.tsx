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
import { SoftRadial } from "@/components/soft-radial";
import { useGuestAccess } from "@/context/guest-access-context";
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
  Eye,
  EyeOff,
  House,
  Info,
  KeyRound,
  LifeBuoy,
  Link,
  Moon,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Uniwind, useUniwind } from "uniwind";
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
  const [numberVisible, setNumberVisible] = useState(false);
  useEffect(
    () => setNumberVisible(false),
    [
      accountContext?.defaultServiceAccountId,
      accountContext?.accessRevision,
      session?.user.id,
      guest,
      fixtures,
    ],
  );
  const [logoutOpen, setLogoutOpen] = useState(false),
    [signingOut, setSigningOut] = useState(false);
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
    [primary, feature] = useAppColors(["primary", "feature"]);
  const name = guest
    ? "Guest"
    : fixtures
      ? "Justine Dela Cruz"
      : (profile?.fullName ?? session?.user.name ?? "Guest");
  const account = accountContext?.accounts.find(
      (a) => a.id === accountContext.defaultServiceAccountId,
    ),
    count = fixtures ? 2 : (accountContext?.accounts.length ?? 0);
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
        ["Personal information", UserRound],
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
        {!guest && !fixtures && profileLoading && !profile ? (
          <ContentSkeleton
            layout="identity"
            count={1}
            label="Loading your profile"
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Personal information"
            accessibilityHint={
              guest ? "Sign in to view your profile details" : undefined
            }
            onPress={() => openFeature("/profile/details")}
            className="flex-row items-center gap-4 py-2"
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
                style={{ width: 64, height: 64, backgroundColor: "#2250CF" }}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
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
                {guest ? "Browsing without signing in" : "Consumer profile"}
              </Text>
              <Text size="sm" className="text-primary">
                {guest
                  ? "Sign in to view your details"
                  : "Personal information"}
              </Text>
            </View>
            <ChevronRight size={18} color={primary} />
          </Pressable>
        )}
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
        {!guest && !fixtures && accountsLoading && !accountContext ? (
          <ContentSkeleton
            layout="profile"
            count={1}
            label="Loading your service accounts"
          />
        ) : (
          <View
            className="rounded-xl overflow-hidden p-4 gap-3"
            style={{ backgroundColor: feature }}
          >
            <SoftRadial />
            <View className="flex-row gap-2 items-center">
              <House size={20} color="#FFFFFF" />
              <Text
                weight="semibold"
                size="xs"
                style={{ color: "#FFFFFF", flex: 1 }}
              >
                ALECO accounts
              </Text>
              <Text size="xs" style={{ color: "#E5E7EB" }}>
                {guest ? "Sign in required" : count + " linked"}
              </Text>
            </View>
            <View className="flex-row justify-between gap-2">
              <View className="flex-1 gap-1">
                <Text size="lg" weight="semibold" style={{ color: "#FFFFFF" }}>
                  {guest
                    ? "Connect your service"
                    : fixtures
                      ? "Home"
                      : (account?.registeredName ?? "Connect your service")}
                </Text>
                <Text size="xs" style={{ color: "#E5E7EB" }}>
                  {guest
                    ? "Sign in to link your ALECO account"
                    : fixtures
                      ? "Rawis, Legazpi City"
                      : (account?.address ??
                        "Your linked accounts appear here")}
                </Text>
              </View>
              {!guest ? (
                <View className="items-end gap-1">
                  <View className="flex-row items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      style={{ width: 32, height: 32 }}
                      hitSlop={6}
                      accessibilityLabel={
                        numberVisible
                          ? "Hide account number"
                          : "Show account number"
                      }
                      onPress={() => setNumberVisible((v) => !v)}
                    >
                      {numberVisible ? (
                        <EyeOff size={16} color="#FFFFFF" />
                      ) : (
                        <Eye size={16} color="#FFFFFF" />
                      )}
                    </Button>
                    <Text
                      size="sm"
                      weight="semibold"
                      style={{ color: "#FFFFFF" }}
                    >
                      {numberVisible
                        ? fixtures
                          ? "10004821"
                          : account?.accountNumber || "Not available"
                        : fixtures
                          ? "••4821"
                          : maskAccountNumber(account?.accountNumber)}
                    </Text>
                  </View>
                  <Text size="xs" style={{ color: "#E5E7EB" }}>
                    {account?.isDefault || fixtures ? "Default" : ""}
                  </Text>
                </View>
              ) : null}
            </View>
            <Button
              variant="social"
              fullWidth
              className="rounded-full"
              startContent={<Link size={18} color={primary} />}
              labelClassName="text-primary"
              onPress={() => openFeature("/profile/accounts")}
            >
              Manage accounts
            </Button>
          </View>
        )}
        {groups.map((group) => (
          <View key={group.title} className="gap-2">
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
          </View>
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
