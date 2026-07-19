import { Stack } from "expo-router";

import { useAppColors } from "@/hooks/use-app-colors";
import PushNotificationSettings from "./(tabs)/profile/push-notifications";

export default function NotificationSettingsRoute() {
  const [foreground, surface, background] = useAppColors([
    "foreground",
    "surface",
    "background",
  ]);

  return (
    <>
      <Stack.Screen
        options={{
          contentStyle: { backgroundColor: background },
          headerStyle: { backgroundColor: surface },
          headerTintColor: foreground,
          title: "Push notifications",
        }}
      />
      <PushNotificationSettings />
    </>
  );
}
