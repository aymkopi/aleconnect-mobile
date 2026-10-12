import { useState, type ReactNode } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/components/panelui/button";
import { ContentSkeleton } from "@/components/content-skeleton";
import { Text } from "@/components/panelui/text";
import { ReportPage } from "@/features/reports/components/report-page";
import type { NotificationAccess } from "./use-notifications";

export function NotificationNotice({ title, children, danger = false }: { title: string; children: ReactNode; danger?: boolean }) {
  return <View accessibilityLiveRegion="polite" className={danger ? "gap-1 rounded-xl border border-destructive bg-card p-3" : "gap-1 rounded-xl border border-border bg-card p-3"}>
    <Text size="sm" weight="semibold" accessibilityRole={danger ? "alert" : undefined}>{title}</Text>
    {typeof children === "string" ? <Text size="sm">{children}</Text> : children}
  </View>;
}

export function NotificationGate({ access, title = "Notifications", children }: { access: NotificationAccess; title?: string; children: ReactNode }) {
  const router = useRouter();
  const [error, setError] = useState("");
  if (access.key && access.account) return children;
  return <ReportPage title={title} onBack={() => router.canGoBack() ? router.back() : router.replace("/home")}>
    {access.loading ? <ContentSkeleton layout="notification" label="Loading notification access" /> : <>
      <NotificationNotice title={access.guest ? "Sign in to see notifications" : "Account access is unavailable"}>
        {access.guest ? "Report updates, account requests and power advisories belong to your signed-in account." : "Refresh your account access before viewing private updates."}
      </NotificationNotice>
      <Button onPress={access.guest ? () => router.push({ pathname: "/sign-in", params: { returnTo: "/notifications" } }) : () => void access.refreshConsumerAccount().catch((e) => setError(e instanceof Error ? e.message : "Account access could not load."))}>{access.guest ? "Sign in" : "Retry account access"}</Button>
      {error ? <NotificationNotice title="Could not load account access" danger>{error}</NotificationNotice> : null}
    </>}
  </ReportPage>;
}
