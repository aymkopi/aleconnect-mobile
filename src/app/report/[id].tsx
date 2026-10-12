import { Redirect, useLocalSearchParams } from "expo-router";

export default function ReportAlias() {
  const { id, focus, serviceAccountId } = useLocalSearchParams<{
    id: string;
    focus?: string;
    serviceAccountId?: string;
  }>();
  if (typeof id !== "string" || !id.trim())
    return <Redirect href="/reports/list" />;
  return (
    <Redirect
      href={{
        pathname: "/reports/[id]",
        params: {
          id,
          ...(typeof focus === "string" ? { focus } : {}),
          ...(typeof serviceAccountId === "string" ? { serviceAccountId } : {}),
        },
      }}
    />
  );
}
