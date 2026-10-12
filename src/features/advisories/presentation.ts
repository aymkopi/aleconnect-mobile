import type { MobileAdvisory } from "@/services/advisories";
import type {
  MobilePublicUpdate,
  MobilePublicUpdatesPage,
} from "@/services/public-updates";
export function updateTopicLabel(topic: string | null | undefined) {
  const labels: Record<string, string> = { general: "General", billing: "Billing", communications: "Communications" };
  return topic && Object.hasOwn(labels, topic) ? labels[topic] : topic ?? "ALECO feed";
}
export function advisoryTypeLabel(type: string | null) {
  return (
    (
      {
        scheduled_outage: "Scheduled interruption",
        unscheduled_outage: "Unscheduled interruption",
        restoration: "Power restored",
        maintenance: "Maintenance",
        weather_advisory: "Weather advisory",
        general: "Information",
      } as Record<string, string>
    )[type ?? ""] ?? "Advisory"
  );
}
export function advisorySchedule(item: MobileAdvisory) {
  const valid = (value: string | null) =>
    value && Number.isFinite(Date.parse(value)) ? value : null;
  if (item.type === "restoration") {
    const start = valid(item.scheduledEndAt);
    return start ? { label: "Restored at", start, end: null } : null;
  }
  if (
    !["scheduled_outage", "unscheduled_outage", "maintenance"].includes(
      item.type ?? "",
    )
  )
    return null;
  const start = valid(item.scheduledStartAt),
    end = valid(item.scheduledEndAt);
  return start || end ? { label: "Interruption schedule", start, end } : null;
}
export function matchesUpdate(
  item: MobilePublicUpdate,
  query: string,
  tab = "all",
) {
  if (
    (tab === "advisories" && item.kind !== "advisory") ||
    (tab === "feed" && item.kind !== "facebook_post")
  )
    return false;
  const text =
    item.kind === "advisory"
      ? [item.title, item.content, item.audience, item.controlNumber, item.topic].join(" ")
      : [item.message, updateTopicLabel(item.topic)].join(" ");
  return text.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
}
export function updateRoute(item: MobilePublicUpdate) {
  return item.kind === "advisory"
    ? { pathname: "/advisory/[id]" as const, params: { id: item.id } }
    : { pathname: "/advisory/post/[id]" as const, params: { id: item.id } };
}
export async function findPublicPost(
  id: string,
  readPage: (cursor: string | null) => Promise<MobilePublicUpdatesPage>,
) {
  if (!id) return null;
  let cursor: string | null = null;
  const seen = new Set<string>();
  while (true) {
    const page = await readPage(cursor);
    const post = page.items.find(
      (item) => item.kind === "facebook_post" && item.id === id,
    );
    if (post?.kind === "facebook_post") return post;
    if (!page.nextCursor) return null;
    if (seen.has(page.nextCursor))
      throw new Error("Updates changed. Refresh and try again.");
    seen.add(page.nextCursor);
    cursor = page.nextCursor;
  }
}
export async function readUpdate<T>(read: () => Promise<T | null>) {
  try {
    const item = await read();
    return { item, unavailable: !item, signIn: false };
  } catch (error) {
    const status = (error as { status?: number })?.status;
    if ([401, 403, 404].includes(status ?? 0))
      return {
        item: null,
        unavailable: status !== 401,
        signIn: status === 401,
      };
    throw error;
  }
}
export function safePublicUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
