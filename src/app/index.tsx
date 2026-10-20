import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { Spinner } from "@/components/panelui/spinner";
import { useAuthSession } from "@/hooks/use-auth-session";
import { signedInDestination, signInIntent } from "@/features/auth/auth-state";
import { welcomeEntryRoute, welcomeSeenKey } from "@/features/onboarding/welcome-state";

export default function Index() {
  const { session, isLoading } = useAuthSession();
  const [hasSeenWelcome, setHasSeenWelcome] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(welcomeSeenKey)
      .then((value) => { if (active) setHasSeenWelcome(value === "1"); })
      // The introductory tour must never block access when device storage fails.
      .catch(() => { if (active) setHasSeenWelcome(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (session) void AsyncStorage.setItem(welcomeSeenKey, "1").catch(() => undefined);
  }, [session]);

  const destination = welcomeEntryRoute({ isLoading, hasSession: !!session, hasSeenWelcome });
  if (!destination) return <View className="flex-1 items-center justify-center bg-background"><Spinner label="Opening ALEConnect" /></View>;
  return <Redirect href={session ? signedInDestination(signInIntent({}), session) : destination} />;
}
