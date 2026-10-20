import { FloatingAppBar } from "@/components/floating-app-bar";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { useGuestAccess } from "@/context/guest-access-context";
import { View } from "react-native";

export function FloatingTabsBar({ state, navigation }: BottomTabBarProps) {
  const { guest, requestSignIn } = useGuestAccess();

  return (
    <View style={{ flex: 0 }} pointerEvents="box-none">
      <FloatingAppBar
        guideNavigation
        currentIndex={state.index}
        onSelect={(index) => {
          const route = state.routes[index];

          if (!route) {
            return false;
          }

          if (guest && route.name === "reports") { requestSignIn("/reports", "reports"); return false; }
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (event.defaultPrevented) return false;
          navigation.navigate(route.name);
          return true;
        }}
      />
    </View>
  );
}
