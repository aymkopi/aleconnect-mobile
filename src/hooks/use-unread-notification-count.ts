import { useAuthSession } from "@/hooks/use-auth-session";
import { useConsumerAccount } from "@/hooks/use-consumer-account";
import {
  fetchNotifications,
  subscribeNotificationsChanged,
} from "@/services/notifications";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

export function useUnreadNotificationCount() {
  const { session } = useAuthSession();
  const { accountContext } = useConsumerAccount();
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      if (!session) {
        setUnreadCount(0);
        return;
      }

      const load = () =>
        void fetchNotifications({
          userId: session.user.id,
          identityUserId: accountContext?.identityUserId,
          accessRevision: accountContext?.accessRevision,
        })
        .then((response) => {
          if (isActive) setUnreadCount(response.unreadCount);
        })
        .catch(() => {
          if (isActive) setUnreadCount(0);
        });
      load();
      const unsubscribe = subscribeNotificationsChanged(load);

      return () => {
        isActive = false;
        unsubscribe();
      };
    }, [accountContext?.accessRevision, accountContext?.identityUserId, session]),
  );

  return unreadCount;
}
