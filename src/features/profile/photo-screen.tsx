import { Redirect, useLocalSearchParams } from "expo-router";

// Keep existing links working while the photo editor lives inside Edit profile.
export default function PhotoScreen() {
  const { serviceAccountId } = useLocalSearchParams<{ serviceAccountId?: string }>();
  return <Redirect href={{ pathname: "/profile/details", params: {
    ...(typeof serviceAccountId === "string" ? { serviceAccountId } : {}), edit: "1",
  } }} />;
}
