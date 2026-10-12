import { Stack } from "expo-router";
import { useAppColors } from "@/hooks/use-app-colors";
export default function ProfileLayout() {
  const [background] = useAppColors(["background"]);
  return <Stack screenOptions={{ headerShown: false, animation: "none", contentStyle: { backgroundColor: background } }} />;
}
