import { useEffect, useRef, useState } from "react";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useConsumerAccount } from "@/hooks/use-consumer-account";
import { useScopedRead } from "@/hooks/use-scoped-read";
import { useVisualPreview } from "@/context/visual-preview-context";
import { PANELUI_PREVIEW } from "@/constants/panelui-preview";
import { fetchNotifications, markAllNotificationsRead, markNotificationsRead, type MobileNotification, type MobileNotificationCategory, type MobileNotificationsResponse } from "@/services/notifications";
import { notificationFixtureAccount, notificationFixtures } from "./fixtures";
import { mergeNotificationPages, notificationIsAuthorized } from "./presentation";

type NotificationPage = MobileNotificationsResponse & { accessDenied?: boolean };
export function useNotificationAccess() {
  const { session, isLoading } = useAuthSession();
  const { accountContext, isLoading: accountLoading, refreshConsumerAccount } = useConsumerAccount();
  const { fixtures } = useVisualPreview();
  const account = fixtures ? notificationFixtureAccount : accountContext;
  const key = fixtures ? "notification-fixture" : !isLoading && session && account ? JSON.stringify([session.session.id, session.user.id, account.identityUserId, account.accessRevision, account.authorizedServiceAccountIds]) : null;
  const current = useRef(key);
  // eslint-disable-next-line react-hooks/refs -- Invalidate pending private work before effects run.
  current.current = key;
  useEffect(() => () => { current.current = null; }, []);
  const isCurrent = () => key !== null && current.current === key;
  const options = {
    userId: session?.user.id ?? "fixture-notifications", identityUserId: account?.identityUserId,
    accessRevision: account?.accessRevision, sessionId: session?.session.id, isCurrent,
  };
  return { account, fixtures, key, options, isCurrent, refreshConsumerAccount, loading: !fixtures && (isLoading || (!account && accountLoading)), guest: !fixtures && !isLoading && !session };
}

export type NotificationAccess = ReturnType<typeof useNotificationAccess>;
export function useNotifications(access: NotificationAccess, category: "all" | MobileNotificationCategory, accountId: string, unread: boolean) {
  const [fixtureRows, setFixtureRows] = useState(notificationFixtures);
  const [mutation, setMutation] = useState({ busy: false, error: "", notice: "" });
  const actionPending = useRef(false);
  const paging = useRef(false);
  const readKey = access.key && !access.fixtures ? JSON.stringify([access.key, category, accountId, unread]) : null;
  const readCurrent = useRef(readKey);
  // eslint-disable-next-line react-hooks/refs -- Filter changes also invalidate pagination/cache writes.
  readCurrent.current = readKey;
  const isCurrent = () => access.isCurrent() && readCurrent.current === readKey;
  const options = { ...access.options, isCurrent, limit: 25, unread, categories: category === "all" ? undefined : [category], serviceAccountId: accountId === "all" ? undefined : accountId };
  const read = async (force: boolean, cursor?: string | null): Promise<NotificationPage> => {
    try { return await fetchNotifications({ ...options, force, cursor }); }
    catch (error) {
      if ([401, 403, 409].includes((error as { status?: number })?.status ?? 0)) return { notifications: [], unreadCount: 0, nextCursor: null, accessDenied: true };
      throw error;
    }
  };
  const feed = useScopedRead(readKey, (force) => read(force));
  const rows = (access.fixtures ? fixtureRows.filter((row) => (!unread || !row.isRead) && (category === "all" || row.category === category) && (accountId === "all" || row.identityLevel || !row.serviceAccountId || row.serviceAccountId === accountId)) : feed.data?.notifications ?? []).filter((row) => access.account && notificationIsAuthorized(row, access.account));
  const mutate = async (item?: MobileNotification) => {
    if (actionPending.current || !access.isCurrent()) return false;
    if (!access.fixtures && PANELUI_PREVIEW) return true;
    actionPending.current = true;
    setMutation({ busy: true, error: "", notice: "" });
    try {
      if (access.fixtures) setFixtureRows((before) => before.map((row) => (!item || row.id === item.id) && (accountId === "all" || !row.serviceAccountId || row.serviceAccountId === accountId) ? { ...row, isRead: true } : row));
      else {
        const scope = { ...access.options, serviceAccountId: options.serviceAccountId };
        if (item) await markNotificationsRead([item.id], options.userId, scope);
        else await markAllNotificationsRead(options.userId, scope);
        if (!isCurrent()) return false;
        await feed.reload(true);
      }
      if (!isCurrent()) return false;
      setMutation({ busy: false, error: "", notice: item ? "Notification marked as read." : "Notifications marked as read." });
      return true;
    } catch (error) {
      if (isCurrent()) setMutation({ busy: false, error: error instanceof Error ? error.message : "The read status could not be saved. Try again.", notice: "" });
      return false;
    } finally {
      actionPending.current = false;
      if (access.isCurrent()) setMutation((before) => ({ ...before, busy: false }));
    }
  };
  const loadMore = async () => {
    const cursor = feed.data?.nextCursor;
    if (!cursor || feed.busy || paging.current || !isCurrent() || feed.data?.isStale) return;
    paging.current = true;
    try { await feed.append(() => read(false, cursor), (before, next) => next.accessDenied ? next : mergeNotificationPages(before, next)); }
    finally { paging.current = false; }
  };
  return { ...access, ...feed, rows, mutate, loadMore, mutation,
    unreadCount: access.fixtures ? fixtureRows.filter((row) => !row.isRead && (accountId === "all" || !row.serviceAccountId || row.serviceAccountId === accountId)).length : feed.data?.unreadCount ?? 0,
    readOnly: !access.fixtures && PANELUI_PREVIEW,
  };
}
