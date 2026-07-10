import AsyncStorage from "@react-native-async-storage/async-storage";

import { aleconnectApiBaseUrl } from "@/constants";

const authTokenKey = "aleconnect_auth_token_v1";
const forcedLogoutReasonKey = "aleconnect_forced_logout_reason_v1";
const forcedLogoutMessage =
  "You have been logged out because your account was accessed from another device.";
const authInvalidatedListeners = new Set<(reason: string) => void>();

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
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
  return AsyncStorage.getItem(authTokenKey);
}

export async function setAuthToken(token: string): Promise<void> {
  await AsyncStorage.setItem(authTokenKey, token);
}

export async function clearAuthToken(): Promise<void> {
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

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await getAuthToken();
  const headers = new Headers(init.headers);

  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }

  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(`${aleconnectApiBaseUrl}${path}`, {
    ...init,
    headers,
  }).catch(() => {
    throw new ApiRequestError(
      `Cannot reach Aleconnect API at ${aleconnectApiBaseUrl}. Start Aleconnect backend and keep your phone on the same network.`,
    );
  });

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
    );
  }

  return readJson<T>(response);
}
