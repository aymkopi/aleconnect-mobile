import { FloatingTabsBar } from "@/components/floating-tabs-bar";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      detachInactiveScreens={false}
      tabBar={(props) => <FloatingTabsBar {...props} />}
      screenOptions={{
        animation: "none",
        freezeOnBlur: true,
        headerShown: false,
        headerLeft: () => null,
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
