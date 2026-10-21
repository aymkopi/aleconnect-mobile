import { consumerPasswordError } from "../../lib/consumer-password-policy.ts";
export function accountProfileIdentifier(count: number, email: string | null | undefined, accountNumber: string | null | undefined) {
  return (count > 1 ? email?.trim() : accountNumber?.trim() || email?.trim()) || null;
}
export function profileEditAllowed(
  editing?: { version: number; activeReportCount: number } | null,
) {
  return editing?.version === 1;
}
export function validateProfileDraft(
  draft: { phone: string; email: string },
  emailEditable: boolean,
) {
  if (draft.phone.replace(/\D/g, "").length !== 11)
    return "Contact number must be exactly 11 digits.";
  if (
    emailEditable &&
    (draft.email.trim().length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim()))
  )
    return "Enter a valid email address (up to 255 characters).";
  return null;
}
export function validatePasswordChange(current: string, next: string, confirmation: string, personal: readonly string[] = []) {
  if (!current) return "Enter your current password.";
  const policy = consumerPasswordError(next, confirmation, personal);
  if (policy) return policy;
  if (next === current) return "Choose a different password.";
  return null;
}
