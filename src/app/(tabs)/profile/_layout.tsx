import { Stack } from "expo-router";
import { useThemeColor } from "heroui-native";

export default function ProfileLayout() {
  const [headerTintColor, headerBackgroundColor] = useThemeColor([
    "foreground",
    "surface",
  ]);

  return (
    <Stack
      screenOptions={{
        headerTintColor,
        headerTitleStyle: { color: headerTintColor },
        headerStyle: { backgroundColor: headerBackgroundColor },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="details"
        options={{
          title: "Account details",
        }}
      />
    </Stack>
  );
}
