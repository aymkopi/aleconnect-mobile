import AsyncStorage from "@react-native-async-storage/async-storage";

import { aleconnectApiBaseUrl } from "@/constants";

const authTokenKey = "aleconnect_auth_token_v1";

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
