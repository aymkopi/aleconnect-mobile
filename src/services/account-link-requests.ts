import { createApiRequestId, apiRequest } from "@/services/api";
import type { PasswordChangeStatus } from "@/services/auth";
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
  isCurrentLink?: boolean;
};

export async function fetchAccountLinkRequests() {
  const result = await apiRequest<{ requests: (Omit<AccountLinkRequest, "status"> & { status: unknown })[]; accessRevision: number }>("/api/mobile/account-link-requests");
  return {
    ...result,
    requests: result.requests.map((request) => ({
      ...request,
      status: parseConsumerAccountLinkRequestStatus(request.status),
      isCurrentLink: typeof request.isCurrentLink === "boolean" ? request.isCurrentLink : undefined,
    })),
  };
}

export async function submitAccountLinkRequest(input: {
  accountNumber: string;
  registeredName: string;
  password: string;
  idempotencyKey?: string;
  verificationFlowId: string;
}, authToken: string) {
  const result = await apiRequest<{ requestId: string; status: unknown; replayed: boolean }>("/api/mobile/account-link-requests", {
    method: "POST",
    body: JSON.stringify({
      accountNumber: input.accountNumber.trim(),
      registeredName: input.registeredName.trim(),
      password: input.password,
      idempotencyKey: input.idempotencyKey ?? createApiRequestId(),
      verificationFlowId: input.verificationFlowId,
    }),
  }, { idempotent: true, authToken });
  return { ...result, status: parseConsumerAccountLinkRequestStatus(result.status) };
}

export function requestAccountLinkVerification(
  body: { action: "status" | "verify" | "cancel"; currentPassword?: string; flowId?: string | null },
  authToken: string,
) {
  return apiRequest<PasswordChangeStatus>("/api/mobile/auth/account-link-verification", {
    method: "POST", body: JSON.stringify(body),
  }, { authToken });
}
