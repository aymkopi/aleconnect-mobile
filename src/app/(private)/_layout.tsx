import { Stack, Redirect, usePathname } from "expo-router";
import { useAppColors } from "@/hooks/use-app-colors";
import { useAuthSession } from "@/hooks/use-auth-session";
import { authReturnRoute } from "@/features/auth/auth-state";

export default function PrivateLayout() {
  const [background] = useAppColors(["background"]);
  const { session } = useAuthSession();
  const pathname = usePathname();
  if (session?.user.mustChangePassword) return <Redirect href={{ pathname: "/required-password", params: { returnTo: authReturnRoute(pathname) } }} />;
  return <Stack screenOptions={{ headerShown: false, animation: "none", contentStyle: { backgroundColor: background } }} />;
}
