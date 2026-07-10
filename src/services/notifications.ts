import { apiRequest } from "@/services/api";

export type MobileNotification = {
  id: string;
  title: string;
  description: string | null;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
  isRead: boolean;
  severity: string;
  ticketId: string | null;
  ticketNumber: string | null;
};

export type MobileNotificationsResponse = {
  unreadCount: number;
  notifications: MobileNotification[];
};

export async function fetchNotifications(): Promise<MobileNotificationsResponse> {
  return apiRequest<MobileNotificationsResponse>("/api/mobile/notifications");
}

export async function markNotificationsRead(ids: string[]) {
  return apiRequest<MobileNotificationsResponse>("/api/mobile/notifications", {
    method: "POST",
    body: JSON.stringify({ action: "markRead", ids }),
  });
}

export async function markAllNotificationsRead() {
  return apiRequest<MobileNotificationsResponse>("/api/mobile/notifications", {
    method: "POST",
    body: JSON.stringify({ action: "markAllRead" }),
  });
}
