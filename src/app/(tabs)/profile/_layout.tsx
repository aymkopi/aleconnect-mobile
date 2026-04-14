import { Stack } from "expo-router";
import { useThemeColor } from "heroui-native";

import { ConsumerProfileProvider } from "../../../context/consumer-profile-context";

export default function ProfileLayout() {
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
            title: "Account",
          }}
        />
      </Stack>
    </ConsumerProfileProvider>
  );
}
