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
  const scope = session ? JSON.stringify([session.user.id, session.session.id, accountContext?.identityUserId, accountContext?.accessRevision]) : null;
  const [unread, setUnread] = useState<{ scope: string | null; count: number }>({ scope: null, count: 0 });

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      let loading = false, pending = false;

      if (!session) {
        return;
      }

      const load = () => {
        if (loading) { pending = true; return; }
        loading = true;
        void fetchNotifications({
          userId: session.user.id,
          sessionId: session.session.id,
          identityUserId: accountContext?.identityUserId,
          accessRevision: accountContext?.accessRevision,
          force: true,
          isCurrent: () => isActive,
        })
        .then((response) => {
          if (isActive && !pending) setUnread({ scope, count: response.unreadCount });
        })
        .catch(() => {
          // Keep the last accepted count during transient network failures.
        }).finally(() => {
          loading = false;
          if (isActive && pending) { pending = false; load(); }
        });
      };
      load();
      const unsubscribe = subscribeNotificationsChanged(load);

      return () => {
        isActive = false;
        unsubscribe();
      };
    }, [accountContext?.accessRevision, accountContext?.identityUserId, session, scope]),
  );

  return unread.scope === scope ? unread.count : 0;
}
