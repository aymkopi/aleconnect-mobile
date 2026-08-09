const refreshedAt = new Map<string, number>();

export function claimRefresh(
  key: string,
  cooldownMs = 3_000,
  now = Date.now(),
) {
  const previous = refreshedAt.get(key) ?? 0;
  if (now - previous < cooldownMs) return false;
  refreshedAt.set(key, now);
  return true;
}
