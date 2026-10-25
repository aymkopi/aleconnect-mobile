import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Pressable, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Button } from "@/components/panelui/button";
import { Text } from "@/components/panelui/text";
import { Input } from "@/components/panelui/input";
import { Dialog } from "@/components/panelui/dialog";
import { FileUpload, type FileUploadFile } from "@/components/panelui/file-upload";
import { ImageViewer } from "@/components/panelui/image-viewer";
import { prepareEvidencePhoto, deleteEvidencePhoto } from "@/utils/evidence-image-processing";
import { fetchConsumerUpdates } from "@/services/consumer-updates";
import { listConsumerUpdates, saveConsumerUpdateDraft, enqueueConsumerUpdate, syncConsumerUpdateQueue, retryConsumerUpdate, discardConsumerUpdate, subscribeConsumerUpdates, type ConsumerUpdateScope, type QueuedConsumerUpdate } from "@/services/consumer-update-queue";
import { createConsumerUpdateId, type ConsumerUpdatePayload, type ConsumerUpdatesPage } from "./consumer-updates-contract";
import { formatReportDate } from "./data";
import { ChevronRight } from "lucide-react-native";
import { useAppColors } from "@/hooks/use-app-colors";
import { RadioGroup } from "@/components/panelui/radio-group";
import { ReportPage } from "./components/report-page";
import { ServiceFeedbackSection } from "./service-feedback-section";

type Draft = { id: string; payload: ConsumerUpdatePayload; evidence: QueuedConsumerUpdate["evidence"] };
const freshDraft = (): Draft => ({ id: createConsumerUpdateId(), payload: { kind: "consumer_update", text: "", cycleId: null, responseVersion: 0 }, evidence: [] });
const labels: Record<QueuedConsumerUpdate["status"], string> = { draft: "Draft", queued: "Waiting to send", sending: "Sending…", failed: "Awaiting receipt", needs_attention: "Review needed", sent: "Received" };
export function ConsumerUpdatesSection({ ticketId, serviceAccountId, scope, featureAvailable, serviceFeedbackAvailable = false, active = true, screen = false, onOpen, onBack, ticketNumber, title, refreshRequest = false }: { ticketId: string; serviceAccountId: string; scope: ConsumerUpdateScope; featureAvailable: boolean; serviceFeedbackAvailable?: boolean; active?: boolean; screen?: boolean; onOpen?: () => void; onBack?: () => void; ticketNumber?: string; title?: string; refreshRequest?: boolean }) {
  const [primary] = useAppColors(["primary"]);
  const feedbackScope = useMemo(() => ({ principalId: scope.principalId, identityUserId: scope.identityUserId, accessRevision: scope.accessRevision, serviceAccountId }), [scope.principalId, scope.identityUserId, scope.accessRevision, serviceAccountId]);
  const [page, setPage] = useState<ConsumerUpdatesPage | null>(null), [loading, setLoading] = useState(false);
  const [items, setItems] = useState<QueuedConsumerUpdate[]>([]), [draft, setDraft] = useState<Draft>(freshDraft);
  const [files, setFiles] = useState<FileUploadFile[]>([]), [formOpen, setFormOpen] = useState(false), [choice, setChoice] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [readError, setReadError] = useState("");
  const [notice, setNotice] = useState(""), [discardId, setDiscardId] = useState<string | null>(null), [preparing, setPreparing] = useState(0);
  const alive = useRef(true), readGeneration = useRef(0), currentDraft = useRef(draft), currentFiles = useRef(files);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const refreshLocal = useCallback(async () => {
    try { const next = await listConsumerUpdates(scope, ticketId); if (alive.current) setItems(next.filter(item => item.serviceAccountId === serviceAccountId)); }
    catch (failure) { if (alive.current) setError(failure instanceof Error ? failure.message : "Saved follow-ups could not be loaded."); }
  }, [scope, ticketId, serviceAccountId]);
  const refresh = useCallback(async () => {
    if (!featureAvailable || !active) return;
    const generation = ++readGeneration.current; setLoading(true); setReadError("");
    try { const next = await fetchConsumerUpdates(ticketId, serviceAccountId); if (alive.current && generation === readGeneration.current) setPage(next); }
    catch { if (alive.current && generation === readGeneration.current) setReadError("Updates unavailable. Saved work is kept."); }
    finally { if (alive.current && generation === readGeneration.current) setLoading(false); }
  }, [featureAvailable, active, ticketId, serviceAccountId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Subscribe to persisted device state and load its initial snapshot.
  useEffect(() => { void refreshLocal(); return subscribeConsumerUpdates(() => { void refreshLocal(); }); }, [refreshLocal]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Start the scoped external read when this report becomes active.
  useEffect(() => { void refresh(); }, [refresh]);
  async function persistDraft(next: Draft) {
    currentDraft.current = next; setDraft(next);
    try { await saveConsumerUpdateDraft({ id: next.id, scope, ticketId, serviceAccountId, payload: next.payload, evidence: next.evidence }); }
    catch (failure) { if (alive.current) setError(failure instanceof Error ? failure.message : "This draft could not be saved. Keep this screen open and try again."); throw failure; }
  }
  function resume(item: QueuedConsumerUpdate) {
    const next = { id: item.id, payload: item.payload, evidence: item.evidence };
    currentDraft.current = next; setDraft(next);
    const photos: FileUploadFile[] = item.evidence.map((photo, index) => ({ ...photo, name: `Photo ${index + 1}`, kind: "image", mimeType: "image/webp", status: "idle" }));
    currentFiles.current = photos; setFiles(photos); setFormOpen(true); setError("");
  }
  function openForm() {
    const next = freshDraft();
    currentDraft.current = next; setDraft(next); currentFiles.current = []; setFiles([]); setFormOpen(true); setError(""); setNotice("");
  }
  function changePhotos(nextFiles: FileUploadFile[]) {
    currentFiles.current = nextFiles; setFiles(nextFiles); setError("");
    const original = currentDraft.current;
    const retained = original.evidence.filter(photo => nextFiles.some(file => file.id === photo.id));
    for (const photo of original.evidence) if (!retained.includes(photo)) { try { deleteEvidencePhoto(photo.uri); } catch { /* Removed draft photo can be cleaned up with this draft later. */ } }
    void persistDraft({ ...original, evidence: retained }).catch(() => {});
    const added = nextFiles.filter(file => !original.evidence.some(photo => photo.id === file.id));
    for (const file of added) {
      setPreparing(value => value + 1);
      void prepareEvidencePhoto(file.uri, `consumer-update-${original.id}`, file.id).then(async photo => {
        if (!alive.current || currentDraft.current.id !== original.id || !currentFiles.current.some(value => value.id === file.id)) { deleteEvidencePhoto(photo.uri); return; }
        const next = { ...currentDraft.current, evidence: [...currentDraft.current.evidence.filter(value => value.id !== photo.id), photo] };
        await persistDraft(next);
        const preparedFiles = currentFiles.current.map(value => value.id === photo.id ? { ...value, uri: photo.uri, size: photo.size, mimeType: "image/webp" } : value);
        currentFiles.current = preparedFiles; setFiles(preparedFiles);
      }).catch(failure => { if (alive.current) setError(failure instanceof Error ? failure.message : "This photo could not be prepared. Remove it and choose another."); }).finally(() => { if (alive.current) setPreparing(value => value - 1); });
    }
  }
  async function send(next: Draft) {
    if (busy || preparing) return;
    if (next.payload.kind === "consumer_update" && !next.payload.text.trim()) { setError("Describe what ALECO needs to know."); return; }
    if (next.id === currentDraft.current.id && currentFiles.current.length !== next.evidence.length) { setError("Remove or replace any photo that could not be prepared."); return; }
    setBusy(true); setError("");
    try {
      await saveConsumerUpdateDraft({ id: next.id, scope, ticketId, serviceAccountId, payload: next.payload, evidence: next.evidence });
      await enqueueConsumerUpdate(next.id, scope);
      if (alive.current) {
        setChoice(undefined); setNotice("Saved. Awaiting receipt.");
        if (next.id === currentDraft.current.id) { setFormOpen(false); const clean = freshDraft(); currentDraft.current = clean; setDraft(clean); currentFiles.current = []; setFiles([]); Keyboard.dismiss(); }
      }
      const results = await syncConsumerUpdateQueue();
      if (alive.current) { if (results.some(item => item.id === next.id && item.status === "sent")) setNotice("Received by ALECO."); await refreshLocal(); await refresh(); }
    } catch (failure) { if (alive.current) setError(failure instanceof Error ? failure.message : "Your saved update is kept. Reconnect and retry."); }
    finally { if (alive.current) setBusy(false); }
  }
  async function confirmResolution() {
    const check = page?.resolutionCheck;
    if (!check || check.answer || !choice) return;
    const next = freshDraft(); next.payload = { kind: choice === "confirmed" ? "resolution_confirmed" : "resolution_disputed", text: "", cycleId: check.cycleId, responseVersion: check.responseVersion };
    await send(next);
  }
  async function older() {
    if (!page?.nextCursor || loading) return;
    setLoading(true);
    try { const next = await fetchConsumerUpdates(ticketId, serviceAccountId, page.nextCursor); if (alive.current) setPage(current => current ? { ...current, events: [...next.events, ...current.events], nextCursor: next.nextCursor } : next); }
    catch { if (alive.current) setReadError("Older updates could not load. Try again."); } finally { if (alive.current) setLoading(false); }
  }
  const canWrite = featureAvailable && page?.canWrite === true;
  const pendingAnswer = items.some(item => !["draft", "sent", "needs_attention"].includes(item.status) && item.payload.kind !== "consumer_update" && item.payload.cycleId === page?.resolutionCheck?.cycleId);
  const visibleItems = items.filter(item => item.status !== "sent");
  const check = page?.resolutionCheck;
  const accepted = items.findLast(item => item.status === "sent" && item.receipt && item.payload.kind !== "consumer_update" && item.payload.cycleId === check?.cycleId);
  const answer = check?.answer ?? (accepted ? accepted.payload.kind === "resolution_confirmed" ? "confirmed" : "still_exists" : null);
  const messages = page?.events.filter(event => event.kind !== "resolution_confirmed" && event.kind !== "resolution_disputed") ?? [];
  const unavailable = (!featureAvailable || page?.enabled === false) && !visibleItems.length;
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Pull-to-refresh on Ticket details also refreshes this scoped external read.
  useEffect(() => { if (refreshRequest) void refresh(); }, [refreshRequest, refresh]);
  if (unavailable && !screen) return null;
  if (!screen) return <View className="gap-3">
    <Pressable accessibilityRole="button" accessibilityLabel="Follow-up & replies" onPress={onOpen} className="min-h-16 flex-row items-center gap-3 rounded-xl bg-card p-4">
      <View className="flex-1 gap-1"><Text size="sm" weight="semibold" className="text-primary">Follow-up & replies</Text>{answer || pendingAnswer ? <Text size="xs" muted>{answer ? "Response submitted" : "Awaiting receipt"}</Text> : null}</View><ChevronRight size={20} color={primary} />
    </Pressable>
    {check ? <ServiceFeedbackSection key={`${ticketId}:${feedbackScope.identityUserId}:${feedbackScope.serviceAccountId}:${check.cycleId}`} ticketId={ticketId} cycleId={check.cycleId} responseVersion={check.responseVersion} confirmed={check.answer === "confirmed" && check.responseVersion > 0 && !pendingAnswer} available={serviceFeedbackAvailable} scope={feedbackScope} ticketNumber={ticketNumber} refreshRequest={refreshRequest} /> : null}
  </View>;
  return <ReportPage title="Follow-up" onBack={onBack} refreshing={loading} onRefresh={() => { void refreshLocal(); void refresh(); }} footer={canWrite && !formOpen ? <Button variant="outline" disabled={busy} onPress={() => openForm()}>Add an update</Button> : undefined}>
    <Text size="xs" muted>{ticketNumber}</Text>{title ? <Text weight="semibold" size="sm">{title}</Text> : null}
    {unavailable ? <Text muted>Follow-up unavailable.</Text> : null}
    {loading && !page ? <Text accessibilityLiveRegion="polite" muted size="sm">Loading updates…</Text> : null}
    {readError ? <Text accessibilityRole="alert" size="sm" className="text-destructive">{readError} Pull down to retry.</Text> : null}
    {check ? <View className="gap-3 rounded-xl bg-card p-4">
      {answer ? <><Text weight="semibold" size="sm">Response submitted</Text><Text size="sm">{answer === "confirmed" ? "Resolved" : "Problem still exists"}. Cannot be changed.</Text>{answer === "still_exists" ? <Text size="sm">{check.reviewState === "addressed" ? "Reviewed" : "Awaiting ALECO review"}</Text> : null}</> : pendingAnswer ? <><Text weight="semibold" size="sm">Awaiting receipt</Text><Text muted size="sm">Saved on this device.</Text></> : canWrite ? <><Text weight="semibold">Is the problem resolved?</Text><RadioGroup value={choice} onValueChange={setChoice} variant="card" disabled={busy}><RadioGroup.Item value="confirmed" label="Yes, resolved" /><RadioGroup.Item value="still_exists" label="Problem still exists" /></RadioGroup><Text muted size="xs">Cannot be changed after submission.</Text><Button disabled={busy || !choice} onPress={() => void confirmResolution()}>Submit response</Button></> : null}
    </View> : null}
    <Text weight="semibold" size="sm">Messages</Text>
    {page?.nextCursor ? <Button variant="outline" disabled={loading} onPress={() => void older()}>Load older messages</Button> : null}
    {messages.map(event => <View key={event.id} className="gap-2 rounded-xl bg-card p-4">
      <Text weight="medium" size="xs">{event.author === "Consumer" ? "You" : event.author} · {formatReportDate(event.createdAt)}</Text>
      {event.text ? <Text selectable size="sm">{event.text}</Text> : null}
      {event.imageUrls.length ? <ImageViewer><View className="flex-row flex-wrap gap-2">{event.imageUrls.map((uri,index) => <ImageViewer.Trigger key={uri} source={{uri}} alt={`Follow-up photo ${index+1}`} className="h-24 w-24 rounded-xl" radius={12} />)}</View></ImageViewer> : null}
      {event.reviewState ? <Text muted size="xs">{event.reviewState === "pending" ? "Awaiting review" : event.reviewState === "awaiting_superadmin" ? "Awaiting review" : "Reviewed"}</Text> : null}
    </View>)}
    {page?.enabled && !messages.length ? <Text muted size="sm">No messages yet.</Text> : null}
    {formOpen && canWrite ? <View className="gap-3">
      {draft.payload.kind === "consumer_update" ? <Input label="Your update" isRequired multiline avoidKeyboard maxLength={2000} value={draft.payload.text} disabled={busy} onChangeText={text => { void persistDraft({ ...currentDraft.current, payload: { ...currentDraft.current.payload, text } }).catch(() => {}); }} description="Saved on this device." /> : <Text size="sm">Saved response: {draft.payload.kind === "resolution_confirmed" ? "Resolved" : "Problem still exists"}{draft.payload.text ? ` — ${draft.payload.text}` : ""}. Once submitted, it can’t be changed.</Text>}
      <Text muted size="sm">Up to 3 photos, 5 MB each.</Text>
      <FileUpload key={draft.id} value={files} onValueChange={changePhotos} sources={["camera", "library"]} sourceTitle="Add follow-up photos" accept={["image/*"]} multiple maxFiles={3} image={{ quality: 1 }} disabled={busy || preparing > 0} onError={failure => setError(failure.message)} onReject={failures => setError(failures.map(value => value.message).join(" "))}><FileUpload.Grid columns={3} placeholders addLabel="Add photos" /></FileUpload>
      {preparing ? <Text muted size="sm" accessibilityLiveRegion="polite">Preparing photos…</Text> : null}
      <Button disabled={busy || preparing > 0 || (draft.payload.kind === "consumer_update" && !draft.payload.text.trim())} onPress={() => void send(currentDraft.current)}>{busy ? "Saving update…" : "Send update"}</Button><Button variant="outline" disabled={busy || preparing > 0} onPress={() => { setFormOpen(false); Keyboard.dismiss(); }}>Keep draft</Button>
    </View> : null}
    {!canWrite && visibleItems.length ? <Text muted size="sm">Sending paused. Saved work is kept.</Text> : null}
    {visibleItems.length ? <Text weight="medium" size="sm">Saved updates</Text> : null}
    {visibleItems.map(item => <View key={item.id} className="gap-2 rounded-xl bg-background p-3"><Text weight="medium" size="sm" accessibilityLiveRegion="polite">{labels[item.status]}</Text><Text selectable size="sm">{item.payload.text || (item.payload.kind === "resolution_disputed" ? "Problem still exists" : "Yes, resolved")}</Text>{item.error ? <Text size="sm" className="text-destructive">{item.error}</Text> : null}
      {item.status === "draft" && canWrite ? <Button variant="outline" disabled={busy} onPress={() => resume(item)}>Resume draft</Button> : null}
      {(item.status === "failed" || item.status === "queued") && canWrite ? <Button variant="outline" disabled={busy} onPress={() => { setBusy(true); void retryConsumerUpdate(item.id, scope).then(async () => { await refreshLocal(); await refresh(); }).catch(failure => setError(failure instanceof Error ? failure.message : "Retry failed; your saved update is kept.")).finally(() => { if (alive.current) setBusy(false); }); }}>Retry saved update</Button> : null}
      {item.status === "needs_attention" ? <Button variant="outline" onPress={() => { void Clipboard.setStringAsync(item.payload.text).then(() => setNotice("Copied.")).catch(() => setError("Text could not be copied. You can select the saved text instead.")); }}>Copy saved text</Button> : null}
      {item.status !== "sending" ? <Button variant="outline" disabled={busy} onPress={() => setDiscardId(item.id)}>Remove local copy</Button> : null}
    </View>)}
    {notice ? <Text size="sm" accessibilityLiveRegion="polite">{notice}</Text> : null}{error ? <Text accessibilityRole="alert" className="text-destructive" size="sm">{error}</Text> : null}
    <Dialog open={discardId !== null} onOpenChange={open => { if (!open) setDiscardId(null); }}><Dialog.Content><Dialog.Title>Remove this copy?</Dialog.Title><Dialog.Description>This removes only the saved copy. It does not undo a sent update.</Dialog.Description><Dialog.Footer><Button variant="outline" onPress={() => setDiscardId(null)}>Keep copy</Button><Button variant="destructive" onPress={() => { const id = discardId; setDiscardId(null); if (id) void discardConsumerUpdate(id, scope).then(() => { if (id === currentDraft.current.id) { const next = freshDraft(); currentDraft.current = next; setDraft(next); setFiles([]); setFormOpen(false); } }).catch(failure => setError(failure instanceof Error ? failure.message : "The saved copy could not be removed.")); }}>Remove copy</Button></Dialog.Footer></Dialog.Content></Dialog>
  </ReportPage>;
}
