import { FloatingTabsBar } from "@/components/floating-tabs-bar";
import { Tabs } from "expo-router";
import { useThemeColor } from "heroui-native";

export default function TabsLayout() {
  const [sceneBackgroundColor] = useThemeColor(["background"]);

  return (
    <Tabs
      detachInactiveScreens
      tabBar={(props) => <FloatingTabsBar {...props} />}
      screenOptions={{
        animation: "none",
        headerShown: false,
        headerLeft: () => null,
        lazy: true,
        sceneStyle: { backgroundColor: sceneBackgroundColor },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
        }}
      />
      <Tabs.Screen
        name="complaints"
        options={{
          popToTopOnBlur: true,
          title: "Complaints",
        }}
      />
      <Tabs.Screen
        name="hotlines"
        options={{
          title: "Hotlines",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          popToTopOnBlur: true,
          title: "Profile",
        }}
      />
    </Tabs>
  );
}
