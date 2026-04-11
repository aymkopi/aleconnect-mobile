import { appScrollableBottomPadding } from "@/components/floating-app-bar";
import { statusBarHeight } from "@/constants";
import { useRouter } from "expo-router";
import { Avatar, Button, Label, ListGroup, Select } from "heroui-native";
import {
  LucideBell,
  LucideChevronRight,
  LucideLanguages,
  LucideSunMoon,
} from "lucide-react-native";
import { useMemo } from "react";
import { ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Uniwind, useCSSVariable, useUniwind } from "uniwind";

export default function ProfileRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
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
        className="bg-surface rounded-b-3xl"
        style={{
          marginHorizontal: -20,
          justifyContent: "center",
          height: 250,
          padding: 25,
          paddingTop: statusBarHeight,
          boxShadow:
            typeof surfaceCardShadow === "string"
              ? surfaceCardShadow
              : undefined,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
          }}
        >
          <Avatar size="lg" alt="Profile picture" />
          <View
            style={{
              flex: 1,
              minWidth: 0,
              gap: 2,
              justifyContent: "center",
            }}
          >
            <Label className="text-foreground">Justine Lee</Label>
            <Text numberOfLines={1} className="text-muted">
              0324027303
            </Text>
          </View>
          <Button
            isIconOnly
            variant="ghost"
            size="sm"
            onPress={() => {
              router.push("/(tabs)/profile/details");
            }}
          >
            <LucideChevronRight size={20} color={iconMutedColor} />
          </Button>
        </View>
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
        <Text className="text-sm mt-3 text-muted ml-2">Socials</Text>
        <ListGroup>
          <ListGroup.Item>
            <ListGroup.ItemPrefix>
              <LucideBell size={20} color={iconForegroundColor} />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>Facebook</ListGroup.ItemTitle>
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
              <Button
                feedbackVariant="scale-highlight"
                variant="tertiary"
                size="sm"
              >
                Change
              </Button>
            </ListGroup.ItemSuffix>
          </ListGroup.Item>
        </ListGroup>
      </View>
    </ScrollView>
  );
}
