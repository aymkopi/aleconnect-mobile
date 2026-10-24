import {useEffect,useRef,useState} from 'react';
import {View} from 'react-native';
import {Button} from '@/components/panelui/button';
import {Text} from '@/components/panelui/text';
import {Input} from '@/components/panelui/input';
import {fetchServiceFeedback,readServiceFeedbackDraft,saveServiceFeedbackDraft,sendServiceFeedback,discardServiceFeedbackDraft,type FeedbackDraft,type ServiceFeedbackInput} from '@/services/feedback';
import type {ConsumerIntentScope} from '@/services/consumer-intent';
import {createConsumerUpdateId} from './consumer-updates-contract';
import type {ServiceFeedback} from './service-feedback-contract';
const labels=['Very dissatisfied','Dissatisfied','Neutral','Satisfied','Very satisfied'];
export function ServiceFeedbackSection({ticketId,cycleId,responseVersion,confirmed,available,scope}:{ticketId:string;cycleId:string;responseVersion:number;confirmed:boolean;available:boolean;scope:ConsumerIntentScope}){
 const [saved,setSaved]=useState<ServiceFeedback|null>(null),[draft,setDraft]=useState<FeedbackDraft|null>(null),[enabled,setEnabled]=useState(false),[canWrite,setCanWrite]=useState(false),[busy,setBusy]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[skipped,setSkipped]=useState(false),[refresh,setRefresh]=useState(0);
 const current=useRef<FeedbackDraft|null>(null);
 useEffect(()=>{
  let active=true;
  void readServiceFeedbackDraft(scope,ticketId).then(value=>{if(active){current.current=value;setDraft(value);setReady(true);}}).catch(()=>{if(active)setError('The saved feedback could not load.');});
  if(available)void fetchServiceFeedback(ticketId,cycleId,scope.serviceAccountId).then(value=>{if(active){setSaved(value.serviceFeedback);setEnabled(value.enabled);setCanWrite(value.canWrite);}}).catch(()=>{if(active){setCanWrite(false);setError('Feedback could not refresh. Your saved choice is kept.');}});
  return()=>{active=false;};
 },[scope,ticketId,cycleId,available,refresh]);
 const original=draft?.input;
 const stale=!!original && (original.cycleId!==cycleId || original.responseVersion!==responseVersion || original.accessRevision!==scope.accessRevision);
 function input(rating:number,comment:string):ServiceFeedbackInput{return {kind:'service',clientMutationId:createConsumerUpdateId(),ticketId,cycleId,serviceAccountId:scope.serviceAccountId,accessRevision:scope.accessRevision,responseVersion,expectedVersion:saved?.version ?? 0,rating,comment};}
 async function change(rating:number,comment:string){
  const next={input:current.current ? {...current.current.input,rating,comment}:input(rating,comment),pending:false};current.current=next;setDraft(next);setError('');setNotice('');
  try{await saveServiceFeedbackDraft(scope,next);}catch{setError('This feedback draft could not be saved. Keep this screen open.');}
 }
 async function send(){
  const value=current.current?.input;if(!value || busy)return;setBusy(true);setError('');setNotice('');
  current.current={input:value,pending:true};setDraft(current.current);
  try{await sendServiceFeedback(scope,value);current.current=null;setDraft(null);setNotice('Service feedback received by ALECO.');setRefresh(v=>v+1);}catch(failure){setError(failure instanceof Error?failure.message:'Feedback receipt was not confirmed. Your draft is kept.');}finally{setBusy(false);}
 }
 async function discard(){try{await discardServiceFeedbackDraft(scope,ticketId);current.current=null;setDraft(null);setRefresh(v=>v+1);setError('');}catch{setError('The saved feedback could not be removed.');}}
 if(!available && !draft || !confirmed && !draft && !saved)return null;
 const editable=ready && available && enabled && canWrite && confirmed && !stale && !busy && !draft?.pending;
 return <View className="gap-3 rounded-xl bg-background p-3" accessibilityLabel="Optional service satisfaction">
  <Text weight="semibold" size="sm">How satisfied were you with the service?</Text>
  <Text muted size="sm">Optional. This does not close your report or replace telling ALECO the problem still exists.</Text>
  {saved?<Text size="sm">Your submitted rating: {saved.rating} of 5 — {labels[saved.rating-1]}.{saved.comment?` ${saved.comment}`:''}</Text>:null}
  {stale?<Text accessibilityRole="alert" size="sm">Your saved feedback belongs to an earlier answer, resolution cycle, or account access. Keep it for review or remove the local copy before making a new choice.</Text>:null}
  {draft?.pending?<Text size="sm">Saved feedback is awaiting a server receipt. Retry uses the same submission.</Text>:null}
  {!skipped && (confirmed || draft)?<>
   <View className="gap-2" accessibilityLabel="Service rating from 1 to 5">
    {labels.map((label,index)=><Button key={label} variant={(original?.rating ?? saved?.rating)===index+1?'primary':'outline'} accessibilityLabel={`${index+1} of 5: ${label}`} accessibilityState={{selected:(original?.rating ?? saved?.rating)===index+1}} disabled={!editable} onPress={()=>void change(index+1,original?.comment ?? saved?.comment ?? '')}>{index+1} · {label}</Button>)}
   </View>
   <Input label="Comment (optional)" multiline avoidKeyboard maxLength={1000} value={original?.comment ?? saved?.comment ?? ''} disabled={!editable || !original?.rating} onChangeText={comment=>void change(original?.rating ?? 0,comment)} description="Up to 1,000 characters." />
   {draft?<Button disabled={busy || !available || !canWrite || !confirmed || stale} onPress={()=>void send()}>{busy?'Sending…':draft.pending?'Retry saved feedback':'Send optional feedback'}</Button>:null}
  </>:<Button variant="outline" onPress={()=>setSkipped(false)}>Give service feedback</Button>}
  {draft?<Button variant="ghost" disabled={busy} onPress={()=>void discard()}>Remove saved feedback from this device</Button>:<Button variant="ghost" onPress={()=>setSkipped(true)}>Skip for now</Button>}
  <Button variant="ghost" disabled={busy || !available} onPress={()=>setRefresh(v=>v+1)}>Refresh service feedback</Button>
  {!available || enabled && !canWrite?<Text muted size="sm">Service feedback is unavailable or paused. Saved work is kept.</Text>:null}
  {error?<Text accessibilityRole="alert" size="sm" className="text-destructive">{error}</Text>:null}
  {notice?<Text accessibilityLiveRegion="polite" size="sm">{notice}</Text>:null}
 </View>;
}
