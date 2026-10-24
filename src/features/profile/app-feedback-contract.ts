export type AppFeedbackScope={principalId:string;identityUserId:string};
export type AppFeedbackReceipt={mutationId:string;feedbackId:string;kind:'app';identityUserId:string;acceptedAt:string};
export type AppFeedbackDraft=AppFeedbackScope & {version:1;clientMutationId:string;category:'bug'|'suggestion';text:string;appVersion:string;platform:'android'|'ios'|'web';status:'draft'|'pending'|'received';receipt:AppFeedbackReceipt|null};
function record(value:unknown):value is Record<string,unknown>{return Boolean(value)&&typeof value==='object'&&!Array.isArray(value);}
function uuid(value:unknown):value is string{return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);}
export function appFeedbackTextError(text:string){return !text.trim()||[...text.trim()].length>2000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(text)?'Enter 1–2,000 characters without control characters.':null;}
export function appFeedbackPayload(draft:Pick<AppFeedbackDraft,'clientMutationId'|'category'|'text'|'appVersion'|'platform'>){return {kind:'app' as const,clientMutationId:draft.clientMutationId,category:draft.category,text:draft.text.trim(),appVersion:draft.appVersion,platform:draft.platform};}
export function appFeedbackReceiptMatches(value:unknown,draft:Pick<AppFeedbackDraft,'clientMutationId'|'identityUserId'>):value is AppFeedbackReceipt{
 return record(value)&&value.kind==='app'&&value.mutationId===draft.clientMutationId&&uuid(value.feedbackId)&&value.identityUserId===draft.identityUserId&&typeof value.acceptedAt==='string'&&Number.isFinite(Date.parse(value.acceptedAt));
}
export function normalizeAppFeedbackDraft(value:unknown,scope:AppFeedbackScope):AppFeedbackDraft|null{
 if(!record(value)||value.version!==1||value.principalId!==scope.principalId||value.identityUserId!==scope.identityUserId||!uuid(value.clientMutationId)||!['bug','suggestion'].includes(String(value.category))||typeof value.text!=='string'||[...value.text.trim()].length>2000||typeof value.appVersion!=='string'||!value.appVersion.trim()||value.appVersion.length>80||!['android','ios','web'].includes(String(value.platform))||!['draft','pending','received'].includes(String(value.status)))return null;
 if(value.status!=='draft'&&appFeedbackTextError(value.text))return null;
 if(value.status==='received'&&!appFeedbackReceiptMatches(value.receipt,{clientMutationId:value.clientMutationId,identityUserId:scope.identityUserId}))return null;
 if(value.status!=='received'&&value.receipt!==null)return null;
 return value as AppFeedbackDraft;
}
