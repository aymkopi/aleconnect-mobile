import { FloatingAppBar } from "@/components/floating-app-bar";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { usePathname } from "expo-router";
import { useGuestAccess } from "@/context/guest-access-context";
import { View } from "react-native";

type NestedRoute = {
  name?: string;
  state?: {
    index?: number;
    routes?: NestedRoute[];
  };
};

function getFocusedNestedRouteName(route: NestedRoute): string | undefined {
  const nestedState = route.state;
  const nestedRoute = nestedState?.routes?.[nestedState.index ?? 0];

  if (!nestedRoute) {
    return undefined;
  }

  return getFocusedNestedRouteName(nestedRoute) ?? nestedRoute.name;
}

export function FloatingTabsBar({ state, navigation }: BottomTabBarProps) {
  const pathname = usePathname();
  const { guest, requestSignIn } = useGuestAccess();
  const activeRoute = state.routes[state.index];
  const nestedRouteName = activeRoute
    ? getFocusedNestedRouteName(activeRoute as NestedRoute)
    : undefined;

  const reportDetail =
    nestedRouteName === "[id]" && pathname.startsWith("/reports/");
  if (
    [
      "/reports/new",
      "/reports/list",
      "/reports/queue",
      "/reports/timeline",
      "/reports/period",
    ].includes(pathname) ||
    pathname.startsWith("/profile/") ||
    (nestedRouteName && nestedRouteName !== "index" && !reportDetail)
  ) {
    return null;
  }

  return (
    <View style={{ flex: 0, pointerEvents: "box-none" }}>
      <FloatingAppBar
        currentIndex={state.index}
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
