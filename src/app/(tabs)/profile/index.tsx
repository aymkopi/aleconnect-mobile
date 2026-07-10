import { appScrollableBottomPadding } from "@/components/floating-app-bar";
import { statusBarHeight } from "@/constants";
import { useAuthSession } from "@/hooks/use-auth-session";
import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import {
  Avatar,
  Button,
  Select,
  Skeleton,
  Surface,
  Typography,
  useThemeColor,
} from "heroui-native";
import {
  LucideArrowUpRight,
  LucideBell,
  LucideChevronRight,
  LucideFileText,
  LucideGlobe,
  LucideHeart,
  LucideLanguages,
  LucideLogOut,
  LucideShieldCheck,
  LucideSunMoon,
  LucideUserRound,
} from "lucide-react-native";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Uniwind, useUniwind } from "uniwind";

import { useConsumerProfileContext } from "../../../context/consumer-profile-context";

type ProfileRowProps = {
  icon: ReactNode;
  title: string;
  description?: string;
  value?: string;
  action?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
};

function IconBubble({ children }: { children: ReactNode }) {
  return (
    <View className="h-10 w-10 items-center justify-center rounded-2xl bg-accent-soft">
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
  return (
    <View className="gap-2">
      <Typography
        type="body-xs"
        color="muted"
        weight="semibold"
        className="px-1"
      >
        {title}
      </Typography>
      <View className="gap-2">{children}</View>
    </View>
  );
}

function ProfileRow({
  icon,
  title,
  description,
  value,
  action,
  onPress,
  accessibilityLabel,
}: ProfileRowProps) {
  return (
    <Surface className="rounded-[22px] p-0">
      <Pressable
        disabled={!onPress}
        onPress={onPress}
        accessibilityRole={onPress ? "button" : undefined}
        accessibilityLabel={accessibilityLabel ?? title}
        className="min-h-16 flex-row items-center gap-3 px-4 py-3"
      >
        {icon}
        <View className="flex-1">
          <Typography type="body-sm" weight="semibold">
            {title}
          </Typography>
          {description ? (
            <Typography.Paragraph
              type="body-xs"
              color="muted"
              numberOfLines={2}
            >
              {description}
            </Typography.Paragraph>
          ) : null}
        </View>
        {value ? (
          <Typography type="body-xs" color="muted" weight="medium">
            {value}
          </Typography>
        ) : null}
        {action}
      </Pressable>
    </Surface>
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
    <Surface className="flex-1 rounded-3xl p-0">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={title}
        className="min-h-29.5 gap-3 px-4 py-4"
      >
        {icon}
        <View className="gap-1">
          <Typography type="body-sm" weight="bold">
            {title}
          </Typography>
          <Typography.Paragraph type="body-xs" color="muted" numberOfLines={2}>
            {description}
          </Typography.Paragraph>
        </View>
      </Pressable>
    </Surface>
  );
}

export default function ProfileRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { session, signOut } = useAuthSession();
  const { profile, isLoading, reload } = useConsumerProfileContext();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { theme, hasAdaptiveThemes } = useUniwind();
  const [accentColor, mutedColor, accentForegroundColor, dangerColor] =
    useThemeColor(["accent", "muted", "accent-foreground", "danger"]);
  const bottomPadding = appScrollableBottomPadding(insets.bottom);
  const isGuest = !session;

  const themeOptions = useMemo(
    () => [
      { value: "system", label: "Auto" },
      { value: "light", label: "Light" },
      { value: "dark", label: "Dark" },
    ],
    [],
  );
  const activeTheme = hasAdaptiveThemes ? "system" : theme;
  const selectedTheme =
    themeOptions.find((option) => option.value === activeTheme) ??
    themeOptions[0];
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
    void router.prefetch("/profile/push-notifications");
  }, [router]);

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

    try {
      await signOut();
      router.replace("/sign-in");
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
        className="bg-accent rounded-b-[28px]"
        style={{
          marginHorizontal: -20,
          minHeight: 208,
          padding: 22,
          paddingTop: statusBarHeight + 24,
          justifyContent: "space-between",
        }}
      >
        <View className="gap-1">
          <Typography.Heading
            type="h2"
            weight="bold"
            style={{ color: accentForegroundColor }}
          >
            Profile
          </Typography.Heading>
          <Typography.Paragraph
            type="body-sm"
            style={{ color: accentForegroundColor, opacity: 0.76 }}
          >
            Account access, alerts, and app preferences.
          </Typography.Paragraph>
        </View>

        <View className="flex-row items-center gap-4">
          <Avatar
            size="lg"
            alt={isGuest ? "Guest profile" : "Profile picture"}
            style={{
              width: 76,
              height: 76,
              borderRadius: 38,
              borderWidth: 2,
              borderColor: accentForegroundColor,
            }}
          >
            {!isGuest && profile?.avatarUrl ? (
              <Avatar.Image
                key={profile.avatarUrl}
                source={{ uri: profile.avatarUrl }}
              />
            ) : null}
            <Avatar.Fallback>{isGuest ? "?" : initials}</Avatar.Fallback>
          </Avatar>
          <View className="flex-1 gap-1">
            {isLoading && !isGuest ? (
              <View className="gap-2">
                <Skeleton className="h-6 w-44 rounded-full" />
                <Skeleton className="h-4 w-36 rounded-full" />
              </View>
            ) : (
              <>
                <Typography.Heading
                  type="h4"
                  weight="bold"
                  numberOfLines={1}
                  style={{ color: accentForegroundColor }}
                >
                  {isGuest
                    ? "Guest mode"
                    : (profile?.fullName ?? "Profile not linked")}
                </Typography.Heading>
                <Typography.Paragraph
                  type="body-sm"
                  numberOfLines={2}
                  style={{ color: accentForegroundColor, opacity: 0.76 }}
                >
                  {isGuest
                    ? "Sign in to view account data and manage notifications."
                    : (profile?.accountNumber ?? "No account number linked")}
                </Typography.Paragraph>
              </>
            )}
          </View>
          {isGuest ? (
            <Button
              isIconOnly
              variant="primary"
              size="md"
              onPress={() => {
                router.push("/sign-in");
              }}
              accessibilityLabel="Sign in"
            >
              <LucideUserRound size={19} color={accentForegroundColor} />
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
            router.push(isGuest ? "/sign-in" : "/profile/push-notifications")
          }
        />
      </View>

      <ProfileSection title="Preferences">
        <ProfileRow
          icon={
            <IconBubble>
              <LucideSunMoon size={20} color={accentColor} />
            </IconBubble>
          }
          title="Theme"
          description="Use system mode or choose a fixed appearance."
          value={
            themeOptions.find((option) => option.value === activeTheme)?.label
          }
          action={
            <Select
              value={selectedTheme}
              onValueChange={(option) => {
                if (!option) return;
                Uniwind.setTheme(option.value as "system" | "light" | "dark");
              }}
            >
              <Select.Trigger variant="unstyled">
                <Select.Value placeholder="Theme" />
                <Select.TriggerIndicator
                  iconProps={{ size: 16, color: mutedColor }}
                />
              </Select.Trigger>
              <Select.Portal>
                <Select.Overlay />
                <Select.Content presentation="popover" width={150} align="end">
                  <Select.Item value="system" label="Auto" />
                  <Select.Item value="light" label="Light" />
                  <Select.Item value="dark" label="Dark" />
                </Select.Content>
              </Select.Portal>
            </Select>
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
          action={<LucideChevronRight size={19} color={mutedColor} />}
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
              appUrl:
                "fb://facewebmodal/f?href=https://www.facebook.com/albayelectric/",
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
          action={<LucideChevronRight size={19} color={mutedColor} />}
        />
        <ProfileRow
          icon={
            <IconBubble>
              <LucideShieldCheck size={20} color={accentColor} />
            </IconBubble>
          }
          title="Privacy policy"
          description="How account data is handled"
          action={<LucideChevronRight size={19} color={mutedColor} />}
        />
      </ProfileSection>

      {!isGuest ? (
        <ProfileSection title="Session">
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
                feedbackVariant="scale-highlight"
                variant="danger-soft"
                size="sm"
                onPress={handleSignOut}
                isDisabled={isSigningOut}
                accessibilityLabel="Sign out"
              >
                <Button.Label>
                  {isSigningOut ? "Signing out..." : "Sign out"}
                </Button.Label>
              </Button>
            }
          />
        </ProfileSection>
      ) : null}
    </ScrollView>
  );
}
