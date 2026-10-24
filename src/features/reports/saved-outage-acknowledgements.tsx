import { useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/components/panelui/button";
import { Text } from "@/components/panelui/text";
import { listOutageAcknowledgements, retryConsumerUpdate, discardConsumerUpdate, subscribeConsumerUpdates, type ConsumerUpdateScope, type QueuedOutageAcknowledgement } from "@/services/consumer-update-queue";
import { formatReportDate } from "./data";

export function useSavedOutageAcknowledgements(scope: ConsumerUpdateScope, serviceAccountId: string) {
  const [items, setItems] = useState<QueuedOutageAcknowledgement[]>([]), [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    const load = () => { void listOutageAcknowledgements(scope, serviceAccountId).then(rows => { if (alive) { setItems(rows); setError(""); } }).catch(() => { if (alive) setError("Saved acknowledgements could not load. Nothing was removed."); }); };
    load(); const unsubscribe = subscribeConsumerUpdates(load);
    return () => { alive = false; unsubscribe(); };
  }, [scope, serviceAccountId]);
  return { items, error };
}
export function SavedOutageAcknowledgements({ scope, serviceAccountId, accountLabel, canRetry, className = "", onVisibilityChange }: { scope: ConsumerUpdateScope; serviceAccountId: string; accountLabel: string; canRetry: boolean; className?: string; onVisibilityChange?: (visible: boolean) => void }) {
  const router = useRouter(), saved = useSavedOutageAcknowledgements(scope, serviceAccountId);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => { onVisibilityChange?.(saved.items.length > 0 || Boolean(saved.error)); return () => onVisibilityChange?.(false); }, [saved.items.length, saved.error, onVisibilityChange]);
  async function act(work: () => Promise<unknown>) {
    setBusy(true); setError("");
    try { await work(); } catch (failure) { setError(failure instanceof Error ? failure.message : "Your saved acknowledgement is kept."); } finally { setBusy(false); }
  }
  if (!saved.items.length && !saved.error) return null;
  const visibleItems = saved.items.filter(item => item.status !== "sent").concat(saved.items.filter(item => item.status === "sent").slice(-3));
  return <View className={`${className} gap-3 rounded-2xl bg-card p-4`}>
    <Text weight="semibold" accessibilityRole="header">Saved outage acknowledgements</Text>
    <Text size="sm" muted>{accountLabel}</Text>
    {visibleItems.map(item => <View key={item.id} className="gap-2 rounded-xl bg-background p-3">
      <Text weight="semibold" accessibilityLiveRegion="polite">{item.status === "sent" ? "ALECO received your acknowledgement" : item.status === "needs_attention" || item.accessRevision !== scope.accessRevision ? "Saved acknowledgement needs review" : "Saved on this device · Receipt not confirmed"}</Text>
      <Text muted size="xs">Saved {formatReportDate(item.createdAt)}</Text>
      {item.receipt ? <Text muted size="sm">Received {formatReportDate(item.receipt.acceptedAt)}. No service report was created.</Text> : <Text muted size="sm">Your original account and notice are kept. Reconnecting retries the same acknowledgement.</Text>}
      {item.error ? <Text size="sm" className="text-destructive">{item.error}</Text> : null}
      <Button variant="outline" onPress={() => router.push({ pathname: "/advisory/[id]", params: { id: item.payload.advisoryId } })}>View acknowledged notice</Button>
      {canRetry && ["failed", "queued"].includes(item.status) && item.accessRevision === scope.accessRevision ? <Button variant="outline" disabled={busy} onPress={() => void act(() => retryConsumerUpdate(item.id, scope))}>Retry acknowledgement</Button> : null}
      {item.status !== "sent" && item.status !== "sending" ? <><Text muted size="xs">Removing this local copy does not withdraw an acknowledgement ALECO may have received.</Text><Button variant="ghost" disabled={busy} onPress={() => void act(() => discardConsumerUpdate(item.id, scope))}>Remove local copy</Button></> : null}
    </View>)}
    {error || saved.error ? <Text accessibilityRole="alert" className="text-destructive">{error || saved.error}</Text> : null}
  </View>;
}
