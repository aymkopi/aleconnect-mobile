import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  normalizeConsumerIdentity,
  readConsistentConsumerAccountSnapshot,
  type ConsumerAccessContext,
  type ConsumerAccountContext,
} from "@/features/accounts/contract";
import { fetchLinkedAccounts } from "@/services/linked-accounts";
import { apiRequest, setAuthToken, type AuthUser } from "@/services/api";

const emailSetupDismissalKeyPrefix = "email_setup_dismissed_v1:";

export type ConsumerIdentitySetupInput = {
  email: string;
  password: string;
  verification: "mock";
  idempotencyKey: string;
};

type ConsumerIdentitySetupResponse = {
  token?: unknown;
  identityUserId?: unknown;
  defaultServiceAccountId?: unknown;
  accessRevision?: unknown;
  verificationStatus?: unknown;
};

export function emailSetupDismissalKey(serviceAccountId: string): string {
  return `${emailSetupDismissalKeyPrefix}${encodeURIComponent(serviceAccountId)}`;
}

export async function hasDismissedEmailSetup(serviceAccountId: string): Promise<boolean> {
  return (await AsyncStorage.getItem(emailSetupDismissalKey(serviceAccountId))) === "1";
}

export async function dismissEmailSetup(serviceAccountId: string): Promise<void> {
  await AsyncStorage.setItem(emailSetupDismissalKey(serviceAccountId), "1");
}

export async function clearEmailSetupDismissal(serviceAccountId: string): Promise<void> {
  await AsyncStorage.removeItem(emailSetupDismissalKey(serviceAccountId));
}

export async function fetchConsumerIdentity(user: AuthUser): Promise<ConsumerAccessContext> {
  const response = await apiRequest<unknown>("/api/mobile/consumer-identity");
  return normalizeConsumerIdentity(response, user);
}

export async function fetchConsumerAccountContext(
  user: AuthUser,
): Promise<ConsumerAccountContext> {
  return readConsistentConsumerAccountSnapshot({
    readIdentity: () => fetchConsumerIdentity(user),
    readLinkedAccounts: () => fetchLinkedAccounts(user),
  });
}

export async function setupConsumerIdentity(
  input: ConsumerIdentitySetupInput,
): Promise<ConsumerIdentitySetupResponse> {
  const response = await apiRequest<ConsumerIdentitySetupResponse>(
    "/api/mobile/consumer-identity",
    {
      method: "POST",
      body: JSON.stringify({
        email: input.email.trim().toLowerCase(),
        password: input.password,
        verification: "mock",
        idempotencyKey: input.idempotencyKey,
      }),
    },
    { idempotent: true, requestId: input.idempotencyKey },
  );
  if (typeof response.token !== "string" || !response.token) {
    throw new Error("Email setup did not return a replacement session.");
  }

  // The identity setup endpoint atomically revokes the legacy session. Store its
  // replacement before any caller asks the normal session provider to refresh.
  await setAuthToken(response.token);
  return response;
}
