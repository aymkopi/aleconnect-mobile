import { useCallback, useState } from "react";
import { toast } from "@/components/panelui/toast";
import { claimManualRefresh } from "@/utils/manual-refresh";

export function useManualRefresh(
  resource: string,
  consumerId: string | null,
  reload: () => Promise<unknown> | void,
  busy = false,
) {
  const key = consumerId === null ? null : JSON.stringify([resource, consumerId]);
  const [refreshingKey, setRefreshingKey] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    if (!key) return;
    const claim = busy
      ? { allowed: false, pending: true, retryAfterMs: 0 } as const
      : claimManualRefresh(key);
    if (!claim.allowed) {
      toast.show({
        label: claim.pending
          ? "An update is already in progress"
          : "Too many requests. Try again later.",
        description: claim.pending
          ? "Try again when the current update finishes."
          : `Retry in ${Math.ceil(claim.retryAfterMs / 1_000)} seconds.`,
      });
      return;
    }
    setRefreshingKey(key);
    try {
      await reload();
    } finally {
      claim.finish();
      setRefreshingKey((current) => current === key ? null : current);
    }
  }, [key, reload, busy]);
  return { refresh, refreshing: key !== null && refreshingKey === key };
}
