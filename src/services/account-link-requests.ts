import { createApiRequestId, apiRequest } from "@/services/api";
import {
  parseConsumerAccountLinkRequestStatus,
  type ConsumerAccountLinkRequestStatus,
} from "@/features/accounts/status";

export type AccountLinkRequest = {
  requestId: string;
  accountNumber: string;
  registeredName: string;
  status: ConsumerAccountLinkRequestStatus | null;
  consumerReason: string | null;
  createdAt: string;
  decidedAt: string | null;
};

export async function fetchAccountLinkRequests() {
  const result = await apiRequest<{ requests: (Omit<AccountLinkRequest, "status"> & { status: unknown })[]; accessRevision: number }>("/api/mobile/account-link-requests");
  return {
    ...result,
    requests: result.requests.map((request) => ({
      ...request,
      status: parseConsumerAccountLinkRequestStatus(request.status),
    })),
  };
}

export async function submitAccountLinkRequest(input: {
  accountNumber: string;
  registeredName: string;
  password: string;
  idempotencyKey?: string;
}) {
  const result = await apiRequest<{ requestId: string; status: unknown; replayed: boolean }>("/api/mobile/account-link-requests", {
    method: "POST",
    body: JSON.stringify({
      accountNumber: input.accountNumber.trim(),
      registeredName: input.registeredName.trim(),
      password: input.password,
      idempotencyKey: input.idempotencyKey ?? createApiRequestId(),
    }),
  }, { idempotent: true });
  return { ...result, status: parseConsumerAccountLinkRequestStatus(result.status) };
}
