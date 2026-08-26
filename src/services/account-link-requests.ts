import { createApiRequestId, apiRequest } from "@/services/api";

export type AccountLinkRequest = {
  requestId: string;
  accountNumber: string;
  registeredName: string;
  status: "pending" | "conflict" | "denied" | "approved" | string;
  consumerReason: string | null;
  createdAt: string;
  decidedAt: string | null;
};

export async function fetchAccountLinkRequests() {
  return apiRequest<{ requests: AccountLinkRequest[]; accessRevision: number }>("/api/mobile/account-link-requests");
}

export async function submitAccountLinkRequest(input: {
  accountNumber: string;
  registeredName: string;
  password: string;
  idempotencyKey?: string;
}) {
  return apiRequest<AccountLinkRequest>("/api/mobile/account-link-requests", {
    method: "POST",
    body: JSON.stringify({
      accountNumber: input.accountNumber.trim(),
      registeredName: input.registeredName.trim(),
      password: input.password,
      idempotencyKey: input.idempotencyKey ?? createApiRequestId(),
    }),
  }, { idempotent: true });
}
