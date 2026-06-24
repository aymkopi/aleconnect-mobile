import { Stack } from "expo-router";
import { ConsumerProfileProvider } from "@/context/consumer-profile-context";

export default function ComplaintsLayout() {
  return (
    <ConsumerProfileProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ConsumerProfileProvider>
  );
}
