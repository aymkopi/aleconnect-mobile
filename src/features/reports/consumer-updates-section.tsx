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
import { createConsumerUpdateId, type ConsumerUpdatePayload, type ConsumerReportEvent, type ConsumerUpdatesPage } from "./consumer-updates-contract";
import { formatReportDate } from "./data";
import { ChevronRight } from "lucide-react-native";
import { useAppColors } from "@/hooks/use-app-colors";
import { BottomSheet } from "@/components/panelui/bottom-sheet";
import { useConsumerUpdates } from "./use-consumer-updates";
import { cacheServiceFeedback,renewConsumerUpdateEvidence } from "@/services/consumer-updates-cache";
import { useAuthSession } from "@/hooks/use-auth-session";
import { ReportPage } from "./components/report-page";
import { ServiceFeedbackSection } from "./service-feedback-section";

type Draft = { id: string; payload: ConsumerUpdatePayload; evidence: QueuedConsumerUpdate["evidence"] };
const freshDraft = (page?:ConsumerUpdatesPage|null,kind:ConsumerUpdatePayload['kind']='consumer_update'):Draft => ({id:createConsumerUpdateId(),payload:{kind,text:'',cycleId:page?.conversation?.cycleId??null,responseVersion:page?.conversation?.responseVersion??page?.resolutionCheck?.responseVersion??0,followupVersion:1,expectedFollowupRevision:page?.conversation?.revision??0,replyTo:page?.conversation?.replyTo??null},evidence:[]});
const labels: Record<QueuedConsumerUpdate["status"], string> = { draft: "Draft", queued: "Waiting to send", sending: "Sending…", failed: "Awaiting receipt", needs_attention: "Review needed", sent: "Received" };
export function ConsumerUpdatesSection({ ticketId, serviceAccountId, scope, featureAvailable, serviceFeedbackAvailable = false, active = true, screen = false, onOpen, onBack, ticketNumber, title, refreshRequest = false }: { ticketId: string; serviceAccountId: string; scope: ConsumerUpdateScope; featureAvailable: boolean; serviceFeedbackAvailable?: boolean; active?: boolean; screen?: boolean; onOpen?: () => void; onBack?: () => void; ticketNumber?: string; title?: string; refreshRequest?: boolean }) {
  const [primary] = useAppColors(["primary"]);
  const feedbackScope = useMemo(() => ({ principalId: scope.principalId, identityUserId: scope.identityUserId, accessRevision: scope.accessRevision, serviceAccountId }), [scope.principalId, scope.identityUserId, scope.accessRevision, serviceAccountId]);
  const {session}=useAuthSession();
  const {page,loading,error:readError,refresh,scope:stableScope}=useConsumerUpdates(scope,ticketId,serviceAccountId,featureAvailable&&active);
  const [olderEvents,setOlderEvents]=useState<ConsumerReportEvent[]>([]),[cursor,setCursor]=useState<string|null|undefined>(undefined),[paging,setPaging]=useState(false);
  const [photoOpen,setPhotoOpen]=useState<string|null>(null),[photoState,setPhotoState]=useState<{eventId:string;message:string;loading?:boolean}|null>(null);
  const photoRequest=useRef(0);
  const [question,setQuestion]=useState(false),[ratingRequest,setRatingRequest]=useState(0);
  const [items, setItems] = useState<QueuedConsumerUpdate[]>([]), [draft, setDraft] = useState<Draft>(()=>freshDraft());
  const [files, setFiles] = useState<FileUploadFile[]>([]), [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [notice, setNotice] = useState(""), [discardId, setDiscardId] = useState<string | null>(null), [preparing, setPreparing] = useState(0);
  const alive = useRef(true), currentDraft = useRef(draft), currentFiles = useRef(files),navigateAfterQuestion=useRef(false),displayActive=useRef(active);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(()=>{displayActive.current=active;if(!active)photoRequest.current++;},[active]);
  useEffect(()=>{if(!question&&navigateAfterQuestion.current){navigateAfterQuestion.current=false;onOpen?.();}},[question,onOpen]);
  const refreshLocal = useCallback(async () => {
    try { const next = await listConsumerUpdates(stableScope, ticketId); if (alive.current) setItems(next.filter(item => item.serviceAccountId === serviceAccountId)); }
    catch (failure) { if (alive.current) setError(failure instanceof Error ? failure.message : "Saved follow-ups could not be loaded."); }
  }, [stableScope, ticketId, serviceAccountId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Subscribe to durable local work, independently of network reads.
  useEffect(() => { void refreshLocal(); return subscribeConsumerUpdates(() => { void refreshLocal(); }); }, [refreshLocal]);
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
  const openForm=useCallback(()=>{
    const next=freshDraft(page,page?.conversation?.state==='not_started'?'resolution_disputed':'consumer_update');
    currentDraft.current=next;setDraft(next);currentFiles.current=[];setFiles([]);setFormOpen(true);setError('');setNotice('');
  },[page]);
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
    if (next.payload.kind !== "resolution_confirmed" && (![...next.payload.text.trim()].length || [...next.payload.text.trim()].length>250)) { setError("Write an update of 1 to 250 characters."); return false; }
    if(next.payload.followupVersion!==1){setError('Review your saved text and create a new update. The original is kept.');return false;}
    if (next.id === currentDraft.current.id && currentFiles.current.length !== next.evidence.length) { setError("Remove or replace any photo that could not be prepared."); return; }
    setBusy(true); setError("");
    try {
      await saveConsumerUpdateDraft({ id: next.id, scope, ticketId, serviceAccountId, payload: next.payload, evidence: next.evidence });
      await enqueueConsumerUpdate(next.id, scope);
      if (alive.current) {
        setQuestion(false); setNotice("Saved. Awaiting receipt.");
        if (next.id === currentDraft.current.id) { setFormOpen(false); const clean = freshDraft(); currentDraft.current = clean; setDraft(clean); currentFiles.current = []; setFiles([]); Keyboard.dismiss(); }
      }
      const results = await syncConsumerUpdateQueue();
      if (alive.current) { const received=results.some(item => item.id === next.id && item.status === "sent");if(received){setNotice('');if(next.payload.kind==='resolution_confirmed'&&displayActive.current)setRatingRequest(value=>value+1);} await refreshLocal();return received; }
    } catch (failure) { if (alive.current) setError(failure instanceof Error ? failure.message : "Your saved update is kept. Reconnect and retry."); }
    finally { if (alive.current) setBusy(false); }
  }
  async function confirmResolution() {
    if(!page?.conversation?.canConfirmResolution||busy)return;
    await send(freshDraft(page,'resolution_confirmed'));
  }
  async function openPhoto(open:boolean,eventId:string){
    const request=++photoRequest.current;
    if(!open){setPhotoOpen(null);return;}
    setPhotoState({eventId,message:'Opening photo…',loading:true});
    try{const urls=await renewConsumerUpdateEvidence(stableScope,ticketId,serviceAccountId,eventId);if(alive.current&&displayActive.current&&request===photoRequest.current){setOlderEvents(rows=>rows.map(event=>event.id===eventId?{...event,imageUrls:urls}:event));setPhotoState(null);setPhotoOpen(eventId);}}
    catch(failure){if(alive.current&&request===photoRequest.current)setPhotoState({eventId,message:failure instanceof Error?failure.message:'Photo unavailable.'});}
  }
  async function older() {
    const nextCursor=cursor===undefined?page?.nextCursor:cursor;
    if(!nextCursor||paging)return;setPaging(true);
    try{const next=await fetchConsumerUpdates(ticketId,serviceAccountId,nextCursor);if(alive.current){setOlderEvents(rows=>[...next.events,...rows.filter(row=>!next.events.some(event=>event.id===row.id))]);setCursor(next.nextCursor);}}
    catch(failure){setError(failure instanceof Error?failure.message:'Older updates could not load.');}finally{if(alive.current)setPaging(false);}
  }
  const pending=items.some(item=>!['draft','sent','needs_attention'].includes(item.status)&&item.accessRevision===scope.accessRevision&&item.payload.cycleId===page?.conversation?.cycleId);
  const canWrite=featureAvailable&&page?.canWrite===true;
  const canSubmit=canWrite&&page?.conversation?.canSubmitUpdate===true&&!pending;
  const canConfirm=canWrite&&page?.conversation?.canConfirmResolution===true&&!pending;
  const visibleItems=items.filter(item=>item.status!=='sent'&&(!formOpen||item.id!==draft.id));
  const messages=[...olderEvents.filter(event=>!page?.events.some(row=>row.id===event.id)),...(page?.events??[])].filter(event=>['consumer_update','resolution_disputed','staff_reply','staff_address','staff_reopen'].includes(event.kind)&&(event.text||event.imageUrls.length)).reverse();
  const unavailable=(!featureAvailable||page?.enabled===false)&&!visibleItems.length;
  const conversation=page?.conversation;
  const composerStarted=useRef(false);
  useEffect(()=>{if(screen&&!composerStarted.current&&conversation?.state==='not_started'&&canSubmit){composerStarted.current=true;openForm();}},[screen,conversation?.state,canSubmit,openForm]);
  useEffect(()=>{if(refreshRequest)void refresh(true);},[refreshRequest,refresh]);
  if(page?.closurePolicy)return null;
  const rating=page?.resolutionCheck?<ServiceFeedbackSection key={page.resolutionCheck.cycleId} ticketId={ticketId} cycleId={page.resolutionCheck.cycleId} responseVersion={page.resolutionCheck.responseVersion} confirmed={page.resolutionCheck.answer==='confirmed'} available={serviceFeedbackAvailable&&page.serviceFeedbackEnabled===true} canWrite={page.canRate===true} saved={page.serviceFeedback??null} scope={feedbackScope} ticketNumber={ticketNumber} firstName={session?.user.name} openRequest={ratingRequest} triggerVisible={screen} onReceived={feedback=>cacheServiceFeedback(stableScope,ticketId,serviceAccountId,feedback)} onFinished={()=>{setFormOpen(false);Keyboard.dismiss();}}/>:null;
  const prompt=question?<BottomSheet open onOpenChange={setQuestion}><BottomSheet.Content><BottomSheet.Header title="Is the issue resolved?" description={ticketNumber}/><BottomSheet.Body><View className="gap-3"><Button disabled={busy||!canConfirm} onPress={()=>void confirmResolution()}>Yes, resolved</Button><Button variant="outline" disabled={busy||!canSubmit} onPress={()=>{setQuestion(false);if(screen)openForm();else navigateAfterQuestion.current=true;}}>Still having an issue</Button></View></BottomSheet.Body></BottomSheet.Content></BottomSheet>:null;
  if (unavailable && !screen) return null;
  if(!screen&&(!page||!conversation&&!messages.length)&&!visibleItems.length)return null;
  if (!screen) return <View className="gap-2">
    <Pressable accessibilityRole="button" accessibilityLabel={conversation?.state==='not_started'&&!pending?'Is the issue resolved?':'Follow-up & replies'} onPress={()=>{if(conversation?.state==='not_started'&&!pending)setQuestion(true);else onOpen?.();}} className="min-h-16 flex-row items-center gap-3 rounded-xl bg-card p-4">
      <View className="flex-1 gap-1"><Text size="sm" weight="semibold" className="text-primary">{conversation?.state==='not_started'&&!pending?'Is the issue resolved?':'Follow-up & replies'}</Text>{conversation?.state==='awaiting_staff'?<Text size="xs" muted>Update submitted. Awaiting ALECO.</Text>:conversation?.state==='expired'?<Text size="xs" muted>Follow-up closed</Text>:conversation?.state==='confirmed'?<Text size="xs" muted>Resolved</Text>:pending?<Text size="xs" muted>Awaiting receipt</Text>:null}</View><ChevronRight size={20} color={primary}/>
    </Pressable>{prompt}{rating}{readError?<Text size="xs" accessibilityRole="alert" className="text-destructive">{readError}</Text>:null}{error?<Text size="xs" accessibilityRole="alert" className="text-destructive">{error}</Text>:null}
  </View>;
  return <ReportPage title="Follow-up" onBack={onBack} headerAction={rating??undefined} refreshing={loading} onRefresh={()=>{void refreshLocal();void refresh(true).then(()=>{setOlderEvents([]);setCursor(undefined);});}} footer={!formOpen?<View className="gap-2">{canSubmit?<Button onPress={openForm}>Add update</Button>:conversation?.state==='awaiting_staff'?<Text size="sm" muted className="text-center">Update submitted. Awaiting ALECO.</Text>:conversation?.state==='expired'?<Text size="sm" muted className="text-center">Closed after 48 hours without a response.</Text>:conversation?.state==='confirmed'?<Text size="sm" muted className="text-center">Resolution confirmed.</Text>:null}{canConfirm&&conversation?.state!=='not_started'?<Button variant="outline" disabled={busy} onPress={()=>void confirmResolution()}>It’s resolved</Button>:null}</View>:undefined}>
    <Text size="xs" muted>{ticketNumber}</Text>{title?<Text weight="semibold" size="sm">{title}</Text>:null}
    {unavailable?<Text muted>Follow-up unavailable.</Text>:null}
    {conversation?.state==='awaiting_consumer'&&conversation.expiresAt?<Text size="xs" muted>Reply by {formatReportDate(conversation.expiresAt)} to keep this follow-up open.</Text>:null}
    {loading&&!page?<Text accessibilityLiveRegion="polite" muted size="sm">Loading updates…</Text>:null}
    {readError?<Text accessibilityRole="alert" size="sm" className="text-destructive">{readError}</Text>:null}
    {messages.map(event=><View key={event.id} className="gap-2 rounded-xl bg-card p-4"><View className="flex-row justify-between gap-3"><Text weight="semibold" size="xs">{event.author==='Consumer'?'You':'ALECO'}</Text><Text muted size="xs">{formatReportDate(event.createdAt)}</Text></View>{event.text?<Text selectable size="sm">{event.text}</Text>:null}{event.imageUrls.length?<ImageViewer closeLabel="Close photo" open={active&&photoOpen===event.id} onOpenChange={open=>{void openPhoto(open,event.id);}}><View className="flex-row flex-wrap gap-2">{event.imageUrls.map((uri,index)=><ImageViewer.Trigger disabled={photoState?.eventId===event.id&&photoState.loading===true} key={event.id+':'+index} source={{uri}} alt={'Follow-up photo '+(index+1)} className="h-24 w-24 rounded-xl" radius={12}/>)}</View></ImageViewer>:null}{photoState?.eventId===event.id?<Text size="xs" accessibilityLiveRegion="polite">{photoState.message}</Text>:null}</View>)}
    {(cursor===undefined?page?.nextCursor:cursor)?<Button variant="outline" disabled={paging} onPress={()=>void older()}>Earlier updates</Button>:null}
    {page?.enabled&&!messages.length&&!formOpen?<Text muted size="sm">No updates yet.</Text>:null}
    {prompt}
    {formOpen && canSubmit ? <View className="gap-3">
      <Input accessibilityLabel="Your update" placeholder="What’s still happening?" multiline avoidKeyboard maxLength={500} value={draft.payload.text} disabled={busy} onChangeText={text=>{const limit=[...text].slice(0,250).join('');void persistDraft({...currentDraft.current,payload:{...currentDraft.current.payload,text:limit}}).catch(()=>{});}} description={[...draft.payload.text].length+'/250'}/>
      <FileUpload key={draft.id} value={files} onValueChange={changePhotos} sources={["camera","library"]} sourceTitle="Add follow-up photos" accept={["image/*"]} multiple maxFiles={3} image={{quality:1}} disabled={busy||preparing>0} onError={failure=>setError(failure.message)} onReject={failures=>setError(failures.map(value=>value.message).join(' '))}><FileUpload.Trigger><Button variant="outline">Add photos</Button></FileUpload.Trigger>{files.length?<FileUpload.Grid columns={3} hideAdd/>:null}</FileUpload>
      {preparing ? <Text muted size="sm" accessibilityLiveRegion="polite">Preparing photos…</Text> : null}
      <Button disabled={busy || preparing > 0 || (!draft.payload.text.trim()||[...draft.payload.text.trim()].length>250)} onPress={() => void send(currentDraft.current)}>{busy ? "Saving update…" : "Send update"}</Button><Button variant="outline" disabled={busy || preparing > 0} onPress={() => { setFormOpen(false); Keyboard.dismiss(); }}>Keep draft</Button>
    </View> : null}
    {!canWrite && visibleItems.length ? <Text muted size="sm">Sending paused. Saved work is kept.</Text> : null}
    {visibleItems.length ? <Text weight="medium" size="sm">Saved updates</Text> : null}
    {visibleItems.map(item => <View key={item.id} className="gap-2 rounded-xl bg-background p-3"><Text weight="medium" size="sm" accessibilityLiveRegion="polite">{labels[item.status]}</Text><Text selectable size="sm">{item.payload.text || (item.payload.kind === "resolution_disputed" ? "Problem still exists" : "Yes, resolved")}</Text>{item.error ? <Text size="sm" className="text-destructive">{item.error}</Text> : null}
      {item.status === "draft" && canSubmit && item.payload.followupVersion===1 && item.payload.cycleId===conversation?.cycleId && item.accessRevision===scope.accessRevision ? <Button variant="outline" disabled={busy} onPress={() => resume(item)}>Resume draft</Button> : null}
      {(item.status === "failed" || item.status === "queued") && canWrite ? <Button variant="outline" disabled={busy} onPress={() => { setBusy(true); void retryConsumerUpdate(item.id, scope).then(async () => { await refreshLocal(); }).catch(failure => setError(failure instanceof Error ? failure.message : "Retry failed; your saved update is kept.")).finally(() => { if (alive.current) setBusy(false); }); }}>Retry saved update</Button> : null}
      {item.status === "needs_attention" ? <Button variant="outline" onPress={() => { void Clipboard.setStringAsync(item.payload.text).then(() => setNotice("Copied.")).catch(() => setError("Text could not be copied. You can select the saved text instead.")); }}>Copy saved text</Button> : null}
      {item.status !== "sending" ? <Button variant="outline" disabled={busy} onPress={() => setDiscardId(item.id)}>Remove local copy</Button> : null}
    </View>)}
    {notice ? <Text size="sm" accessibilityLiveRegion="polite">{notice}</Text> : null}{error ? <Text accessibilityRole="alert" className="text-destructive" size="sm">{error}</Text> : null}
    <Dialog open={discardId !== null} onOpenChange={open => { if (!open) setDiscardId(null); }}><Dialog.Content><Dialog.Title>Remove this copy?</Dialog.Title><Dialog.Description>This removes only the saved copy. It does not undo a sent update.</Dialog.Description><Dialog.Footer><Button variant="outline" onPress={() => setDiscardId(null)}>Keep copy</Button><Button variant="destructive" onPress={() => { const id = discardId; setDiscardId(null); if (id) void discardConsumerUpdate(id, scope).then(() => { if (id === currentDraft.current.id) { const next = freshDraft(); currentDraft.current = next; setDraft(next); setFiles([]); setFormOpen(false); } }).catch(failure => setError(failure instanceof Error ? failure.message : "The saved copy could not be removed.")); }}>Remove copy</Button></Dialog.Footer></Dialog.Content></Dialog>
  </ReportPage>;
}
