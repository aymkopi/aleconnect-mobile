import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "@/components/panelui/button";
import { DataState, DataNotice } from "@/components/data-state";
import { Text } from "@/components/panelui/text";
import { ReportPage } from "@/features/reports/components/report-page";
import { useScopedRead } from "@/hooks/use-scoped-read";
import { fetchNotifications } from "@/services/notifications";
import { manilaNotificationGroupTitle } from "@/utils/manila-time";
import { notificationFixtureNow, notificationFixtures } from "./fixtures";
import { findOwnNotification, notificationContext, notificationIsAuthorized, notificationTime } from "./presentation";
import { NotificationGate, NotificationNotice } from "./notification-ui";
import { useNotificationAccess, type NotificationAccess } from "./use-notifications";

export default function NotificationScreen() {
  const access = useNotificationAccess();
  return <NotificationGate access={access} title="Notification"><NotificationMessage key={access.key} access={access} /></NotificationGate>;
}

function NotificationMessage({ access }: { access: NotificationAccess }) {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; preview?: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const preview = access.fixtures && typeof params.preview === "string" ? params.preview : null;
  const read = useScopedRead(access.key && !access.fixtures ? JSON.stringify([access.key, id]) : null, async (force) => {
    try {
      const result = await findOwnNotification(id, async (cursor) => {
        const page = await fetchNotifications({ ...access.options, force: !cursor && force, cursor, limit: 50 });
        return { ...page, notifications: page.notifications.filter((row) => access.account && notificationIsAuthorized(row, access.account)) };
      }, access.isCurrent);
      return { ...result, signIn: false };
    } catch (error) {
      if ([401, 403, 409].includes((error as { status?: number })?.status ?? 0)) return { item: null, isStale: false, signIn: true };
      throw error;
    }
  });
  const item = access.fixtures ? preview === "unavailable" || preview === "loading" ? null : notificationFixtures.find((row) => row.id === (id || "fixture-message")) ?? null : read.data?.item;
  const busy = read.busy && !item || preview === "loading";
  const unavailable = !busy && !item;
  const reference = access.fixtures ? notificationFixtureNow : new Date();
  return <ReportPage title="Notification" onBack={() => router.dismissTo("/notifications")} footer={<>
    {read.data?.signIn ? <Button className="min-h-12 rounded-2xl" onPress={() => router.push("/sign-in")}>Sign in</Button> : item ? <Button className="min-h-12 rounded-2xl" onPress={() => router.push("/hotlines")}>Contact ALECO</Button> : null}
    <Button variant="outline" className="min-h-12 rounded-2xl" onPress={() => router.dismissTo("/notifications")}>Back to notifications</Button>
  </>}>
    {busy ? <DataState loading loadingLayout="detail" title="Loading your notification" /> : read.error && !item ? <DataState title="This notification couldn’t load" description="Reconnect and retry. Your inbox is still available." actionLabel="Try again" onAction={() => void read.reload(true)} /> : <>
      <Text accessibilityRole="header" style={{ fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 18, lineHeight: 26 }}>{unavailable ? "This update can’t be opened" : "An update from ALECO"}</Text>
      {item ? <>
        <NotificationNotice title={item.title}>ALECO has shared a message for your account.</NotificationNotice>
        {item.description ? <Text muted size="sm" style={{ lineHeight: 20 }}>{item.description}</Text> : null}
        <Text muted size="sm" style={{ lineHeight: 20 }}>Received {manilaNotificationGroupTitle(item.createdAt, reference).toLocaleLowerCase()}, {notificationTime(item, reference)} · {notificationContext(item)}</Text>
        {read.data?.isStale ? <NotificationNotice title="Showing a saved notification">Connect and refresh the inbox to confirm this update.</NotificationNotice> : null}
      </> : <NotificationNotice title={read.error ? "The message could not load" : "The linked item is unavailable"}>{read.error || "Return to your notifications, or sign in with the intended account to view its updates."}</NotificationNotice>}
      {read.error && item ? <DataNotice title="Could not refresh this notification" description="Your loaded notification remains visible. Reconnect and refresh for the latest information." actionLabel="Refresh notification" busy={read.busy} onAction={() => void read.reload(true)} /> : null}
    </>}
  </ReportPage>;
}
