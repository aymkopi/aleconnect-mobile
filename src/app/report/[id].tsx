import { Redirect, Stack } from "expo-router";

import { useAuthSession } from "@/hooks/use-auth-session";
import ComplaintDetail from "../(tabs)/reports/[id]";

export default function ReportDetailRoute() {
  const { isLoading, session } = useAuthSession();

  if (isLoading) return null;
  if (!session) return <Redirect href="/sign-in" />;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ComplaintDetail />
    </>
  );
}
