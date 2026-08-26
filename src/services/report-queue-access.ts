export type QueuedReportAccessScope = {
  userId: string;
  identityUserId?: string;
  serviceAccountId?: string;
  accessRevision?: number;
};

export type CurrentReportAccessScope = {
  identityUserId: string;
  authorizedServiceAccountIds: readonly string[];
  accessRevision: number;
};

export function isQueuedReportVisible(
  queued: QueuedReportAccessScope,
  current: CurrentReportAccessScope,
) {
  if (queued.identityUserId !== undefined) {
    return queued.identityUserId === current.identityUserId;
  }
  if (queued.serviceAccountId !== undefined) {
    return current.authorizedServiceAccountIds.includes(queued.serviceAccountId);
  }
  return current.authorizedServiceAccountIds.length === 1
    && current.authorizedServiceAccountIds[0] === queued.userId;
}

export type QueuedReportAccessDecision =
  | {
      allowed: true;
      legacyUpgraded: boolean;
      scope: {
        identityUserId: string;
        serviceAccountId: string;
        accessRevision: number;
      };
    }
  | { allowed: false; code: "ACCOUNT_NOT_ACCESSIBLE" | "QUEUE_ACCESS_STALE" };

export function evaluateQueuedReportAccess(
  queued: QueuedReportAccessScope,
  current: CurrentReportAccessScope,
): QueuedReportAccessDecision {
  const serviceAccountId = queued.serviceAccountId
    ?? (current.authorizedServiceAccountIds.length === 1
      ? current.authorizedServiceAccountIds[0]
      : undefined);

  if (!serviceAccountId || !current.authorizedServiceAccountIds.includes(serviceAccountId)) {
    return { allowed: false, code: "ACCOUNT_NOT_ACCESSIBLE" };
  }

  const legacyUpgraded = queued.identityUserId === undefined
    && queued.serviceAccountId === undefined
    && queued.accessRevision === undefined
    && current.authorizedServiceAccountIds.length === 1
    && serviceAccountId === queued.userId;

  if (!legacyUpgraded && (
    queued.identityUserId !== current.identityUserId
    || queued.serviceAccountId !== serviceAccountId
    || queued.accessRevision !== current.accessRevision
  )) {
    return { allowed: false, code: "QUEUE_ACCESS_STALE" };
  }

  return {
    allowed: true,
    legacyUpgraded,
    scope: {
      identityUserId: current.identityUserId,
      serviceAccountId,
      accessRevision: current.accessRevision,
    },
  };
}
