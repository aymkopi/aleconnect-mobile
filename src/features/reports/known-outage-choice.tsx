import { useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/panelui/text";
import { Button } from "@/components/panelui/button";
import { fetchServiceStatus } from "@/services/service-status";
import type { OutageItem, ServiceStatus } from "@/features/home/service-status-contract";
import { OutageNotice } from "@/features/home/account-outage-card";
import { enqueueOutageAcknowledgement, syncConsumerUpdateQueue, type ConsumerUpdateScope } from "@/services/consumer-update-queue";
import { SavedOutageAcknowledgements, useSavedOutageAcknowledgements } from "./saved-outage-acknowledgements";
import { formatReportDate } from "./data";

export function KnownOutageChoice({ scope, serviceAccountId, accountLabel, initialStatus, onContinue, onHome }: { scope: ConsumerUpdateScope; serviceAccountId: string; accountLabel: string; initialStatus: Extract<ServiceStatus, { enabled: true }>; onContinue: () => void; onHome: () => void }) {
  const outageScope = { ...scope, serviceAccountId };
  const { items: local } = useSavedOutageAcknowledgements(scope, serviceAccountId);
  const [data, setData] = useState(initialStatus), [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function act(work: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true); setError("");
    try { await work(); } catch (failure) { setError(failure instanceof Error ? failure.message : "Your saved acknowledgement is kept. Try again."); } finally { setBusy(false); }
  }
  async function acknowledge(item: OutageItem) {
    await enqueueOutageAcknowledgement(scope, serviceAccountId, item);
    await syncConsumerUpdateQueue();
  }
  async function refresh() {
    const fresh = await fetchServiceStatus(outageScope);
    if (!fresh.enabled || fresh.isStale) throw new Error("Current notices could not refresh. Your original notice and saved work are kept.");
    setData(fresh);
  }
  const matches = data.items.filter(item => item.state === "active");
  return <View className="gap-4">
    <Text weight="semibold" size="lg" accessibilityRole="header">Before you report no power</Text>
    <Text muted>{accountLabel}</Text>
    <Text size="sm">If a current outage notice describes your situation, let ALECO know you are also affected. This sends an impact acknowledgement; it does not create a service report.</Text>
    <Text muted size="xs">Checked {formatReportDate(data.asOf)}. ALECO rechecks the original notice when your acknowledgement arrives.</Text>
    {!matches.length ? <Text size="sm">No current matching notice is confirmed. You can continue with your report.</Text> : null}
    {data?.enabled && data.multipleFeeders ? <Text muted size="sm">Your barangay has multiple feeders. Only acknowledge a notice that describes your situation.</Text> : null}
    {matches.map(item => {
      const saved = local.filter(row => row.payload.advisoryId === item.advisoryId && row.payload.occurrenceId === item.occurrenceId);
      return <View key={`${item.advisoryId}:${item.occurrenceId}`} className="gap-3 rounded-2xl bg-card p-4">
        <OutageNotice item={item} />
        {data?.enabled && data.canAcknowledge && !saved.some(row => row.accessRevision === scope.accessRevision && row.payload.publicationRevision === item.publicationRevision) ? <Button disabled={busy} onPress={() => void act(() => acknowledge(item))}>I’m also affected</Button> : null}
      </View>;
    })}
    <SavedOutageAcknowledgements scope={scope} serviceAccountId={serviceAccountId} accountLabel={accountLabel} canRetry={data.canAcknowledge} />
    {error ? <Text accessibilityRole="alert" className="text-destructive">{error}</Text> : null}
    <Button variant="outline" disabled={busy} onPress={() => void act(refresh)}>Refresh official notices</Button>
    <Button variant="secondary" onPress={onContinue}>Report a different problem</Button>
    <Text muted size="sm">Use Back to choose another report type for damaged lines, sparking equipment or a different concern.</Text>
    {local.some(item => item.status === "sent") ? <Button variant="ghost" onPress={onHome}>Return to Home</Button> : null}
  </View>;
}
