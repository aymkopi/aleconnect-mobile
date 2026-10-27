import {useEffect,useState} from 'react';
import {View} from 'react-native';
import {useRouter} from 'expo-router';
import {Button} from '@/components/panelui/button';
import {Text} from '@/components/panelui/text';
import {listOutageAcknowledgements,retryConsumerUpdate,subscribeConsumerUpdates,type ConsumerUpdateScope,type QueuedOutageAcknowledgement} from '@/services/consumer-update-queue';
import {RATE_LIMIT_MESSAGE,isRateLimit} from '@/utils/rate-limit';

export function useSavedOutageAcknowledgements(scope:ConsumerUpdateScope|null,serviceAccountId?:string){
 const key=JSON.stringify([scope?.principalId,scope?.identityUserId,scope?.accessRevision,scope?.authorizedServiceAccountIds,serviceAccountId]);
 const [state,setState]=useState<{key:string;items:QueuedOutageAcknowledgement[];error:string}>({key:'',items:[],error:''});
 const principalId=scope?.principalId,identityUserId=scope?.identityUserId,accessRevision=scope?.accessRevision,authorized=JSON.stringify(scope?.authorizedServiceAccountIds??[]);
 useEffect(()=>{
  if(!principalId||!identityUserId||accessRevision===undefined)return;
  let alive=true;const current={principalId,identityUserId,accessRevision,authorizedServiceAccountIds:JSON.parse(authorized) as string[]};
  const load=()=>void listOutageAcknowledgements(current,serviceAccountId).then(items=>{if(alive)setState({key,items,error:''})}).catch(()=>{if(alive)setState(previous=>({key,items:previous.key===key?previous.items:[],error:'Saved confirmations could not load.'}))});
  load();const unsubscribe=subscribeConsumerUpdates(load);return()=>{alive=false;unsubscribe()};
 },[key,principalId,identityUserId,accessRevision,authorized,serviceAccountId]);
 return state.key===key?{items:state.items,error:state.error,loading:false}:{items:[],error:'',loading:!!scope};
}
export function SavedOutageAcknowledgements({scope,serviceAccountId,accountLabel='ALECO account',accountLabels,canRetry=true,className=''}:{scope:ConsumerUpdateScope|null;serviceAccountId?:string;accountLabel?:string;accountLabels?:Record<string,string>;canRetry?:boolean;className?:string}){
 const router=useRouter(),saved=useSavedOutageAcknowledgements(scope,serviceAccountId),pending=saved.items.filter(row=>row.status!=='sent');
 const [busy,setBusy]=useState<string|null>(null),[error,setError]=useState('');
 async function retry(id:string){if(!scope||busy)return;setBusy(id);setError('');try{await retryConsumerUpdate(id,scope)}catch(failure){const e=failure as {status?:number;code?:string};setError(isRateLimit(e.status,e.code)?RATE_LIMIT_MESSAGE:'Couldn’t confirm. Try again.')}finally{setBusy(null)}}
 if(!pending.length&&!saved.error)return null;
 return <View className={className+' gap-3'}>{pending.map(item=><View key={item.id} className="gap-3 rounded-xl bg-card p-4"><View className="gap-1"><Text weight="semibold">Outage confirmation</Text><Text size="xs" muted>{accountLabels?.[item.serviceAccountId]??accountLabel}</Text></View><Text muted size="sm">{item.errorCode==='RATE_LIMITED'?RATE_LIMIT_MESSAGE:item.status==='needs_attention'||item.accessRevision!==scope?.accessRevision?'Review the notice before trying again.':item.status==='sending'?'Sending…':'Couldn’t confirm. Try again.'}</Text><View className="flex-row gap-3">{canRetry&&['failed','queued'].includes(item.status)&&item.accessRevision===scope?.accessRevision?<Button size="sm" loading={busy===item.id} onPress={()=>void retry(item.id)}>Try again</Button>:null}<Button size="sm" variant="ghost" onPress={()=>router.push({pathname:'/advisory/[id]',params:{id:item.payload.advisoryId}})}>View notice</Button></View></View>)}{error||saved.error?<Text accessibilityRole="alert" className="text-destructive">{error||saved.error}</Text>:null}</View>;
}