import assert from 'node:assert/strict';
import test from 'node:test';
import {normalizeConsumerUpdates} from '../src/features/reports/consumer-updates-contract.ts';
import {newerConsumerUpdates} from '../src/features/reports/consumer-updates-cache-policy.ts';
import {feedbackReceiptMatches,normalizeServiceFeedback} from '../src/features/reports/service-feedback-contract.ts';

const id='11111111-1111-4111-8111-111111111111';
const policy={version:1,closesAt:'2026-10-30T12:00:00Z',cycleId:id,canRate:true};
test('closure policy makes old follow-up actions read-only and keeps optional rating eligibility',()=>{
  const page=normalizeConsumerUpdates({enabled:true,canWrite:true,canRate:true,closurePolicy:policy});
  assert.equal(page.closurePolicy?.version,1);
  assert.equal(page.canWrite,false);
  assert.equal(page.canRate,true);
  const unsupported=normalizeConsumerUpdates({enabled:true,canWrite:true,canRate:true,closurePolicy:{...policy,version:2}});
  assert.equal(unsupported.canWrite,false);
  assert.equal(unsupported.canRate,false);
});
test('late legacy cache reads cannot restore retired actions or replace a final rating',()=>{
  const current=normalizeConsumerUpdates({enabled:true,closurePolicy:policy});
  const legacy=normalizeConsumerUpdates({enabled:true,canWrite:true});
  assert.equal(newerConsumerUpdates(current,legacy),current);
});
test('new rating receipt must explicitly confirm Closed before reporting success',()=>{
  const input={clientMutationId:id,ticketId:id,cycleId:id,serviceAccountId:'account-a',closurePolicyVersion:1};
  const receipt={mutationId:id,ticketId:id,cycleId:id,serviceAccountId:'account-a',feedbackId:id,version:1,acceptedAt:'2026-10-29T12:00:00Z'};
  assert.equal(feedbackReceiptMatches(receipt,input),false);
  assert.equal(feedbackReceiptMatches({...receipt,status:'closed'},input),true);
  assert.equal(feedbackReceiptMatches(receipt,{...input,closurePolicyVersion:undefined}),true);
});
test('a new service score can omit the old positive resolution response',()=>{
  const score={feedbackId:id,ticketId:id,cycleId:id,serviceAccountId:'account-a',rating:3,comment:'',version:1,responseVersion:0,closurePolicyVersion:1,updatedAt:'2026-10-29T12:00:00Z'};
  assert.equal(normalizeServiceFeedback(score)?.rating,3);
  assert.equal(normalizeServiceFeedback({...score,closurePolicyVersion:undefined}),null);
});
