import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ConsumerAccountContext } from "@/features/accounts/contract";

const prefix = "consumer_account_cache_v1:";
const maxAgeMs = 30 * 24 * 60 * 60 * 1000;
let generation = 0;
let writes = Promise.resolve();

function validSnapshot(value: unknown): value is ConsumerAccountContext {
  if (!value || typeof value !== "object") return false;
  const v = value as ConsumerAccountContext;
  if (typeof v.identityUserId !== "string" || !v.identityUserId ||
      (v.sessionMode !== "legacy" && v.sessionMode !== "identity") ||
      !Number.isSafeInteger(v.accessRevision) || v.accessRevision < 0 ||
      v.cacheKey !== `${v.identityUserId}:${v.accessRevision}` ||
      !Array.isArray(v.authorizedServiceAccountIds) || !Array.isArray(v.accounts) ||
      !v.capabilities || typeof v.capabilities !== "object") return false;
  const ids = v.authorizedServiceAccountIds;
  return ids.every(id => typeof id === "string" && id.length > 0) &&
    new Set(ids).size === ids.length && v.accounts.length === ids.length &&
    (ids.length ? ids.includes(v.defaultServiceAccountId) : v.defaultServiceAccountId === "") &&
    v.accounts.every(account => account && ids.includes(account.id) &&
      typeof account.registeredName === "string" &&
      (account.accountNumber === null || typeof account.accountNumber === "string") &&
      account.isDefault === (account.id === v.defaultServiceAccountId) &&
      ["address", "meterSerialNumber", "phoneNumber"].every(key => {
        const field = account[key as keyof typeof account];
        return field === undefined || field === null || typeof field === "string";
      })) && new Set(v.accounts.map(account => account.id)).size === ids.length &&
    ["emailSetup", "accountLinking", "accountNumberLogin", "mockEmailVerification"].every(key =>
      typeof v.capabilities[key as keyof typeof v.capabilities] === "boolean") &&
    Object.values(v.capabilities).every(flag => typeof flag === "boolean");
}

export function isConsumerReadTransportError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const { status, code } = error as Error & { status?: number; code?: string };
  return (status === undefined && !code && (error.name === "ApiRequestError" || error instanceof TypeError)) || status === 408 || status === 429 || (typeof status === "number" && status >= 500);
}

export async function readConsumerAccountCache(principalId: string, now = Date.now()): Promise<ConsumerAccountContext | null> {
  if (!principalId) return null;
  const revision = generation;
  await writes;
  const raw = await AsyncStorage.getItem(prefix + encodeURIComponent(principalId));
  if (!raw || revision !== generation) return null;
  try {
    const stored = JSON.parse(raw);
    if (stored.version !== 1 || stored.principalId !== principalId ||
        !Number.isFinite(stored.fetchedAt) || stored.fetchedAt > now || now - stored.fetchedAt > maxAgeMs ||
        !validSnapshot(stored.value)) return null;
    return stored.value;
  } catch { return null; }
}

export async function writeConsumerAccountCache(principalId: string, value: ConsumerAccountContext, now = Date.now()): Promise<void> {
  if (!principalId || !validSnapshot(value)) throw Object.assign(new Error("Account snapshot is invalid."), { code: "INVALID_ACCOUNT_SNAPSHOT" });
  const revision = generation;
  // Persist only the read contract, never arbitrary response properties or credentials.
  const snapshot: ConsumerAccountContext = {
    identityUserId: value.identityUserId, sessionMode: value.sessionMode,
    authorizedServiceAccountIds: [...value.authorizedServiceAccountIds],
    defaultServiceAccountId: value.defaultServiceAccountId, accessRevision: value.accessRevision,
    capabilities: { ...value.capabilities }, cacheKey: value.cacheKey,
    accounts: value.accounts.map(({ id, accountNumber, registeredName, isDefault, address, meterSerialNumber, phoneNumber }) =>
      ({ id, accountNumber, registeredName, isDefault, ...(address !== undefined ? { address } : {}), ...(meterSerialNumber !== undefined ? { meterSerialNumber } : {}), ...(phoneNumber !== undefined ? { phoneNumber } : {}) })),
  };
  const write = writes.then(async () => {
    if (generation === revision) await AsyncStorage.setItem(prefix + encodeURIComponent(principalId), JSON.stringify({ version: 1, principalId, fetchedAt: now, value: snapshot }));
  });
  writes = write.catch(() => {});
  await write;
}

export async function clearConsumerAccountCache(principalId?: string): Promise<void> {
  generation += 1;
  const clear = writes.then(async () => {
    if (principalId) await AsyncStorage.removeItem(prefix + encodeURIComponent(principalId));
    else {
      const keys = (await AsyncStorage.getAllKeys()).filter(key => key.startsWith(prefix));
      if (keys.length) await AsyncStorage.multiRemove(keys);
    }
  });
  writes = clear.catch(() => {});
  await clear;
}
