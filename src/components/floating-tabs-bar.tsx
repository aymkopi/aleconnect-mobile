import { FloatingAppBar } from "@/components/floating-app-bar";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { usePathname } from "expo-router";
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

export function FloatingTabsBar({
  state,
  navigation,
}: BottomTabBarProps) {
  const pathname = usePathname();
  const activeRoute = state.routes[state.index];
  const nestedRouteName = activeRoute
    ? getFocusedNestedRouteName(activeRoute as NestedRoute)
    : undefined;

  if (
    pathname.endsWith("/complaints/new") ||
    pathname.endsWith("/profile/details") ||
    (nestedRouteName && nestedRouteName !== "index")
  ) {
    return null;
  }

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
