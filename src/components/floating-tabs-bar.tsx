import { FloatingAppBar } from "@/components/floating-app-bar";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { usePathname } from "expo-router";
import { getFocusedRouteNameFromRoute } from "expo-router/react-navigation";
import { useGuestAccess } from "@/context/guest-access-context";
import { View } from "react-native";

export function FloatingTabsBar({ state, navigation }: BottomTabBarProps) {
  const pathname = usePathname();
  const { guest, requestSignIn } = useGuestAccess();
  const activeRoute = state.routes[state.index];
  const nestedRouteName = activeRoute
    ? getFocusedRouteNameFromRoute(activeRoute)
    : undefined;

  // The URL may lag native Back; use it only while the active stack has no state.
  const hidden = Boolean(nestedRouteName !== undefined
      ? nestedRouteName !== "index"
      : activeRoute && pathname.startsWith(`/${activeRoute.name}/`));

  return (
    <View
      style={{ flex: 0, opacity: hidden ? 0 : 1 }}
      pointerEvents={hidden ? "none" : "box-none"}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? "no-hide-descendants" : "auto"}
      aria-hidden={hidden}
    >
      <FloatingAppBar
        currentIndex={state.index}
        hidden={hidden}
        onSelect={(index) => {
          const route = state.routes[index];

          if (!route) {
            return false;
          }

          if (guest && route.name === "reports") { requestSignIn("/reports", "reports"); return false; }
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (event.defaultPrevented) return false;
          if (route.name === "reports" || route.name === "profile") navigation.navigate(route.name, { screen: "index" });
          else navigation.navigate(route.name);
          return true;
        }}
      />
    </View>
  );
}
