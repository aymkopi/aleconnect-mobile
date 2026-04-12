import { FloatingAppBar } from "@/components/floating-app-bar";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import type { RefObject } from "react";
import { View } from "react-native";

interface FloatingTabsBarProps extends BottomTabBarProps {
  readonly blurTarget: RefObject<View | null>;
}

export function FloatingTabsBar({
  state,
  navigation,
  blurTarget,
}: FloatingTabsBarProps) {
  return (
    <View pointerEvents="box-none" style={{ flex: 0 }}>
      <FloatingAppBar
        currentIndex={state.index}
        blurTarget={blurTarget}
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
