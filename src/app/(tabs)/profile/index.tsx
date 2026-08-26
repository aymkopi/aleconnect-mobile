import { appScrollableBottomPadding } from "@/components/floating-app-bar";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { ListSection, ListSectionItem } from "@/components/ui/list-section";
import { Menu, MenuItem, MenuItemLabel } from "@/components/ui/menu";
import { Pressable } from "@/components/ui/pressable";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { statusBarHeight } from "@/constants";
import { useAppColors } from "@/hooks/use-app-colors";
import { useAuthSession } from "@/hooks/use-auth-session";
import Feather from "@expo/vector-icons/Feather";
import { type Href, useFocusEffect, useRouter } from "expo-router";
import {
  Check,
  LucideArrowUpRight,
  LucideBell,
  LucideChevronDown,
  LucideChevronRight,
  LucideFileText,
  LucideGlobe,
  LucideHeart,
  LucideKeyRound,
  LucideLink,
  LucideLanguages,
  LucideLogOut,
  LucideShieldCheck,
  LucideSunMoon,
  LucideUserRound,
} from "lucide-react-native";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Linking,
  RefreshControl,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Uniwind, useUniwind } from "uniwind";

import { ProfileAvatar } from "@/features/profile/components/ProfileAvatar";
import { useConsumerAccount } from "@/hooks/use-consumer-account";
import { useConsumerProfileContext } from "../../../context/consumer-profile-context";

type ProfileRowProps = {
  icon: ReactNode;
  title: string;
  description?: string;
  value?: string;
  action?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  showDivider?: boolean;
};

function IconBubble({ children }: { children: ReactNode }) {
  return (
    <View className="h-10 w-10 items-center justify-center rounded-full bg-accent-soft">
      {children}
    </View>
  );
}

function ProfileSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return <ListSection title={title}>{children}</ListSection>;
}

function ProfileRow({
  icon,
  title,
  description,
  value,
  action,
  onPress,
  accessibilityLabel,
  showDivider = true,
}: ProfileRowProps) {
  return (
    <ListSectionItem
      accessibilityLabel={accessibilityLabel ?? title}
      description={description}
      leading={icon}
      onPress={onPress}
      showDivider={showDivider}
      title={title}
      trailing={
        <View className="flex-row items-center gap-2">
          {value ? (
            <Text className="text-xs font-medium text-muted-foreground">
              {value}
            </Text>
          ) : null}
          {action}
        </View>
      }
    />
  );
}

function QuickAction({
  icon,
  title,
  description,
  onPress,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <View className="flex-1 rounded-lg border border-border bg-card p-0">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={title}
        className="min-h-29.5 gap-3 px-4 py-4"
      >
        {icon}
        <View className="gap-1">
          <Text className="text-sm font-bold text-foreground">{title}</Text>
          <Text className="text-xs text-muted-foreground" numberOfLines={2}>
            {description}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

export default function ProfileRoute() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView | null>(null);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { session, signOut } = useAuthSession();
  const { accountContext } = useConsumerAccount();
  const { profile, isLoading, reload } = useConsumerProfileContext();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [shouldRedirectAfterSignOut, setShouldRedirectAfterSignOut] =
    useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { theme, hasAdaptiveThemes } = useUniwind();
  const [accentColor, mutedColor, accentForegroundColor, dangerColor] =
    useAppColors(["accent", "muted", "accent-foreground", "danger"]);
  const bottomPadding = appScrollableBottomPadding(insets.bottom);
  const isGuest = !session;

  const activeTheme = hasAdaptiveThemes ? "system" : theme;
  const activeThemeLabel =
    activeTheme === "system"
      ? "Auto"
      : activeTheme === "light"
        ? "Light"
        : "Dark";
  const initials =
    (profile?.fullName ?? "?")
      .split(/\s+/)
      .filter(Boolean)
      .map((name) => name[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  useEffect(() => {
    void router.prefetch("/profile/details");
    void router.prefetch("/notification-settings");
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, []),
  );

  useEffect(() => {
    if (!shouldRedirectAfterSignOut || session) return;

    setShouldRedirectAfterSignOut(false);
    router.replace("/sign-in");
  }, [router, session, shouldRedirectAfterSignOut]);

  const openPreferredLink = async ({
    appUrl,
    webUrl,
  }: {
    appUrl?: string;
    webUrl: string;
  }) => {
    if (appUrl) {
      try {
        await Linking.openURL(appUrl);
        return;
      } catch {
        // App deep links can fail when the app is not installed; browser URL is the fallback.
      }
    }

    await Linking.openURL(webUrl);
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setShouldRedirectAfterSignOut(true);

    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      await reload({ forceNetwork: true });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <ScrollView
      ref={scrollRef}
      contentInsetAdjustmentBehavior="automatic"
      style={{ width }}
      className="bg-background"
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: 0,
        gap: 16,
        paddingBottom: bottomPadding,
      }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => {
            void handleRefresh();
          }}
          tintColor={accentColor}
          colors={[accentColor]}
        />
      }
    >
      <View
        className="rounded-b-xl bg-accent"
        style={{
          marginHorizontal: -20,
          minHeight: 208,
          padding: 22,
          paddingTop: statusBarHeight + 24,
          justifyContent: "space-between",
        }}
      >
        <View className="gap-1">
          <Heading size="xl" style={{ color: accentForegroundColor }}>
            Profile
          </Heading>
          <Text
            className="text-sm"
            style={{ color: accentForegroundColor, opacity: 0.76 }}
          >
            Account access, alerts, and app preferences.
          </Text>
        </View>

        <View className="flex-row items-center gap-4">
          <ProfileAvatar
            accessibilityLabel={isGuest ? "Guest profile" : "Profile picture"}
            className="h-[76px] w-[76px] border-2"
            fallback={isGuest ? "?" : initials}
            fallbackClassName="text-lg font-bold"
            style={{
              borderColor: accentForegroundColor,
            }}
            uri={isGuest ? null : profile?.avatarUrl}
          />
          <View className="flex-1 gap-1">
            {isLoading && !isGuest ? (
              <View className="gap-2">
                <Skeleton className="h-6 w-44 rounded-full" />
                <Skeleton className="h-4 w-36 rounded-full" />
              </View>
            ) : (
              <>
                <Heading
                  size="lg"
                  numberOfLines={1}
                  style={{ color: accentForegroundColor }}
                >
                  {isGuest
                    ? "Guest mode"
                    : (profile?.fullName ?? "Profile not linked")}
                </Heading>
                <Text
                  className="text-sm"
                  numberOfLines={2}
                  style={{ color: accentForegroundColor, opacity: 0.76 }}
                >
                  {isGuest
                    ? "Sign in to view account data and manage notifications."
                    : (profile?.accountNumber ?? "No account number linked")}
                </Text>
              </>
            )}
          </View>
          {isGuest ? (
            <Button
              size="icon"
              className="min-h-11 min-w-11 rounded-full"
              onPress={() => {
                router.push("/sign-in");
              }}
              accessibilityLabel="Sign in"
            >
              <ButtonIcon as={LucideUserRound} height={19} width={19} />
            </Button>
          ) : null}
        </View>
      </View>

      <View className="flex-row gap-3">
        <QuickAction
          icon={
            <IconBubble>
              <LucideUserRound size={20} color={accentColor} />
            </IconBubble>
          }
          title="Account details"
          description="Contact, address, meter"
          onPress={() => router.push(isGuest ? "/sign-in" : "/profile/details")}
        />
        <QuickAction
          icon={
            <IconBubble>
              <LucideBell size={20} color={accentColor} />
            </IconBubble>
          }
          title="Alerts"
          description="Push and feeder alerts"
          onPress={() =>
            router.push(isGuest ? "/sign-in" : "/notification-settings")
          }
        />
      </View>

      {!isGuest ? (
        <ProfileSection title="ALECO accounts">
          <ProfileRow
            icon={<IconBubble><LucideLink size={20} color={accentColor} /></IconBubble>}
            title="ALECO accounts"
            description={
              accountContext && accountContext.accounts.length > 1
                ? `${accountContext.accounts.length} linked accounts. Choose a default or edit service details.`
                : "Manage this account or link another ALECO account."
            }
            value={accountContext?.accounts.length && accountContext.accounts.length > 1 ? `${accountContext.accounts.length}` : "Link another"}
            onPress={() => router.push("/profile/accounts" as Href)}
            action={<LucideChevronRight size={19} color={mutedColor} />}
            showDivider={false}
          />
        </ProfileSection>
      ) : null}

      <ProfileSection title="Preferences">
        <ProfileRow
          icon={
            <IconBubble>
              <LucideSunMoon size={20} color={accentColor} />
            </IconBubble>
          }
          title="Theme"
          description="Use system mode or choose a fixed appearance."
          action={
            <Menu
              placement="bottom right"
              offset={6}
              selectionMode="single"
              selectedKeys={new Set([activeTheme])}
              trigger={(triggerProps) => (
                <Button
                  {...triggerProps}
                  size="default"
                  variant="outline"
                  className="w-28 justify-between"
                  accessibilityLabel="Choose theme"
                >
                  <ButtonText>{activeThemeLabel}</ButtonText>
                  <ButtonIcon as={LucideChevronDown} height={16} width={16} />
                </Button>
              )}
            >
              {[
                ["system", "Auto"],
                ["light", "Light"],
                ["dark", "Dark"],
              ].map(([value, label]) => (
                <MenuItem
                  key={value}
                  textValue={label}
                  accessibilityState={{ selected: activeTheme === value }}
                  onPress={() =>
                    Uniwind.setTheme(value as "system" | "light" | "dark")
                  }
                >
                  <View className="w-5">
                    {activeTheme === value ? (
                      <Check size={16} color={accentColor} />
                    ) : null}
                  </View>
                  <MenuItemLabel>{label}</MenuItemLabel>
                </MenuItem>
              ))}
            </Menu>
          }
        />
        <ProfileRow
          icon={
            <IconBubble>
              <LucideLanguages size={20} color={accentColor} />
            </IconBubble>
          }
          title="Language"
          description="Interface language"
          value="English"
          showDivider={false}
        />
      </ProfileSection>

      <ProfileSection title="Links">
        <ProfileRow
          icon={
            <IconBubble>
              <Feather name="facebook" size={20} color={accentColor} />
            </IconBubble>
          }
          title="Facebook"
          description="ALECO announcements and public updates"
          onPress={() =>
            void openPreferredLink({
              webUrl: "https://www.facebook.com/albayelectric",
            })
          }
          action={<LucideArrowUpRight size={18} color={mutedColor} />}
        />
        <ProfileRow
          icon={
            <IconBubble>
              <LucideGlobe size={20} color={accentColor} />
            </IconBubble>
          }
          title="ALECO website"
          description="Official web portal"
          onPress={() =>
            void openPreferredLink({ webUrl: "https://web.alecoinc.com.ph/" })
          }
          action={<LucideArrowUpRight size={18} color={mutedColor} />}
        />
        <ProfileRow
          icon={
            <IconBubble>
              <LucideHeart size={20} color={accentColor} />
            </IconBubble>
          }
          title="About ALECO"
          description="Organization profile and services"
          onPress={() =>
            void openPreferredLink({
              webUrl: "https://web.alecoinc.com.ph/about",
            })
          }
          action={<LucideArrowUpRight size={18} color={mutedColor} />}
          showDivider={false}
        />
      </ProfileSection>

      <ProfileSection title="Legal">
        <ProfileRow
          icon={
            <IconBubble>
              <LucideFileText size={20} color={accentColor} />
            </IconBubble>
          }
          title="Terms and conditions"
          description="Rules for using Aleconnect"
        />
        <ProfileRow
          icon={
            <IconBubble>
              <LucideShieldCheck size={20} color={accentColor} />
            </IconBubble>
          }
          title="Privacy policy"
          description="How account data is handled"
          showDivider={false}
        />
      </ProfileSection>

      {!isGuest ? (
        <ProfileSection title="Session">
          <ProfileRow
            icon={
              <IconBubble>
                <LucideKeyRound size={20} color={accentColor} />
              </IconBubble>
            }
            title="Change password"
            description="Update your account password."
            onPress={() => router.push("/profile/change-password")}
            action={<LucideChevronRight size={19} color={mutedColor} />}
          />
          <ProfileRow
            icon={
              <IconBubble>
                <LucideLogOut size={20} color={dangerColor} />
              </IconBubble>
            }
            title="Sign out"
            description="End this device session."
            action={
              <Button
                variant="destructive"
                size="sm"
                className="min-h-11"
                onPress={handleSignOut}
                isDisabled={isSigningOut}
                accessibilityLabel="Sign out"
              >
                <ButtonText>
                  {isSigningOut ? "Signing out..." : "Sign out"}
                </ButtonText>
              </Button>
            }
            showDivider={false}
          />
        </ProfileSection>
      ) : null}
    </ScrollView>
  );
}
