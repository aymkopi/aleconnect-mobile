import { Stack, useRouter } from "expo-router";
import { Button, useThemeColor } from "heroui-native";
import { ChevronLeft } from "lucide-react-native";

import { ConsumerProfileProvider } from "../../../context/consumer-profile-context";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function ProfileLayout() {
  const router = useRouter();
  const [headerTintColor, headerBackgroundColor] = useThemeColor([
    "foreground",
    "surface",
  ]);
  const [contentBackgroundColor] = useThemeColor(["background"]);

  return (
    <ConsumerProfileProvider>
      <Stack
        screenOptions={{
          contentStyle: {
            backgroundColor: contentBackgroundColor,
          },
          freezeOnBlur: true,
          headerTintColor,
          headerTitleStyle: { color: headerTintColor },
          headerStyle: { backgroundColor: headerBackgroundColor },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="details"
          options={{
            headerBackVisible: false,
            headerLeft: () => (
              <Button
                isIconOnly
                variant="ghost"
                onPress={() => {
                  if (__DEV__) {
                    console.log("[nav] profile details header back");
                  }
                  router.replace("/profile");
                }}
                accessibilityLabel="Back to profile"
              >
                <ChevronLeft size={22} color={headerTintColor} />
              </Button>
            ),
            title: "Account",
          }}
        />
        <Stack.Screen
          name="push-notifications"
          options={{
            headerBackVisible: false,
            headerLeft: () => (
              <Button
                isIconOnly
                variant="ghost"
                onPress={() => {
                  router.replace("/profile");
                }}
                accessibilityLabel="Back to profile"
              >
                <ChevronLeft size={22} color={headerTintColor} />
              </Button>
            ),
            title: "Push notifications",
          }}
        />
      </Stack>
    </ConsumerProfileProvider>
  );
}
