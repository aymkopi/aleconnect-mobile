import { Stack } from "expo-router";
import { useAppColors } from "@/hooks/use-app-colors";
import { ConsumerProfileProvider } from "../../../context/consumer-profile-context";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function ProfileLayout() {
  const [contentBackgroundColor] = useAppColors(["background"]);

  return (
    <ConsumerProfileProvider>
      <Stack
        screenOptions={{
          contentStyle: {
            backgroundColor: contentBackgroundColor,
          },
          freezeOnBlur: true,
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="details" />
        <Stack.Screen name="change-password" />
        <Stack.Screen name="push-notifications" />
      </Stack>
    </ConsumerProfileProvider>
  );
}
