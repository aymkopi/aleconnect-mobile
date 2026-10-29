import {useEffect,useRef,useState} from 'react';
import {AppState,Keyboard,View} from 'react-native';
import {Star,Check} from 'lucide-react-native';
import {Button} from '@/components/panelui/button';
import {Text} from '@/components/panelui/text';
import {BottomSheet} from '@/components/panelui/bottom-sheet';
import {Rating} from '@/components/panelui/rating';
import {useAppColors} from '@/hooks/use-app-colors';
import {readServiceFeedbackDraft,saveServiceFeedbackDraft,sendServiceFeedback,type FeedbackDraft,type ServiceFeedbackInput} from '@/services/feedback';
import type {ConsumerIntentScope} from '@/services/consumer-intent';
import {createConsumerUpdateId} from './consumer-updates-contract';
import {feedbackReceiptMatches,type ServiceFeedback} from './service-feedback-contract';
const labels=['Very dissatisfied','Dissatisfied','Neutral','Satisfied','Very satisfied'];
export function ServiceFeedbackSection({ticketId,cycleId,responseVersion,confirmed,available,canWrite,saved,scope,ticketNumber,firstName,openRequest=0,triggerVisible=true,onReceived,onFinished,closurePolicyVersion,onClosed}:{ticketId:string;cycleId:string;responseVersion:number;confirmed:boolean;available:boolean;canWrite:boolean;saved:ServiceFeedback|null;scope:ConsumerIntentScope;ticketNumber?:string;firstName?:string;openRequest?:number;triggerVisible?:boolean;onReceived:(feedback:ServiceFeedback)=>Promise<void>;onFinished?:()=>void;closurePolicyVersion?:1;onClosed?:()=>void}){
 const [draft,setDraft]=useState<FeedbackDraft|null>(null),[busy,setBusy]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState('');
 const [open,setOpen]=useState(false),[score,setScore]=useState(saved?.rating??0),[received,setReceived]=useState<ServiceFeedback|null>(null),[ack,setAck]=useState(false);
 const current=useRef<FeedbackDraft|null>(null),alive=useRef(true),lastRequest=useRef(0),done=useRef(onFinished);
 useEffect(()=>{done.current=onFinished;},[onFinished]);
 const [primary]=useAppColors(['primary']);
 const submitted=received??saved;
 const name=firstName?.trim().split(/\s+/)[0];
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{let active=true;void readServiceFeedbackDraft(scope,ticketId,cycleId).then(value=>{if(active){current.current=value;setDraft(value);if(value)setScore(value.input.rating);if(value?.receipt&&feedbackReceiptMatches(value.receipt,value.input)&&value.input.cycleId===cycleId){const receipt=value.receipt as {feedbackId:string;version:number;acceptedAt:string};setReceived({feedbackId:receipt.feedbackId,ticketId,cycleId,serviceAccountId:scope.serviceAccountId,rating:value.input.rating,comment:value.input.comment,version:receipt.version,responseVersion:value.input.responseVersion,...(value.input.closurePolicyVersion?{closurePolicyVersion:value.input.closurePolicyVersion}:{}),updatedAt:receipt.acceptedAt});}setReady(true);}}).catch(()=>{if(active)setError('Saved rating could not load.');});return()=>{active=false;};},[scope,ticketId,cycleId,open]);
 useEffect(()=>{if(openRequest>lastRequest.current){lastRequest.current=openRequest;setReady(false);setOpen(true);}},[openRequest]);
 useEffect(()=>{
  if(!ack||!open)return;
  let timer:ReturnType<typeof setTimeout>|undefined;
  const schedule=(state:string|null)=>{if(timer)clearTimeout(timer);if(state===null||state==='active')timer=setTimeout(()=>{setOpen(false);setAck(false);Keyboard.dismiss();done.current?.();},3000);};
  schedule(AppState.currentState);const listener=AppState.addEventListener('change',schedule);
  return()=>{if(timer)clearTimeout(timer);listener.remove();};
 },[ack,open]);
 const original=draft?.input;
 const stale=!!original&&(original.cycleId!==cycleId||(closurePolicyVersion!==1&&original.responseVersion!==responseVersion)||original.accessRevision!==scope.accessRevision);
 const editable=ready&&available&&canWrite&&confirmed&&!stale&&!busy&&!draft?.pending&&!submitted;
 async function change(rating:number){
  if(!editable)return;
  const input:ServiceFeedbackInput=original?{...original,rating}:{kind:'service',clientMutationId:createConsumerUpdateId(),ticketId,cycleId,serviceAccountId:scope.serviceAccountId,accessRevision:scope.accessRevision,responseVersion,expectedVersion:0,rating,comment:'',...(closurePolicyVersion?{closurePolicyVersion}:{})};
  const next={input,pending:false};current.current=next;setDraft(next);setScore(rating);setError('');
  try{await saveServiceFeedbackDraft(scope,next);}catch{setError('Rating not saved. Keep this sheet open.');}
 }
 async function send(){
  const value=current.current?.input;if(!value||busy||submitted||stale)return;setBusy(true);setError('');current.current={input:value,pending:true};setDraft(current.current);
  try{
   const receipt=await sendServiceFeedback(scope,value) as {feedbackId:string;version:number;acceptedAt:string;status?:string};
   if(!alive.current)return;
   const feedback:ServiceFeedback={feedbackId:receipt.feedbackId,ticketId,cycleId,serviceAccountId:scope.serviceAccountId,rating:value.rating,comment:value.comment,version:receipt.version,responseVersion:value.responseVersion,...(value.closurePolicyVersion?{closurePolicyVersion:value.closurePolicyVersion}:{}),updatedAt:receipt.acceptedAt};
   current.current=null;setDraft(null);setReceived(feedback);setAck(true);Keyboard.dismiss();
   await onReceived(feedback);
   if(receipt.status==='closed')onClosed?.();
  }catch(failure){if(alive.current)setError(failure instanceof Error?failure.message:'Delivery unconfirmed. Your rating is kept.');}
  finally{if(alive.current)setBusy(false);}
 }
 if(!confirmed&&!draft&&!submitted)return null;
 if(!available&&!draft&&!submitted)return null;
 return <BottomSheet open={open} onOpenChange={value=>{if(value)setReady(false);setOpen(value);if(!value&&ack){setAck(false);Keyboard.dismiss();done.current?.();}}}>
  {triggerVisible?<BottomSheet.Trigger><Button variant="ghost" accessibilityLabel={submitted?'Your rating: '+submitted.rating+' out of 5':'Rate service'}>{submitted?<Text size="sm" weight="semibold">{submitted.rating}/5</Text>:<Text size="sm" weight="semibold">Rate</Text>}<Star size={18} color={primary} fill={submitted?primary:'transparent'} /></Button></BottomSheet.Trigger>:null}
  <BottomSheet.Content>
   <BottomSheet.Header title={ack?(score>=4?'Thank you'+(name?', '+name:'')+'!':'Thanks'+(name?', '+name:'')+'.'):'Rate the service'} description={ack?undefined:ticketNumber} />
   <BottomSheet.Body><View className="gap-5">
    {ack?<><View className="items-center"><Check size={32} color={primary}/></View><Text size="sm" className="text-center">{score<=2?'We’ll use your feedback to improve our service.':score===3?'Your feedback helps us serve you better.':'We’re glad we could help. We’ll keep improving.'}</Text></>:<>
     <Text size="sm" className="text-center">{submitted?'Your rating for this report.':'How did ALECO handle this report?'}</Text>
     <Rating value={submitted?.rating??score} onValueChange={value=>{if(editable)setScore(value);}} onValueCommit={value=>{void change(Math.max(1,value));}} max={5} precision={1} size="lg" color="primary" label="Service rating" readOnly={!!submitted} disabled={!editable&&!submitted} headerClassName="hidden" formatValue={value=>value+' out of 5'+(value?': '+labels[value-1]:'')} className="self-center" rowClassName="min-h-12" />
     <Text size="sm" className="text-center">{(submitted?.rating??score)?labels[(submitted?.rating??score)-1]:'Select a rating'}</Text>
     {submitted?<Text size="xs" muted className="text-center">Rating submitted.</Text>:null}
     {stale?<Text accessibilityRole="alert" size="sm">Saved for an earlier report or account state. Your original rating is kept.</Text>:null}
     {draft?.pending&&!submitted?<Text size="sm">Awaiting receipt. Retry your saved rating.</Text>:null}
     {!canWrite&&!submitted?<Text muted size="sm">Rating unavailable. Your choice is kept.</Text>:null}
    </>}
    {error?<Text accessibilityRole="alert" size="sm" className="text-destructive">{error}</Text>:null}
   </View></BottomSheet.Body>
   {!ack?<BottomSheet.Footer>{submitted?<Button onPress={()=>setOpen(false)}>Done</Button>:<><Button disabled={!draft||busy||!available||!canWrite||!confirmed||stale} onPress={()=>void send()}>{busy?'Sending…':draft?.pending?'Retry rating':'Submit rating'}</Button><Button variant="ghost" onPress={()=>setOpen(false)}>Not now</Button></>}</BottomSheet.Footer>:null}
  </BottomSheet.Content>
 </BottomSheet>;
}
