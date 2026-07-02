import { Stack } from "expo-router";
import { ConsumerProfileProvider } from "@/context/consumer-profile-context";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function ComplaintsLayout() {
  return (
    <ConsumerProfileProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ConsumerProfileProvider>
  );
}
