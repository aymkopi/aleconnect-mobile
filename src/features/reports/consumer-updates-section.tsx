import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, View } from "react-native";
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
import { ServiceFeedbackSection } from "./service-feedback-section";

type Draft = { id: string; payload: ConsumerUpdatePayload; evidence: QueuedConsumerUpdate["evidence"] };
const freshDraft = (): Draft => ({ id: createConsumerUpdateId(), payload: { kind: "consumer_update", text: "", cycleId: null, responseVersion: 0 }, evidence: [] });
const labels: Record<QueuedConsumerUpdate["status"], string> = { draft: "Draft saved on this device", queued: "Waiting to send", sending: "Sending — awaiting receipt", failed: "Receipt not confirmed", needs_attention: "Review needed", sent: "Received by ALECO" };
export function ConsumerUpdatesSection({ ticketId, serviceAccountId, scope, featureAvailable, serviceFeedbackAvailable = false, active = true }: { ticketId: string; serviceAccountId: string; scope: ConsumerUpdateScope; featureAvailable: boolean; serviceFeedbackAvailable?: boolean; active?: boolean }) {
  const feedbackScope = useMemo(() => ({ principalId: scope.principalId, identityUserId: scope.identityUserId, accessRevision: scope.accessRevision, serviceAccountId }), [scope.principalId, scope.identityUserId, scope.accessRevision, serviceAccountId]);
  const [page, setPage] = useState<ConsumerUpdatesPage | null>(null), [loading, setLoading] = useState(false);
  const [items, setItems] = useState<QueuedConsumerUpdate[]>([]), [draft, setDraft] = useState<Draft>(freshDraft);
  const [files, setFiles] = useState<FileUploadFile[]>([]), [formOpen, setFormOpen] = useState(false), [changeAnswer, setChangeAnswer] = useState(false);
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
    catch { if (alive.current && generation === readGeneration.current) setReadError("Updates could not refresh. Your saved drafts and pending sends are kept."); }
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
  function openForm(kind: "consumer_update" | "resolution_disputed") {
    const check = page?.resolutionCheck;
    const next = freshDraft();
    if (kind === "resolution_disputed" && check) next.payload = { kind, text: "", cycleId: check.cycleId, responseVersion: check.responseVersion };
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
    if (next.payload.kind !== "resolution_confirmed" && !next.payload.text.trim()) { setError("Describe what ALECO needs to know."); return; }
    if (next.payload.kind !== "resolution_confirmed" && currentFiles.current.length !== next.evidence.length) { setError("Remove or replace any photo that could not be prepared."); return; }
    setBusy(true); setError("");
    try {
      await saveConsumerUpdateDraft({ id: next.id, scope, ticketId, serviceAccountId, payload: next.payload, evidence: next.evidence });
      await enqueueConsumerUpdate(next.id, scope);
      if (alive.current) {
        setChangeAnswer(false); setNotice("Saved on this device. Waiting for ALECO's receipt.");
        if (next.id === currentDraft.current.id) { setFormOpen(false); const clean = freshDraft(); currentDraft.current = clean; setDraft(clean); currentFiles.current = []; setFiles([]); Keyboard.dismiss(); }
      }
      const results = await syncConsumerUpdateQueue();
      if (alive.current) { if (results.some(item => item.id === next.id && item.status === "sent")) setNotice("ALECO received your update."); await refreshLocal(); await refresh(); }
    } catch (failure) { if (alive.current) setError(failure instanceof Error ? failure.message : "Your saved update is kept. Reconnect and retry."); }
    finally { if (alive.current) setBusy(false); }
  }
  async function confirmResolution() {
    const check = page?.resolutionCheck;
    if (!check) return;
    const next = freshDraft(); next.payload = { kind: "resolution_confirmed", text: "", cycleId: check.cycleId, responseVersion: check.responseVersion };
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
  const visibleItems = items.filter(item => item.status !== "sent").concat(items.filter(item => item.status === "sent").slice(-3));
  if ((!featureAvailable || page?.enabled === false) && !visibleItems.length) return null;
  return <View className="gap-3 rounded-xl bg-card p-4">
    <Text weight="semibold" accessibilityRole="header">Follow-up and resolution</Text>
    <Text size="sm" muted>Add information or read ALECO’s responses. Your official report status is managed separately.</Text>
    {featureAvailable ? <Button variant="outline" disabled={loading || busy} onPress={() => void refresh()}>Refresh updates</Button> : null}
    {loading && !page ? <Text accessibilityLiveRegion="polite" muted size="sm">Loading updates…</Text> : null}
    {readError ? <Text accessibilityRole="alert" size="sm" className="text-destructive">{readError}</Text> : null}
    {page?.nextCursor ? <Button variant="outline" disabled={loading} onPress={() => void older()}>Load older updates</Button> : null}
    {page?.events.map(event => <View key={event.id} className="gap-2 rounded-xl bg-background p-3">
      <Text weight="semibold" size="sm">{event.author}{event.kind === "resolution_confirmed" ? " · Confirmed resolved" : event.kind === "resolution_disputed" ? " · Problem still exists" : ""}</Text>
      <Text muted size="xs">{formatReportDate(event.createdAt)}</Text>
      {event.text ? <Text selectable size="sm">{event.text}</Text> : null}
      {event.imageUrls.length ? <ImageViewer><View className="flex-row flex-wrap gap-2">{event.imageUrls.map((uri, index) => <ImageViewer.Trigger key={uri} source={{ uri }} alt={`Follow-up photo ${index + 1}`} className="h-24 w-24 rounded-xl" radius={12} />)}</View></ImageViewer> : null}
      {event.reviewState ? <Text muted size="xs">{event.reviewState === "pending" ? "Awaiting Staff review" : event.reviewState === "awaiting_superadmin" ? "Awaiting supervisor review" : "Review addressed"}</Text> : null}
    </View>)}
    {page?.enabled && !page.events.length ? <Text muted size="sm">No follow-ups yet.</Text> : null}
    {page?.resolutionCheck ? <View className="gap-3 rounded-xl bg-background p-3">
      <Text weight="semibold" size="sm">Has your problem been resolved?</Text>
      {page.resolutionCheck.answer ? <Text size="sm">Your response: {page.resolutionCheck.answer === "confirmed" ? "Yes, resolved" : "Problem still exists"}.</Text> : null}
      {pendingAnswer ? <Text muted size="sm">Your saved response is waiting for a receipt. Follow its progress below.</Text> : canWrite && (!page.resolutionCheck.answer || changeAnswer) ? <View className="gap-2"><Button disabled={busy} onPress={() => void confirmResolution()}>Yes, resolved</Button><Button variant="outline" disabled={busy} onPress={() => openForm("resolution_disputed")}>Problem still exists</Button></View> : canWrite ? <Button variant="outline" disabled={busy} onPress={() => setChangeAnswer(true)}>Change your response</Button> : null}
      <Text muted size="xs">You may skip this question. Your response does not close or reopen the report.</Text>
      {canWrite && page.resolutionCheck.answer === "confirmed" && !pendingAnswer && !changeAnswer ? <Button variant="outline" disabled={busy} onPress={() => openForm("resolution_disputed")}>Problem still exists</Button> : null}
    </View> : null}
    {page?.resolutionCheck ? <ServiceFeedbackSection key={`${ticketId}:${feedbackScope.identityUserId}:${feedbackScope.serviceAccountId}`} ticketId={ticketId} cycleId={page.resolutionCheck.cycleId} responseVersion={page.resolutionCheck.responseVersion} confirmed={page.resolutionCheck.answer === "confirmed" && !pendingAnswer} available={serviceFeedbackAvailable} scope={feedbackScope} /> : null}
    {canWrite && !formOpen ? <Button disabled={busy} onPress={() => openForm("consumer_update")}>Add an update</Button> : null}
    {formOpen && canWrite ? <View className="gap-3">
      <Input label={draft.payload.kind === "resolution_disputed" ? "What problem remains?" : "Your update"} isRequired multiline avoidKeyboard maxLength={2000} value={draft.payload.text} disabled={busy} onChangeText={text => { void persistDraft({ ...currentDraft.current, payload: { ...currentDraft.current.payload, text } }).catch(() => {}); }} description="Up to 2,000 characters. Your draft stays on this device until you send it." />
      <Text muted size="sm">Photos are optional. Add up to 3; each prepared photo must be 5 MB or smaller.</Text>
      <FileUpload key={draft.id} value={files} onValueChange={changePhotos} sources={["camera", "library"]} sourceTitle="Add follow-up photos" accept={["image/*"]} multiple maxFiles={3} image={{ quality: 1 }} disabled={busy || preparing > 0} onError={failure => setError(failure.message)} onReject={failures => setError(failures.map(value => value.message).join(" "))}><FileUpload.Grid columns={3} placeholders addLabel="Add photos" /></FileUpload>
      {preparing ? <Text muted size="sm" accessibilityLiveRegion="polite">Preparing photos…</Text> : null}
      <Button disabled={busy || preparing > 0 || !draft.payload.text.trim()} onPress={() => void send(currentDraft.current)}>{busy ? "Saving update…" : "Send update"}</Button><Button variant="outline" disabled={busy || preparing > 0} onPress={() => { setFormOpen(false); Keyboard.dismiss(); }}>Keep draft</Button>
    </View> : null}
    {!canWrite && visibleItems.length ? <Text muted size="sm">Sending is unavailable. Saved copies remain on this device.</Text> : null}
    {visibleItems.length ? <Text weight="medium" size="sm">Saved on this device</Text> : null}
    {visibleItems.map(item => <View key={item.id} className="gap-2 rounded-xl bg-background p-3"><Text weight="medium" size="sm" accessibilityLiveRegion="polite">{labels[item.status]}</Text><Text selectable size="sm">{item.payload.text || "Yes, resolved"}</Text>{item.error ? <Text size="sm" className="text-destructive">{item.error}</Text> : null}
      {item.status === "draft" && canWrite ? <Button variant="outline" disabled={busy} onPress={() => resume(item)}>Resume draft</Button> : null}
      {(item.status === "failed" || item.status === "queued") && canWrite ? <Button variant="outline" disabled={busy} onPress={() => { setBusy(true); void retryConsumerUpdate(item.id, scope).then(async () => { await refreshLocal(); await refresh(); }).catch(failure => setError(failure instanceof Error ? failure.message : "Retry failed; your saved update is kept.")).finally(() => { if (alive.current) setBusy(false); }); }}>Retry saved update</Button> : null}
      {item.status === "needs_attention" ? <Button variant="outline" onPress={() => { void Clipboard.setStringAsync(item.payload.text).then(() => setNotice("Saved text copied. Review the current report before creating a new update.")).catch(() => setError("Text could not be copied. You can select the saved text instead.")); }}>Copy saved text</Button> : null}
      {item.status !== "sending" ? <Button variant="outline" disabled={busy} onPress={() => setDiscardId(item.id)}>Discard saved copy</Button> : null}
    </View>)}
    {notice ? <Text size="sm" accessibilityLiveRegion="polite">{notice}</Text> : null}{error ? <Text accessibilityRole="alert" className="text-destructive" size="sm">{error}</Text> : null}
    <Dialog open={discardId !== null} onOpenChange={open => { if (!open) setDiscardId(null); }}><Dialog.Content><Dialog.Title>Discard saved copy?</Dialog.Title><Dialog.Description>This removes the local draft or retry copy. A previous send may already have reached ALECO; this does not retract it.</Dialog.Description><Dialog.Footer><Button variant="outline" onPress={() => setDiscardId(null)}>Keep saved copy</Button><Button variant="destructive" onPress={() => { const id = discardId; setDiscardId(null); if (id) void discardConsumerUpdate(id, scope).then(() => { if (id === currentDraft.current.id) { const next = freshDraft(); currentDraft.current = next; setDraft(next); setFiles([]); setFormOpen(false); } }).catch(failure => setError(failure instanceof Error ? failure.message : "The saved copy could not be removed.")); }}>Discard local copy</Button></Dialog.Footer></Dialog.Content></Dialog>
  </View>;
}
