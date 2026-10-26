import AsyncStorage from '@react-native-async-storage/async-storage';
import {ApiRequestError,getAuthToken,getAuthTokenRevision} from './api';
import {fetchConsumerUpdates,fetchConsumerUpdateEvidence} from './consumer-updates';
import {normalizeConsumerUpdates,type ConsumerUpdatesPage} from '@/features/reports/consumer-updates-contract';
import {newerConsumerUpdates} from '@/features/reports/consumer-updates-cache-policy';
import type {ConsumerUpdateScope,QueuedConsumerUpdate} from './consumer-update-queue-core';
import type {ServiceFeedback} from '@/features/reports/service-feedback-contract';
import {RATE_LIMIT_MESSAGE} from '@/utils/rate-limit';

const memory=new Map<string,ConsumerUpdatesPage>(),flights=new Map<string,Promise<ConsumerUpdatesPage>>(),pulled=new Map<string,number>(),blocked=new Map<string,number>(),listeners=new Set<()=>void>();
const indexKey='consumer_update_heads_v1';
let writes:Promise<unknown>=Promise.resolve();
async function localHead(cacheKey:string){
 if(memory.has(cacheKey))return memory.get(cacheKey)!;
 await writes;const raw=await AsyncStorage.getItem(cacheKey);
 return memory.get(cacheKey)??(raw?normalizeConsumerUpdates(JSON.parse(raw)):null);
}
function key(scope:ConsumerUpdateScope,ticketId:string,accountId:string){
 if(!scope.authorizedServiceAccountIds.includes(accountId))throw new Error('This service account is unavailable.');
 return `${indexKey}:${JSON.stringify([scope.principalId,scope.identityUserId,scope.accessRevision,accountId,ticketId])}`;
}
export function subscribeConsumerUpdateHeads(listener:()=>void){listeners.add(listener);return ()=>{listeners.delete(listener);};}
async function store(cacheKey:string,page:ConsumerUpdatesPage){
 page=newerConsumerUpdates(memory.get(cacheKey)??null,page);
 memory.delete(cacheKey);memory.set(cacheKey,page);
 while(memory.size>20)memory.delete(memory.keys().next().value!);
 listeners.forEach(listener=>listener());
 const work=async()=>{
  const raw=await AsyncStorage.getItem(indexKey),index:unknown=raw?JSON.parse(raw):[];
  const keys=Array.isArray(index)?index.filter((value):value is string=>typeof value==='string'&&value.startsWith(`${indexKey}:`)&&value!==cacheKey):[];
  const next=[cacheKey,...keys];
  await AsyncStorage.setItem(cacheKey,JSON.stringify(page));await AsyncStorage.setItem(indexKey,JSON.stringify(next.slice(0,20)));
  for(const expired of next.slice(20))await AsyncStorage.removeItem(expired);
 };
 const result=writes.then(work,work);writes=result.catch(()=>{});await result;
}
export async function readConsumerUpdateHead(scope:ConsumerUpdateScope,ticketId:string,accountId:string,force=false){
 const cacheKey=key(scope,ticketId,accountId),revision=getAuthTokenRevision(),token=await getAuthToken();
 const current=()=>revision===getAuthTokenRevision();
 if(!token||!current())throw new Error('Sign in to view follow-ups.');
 if(flights.has(cacheKey))return flights.get(cacheKey)!;
 const work=async()=>{
  if(!force){
   if(memory.has(cacheKey))return memory.get(cacheKey)!;
   const raw=await AsyncStorage.getItem(cacheKey);
   if(!current())throw new Error('Your sign-in changed.');
   if(raw){const page=normalizeConsumerUpdates(JSON.parse(raw));memory.set(cacheKey,newerConsumerUpdates(memory.get(cacheKey)??null,page));return memory.get(cacheKey)!;}
  }
  const now=Date.now();
  if((blocked.get(cacheKey)??0)>now||force&&now-(pulled.get(cacheKey)??0)<10_000)throw new ApiRequestError(RATE_LIMIT_MESSAGE,429,undefined,'metadata',false,'LOCAL_REFRESH_RATE_LIMITED');
  pulled.set(cacheKey,now);
  try{
   const incoming=await fetchConsumerUpdates(ticketId,accountId);
   if(!current()||await getAuthToken()!==token)throw new Error('Your sign-in changed.');
   const page=newerConsumerUpdates(memory.get(cacheKey)??null,incoming);await store(cacheKey,page);return memory.get(cacheKey)??page;
  }catch(error){if(error instanceof ApiRequestError&&error.status===429)blocked.set(cacheKey,Date.now()+Math.max(10,error.retryAfterSeconds??60)*1000);throw error;}
 };
 const flight=work().finally(()=>flights.delete(cacheKey));flights.set(cacheKey,flight);return flight;
}
export function peekConsumerUpdateHead(scope:ConsumerUpdateScope,ticketId:string,accountId:string){return memory.get(key(scope,ticketId,accountId))??null;}
export async function cacheConsumerUpdateReceipt(item:QueuedConsumerUpdate){
 const cacheKey=key({...item,authorizedServiceAccountIds:[item.serviceAccountId]},item.ticketId,item.serviceAccountId),local=await localHead(cacheKey),page=memory.get(cacheKey)??local,receipt=item.receipt;
 if(!page||!receipt?.conversation||page.conversation?.cycleId!==receipt.conversation.cycleId)return;
 const incoming={...page,conversation:receipt.conversation,resolutionCheck:receipt.resolutionCheck??null};
 if(newerConsumerUpdates(page,incoming)===page)return;
 if(item.payload.kind!=='resolution_confirmed'&&!incoming.events.some(event=>event.id===receipt.eventId))incoming.events=[...incoming.events,{id:receipt.eventId,kind:item.payload.kind,text:item.payload.text,imageUrls:receipt.imageUrls??[],author:'Consumer',createdAt:receipt.acceptedAt,reviewState:'pending',reviewVersion:receipt.reviewVersion}];
 incoming.canRate=incoming.serviceFeedbackCanWrite===true&&incoming.resolutionCheck?.answer==='confirmed'&&!incoming.serviceFeedback;
 await store(cacheKey,incoming);
}
export async function cacheServiceFeedback(scope:ConsumerUpdateScope,ticketId:string,accountId:string,feedback:ServiceFeedback){
 const cacheKey=key(scope,ticketId,accountId),local=await localHead(cacheKey),page=memory.get(cacheKey)??local;
 if(page?.conversation?.cycleId===feedback.cycleId)await store(cacheKey,{...page,serviceFeedback:feedback,canRate:false});
}
export async function renewConsumerUpdateEvidence(scope:ConsumerUpdateScope,ticketId:string,accountId:string,eventId:string){
 const cacheKey=key(scope,ticketId,accountId),revision=getAuthTokenRevision(),token=await getAuthToken();
 if(!token||revision!==getAuthTokenRevision())throw new Error('Sign in to open this photo.');
 const urls=await fetchConsumerUpdateEvidence(ticketId,accountId,eventId);
 if(revision!==getAuthTokenRevision()||await getAuthToken()!==token)throw new Error('Your sign-in changed.');
 const local=await localHead(cacheKey),page=memory.get(cacheKey)??local;
 if(page)await store(cacheKey,{...page,events:page.events.map(event=>event.id===eventId?{...event,imageUrls:urls}:event)});
 return urls;
}
