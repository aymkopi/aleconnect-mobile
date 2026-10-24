export type ServiceFeedback={feedbackId:string;ticketId:string;cycleId:string;serviceAccountId:string;rating:number;comment:string;version:number;responseVersion:number;updatedAt:string};
export function validServiceFeedback(rating:unknown,comment:unknown){return Number.isInteger(rating) && Number(rating)>=1 && Number(rating)<=5 && typeof comment==='string' && [...comment].length<=1000;}
export function normalizeServiceFeedback(value:unknown):ServiceFeedback|null{
 if(!value || typeof value!=='object')return null;
 const row=value as Record<string,unknown>;
 if(!validServiceFeedback(row.rating,row.comment) || !['feedbackId','ticketId','cycleId','serviceAccountId','updatedAt'].every(k=>typeof row[k]==='string') || !Number.isSafeInteger(row.version) || Number(row.version)<1 || !Number.isSafeInteger(row.responseVersion) || Number(row.responseVersion)<1 || !Number.isFinite(Date.parse(String(row.updatedAt))))return null;
 return row as ServiceFeedback;
}
export function feedbackReceiptMatches(value:unknown,input:{clientMutationId:string;ticketId:string;cycleId:string;serviceAccountId:string}){
 if(!value || typeof value!=='object')return false;
 const row=value as Record<string,unknown>;
 return row.mutationId===input.clientMutationId && row.ticketId===input.ticketId && row.cycleId===input.cycleId && row.serviceAccountId===input.serviceAccountId && typeof row.feedbackId==='string' && Number.isSafeInteger(row.version) && Number(row.version)>0 && typeof row.acceptedAt==='string' && Number.isFinite(Date.parse(row.acceptedAt));
}
