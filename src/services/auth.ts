import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "@/services/supabase";

type SignInWithAccountNumberParams = {
  accountNumber: string;
  password: string;
};

const loginRateLimitMaxAttempts = 5;
const loginRateLimitWindowMs = 5 * 60 * 1000;
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

export async function resolveConsumerEmailByAccountNumber(
  accountNumber: string,
): Promise<string | null> {
  const normalizedAccountNumber = normalizeAccountNumber(accountNumber);

  if (!normalizedAccountNumber) {
    return null;
  }

  const { data, error } = await supabase.rpc(
    "resolve_consumer_email_by_account_number",
    {
      p_account_number: normalizedAccountNumber,
    },
  );

  if (error) {
    throw error;
  }

  return typeof data === "string" && data.length > 0 ? data : null;
}

export async function signInWithAccountNumber({
  accountNumber,
  password,
}: SignInWithAccountNumberParams): Promise<void> {
  const normalizedAccountNumber = normalizeAccountNumber(accountNumber);
  const normalizedPassword = normalizePassword(password);

  if (!normalizedAccountNumber || !normalizedPassword) {
    throw new Error("Account number and password are required.");
  }

  await assertRateLimit(normalizedAccountNumber);

  const email = await resolveConsumerEmailByAccountNumber(
    normalizedAccountNumber,
  );

  if (!email) {
    await registerFailedAttempt(normalizedAccountNumber);
    throw new Error("Invalid account number or password.");
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: normalizedPassword,
  });

  if (error) {
    await registerFailedAttempt(normalizedAccountNumber);
    throw new Error("Invalid account number or password.");
  }

  await clearAttempts(normalizedAccountNumber);
}
