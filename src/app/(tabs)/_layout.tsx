import { FloatingTabsBar } from "@/components/floating-tabs-bar";
import { BlurTargetView } from "expo-blur";
import { Tabs } from "expo-router";
import { useThemeColor } from "heroui-native";
import { useRef } from "react";
import { View } from "react-native";

export default function TabsLayout() {
  const [sceneBackgroundColor] = useThemeColor(["background"]);
  const blurTargetRef = useRef<View | null>(null);

  return (
    <BlurTargetView ref={blurTargetRef} style={{ flex: 1 }}>
      <Tabs
        detachInactiveScreens={false}
        tabBar={(props) => (
          <FloatingTabsBar {...props} blurTarget={blurTargetRef} />
        )}
        screenOptions={{
          animation: "none",
          freezeOnBlur: true,
          headerShown: false,
          headerLeft: () => null,
          lazy: false,
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
    </BlurTargetView>
  );
}
