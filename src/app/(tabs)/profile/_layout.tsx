import { Stack, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

import { Button, ButtonIcon } from "@/components/ui/button";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useAppColors } from "@/hooks/use-app-colors";
import { ConsumerProfileProvider } from "../../../context/consumer-profile-context";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function ProfileLayout() {
  const router = useRouter();
  const { session } = useAuthSession();
  const [headerTintColor, headerBackgroundColor] = useAppColors([
    "foreground",
    "surface",
  ]);
  const [contentBackgroundColor] = useAppColors(["background"]);

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
                size="icon"
                variant="ghost"
                onPress={() => {
                  if (__DEV__) {
                    console.log("[nav] profile details header back");
                  }
                  router.replace("/profile");
                }}
                accessibilityLabel="Back to profile"
              >
                <ButtonIcon as={ChevronLeft} height={22} width={22} />
              </Button>
            ),
            title: "Account",
          }}
        />
        <Stack.Screen
          name="change-password"
          options={{
            headerBackVisible: false,
            headerLeft: () =>
              session?.user.mustChangePassword ? null : (
                <Button
                  size="icon"
                  variant="ghost"
                  onPress={() => router.replace("/profile")}
                  accessibilityLabel="Back to profile"
                >
                  <ButtonIcon as={ChevronLeft} height={22} width={22} />
                </Button>
              ),
            title: "Change password",
          }}
        />
        <Stack.Screen
          name="push-notifications"
          options={{
            headerBackVisible: false,
            headerLeft: () => (
              <Button
                size="icon"
                variant="ghost"
                onPress={() => {
                  router.replace("/profile");
                }}
                accessibilityLabel="Back to profile"
              >
                <ButtonIcon as={ChevronLeft} height={22} width={22} />
              </Button>
            ),
            title: "Push notifications",
          }}
        />
      </Stack>
    </ConsumerProfileProvider>
  );
}
