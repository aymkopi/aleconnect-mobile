import type { MobileNotification, MobileNotificationCategory, MobileNotificationsResponse } from "../../services/notifications.ts";
import type { ConsumerAccountContext } from "../accounts/contract.ts";
import { manilaNotificationGroupTitle, parseApiInstant } from "../../utils/manila-time.ts";

export const notificationCategories: { value: "all" | MobileNotificationCategory; label: string }[] = [
  { value: "all", label: "All categories" },
  { value: "report_updates", label: "Report updates" },
  { value: "area_incidents", label: "Area incidents" },
  { value: "advisories", label: "Advisories" },
  { value: "system", label: "System" },
];

export function notificationIsAuthorized(item: MobileNotification, account: ConsumerAccountContext) {
  return !item.serviceAccountId || account.authorizedServiceAccountIds.includes(item.serviceAccountId);
}

export function notificationContext(item: MobileNotification) {
  const account = [item.accountName, item.accountNumber ? `••${item.accountNumber.slice(-4)}` : null].filter(Boolean).join(" ");
  if (item.ticketNumber) return [item.ticketNumber, account].filter(Boolean).join(" · ");
  if (item.entityType === "account_linking") return "Account access · System";
  if (item.category === "advisories") return /billing|collection|payment/i.test(item.title) ? "Payment reminder · ALECO" : "Advisory";
  return account || notificationCategories.find((category) => category.value === item.category)?.label || "ALECO update";
}

export function matchesNotification(item: MobileNotification, query: string) {
  return [item.title, item.description, notificationContext(item)].join(" ").toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
}

export function groupNotifications(items: MobileNotification[], reference = new Date()) {
  const groups = new Map<string, MobileNotification[]>();
  for (const item of items) {
    const title = manilaNotificationGroupTitle(item.createdAt, reference);
    if (!groups.has(title)) groups.set(title, []);
    groups.get(title)!.push(item);
  }
  return [...groups].map(([title, data]) => ({ title, data }));
}

export function notificationTime(item: MobileNotification, reference = new Date()) {
  const instant = parseApiInstant(item.createdAt);
  if (!instant) return "Date unavailable";
  const group = manilaNotificationGroupTitle(item.createdAt, reference);
  const time = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit", hour12: true }).format(instant);
  return group === "Today" || group === "Yesterday" ? time : `${new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric" }).format(instant)} · ${time}`;
}

export function notificationRoute(item: MobileNotification, account: ConsumerAccountContext) {
  if (!notificationIsAuthorized(item, account)) return null;
  if (item.entityType === "account_linking") return { pathname: "/profile/link-requests" as const, params: item.entityId ? { requestId: item.entityId } : {} };
  if (item.entityType === "advisory" && item.entityId) return { pathname: "/advisory/[id]" as const, params: { id: item.entityId, focus: "notification" } };
  const serviceAccountId = item.serviceAccountId || (account.sessionMode === "legacy" && account.authorizedServiceAccountIds.length === 1 ? account.defaultServiceAccountId : null);
  if (item.ticketId && serviceAccountId) return { pathname: "/reports/[id]" as const, params: { id: item.ticketId, serviceAccountId, focus: "notification" } };
  return { pathname: "/notification" as const, params: { id: item.id } };
}

export function mergeNotificationPages(before: MobileNotificationsResponse, next: MobileNotificationsResponse) {
  return { ...next, notifications: [...new Map([...before.notifications, ...next.notifications].map((item) => [item.id, item])).values()] };
}

export async function findOwnNotification(id: string, read: (cursor: string | null) => Promise<MobileNotificationsResponse>, isCurrent: () => boolean) {
  if (!id) return { item: null, isStale: false };
  let cursor: string | null = null;
  const seen = new Set<string>();
  while (isCurrent()) {
    const page = await read(cursor);
    if (!isCurrent()) return { item: null, isStale: false };
    const item = page.notifications.find((row) => row.id === id);
    if (item) return { item, isStale: Boolean(page.isStale) };
    if (page.isStale) throw new Error("This update is not in the saved inbox. Connect and retry.");
    if (!page.nextCursor) return { item: null, isStale: false };
    if (seen.has(page.nextCursor)) throw new Error("Notifications changed. Refresh and try again.");
    seen.add(page.nextCursor);
    cursor = page.nextCursor;
  }
  return { item: null, isStale: false };
}
