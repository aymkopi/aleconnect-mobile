export type HumanReferenceKind = "ticket" | "service_memo" | "dispatch_trip" | "advisory";

export function normalizeHumanReference(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= 64 ? normalized : null;
}

export function classifyHumanReference(value: unknown): { kind: HumanReferenceKind; scheme: "compact" | "legacy" } | null {
  const normalized = normalizeHumanReference(value)?.toUpperCase();
  if (!normalized) return null;
  if (/^TK\d{6}-\d{4,}$/.test(normalized)) return { kind: "ticket", scheme: "compact" };
  if (/^SM\d{6}-\d{4,}$/.test(normalized)) return { kind: "service_memo", scheme: "compact" };
  if (/^DT\d{6}-\d{4,}$/.test(normalized)) return { kind: "dispatch_trip", scheme: "compact" };
  if (/^AD\d{6}-\d{4,}$/.test(normalized)) return { kind: "advisory", scheme: "compact" };
  if (/^ALECO-[A-Z0-9-]+$/.test(normalized)) return { kind: "ticket", scheme: "legacy" };
  if (/^SM-[A-Z0-9-]+$/.test(normalized)) return { kind: "service_memo", scheme: "legacy" };
  if (/^TRIP-[A-Z0-9-]+$/.test(normalized)) return { kind: "dispatch_trip", scheme: "legacy" };
  if (/^AD(?:SO|UO|RE|MA|WA|GE)-[A-Z0-9-]+$/.test(normalized)) return { kind: "advisory", scheme: "legacy" };
  return null;
}
