import {useEffect,useRef,useState} from 'react';
import {View} from 'react-native';
import {useRouter} from 'expo-router';
import {Check,ChevronLeft,ChevronRight} from 'lucide-react-native';
import {useAppColors} from '@/hooks/use-app-colors';
import {Text} from '@/components/panelui/text';
import {Button} from '@/components/panelui/button';
import {BottomSheet} from '@/components/panelui/bottom-sheet';
import {ActivityCard} from '@/components/activity-card';
import {ReportPage} from './components/report-page';
import {matchingOutageNotices,outageNoticeExpired} from './outage-capture';
import type {ServiceStatus} from '@/features/home/service-status-contract';
import {enqueueOutageAcknowledgement,syncConsumerUpdateQueue,retryConsumerUpdate,listOutageAcknowledgements,type ConsumerUpdateScope} from '@/services/consumer-update-queue';
import {useSavedOutageAcknowledgements} from './saved-outage-acknowledgements';
import {RATE_LIMIT_MESSAGE,isRateLimit} from '@/utils/rate-limit';
import {formatManilaAdvisoryInterruptionRange} from '@/utils/manila-time';

export function KnownOutageChoice({scope,serviceAccountId,accountLabel,locationLabel,initialStatus,onContinue,onHome,onBack,onReview}:{scope:ConsumerUpdateScope;serviceAccountId:string;accountLabel:string;locationLabel:string;initialStatus:Extract<ServiceStatus,{enabled:true}>;onContinue:()=>void;onHome:()=>void;onBack:()=>void;onReview:()=>Promise<ServiceStatus>}){
 const [foreground]=useAppColors(['foreground']);
 const router=useRouter(),saved=useSavedOutageAcknowledgements(scope,serviceAccountId);
 const [data,setData]=useState<ServiceStatus>(initialStatus),[index,setIndex]=useState(0),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[review,setReview]=useState(false);
 const running=useRef(false),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[]);
 const matches=matchingOutageNotices(data),item=matches[index]??matches[0];
 const work=item?saved.items.filter(row=>row.payload.advisoryId===item.advisoryId&&row.payload.occurrenceId===item.occurrenceId):[];
 const confirmed=work.some(row=>row.status==='sent'&&row.receipt);
 const pending=work.find(row=>row.status!=='sent'&&row.payload.publicationRevision===item?.publicationRevision&&row.accessRevision===scope.accessRevision);
 async function act(action:()=>Promise<void>){if(running.current)return;running.current=true;setBusy(true);setError('');try{await action()}catch(failure){const e=failure as {status?:number;code?:string};setError(isRateLimit(e.status,e.code)?RATE_LIMIT_MESSAGE:'Couldn’t confirm. Try again.')}finally{running.current=false;if(alive.current)setBusy(false)}}
 async function acknowledge(){
  if(!item)return;
  if(outageNoticeExpired(item)){setReview(true);setError('This notice changed. Review the update.');return}
  const id=pending?.id??await enqueueOutageAcknowledgement(scope,serviceAccountId,item);
  if(pending&&['failed','queued'].includes(pending.status))await retryConsumerUpdate(id,scope);else await syncConsumerUpdateQueue();
  const row=(await listOutageAcknowledgements(scope,serviceAccountId)).find(row=>row.id===id);
  if(!alive.current)return;
  if(row?.status==='sent'&&row.receipt){setOpen(false);return}
  if(row?.errorCode==='STALE_OUTAGE_CONTEXT'){setReview(true);setError('This notice changed. Review the update.');setOpen(false);return}
  if(row?.errorCode==='RATE_LIMITED')setError(RATE_LIMIT_MESSAGE);
  else if(row?.status==='needs_attention')setError('Review this notice before trying again.');
  else setError('Couldn’t confirm. Try again.');
  setOpen(false);
 }
 async function refresh(){const value=await onReview();setData(value);setIndex(0);setReview(false);if(!matchingOutageNotices(value).length)setError('This notice no longer applies.')}
 const footer=<>{!confirmed?(review||pending?.errorCode==='STALE_OUTAGE_CONTEXT'?<Button loading={busy} onPress={()=>void act(refresh)}>Review update</Button>:item?<Button loading={busy} disabled={!!(pending?.status==='sending')} onPress={()=>setOpen(true)}>Are you affected?</Button>:<Button onPress={onContinue}>Create a separate report</Button>):<Button variant="secondary" onPress={onContinue}>Create a separate report</Button>}<Button variant={confirmed?'primary':'secondary'} onPress={onHome}>Back to home</Button></>;
 return <ReportPage title="Outage notice" onBack={onBack} footer={footer}>
  {!confirmed?<Text weight="semibold" size="lg">Your area may be affected</Text>:null}
  <Text muted size="sm">{locationLabel||accountLabel}</Text>
  {item?<ActivityCard reference={item.controlNumber} title={item.title} metadata={formatManilaAdvisoryInterruptionRange(item.scheduledStartAt,item.scheduledEndAt)??(item.occurrenceDate?item.occurrenceDate+' · Time to be confirmed':'Time to be confirmed')} onPress={()=>router.push({pathname:'/advisory/[id]',params:{id:item.advisoryId}})}/>:null}
  {matches.length>1?<View className="flex-row items-center justify-center gap-3"><Button size="icon" variant="ghost" accessibilityLabel="Previous notice" disabled={index===0||busy} onPress={()=>{setIndex(v=>v-1);setError('');setReview(false)}}><ChevronLeft size={20} color={foreground}/></Button><Text muted size="sm">{index+1} of {matches.length}</Text><Button size="icon" variant="ghost" accessibilityLabel="Next notice" disabled={index>=matches.length-1||busy} onPress={()=>{setIndex(v=>v+1);setError('');setReview(false)}}><ChevronRight size={20} color={foreground}/></Button></View>:null}
  {data.enabled&&(data.items.filter(row=>row.state==='active').length>3||data.hasMore)?<Text muted size="xs">More notices may apply.</Text>:null}
  {confirmed?<View className="gap-2 rounded-xl bg-card p-4"><View className="flex-row items-center gap-2"><Check size={20} color={foreground}/><Text weight="semibold" accessibilityLiveRegion="polite">You’re marked as affected</Text></View><Text muted size="sm">ALECO received your confirmation.</Text></View>:<Text muted size="sm">Sparking wires or a separate hazard? Choose “Create a separate report”.</Text>}
  {pending&&pending.status!=='sent'&&!error?<Text muted size="sm">{pending.status==='needs_attention'?'Review this notice before trying again.':'Couldn’t confirm. Try again.'}</Text>:null}
  {error||saved.error?<Text accessibilityRole="alert" className="text-destructive">{error||saved.error}</Text>:null}
  <BottomSheet open={open} onOpenChange={setOpen}><BottomSheet.Content><BottomSheet.Header title="Are you affected?"/><BottomSheet.Body className="gap-4">
   <Text muted size="sm">{accountLabel} · {item?.controlNumber}</Text><Button loading={busy} disabled={!data.enabled||!data.canAcknowledge||!item} onPress={()=>void act(acknowledge)}>Yes, I’m affected</Button><Button variant="secondary" disabled={busy} onPress={()=>{setOpen(false);onContinue()}}>Create a separate report</Button>
  </BottomSheet.Body></BottomSheet.Content>
  </BottomSheet>
 </ReportPage>;
}
