import assert from 'node:assert/strict';
import test from 'node:test';
import { appFeedbackPayload, appFeedbackTextError, normalizeAppFeedbackDraft, appFeedbackReceiptMatches } from '../src/features/profile/app-feedback-contract.ts';
const scope={principalId:'principal',identityUserId:'identity'};
const draft={version:1, ...scope, clientMutationId:'11111111-1111-4111-8111-111111111111',category:'bug',text:'The app screen did not open.',appVersion:'1.5.0-alpha.1',platform:'android',status:'draft',receipt:null} as const;
test('app feedback sends only explicit text, category, version and platform metadata',()=>{
 assert.deepEqual(appFeedbackPayload(draft),{kind:'app',clientMutationId:draft.clientMutationId,category:'bug',text:draft.text,appVersion:draft.appVersion,platform:'android'});
 assert.equal(appFeedbackTextError('A suggestion'),null);
 for(const text of ['', '  ', 'x'.repeat(2001), 'a\u0000b'])assert.ok(appFeedbackTextError(text));
});
test('saved drafts remain owner scoped and sending/uncertain work stays pending across restart',()=>{
 assert.equal(normalizeAppFeedbackDraft(draft,scope)?.status,'draft');
 assert.equal(normalizeAppFeedbackDraft({...draft,status:'pending'},scope)?.status,'pending');
 for(const patch of [{principalId:'foreign'},{identityUserId:'foreign'},{clientMutationId:'bad'},{status:'received'},{text:'x'.repeat(2001)}])assert.equal(normalizeAppFeedbackDraft({...draft,...patch},scope),null);
});
test('received requires the original mutation and identity receipt; account switches do not retarget the author',()=>{
 const receipt={mutationId:draft.clientMutationId,feedbackId:'22222222-2222-4222-8222-222222222222',kind:'app',identityUserId:'identity',acceptedAt:'2026-10-24T02:00:00Z'};
 assert.equal(appFeedbackReceiptMatches(receipt,draft),true);
 for(const patch of [{mutationId:'bad'},{identityUserId:'foreign'},{kind:'service'},{acceptedAt:'bad'}])assert.equal(appFeedbackReceiptMatches({...receipt,...patch},draft),false);
 assert.equal(normalizeAppFeedbackDraft({...draft,status:'received',receipt},scope)?.status,'received');
});
