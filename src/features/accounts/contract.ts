export type LinkedAccount = {
  id: string;
  accountNumber: string | null;
  registeredName: string;
  isDefault: boolean;
  address?: string | null;
  meterSerialNumber?: string | null;
};

export type ConsumerCapabilities = {
  emailSetup: boolean;
  accountLinking: boolean;
  accountNumberLogin: boolean;
  mockEmailVerification: boolean;
};

export type ConsumerAccessContext = {
  identityUserId: string;
  sessionMode: "legacy" | "identity";
  authorizedServiceAccountIds: string[];
  defaultServiceAccountId: string;
  accessRevision: number;
  capabilities: ConsumerCapabilities;
};

export type ConsumerAccountContext = ConsumerAccessContext & {
  accounts: LinkedAccount[];
  cacheKey: string;
};

export type ConsumerLinkedAccountsSnapshot = {
  identityUserId?: string;
  accounts: LinkedAccount[];
  defaultServiceAccountId: string | null;
  accessRevision: number;
};

export const CONSUMER_ACCOUNT_SNAPSHOT_MAX_ATTEMPTS = 2;

export class ConsumerAccountSnapshotMismatchError extends Error {
  readonly code = "CONSUMER_ACCOUNT_SNAPSHOT_MISMATCH";

  constructor() {
    super("Consumer account data changed while it was loading. Please retry.");
    this.name = "ConsumerAccountSnapshotMismatchError";
  }
}

export type LegacyUser = {
  id: string;
  username?: string | null;
  name?: string | null;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function stringIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string" && item.length > 0))];
}

function capabilities(value: unknown, sessionMode: "legacy" | "identity"): ConsumerCapabilities {
  const source = record(value);
  return {
    emailSetup: source.emailSetup === true,
    accountLinking: source.accountLinking === true,
    accountNumberLogin: typeof source.accountNumberLogin === "boolean"
      ? source.accountNumberLogin
      : sessionMode === "legacy",
    mockEmailVerification: source.mockEmailVerification === true,
  };
}

export function normalizeConsumerIdentity(
  value: unknown,
  legacyUser: LegacyUser,
): ConsumerAccessContext {
  const source = record(value);
  const requestedMode = source.sessionMode === "identity" ? "identity" : "legacy";
  const identityUserId = typeof source.identityUserId === "string" && source.identityUserId
    ? source.identityUserId
    : legacyUser.id;
  const authorizedServiceAccountIds = stringIds(source.authorizedServiceAccountIds);
  const serviceAccountIds = authorizedServiceAccountIds.length
    ? authorizedServiceAccountIds
    : [legacyUser.id];
  const defaultServiceAccountId = typeof source.defaultServiceAccountId === "string"
    && serviceAccountIds.includes(source.defaultServiceAccountId)
    ? source.defaultServiceAccountId
    : serviceAccountIds[0];
  const sessionMode = requestedMode;

  return {
    identityUserId,
    sessionMode,
    authorizedServiceAccountIds: serviceAccountIds,
    defaultServiceAccountId,
    accessRevision: Number.isSafeInteger(source.accessRevision) && Number(source.accessRevision) >= 0
      ? Number(source.accessRevision)
      : 0,
    capabilities: capabilities(source.capabilities, sessionMode),
  };
}

export function normalizeLinkedAccounts(value: unknown, legacyUser: LegacyUser | null) {
  const source = record(value);
  const accounts = Array.isArray(source.accounts)
    ? source.accounts.filter((item): item is LinkedAccount => Boolean(item && typeof item === "object" && typeof (item as LinkedAccount).id === "string"))
    : [];
  const legacy = legacyUser ? [{ id: legacyUser.id, accountNumber: legacyUser.username ?? null, registeredName: legacyUser.name ?? "ALECO account", isDefault: true }] : [];
  const normalized = accounts.length ? accounts : legacy;
  const defaultServiceAccountId = typeof source.defaultServiceAccountId === "string" && normalized.some((account) => account.id === source.defaultServiceAccountId)
    ? source.defaultServiceAccountId
    : normalized.find((account) => account.isDefault)?.id ?? normalized[0]?.id ?? null;
  const identityUserId = typeof source.identityUserId === "string" && source.identityUserId ? source.identityUserId : undefined;
  return {
    ...(identityUserId ? { identityUserId } : {}),
    accounts: normalized.map((account) => ({ ...account, isDefault: account.id === defaultServiceAccountId })),
    defaultServiceAccountId,
    accessRevision: Number.isInteger(source.accessRevision) ? Number(source.accessRevision) : 0,
  };
}

export function combineConsumerAccountSnapshots(
  identity: ConsumerAccessContext,
  linkedAccounts: ConsumerLinkedAccountsSnapshot,
): ConsumerAccountContext {
  const identityAccounts = [...new Set(identity.authorizedServiceAccountIds)].sort();
  const linkedAccountIds = [...new Set(linkedAccounts.accounts.map((account) => account.id))].sort();
  const strictLegacyFallback = identity.sessionMode === "legacy"
    && identity.accessRevision === 0
    && linkedAccounts.accessRevision === 0
    && !linkedAccounts.identityUserId
    && identityAccounts.length === 1
    && linkedAccountIds.length === 1
    && identityAccounts[0] === linkedAccountIds[0]
    && identity.defaultServiceAccountId === identityAccounts[0]
    && linkedAccounts.defaultServiceAccountId === identityAccounts[0];
  const sameAccountSet = identityAccounts.length === linkedAccountIds.length
    && identityAccounts.every((id, index) => id === linkedAccountIds[index]);
  if (!strictLegacyFallback && (
    identity.accessRevision !== linkedAccounts.accessRevision
    || linkedAccounts.identityUserId !== identity.identityUserId
    || !sameAccountSet
    || linkedAccounts.defaultServiceAccountId !== identity.defaultServiceAccountId
  )) {
    throw new ConsumerAccountSnapshotMismatchError();
  }

  return {
    ...identity,
    authorizedServiceAccountIds: identity.authorizedServiceAccountIds,
    defaultServiceAccountId: identity.defaultServiceAccountId,
    accounts: linkedAccounts.accounts,
    cacheKey: `${identity.identityUserId}:${identity.accessRevision}`,
  };
}

export async function readConsistentConsumerAccountSnapshot(input: {
  readIdentity: () => Promise<ConsumerAccessContext>;
  readLinkedAccounts: () => Promise<ConsumerLinkedAccountsSnapshot>;
}): Promise<ConsumerAccountContext> {
  for (let attempt = 0; attempt < CONSUMER_ACCOUNT_SNAPSHOT_MAX_ATTEMPTS; attempt += 1) {
    const [identity, linkedAccounts] = await Promise.all([
      input.readIdentity(),
      input.readLinkedAccounts(),
    ]);
    try {
      return combineConsumerAccountSnapshots(identity, linkedAccounts);
    } catch (error) {
      if (!(error instanceof ConsumerAccountSnapshotMismatchError)
        || attempt === CONSUMER_ACCOUNT_SNAPSHOT_MAX_ATTEMPTS - 1) {
        throw error;
      }
    }
  }

  throw new ConsumerAccountSnapshotMismatchError();
}
