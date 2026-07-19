import { FloatingTabsBar } from "@/components/floating-tabs-bar";
import { useAppColors } from "@/hooks/use-app-colors";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  const [sceneBackgroundColor] = useAppColors(["background"]);

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
        name="reports"
        options={{
          popToTopOnBlur: true,
          title: "Reports",
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
