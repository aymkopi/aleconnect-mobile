import { appScrollableBottomPadding } from "@/components/floating-app-bar";
import { statusBarHeight } from "@/constants";
import { useAuthSession } from "@/hooks/use-auth-session";
import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { Avatar, Button, ListGroup, Select } from "heroui-native";
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
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  Linking,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Uniwind, useCSSVariable, useUniwind } from "uniwind";

import { useConsumerProfileContext } from "../../../context/consumer-profile-context";

export default function ProfileRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { session, signOut } = useAuthSession();
  const { profile, isLoading } = useConsumerProfileContext();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { theme, hasAdaptiveThemes } = useUniwind();
  const foregroundColor = useCSSVariable("--accent");
  const mutedColor = useCSSVariable("--muted");
  const iconForegroundColor =
    typeof foregroundColor === "string" ? foregroundColor : undefined;
  const iconMutedColor =
    typeof mutedColor === "string" ? mutedColor : undefined;
  const surfaceCardShadow = useCSSVariable("--shadow-surface-card");
  const bottomPadding = appScrollableBottomPadding(insets.bottom);
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
  const currentThemeLabel = selectedTheme.label;
  const isGuest = !session;

  useEffect(() => {
    void router.prefetch("/(tabs)/profile/details");
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
        // Fall through to the browser URL.
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

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ width }}
      className="bg-background"
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 20,
        gap: 10,
        paddingBottom: bottomPadding,
      }}
    >
      <View
        className={"bg-accent rounded-b-3xl"}
        style={{
          marginHorizontal: -20,
          justifyContent: "center",
          minHeight: 250,
          padding: 25,
          paddingTop: statusBarHeight + 30,
          boxShadow:
            typeof surfaceCardShadow === "string"
              ? surfaceCardShadow
              : undefined,
        }}
      >
        {isGuest ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 16,
            }}
          >
            <Avatar
              size="lg"
              style={{
                width: 75,
                height: 75,
                borderRadius: 37.5,
              }}
              alt="Guest profile"
            />
            <View
              style={{
                flex: 1,
                minWidth: 0,
                gap: 8,
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontSize: 20,
                  fontWeight: "600",
                  lineHeight: 20,
                }}
                numberOfLines={1}
              >
                Get the Full Experience
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.9)",
                  fontSize: 14,
                  lineHeight: 20,
                }}
                numberOfLines={2}
              >
                Sign in to access account details and full services.
              </Text>
              <Button
                variant="secondary"
                size="sm"
                onPress={() => {
                  router.push("/sign-in");
                }}
                style={{ alignSelf: "flex-start" }}
              >
                <Button.Label>Sign in</Button.Label>
              </Button>
            </View>
          </View>
        ) : (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 16,
            }}
          >
            <Avatar
              size="lg"
              style={{
                width: 75,
                height: 75,
                borderRadius: 37.5,
              }}
              alt="Profile picture"
            >
              {profile?.avatarUrl ? (
                <Avatar.Image
                  key={profile.avatarUrl}
                  source={{ uri: profile.avatarUrl }}
                />
              ) : null}
              <Avatar.Fallback>
                {(profile?.fullName ?? "?")
                  .split(/\s+/)
                  .filter(Boolean)
                  .map((name) => name[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2) || "?"}
              </Avatar.Fallback>
            </Avatar>
            <View
              style={{
                flex: 1,
                minWidth: 0,
                gap: 2,
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontSize: 20,
                  fontWeight: "700",
                  lineHeight: 30,
                }}
                numberOfLines={1}
              >
                {isLoading
                  ? "Loading profile..."
                  : (profile?.fullName ?? "Profile not linked")}
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.9)",
                  fontSize: 14,
                  lineHeight: 20,
                }}
                numberOfLines={2}
              >
                {isLoading
                  ? ""
                  : (profile?.accountNumber ?? "No account number")}
              </Text>
            </View>
            <Button
              isIconOnly
              variant="ghost"
              size="md"
              onPress={() => {
                router.navigate("/(tabs)/profile/details");
              }}
            >
              <LucideChevronRight size={20} color="white" />
            </Button>
          </View>
        )}
      </View>
      <View className="gap-2 mt-3">
        <Text className="text-sm text-muted ml-2">Personalization</Text>
        <ListGroup>
          <ListGroup.Item>
            <ListGroup.ItemPrefix>
              <LucideSunMoon size={20} color={iconForegroundColor} />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>Change Theme</ListGroup.ItemTitle>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Text className="text-[12px] font-medium text-muted">
                  {currentThemeLabel}
                </Text>
                <Select
                  value={selectedTheme}
                  onValueChange={(option) => {
                    if (!option) {
                      return;
                    }

                    Uniwind.setTheme(
                      option.value as "system" | "light" | "dark",
                    );
                  }}
                >
                  <Select.Trigger variant="unstyled">
                    <Select.Value placeholder="Theme" />
                    <Select.TriggerIndicator
                      iconProps={{ size: 16, color: iconMutedColor }}
                    />
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Overlay />
                    <Select.Content
                      presentation="popover"
                      width={150}
                      align="end"
                    >
                      <Select.Item value="system" label="Auto"></Select.Item>
                      <Select.Item value="light" label="Light"></Select.Item>
                      <Select.Item value="dark" label="Dark"></Select.Item>
                    </Select.Content>
                  </Select.Portal>
                </Select>
              </View>
            </ListGroup.ItemSuffix>
          </ListGroup.Item>
        </ListGroup>
        <Text className="text-sm mt-3 text-muted ml-2">Settings</Text>
        <ListGroup>
          <ListGroup.Item>
            <ListGroup.ItemPrefix>
              <LucideBell size={20} color={iconForegroundColor} />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>Push Notifications</ListGroup.ItemTitle>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix />
          </ListGroup.Item>
          <ListGroup.Item>
            <ListGroup.ItemPrefix>
              <LucideLanguages size={20} color={iconForegroundColor} />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>Languages</ListGroup.ItemTitle>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Text className="text-[12px] font-medium text-muted">
                  English
                </Text>
                <LucideChevronRight size={20} color={iconMutedColor} />
              </View>
            </ListGroup.ItemSuffix>
          </ListGroup.Item>
        </ListGroup>
        <Text className="text-sm mt-3 text-muted ml-2">Social Links</Text>
        <ListGroup>
          <ListGroup.Item
            onPress={() =>
              void openPreferredLink({
                appUrl:
                  "fb://facewebmodal/f?href=https://www.facebook.com/albayelectric/",
                webUrl: "https://www.facebook.com/albayelectric",
              })
            }
          >
            <ListGroup.ItemPrefix>
              <Feather name="facebook" size={20} color={iconForegroundColor} />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>Facebook</ListGroup.ItemTitle>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix>
              <LucideArrowUpRight size={20} color={iconMutedColor} />
            </ListGroup.ItemSuffix>
          </ListGroup.Item>
          <ListGroup.Item
            onPress={() =>
              void openPreferredLink({
                webUrl: "https://web.alecoinc.com.ph/",
              })
            }
          >
            <ListGroup.ItemPrefix>
              <LucideGlobe size={20} color={iconForegroundColor} />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>ALECO Website</ListGroup.ItemTitle>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix>
              <LucideArrowUpRight size={20} color={iconMutedColor} />
            </ListGroup.ItemSuffix>
          </ListGroup.Item>
          <ListGroup.Item
            onPress={() =>
              void openPreferredLink({
                webUrl: "https://web.alecoinc.com.ph/about",
              })
            }
          >
            <ListGroup.ItemPrefix>
              <LucideHeart size={20} color={iconForegroundColor} />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>About Us</ListGroup.ItemTitle>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix>
              <LucideArrowUpRight size={20} color={iconMutedColor} />
            </ListGroup.ItemSuffix>
          </ListGroup.Item>
        </ListGroup>

        <Text className="text-sm mt-3 text-muted ml-2">Legal</Text>
        <ListGroup>
          <ListGroup.Item>
            <ListGroup.ItemPrefix>
              <LucideFileText size={20} color={iconForegroundColor} />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>Terms and Conditions</ListGroup.ItemTitle>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix>
              <LucideChevronRight size={20} color={iconMutedColor} />
            </ListGroup.ItemSuffix>
          </ListGroup.Item>
          <ListGroup.Item>
            <ListGroup.ItemPrefix>
              <LucideShieldCheck size={20} color={iconForegroundColor} />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>Privacy Policy</ListGroup.ItemTitle>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix>
              <LucideChevronRight size={20} color={iconMutedColor} />
            </ListGroup.ItemSuffix>
          </ListGroup.Item>
        </ListGroup>

        {!isGuest ? (
          <>
            <Text className="text-sm mt-3 text-muted ml-2">Account</Text>
            <ListGroup variant="default">
              <ListGroup.Item>
                <ListGroup.ItemPrefix>
                  <LucideLogOut size={20} color={iconForegroundColor} />
                </ListGroup.ItemPrefix>
                <ListGroup.ItemContent>
                  <ListGroup.ItemTitle>Sign out</ListGroup.ItemTitle>
                </ListGroup.ItemContent>
                <ListGroup.ItemSuffix>
                  <Button
                    feedbackVariant="scale-highlight"
                    variant="danger-soft"
                    size="sm"
                    onPress={handleSignOut}
                    isDisabled={isSigningOut}
                  >
                    {isSigningOut ? "Signing out..." : "Sign out"}
                  </Button>
                </ListGroup.ItemSuffix>
              </ListGroup.Item>
            </ListGroup>
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}
