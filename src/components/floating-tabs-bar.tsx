import { FloatingAppBar } from "@/components/floating-app-bar";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { View } from "react-native";

export function FloatingTabsBar({ state, navigation }: BottomTabBarProps) {
  return (
    <View pointerEvents="box-none" style={{ flex: 0 }}>
      <FloatingAppBar
        currentIndex={state.index}
        onSelect={(index) => {
          const route = state.routes[index];

          if (!route) {
            return;
          }

          navigation.navigate(route.name);
        }}
      />
    </View>
  );
}
