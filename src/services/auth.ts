import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  ApiRequestError,
  apiRequest,
  clearAuthToken,
  setAuthToken,
  type AuthUser,
} from "@/services/api";

type SignInWithAccountNumberParams = {
  accountNumber: string;
  password: string;
};

type ConsumerLoginResponse = {
  token: string;
  user: AuthUser;
};

const loginRateLimitMaxAttempts = 100; //MAXIMUM NUMBER OF LOGIN ATTEMPTS ALLOWED WITHIN THE RATE LIMIT WINDOW
const loginRateLimitWindowMs = 5 * 60 * 1000; //RATE LIMIT WINDOW IN MILLISECONDS (5 MINUTES)
const loginRateLimitKeyPrefix = "login_attempts_v1";

function getRateLimitKey(accountNumber: string): string {
  return `${loginRateLimitKeyPrefix}:${encodeURIComponent(accountNumber)}`;
}

function pruneOldAttempts(attempts: number[], nowMs: number): number[] {
  return attempts.filter(
    (attemptMs) => nowMs - attemptMs < loginRateLimitWindowMs,
  );
}

function formatRemainingTime(waitMs: number): string {
  const totalSeconds = Math.max(1, Math.ceil(waitMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes <= 0) {
    return `${seconds}s`;
  }

  if (seconds === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${seconds}s`;
}

async function readAttempts(accountNumber: string): Promise<number[]> {
  const key = getRateLimitKey(accountNumber);
  const raw = await AsyncStorage.getItem(key);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((value): value is number => typeof value === "number");
  } catch {
    return [];
  }
}

async function writeAttempts(
  accountNumber: string,
  attempts: number[],
): Promise<void> {
  const key = getRateLimitKey(accountNumber);
  await AsyncStorage.setItem(key, JSON.stringify(attempts));
}

async function clearAttempts(accountNumber: string): Promise<void> {
  const key = getRateLimitKey(accountNumber);
  await AsyncStorage.removeItem(key);
}

async function assertRateLimit(accountNumber: string): Promise<void> {
  const nowMs = Date.now();
  const attempts = await readAttempts(accountNumber);
  const activeAttempts = pruneOldAttempts(attempts, nowMs);

  if (activeAttempts.length >= loginRateLimitMaxAttempts) {
    const earliestAttempt = activeAttempts[0];
    const waitMs = loginRateLimitWindowMs - (nowMs - earliestAttempt);
    throw new Error(
      `Too many login attempts. Try again in ${formatRemainingTime(waitMs)}.`,
    );
  }

  if (activeAttempts.length !== attempts.length) {
    await writeAttempts(accountNumber, activeAttempts);
  }
}

async function registerFailedAttempt(accountNumber: string): Promise<void> {
  const nowMs = Date.now();
  const attempts = await readAttempts(accountNumber);
  const activeAttempts = pruneOldAttempts(attempts, nowMs);
  activeAttempts.push(nowMs);
  await writeAttempts(accountNumber, activeAttempts);
}

function normalizeAccountNumber(value: string): string {
  return value.trim();
}

function normalizePassword(value: string): string {
  return value;
}

function resolveConsumerUsernameByAccountNumber(
  accountNumber: string,
): string | null {
  const normalizedAccountNumber = normalizeAccountNumber(accountNumber);

  if (!normalizedAccountNumber) {
    return null;
  }

  return normalizedAccountNumber;
}

export async function signInWithAccountNumber({
  accountNumber,
  password,
}: SignInWithAccountNumberParams): Promise<ConsumerLoginResponse> {
  const normalizedAccountNumber = normalizeAccountNumber(accountNumber);
  const normalizedPassword = normalizePassword(password);

  if (!normalizedAccountNumber || !normalizedPassword) {
    throw new Error("Account number and password are required.");
  }

  await assertRateLimit(normalizedAccountNumber);

  const username = resolveConsumerUsernameByAccountNumber(
    normalizedAccountNumber,
  );

  if (!username) {
    await registerFailedAttempt(normalizedAccountNumber);
    throw new Error("Invalid account number or password.");
  }

  let login: ConsumerLoginResponse;
  try {
    login = await apiRequest<ConsumerLoginResponse>(
      "/api/auth/sign-in/username",
      {
        method: "POST",
        body: JSON.stringify({
          username,
          password: normalizedPassword,
        }),
      },
    );
  } catch (error) {
    if (error instanceof ApiRequestError && error.status !== 401) {
      throw error;
    }

    await registerFailedAttempt(normalizedAccountNumber);
    throw new Error("Invalid account number or password.");
  }

  if (login.user.role !== "consumer") {
    await clearAuthToken();
    throw new Error("This app only supports consumer accounts.");
  }

  await setAuthToken(login.token);
  await clearAttempts(normalizedAccountNumber);
  return login;
}
