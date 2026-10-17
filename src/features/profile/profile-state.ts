import type { NotificationSubstation } from "../../services/notification-settings";
export function accountProfileIdentifier(count: number, email: string | null | undefined, accountNumber: string | null | undefined) {
  return (count > 1 ? email?.trim() : accountNumber?.trim() || email?.trim()) || null;
}
export function expandAreas(
  stations: NotificationSubstation[],
  parents: string[],
  children: string[],
) {
  return stations.flatMap((s) =>
    s.feeders.filter((f) => parents.includes(s.id) || children.includes(f.id)).map((f) => f.id),
  );
}
export function compactAreas(stations: NotificationSubstation[], selected: string[]) {
  const selectedSubstationIds: string[] = [],
    selectedFeederIds: string[] = [];
  for (const s of stations) {
    const ids = s.feeders.filter((f) => selected.includes(f.id)).map((f) => f.id);
    if (ids.length && ids.length === s.feeders.length) selectedSubstationIds.push(s.id);
    else selectedFeederIds.push(...ids);
  }
  return { selectedSubstationIds, selectedFeederIds };
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
export function validatePasswordChange(current: string, next: string, confirmation: string) {
  if (!current) return "Enter your current password.";
  if (next.length < 8 || next.length > 128) return "Use 8–128 characters for your new password.";
  if (next === current) return "Choose a different password.";
  if (next !== confirmation) return "New passwords must match.";
  return null;
}
