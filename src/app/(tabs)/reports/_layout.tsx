import { Redirect, Stack } from "expo-router";
import { ConsumerProfileProvider } from "@/context/consumer-profile-context";
import { useAuthSession } from "@/hooks/use-auth-session";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function ComplaintsLayout() {
  const { isLoading, session } = useAuthSession();

  if (isLoading) return null;
  if (!session) return <Redirect href="/sign-in" />;

  return (
    <ConsumerProfileProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ConsumerProfileProvider>
  );
}
