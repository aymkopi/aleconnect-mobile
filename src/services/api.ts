import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { aleconnectApiBaseUrl } from "@/constants";
import { shouldRetryHttpRequest } from "@/utils/http-retry";
import {
  requestPhaseFailureMessage,
  type RequestPhase,
} from "@/utils/report-transport";

const authTokenKey = "aleconnect_auth_token_v1";
const defaultRequestTimeoutMs = 30_000;
const forcedLogoutReasonKey = "aleconnect_forced_logout_reason_v1";
const forcedLogoutMessage =
  "You have been logged out because your account was accessed from another device.";
const authInvalidatedListeners = new Set<(reason: string) => void>();

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly requestId?: string,
    readonly phase: RequestPhase = "request",
    readonly retryable = false,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export function createApiRequestId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  );
}

export type AuthUser = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly username: string | null;
  readonly role: "consumer";
  readonly mustChangePassword?: boolean;
  readonly expoNotificationToken?: string | null;
};

export type AuthSession = {
  readonly session: {
    readonly id: string;
    readonly token: string;
    readonly userId: string;
    readonly expiresAt: string | Date;
  };
  readonly user: AuthUser;
};

export async function getAuthToken(): Promise<string | null> {
  if (Platform.OS === "web") return AsyncStorage.getItem(authTokenKey);

  const secureToken = await SecureStore.getItemAsync(authTokenKey);
  if (secureToken) return secureToken;

  const legacyToken = await AsyncStorage.getItem(authTokenKey);
  if (!legacyToken) return null;

  await SecureStore.setItemAsync(authTokenKey, legacyToken, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
  await AsyncStorage.removeItem(authTokenKey);
  return legacyToken;
}

export async function setAuthToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(authTokenKey, token);
    return;
  }

  await SecureStore.setItemAsync(authTokenKey, token, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
  await AsyncStorage.removeItem(authTokenKey);
}

export async function clearAuthToken(): Promise<void> {
  if (Platform.OS !== "web") {
    await SecureStore.deleteItemAsync(authTokenKey);
  }
  await AsyncStorage.removeItem(authTokenKey);
}

export function subscribeAuthInvalidated(
  listener: (reason: string) => void,
): () => void {
  authInvalidatedListeners.add(listener);
  return () => {
    authInvalidatedListeners.delete(listener);
  };
}

export async function consumeForcedLogoutReason(): Promise<string | null> {
  const reason = await AsyncStorage.getItem(forcedLogoutReasonKey);
  if (reason) {
    await AsyncStorage.removeItem(forcedLogoutReasonKey);
  }

  return reason;
}

async function markAuthInvalidated(): Promise<void> {
  // A 401 with a stored token means the server no longer accepts this session.
  // The common case is a newer device login replacing this device's session.
  await AsyncStorage.setItem(forcedLogoutReasonKey, forcedLogoutMessage);
  await clearAuthToken();
  authInvalidatedListeners.forEach((listener) => listener(forcedLogoutMessage));
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

async function performRequest<T>(
  path: string,
  init: RequestInit,
  token: string | null,
  timeoutMs: number,
  requestId: string,
  phase: RequestPhase,
): Promise<T> {
  const headers = new Headers(init.headers);
  const controller = new AbortController();
  let didTimeout = false;
  const timeout = setTimeout(
    () => {
      didTimeout = true;
      controller.abort();
    },
    timeoutMs,
  );
  const abortFromCaller = () => controller.abort();
  init.signal?.addEventListener("abort", abortFromCaller, { once: true });

  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }
  headers.set("x-request-id", requestId);

  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${aleconnectApiBaseUrl}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });
  } catch {
    const callerAborted = Boolean(init.signal?.aborted);
    throw new ApiRequestError(
      callerAborted
        ? "Request cancelled."
        : requestPhaseFailureMessage(phase, didTimeout ? "timeout" : "network"),
      undefined,
      requestId,
      phase,
      !callerAborted,
    );
  } finally {
    clearTimeout(timeout);
    init.signal?.removeEventListener("abort", abortFromCaller);
  }

  if (!response.ok) {
    if (response.status === 401 && token) {
      await markAuthInvalidated();
    }

    const body = await readJson<{ error?: string; message?: string }>(
      response,
    ).catch(() => null);
    throw new ApiRequestError(
      body?.error ?? body?.message ?? `Request failed with ${response.status}`,
      response.status,
      requestId,
      phase,
      shouldRetryHttpRequest("GET", response.status, false),
    );
  }

  return readJson<T>(response);
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  options: {
    authToken?: string | null;
    timeoutMs?: number;
    phase?: RequestPhase;
    idempotent?: boolean;
    requestId?: string;
  } = {},
): Promise<T> {
  const token =
    options.authToken === undefined ? await getAuthToken() : options.authToken;
  const method = init.method ?? "GET";
  const requestId = options.requestId ?? createApiRequestId();
  const phase = options.phase ?? "request";

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await performRequest<T>(
        path,
        init,
        token,
        options.timeoutMs ?? defaultRequestTimeoutMs,
        requestId,
        phase,
      );
    } catch (error) {
      const status =
        error instanceof ApiRequestError ? error.status : undefined;
      if (
        attempt > 0 ||
        !shouldRetryHttpRequest(
          method,
          status,
          Boolean(init.signal?.aborted),
          options.idempotent,
        )
      ) {
        if (typeof __DEV__ !== "undefined" && __DEV__) {
          console.warn("ALEConnect request failed", {
            requestId,
            phase,
            status,
          });
        }
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
}
