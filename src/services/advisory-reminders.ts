import AsyncStorage from '@react-native-async-storage/async-storage';
import {apiRequest} from '@/services/api';
import {consumerIntentToken} from './consumer-intent';
export type ReminderScope={principalId:string;identityUserId:string;serviceAccountId:string;accessRevision:number};
export type ReminderChoice={clientMutationId:string;serviceAccountId:string;accessRevision:number;advisoryId:string;occurrenceId:string;enabled:boolean;leadMinutes:60};
export type ReminderPage={enabled:boolean;canWrite:boolean;subscriptions:{occurrenceId:string;enabled:boolean}[];eligibleOccurrenceIds:string[]};
function key(scope:ReminderScope,advisoryId:string,occurrenceId:string){return `advisory_reminder_choice_v1:${JSON.stringify([scope.principalId,scope.identityUserId,scope.serviceAccountId,advisoryId,occurrenceId])}`;}
export async function fetchAdvisoryReminders(advisoryId:string,serviceAccountId:string):Promise<ReminderPage>{
 const result=await apiRequest<Partial<ReminderPage>>(`/api/mobile/advisory-reminders?${new URLSearchParams({advisoryId,serviceAccountId})}`);
 return {enabled:result.enabled===true,canWrite:result.canWrite===true,subscriptions:Array.isArray(result.subscriptions)?result.subscriptions.filter(r=>typeof r.occurrenceId==='string' && typeof r.enabled==='boolean'):[],eligibleOccurrenceIds:Array.isArray(result.eligibleOccurrenceIds)?result.eligibleOccurrenceIds.filter((v):v is string=>typeof v==='string'):[]};
}
export async function readReminderChoice(scope:ReminderScope,advisoryId:string,occurrenceId:string):Promise<ReminderChoice|null>{
 const raw=await AsyncStorage.getItem(key(scope,advisoryId,occurrenceId));if(!raw)return null;
 const row=JSON.parse(raw) as ReminderChoice;
 if(row.serviceAccountId!==scope.serviceAccountId || row.advisoryId!==advisoryId || row.occurrenceId!==occurrenceId || typeof row.clientMutationId!=='string' || typeof row.enabled!=='boolean' || row.leadMinutes!==60 || !Number.isSafeInteger(row.accessRevision))throw new Error('The saved reminder choice needs review.');
 return row;
}
export async function saveReminderChoice(scope:ReminderScope,input:ReminderChoice){await AsyncStorage.setItem(key(scope,input.advisoryId,input.occurrenceId),JSON.stringify(input));}
export async function discardReminderChoice(scope:ReminderScope,advisoryId:string,occurrenceId:string){await AsyncStorage.removeItem(key(scope,advisoryId,occurrenceId));}
export async function sendAdvisoryReminder(scope:ReminderScope,input:ReminderChoice){
 if(scope.serviceAccountId!==input.serviceAccountId || scope.accessRevision!==input.accessRevision)throw new Error('Account access changed. Review the saved reminder choice.');
 await saveReminderChoice(scope,input);
 const authToken=await consumerIntentToken(scope);
 const receipt=await apiRequest<Record<string,unknown>>('/api/mobile/advisory-reminders',{method:'POST',body:JSON.stringify(input)},{authToken,idempotent:true,phase:'final submit'});
 if(receipt.mutationId!==input.clientMutationId || receipt.advisoryId!==input.advisoryId || receipt.occurrenceId!==input.occurrenceId || receipt.serviceAccountId!==input.serviceAccountId || receipt.enabled!==input.enabled || typeof receipt.acceptedAt!=='string' || !Number.isFinite(Date.parse(receipt.acceptedAt)))throw new Error('Reminder receipt was not confirmed. Retry the saved choice.');
 await discardReminderChoice(scope,input.advisoryId,input.occurrenceId);
 return receipt;
}
