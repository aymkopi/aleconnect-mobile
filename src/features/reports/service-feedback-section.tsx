import {useEffect,useRef,useState} from 'react';
import {View} from 'react-native';
import {Button} from '@/components/panelui/button';
import {Text} from '@/components/panelui/text';
import {BottomSheet} from '@/components/panelui/bottom-sheet';
import {Rating} from '@/components/panelui/rating';
import {fetchServiceFeedback,readServiceFeedbackDraft,saveServiceFeedbackDraft,sendServiceFeedback,discardServiceFeedbackDraft,type FeedbackDraft,type ServiceFeedbackInput} from '@/services/feedback';
import type {ConsumerIntentScope} from '@/services/consumer-intent';
import {createConsumerUpdateId} from './consumer-updates-contract';
import type {ServiceFeedback} from './service-feedback-contract';
const labels=['Very dissatisfied','Dissatisfied','Neutral','Satisfied','Very satisfied'];
export function ServiceFeedbackSection({ticketId,cycleId,responseVersion,confirmed,available,scope,ticketNumber,refreshRequest=false}:{ticketId:string;cycleId:string;responseVersion:number;confirmed:boolean;available:boolean;scope:ConsumerIntentScope;ticketNumber?:string;refreshRequest?:boolean}){
 const [saved,setSaved]=useState<ServiceFeedback|null>(null),[draft,setDraft]=useState<FeedbackDraft|null>(null),[enabled,setEnabled]=useState(false),[canWrite,setCanWrite]=useState(false),[busy,setBusy]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[refresh,setRefresh]=useState(0);
 const [open,setOpen]=useState(false),[score,setScore]=useState(0);
 const current=useRef<FeedbackDraft|null>(null);
 useEffect(()=>{
  let active=true;const atRead=current.current;
  void readServiceFeedbackDraft(scope,ticketId).then(value=>{if(active && current.current===atRead){current.current=value;setDraft(value);if(value)setScore(value.input.rating);setReady(true);}}).catch(()=>{if(active)setError('The saved feedback could not load.');});
  if(available)void fetchServiceFeedback(ticketId,cycleId,scope.serviceAccountId).then(value=>{if(active){setSaved(value.serviceFeedback);setEnabled(value.enabled);setCanWrite(value.canWrite);if(!current.current)setScore(value.serviceFeedback?.rating ?? 0);}}).catch(()=>{if(active){setCanWrite(false);setError('Feedback could not refresh. Your saved choice is kept.');}});
  return()=>{active=false;};
 },[scope,ticketId,cycleId,available,refresh,refreshRequest,open]);
 const original=draft?.input;
 const stale=!!original && (original.cycleId!==cycleId || original.responseVersion!==responseVersion || original.accessRevision!==scope.accessRevision);
 function input(rating:number,comment:string):ServiceFeedbackInput{return {kind:'service',clientMutationId:createConsumerUpdateId(),ticketId,cycleId,serviceAccountId:scope.serviceAccountId,accessRevision:scope.accessRevision,responseVersion,expectedVersion:saved?.version ?? 0,rating,comment};}
 async function change(rating:number,comment:string){
  if(busy || current.current?.pending || !confirmed || stale || !canWrite)return;
  const next={input:current.current ? {...current.current.input,rating,comment}:input(rating,comment),pending:false};current.current=next;setDraft(next);setScore(rating);setError('');setNotice('');
  try{await saveServiceFeedbackDraft(scope,next);}catch{setError('Draft not saved. Keep this sheet open.');}
 }
 async function send(){
  const value=current.current?.input;if(!value || busy)return;setBusy(true);setError('');setNotice('');
  current.current={input:value,pending:true};setDraft(current.current);
  try{await sendServiceFeedback(scope,value);current.current=null;setDraft(null);setNotice('Rating received.');setRefresh(v=>v+1);}catch(failure){setError(failure instanceof Error?failure.message:'Delivery unconfirmed. Keep this sheet open.');}finally{setBusy(false);}
 }
 async function discard(){try{await discardServiceFeedbackDraft(scope,ticketId);current.current=null;setDraft(null);setRefresh(v=>v+1);setError('');}catch{setError('The saved feedback could not be removed.');}}
 if(!available && !draft || !confirmed && !draft && !saved)return null;
 const editable=ready && available && enabled && canWrite && confirmed && !stale && !busy && !draft?.pending;
 return <BottomSheet open={open} onOpenChange={setOpen}>
  <BottomSheet.Trigger><Button variant="outline">{draft?.pending?'Rating pending':saved?`Rating: ${saved.rating}/5`:'Rate service'}</Button></BottomSheet.Trigger>
  <BottomSheet.Content>
   <BottomSheet.Header title="Rate the service" description={ticketNumber} />
   <BottomSheet.Body><View className="gap-4">
    <Rating value={score} onValueChange={value=>{if(editable)setScore(value);}} onValueCommit={value=>{void change(Math.max(1,value),original?.comment ?? saved?.comment ?? '');}} max={5} precision={1} size="lg" color="primary" label="Service rating" headerClassName="hidden" formatValue={value=>`${value} out of 5${value?`: ${labels[value-1]}`:''}`} disabled={!editable} className="self-center" rowClassName="min-h-12" />
    <Text size="sm" className="text-center">{score?`${score}/5 · ${labels[score-1]}`:'Select a rating'}</Text>
    {saved&&!draft&&!notice?<Text size="sm">Rating submitted.</Text>:null}
    {stale?<Text accessibilityRole="alert" size="sm">Report or account changed. Remove the saved rating to choose again.</Text>:null}
    {draft?.pending?<Text size="sm">Delivery unconfirmed.</Text>:null}
    {original?.comment?<Text muted size="sm">Saved note: {original.comment}</Text>:null}
    {!available || enabled&&!canWrite?<Text muted size="sm">Rating unavailable. Saved work is kept.</Text>:null}
    {error?<Text accessibilityRole="alert" size="sm" className="text-destructive">{error}</Text>:null}
    {notice?<Text accessibilityLiveRegion="polite" size="sm">{notice}</Text>:null}
   </View></BottomSheet.Body>
   <BottomSheet.Footer>
    {notice&&!draft?<Button onPress={()=>setOpen(false)}>Done</Button>:<><Button disabled={!draft || busy || !available || !canWrite || !confirmed || stale} onPress={()=>void send()}>{busy?'Sending…':draft?.pending?'Retry rating':'Submit rating'}</Button><Button variant="ghost" onPress={()=>setOpen(false)}>Not now</Button></>}
    {draft?<Button variant="ghost" disabled={busy} onPress={()=>void discard()}>Remove local copy</Button>:null}
   </BottomSheet.Footer>
  </BottomSheet.Content>
 </BottomSheet>;
}
