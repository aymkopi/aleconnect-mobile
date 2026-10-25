import AsyncStorage from '@react-native-async-storage/async-storage';
import {apiRequest} from '@/services/api';
import {consumerIntentToken} from './consumer-intent';
import {feedbackReceiptMatches,normalizeServiceFeedback,validServiceFeedback} from '@/features/reports/service-feedback-contract';
import type {ReminderScope} from './advisory-reminders';
import type {ConsumerIntentScope} from './consumer-intent';
import {appFeedbackPayload,appFeedbackReceiptMatches,normalizeAppFeedbackDraft,type AppFeedbackDraft,type AppFeedbackScope} from '@/features/profile/app-feedback-contract';
export type ServiceFeedbackInput={kind:'service';clientMutationId:string;ticketId:string;cycleId:string;serviceAccountId:string;accessRevision:number;responseVersion:number;expectedVersion:number;rating:number;comment:string};
export type FeedbackDraft={input:ServiceFeedbackInput;pending:boolean};
function key(scope:ReminderScope,ticketId:string){return `consumer_service_feedback_v1:${JSON.stringify([scope.principalId,scope.identityUserId,scope.serviceAccountId,ticketId])}`;}
let writes:Promise<unknown>=Promise.resolve();
function appKey(scope:AppFeedbackScope){return `consumer_app_feedback_v1:${JSON.stringify([scope.principalId,scope.identityUserId])}`;}
export async function saveAppFeedbackDraft(scope:AppFeedbackScope,draft:AppFeedbackDraft){
 if(!normalizeAppFeedbackDraft(draft,scope))throw new Error('The saved app feedback needs review.');
 const next=()=>AsyncStorage.setItem(appKey(scope),JSON.stringify(draft));const result=writes.then(next,next);writes=result.catch(()=>{});return result;
}
export async function readAppFeedbackDraft(scope:AppFeedbackScope):Promise<AppFeedbackDraft|null>{
 await writes;const raw=await AsyncStorage.getItem(appKey(scope));if(!raw)return null;
 const draft=normalizeAppFeedbackDraft(JSON.parse(raw),scope);if(!draft)throw new Error('The saved app feedback could not be read safely. Its local copy is preserved.');return draft;
}
export async function sendAppFeedback(scope:ConsumerIntentScope,draft:AppFeedbackDraft){
 const pending:AppFeedbackDraft={...draft,status:'pending',receipt:null};await saveAppFeedbackDraft(scope,pending);
 const authToken=await consumerIntentToken(scope);
 const receipt=await apiRequest<unknown>('/api/mobile/feedback',{method:'POST',body:JSON.stringify(appFeedbackPayload(pending))},{authToken,idempotent:true,phase:'final submit'});
 if(!appFeedbackReceiptMatches(receipt,pending))throw new Error('The feedback receipt was not confirmed. Your saved submission is kept for retry.');
 const received:AppFeedbackDraft={...pending,status:'received',receipt};await saveAppFeedbackDraft(scope,received);return received;
}
export async function saveServiceFeedbackDraft(scope:ReminderScope,draft:FeedbackDraft){
 if(draft.input.serviceAccountId!==scope.serviceAccountId || !validServiceFeedback(draft.input.rating,draft.input.comment))throw new Error('Choose a rating from 1 to 5 before saving.');
 const next=()=>AsyncStorage.setItem(key(scope,draft.input.ticketId),JSON.stringify(draft));const result=writes.then(next,next);writes=result.catch(()=>{});return result;
}
export async function readServiceFeedbackDraft(scope:ReminderScope,ticketId:string):Promise<FeedbackDraft|null>{
 await writes;const raw=await AsyncStorage.getItem(key(scope,ticketId));if(!raw)return null;const row=JSON.parse(raw) as FeedbackDraft;
 if(!row.input || row.input.ticketId!==ticketId || row.input.serviceAccountId!==scope.serviceAccountId || !validServiceFeedback(row.input.rating,row.input.comment) || typeof row.pending!=='boolean')throw new Error('The saved feedback needs review.');return row;
}
export async function discardServiceFeedbackDraft(scope:ReminderScope,ticketId:string){await writes;await AsyncStorage.removeItem(key(scope,ticketId));}
export async function fetchServiceFeedback(ticketId:string,cycleId:string,serviceAccountId:string){
 const result=await apiRequest<{enabled?:boolean;canWrite?:boolean;serviceFeedback?:unknown}>(`/api/mobile/feedback?${new URLSearchParams({ticketId,cycleId,serviceAccountId})}`);
 const feedback=normalizeServiceFeedback(result.serviceFeedback);
 if(feedback && (feedback.ticketId!==ticketId || feedback.cycleId!==cycleId || feedback.serviceAccountId!==serviceAccountId))throw new Error('Feedback belongs to another report or account.');
 return {enabled:result.enabled===true,canWrite:result.canWrite===true,serviceFeedback:feedback};
}
export async function sendServiceFeedback(scope:ReminderScope,input:ServiceFeedbackInput){
 if(scope.serviceAccountId!==input.serviceAccountId || scope.accessRevision!==input.accessRevision || !validServiceFeedback(input.rating,input.comment))throw new Error('Review the account and saved feedback before sending.');
 await saveServiceFeedbackDraft(scope,{input,pending:true});
 const authToken=await consumerIntentToken(scope);
 const receipt=await apiRequest<unknown>('/api/mobile/feedback',{method:'POST',body:JSON.stringify(input)},{authToken,idempotent:true,phase:'final submit'});
 if(!feedbackReceiptMatches(receipt,input))throw new Error('Feedback receipt was not confirmed. Your saved feedback is kept.');
 await discardServiceFeedbackDraft(scope,input.ticketId);return receipt;
}
