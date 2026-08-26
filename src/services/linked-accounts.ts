import { normalizeLinkedAccounts, type LinkedAccount } from "@/features/accounts/contract";
import { apiRequest, type AuthUser } from "@/services/api";

export type LinkedAccountsState = {
  identityUserId?: string;
  accounts: LinkedAccount[];
  defaultServiceAccountId: string | null;
  accessRevision: number;
};

export async function fetchLinkedAccounts(user: AuthUser): Promise<LinkedAccountsState> {
  const value = await apiRequest<unknown>("/api/mobile/linked-accounts");
  return normalizeLinkedAccounts(value, user);
}

export async function setDefaultLinkedAccount(serviceAccountId: string, accessRevision: number) {
  return apiRequest<{ defaultServiceAccountId: string; accessRevision: number }>("/api/mobile/linked-accounts", {
    method: "PATCH", body: JSON.stringify({ action: "setDefault", serviceAccountId, accessRevision }),
  });
}

export async function unlinkLinkedAccount(input: {
  serviceAccountId: string;
  currentAccountPassword: string;
  accessRevision: number;
  replacementDefaultServiceAccountId?: string;
}) {
  return apiRequest<{
    defaultServiceAccountId: string;
    accessRevision: number;
    reauthenticationRequired: boolean;
  }>("/api/mobile/linked-accounts", {
    method: "PATCH",
    body: JSON.stringify({
      action: "unlink",
      serviceAccountId: input.serviceAccountId,
      currentAccountPassword: input.currentAccountPassword,
      accessRevision: input.accessRevision,
      replacementDefaultServiceAccountId: input.replacementDefaultServiceAccountId ?? "",
    }),
  });
}
