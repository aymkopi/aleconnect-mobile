import { FloatingTabsBar } from "@/components/floating-tabs-bar";
import { useAppColors } from "@/hooks/use-app-colors";
import { Tabs, Redirect, usePathname } from "expo-router";
import { authReturnRoute } from "@/features/auth/auth-state";
import { useAuthSession } from "@/hooks/use-auth-session";
export default function TabsLayout() {
  const [background] = useAppColors(["background"]);
  const { session } = useAuthSession();
  const pathname = usePathname();
  if (session?.user.mustChangePassword) return <Redirect href={{ pathname: "/required-password", params: { returnTo: authReturnRoute(pathname) } }} />;
  return (
    <Tabs
      detachInactiveScreens
      tabBar={(props) => <FloatingTabsBar {...props} />}
      screenOptions={{
        animation: "none",
        headerShown: false,
        lazy: true,
        sceneStyle: { backgroundColor: background },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen
        name="reports"
        options={{ title: "Reports", popToTopOnBlur: true }}
      />
      <Tabs.Screen name="advisories" options={{ title: "Advisories" }} />
      <Tabs.Screen name="hotlines" options={{ title: "Hotlines" }} />
      <Tabs.Screen
        name="profile"
        options={{ title: "Account", popToTopOnBlur: true }}
      />
    </Tabs>
  );
}
