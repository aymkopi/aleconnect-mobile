import { View } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/panelui/text";
import { Button } from "@/components/panelui/button";
import { useScopedRead } from "@/hooks/use-scoped-read";
import { fetchServiceStatus } from "@/services/service-status";
import { formatReportDate } from "@/features/reports/data";
import { serviceStatusScopeKey, type OutageScope, type OutageItem } from "./service-status-contract";

export function OutageNotice({ item }: { item: OutageItem }) {
  const router = useRouter();
  return <View className="gap-2 rounded-xl bg-background p-3">
    <Text size="xs" weight="semibold">{item.state === "active" ? "Current notice" : "Planned interruption"} · {item.controlNumber}</Text>
    <Text weight="semibold">{item.title}</Text>
    <Text muted size="sm">{item.matchBasis === "all" ? "Published for all accounts." : "Your area may be affected, based on ALECO's recorded feeder coverage."}</Text>
    {item.dateOnly ? <Text muted size="sm">{item.occurrenceDate} · Time to be confirmed</Text> : item.scheduledStartAt ? <Text muted size="sm">{formatReportDate(item.scheduledStartAt)}{item.scheduledEndAt ? ` – ${formatReportDate(item.scheduledEndAt)}` : " · End time to be confirmed"}</Text> : <Text muted size="sm">Start time to be confirmed{item.scheduledEndAt ? ` · Published end: ${formatReportDate(item.scheduledEndAt)}` : " · End time to be confirmed"}</Text>}
    <Button variant="outline" onPress={() => router.push({ pathname: "/advisory/[id]", params: { id: item.advisoryId } })}>View official update</Button>
  </View>;
}
export function AccountOutageCard({ scope, accountLabel }: { scope: OutageScope; accountLabel: string }) {
  const read = useScopedRead(serviceStatusScopeKey(scope), () => fetchServiceStatus(scope));
  const data = read.data;
  if (data?.enabled === false) return null;
  return <View className="mx-4 gap-3 rounded-2xl bg-card p-4">
    <Text weight="semibold" accessibilityRole="header">Outage notices for your account</Text>
    <Text muted size="sm">{accountLabel}</Text>
    {read.busy ? <Text size="sm" muted accessibilityLiveRegion="polite">Checking official outage notices…</Text> : null}
    {read.error ? <Text size="sm" accessibilityRole="alert" className="text-destructive">Outage context could not refresh. Your power status is unknown.</Text> : null}
    {data?.enabled ? <>
      <Text muted size="xs">{data.isStale ? "Saved context · " : "Checked · "}{formatReportDate(data.asOf)}</Text>
      {data.isStale ? <Text size="sm" muted>Reconnect and refresh for the current notice. Saved context cannot confirm an acknowledgement.</Text> : null}
      {data.matchState !== "matched" ? <Text size="sm">{data.matchState === "coverage_unknown" ? "We cannot confirm outage coverage for this account yet." : "No matching official outage notice was found. This does not confirm that power is available."}</Text> : null}
      {data.multipleFeeders ? <Text muted size="sm">Your barangay has multiple recorded feeders. A matching notice may cover only part of the area.</Text> : null}
      {data.items.map(item => <OutageNotice key={`${item.advisoryId}:${item.occurrenceId}`} item={item} />)}
      {data.hasMore ? <Text muted size="sm">More notices may apply. Check Updates for the full official information.</Text> : null}
    </> : null}
    <Button variant="outline" disabled={read.busy} onPress={() => void read.reload(true)}>Refresh outage context</Button>
  </View>;
}
