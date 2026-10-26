import assert from 'node:assert/strict';
import test from 'node:test';
import {normalizeConsumerUpdates,normalizeConsumerUpdateReceipt} from '../src/features/reports/consumer-updates-contract.ts';
import {newerConsumerUpdates} from '../src/features/reports/consumer-updates-cache-policy.ts';
const id='11111111-1111-4111-8111-111111111111';
const page=revision=>normalizeConsumerUpdates({enabled:true,canWrite:true,conversation:{version:1,cycleId:id,revision,state:'awaiting_staff',consumerUpdateId:id,replyTo:null,canSubmitUpdate:false,canConfirmResolution:true}});
test('turn protocol fails closed, keeps receipt context and never downgrades a newer revision',()=>{
 assert.equal(normalizeConsumerUpdates({enabled:true,conversation:{version:2}}).conversation,null);
 const current=page(3);assert.equal(newerConsumerUpdates(current,page(1)),current);
 assert.equal(newerConsumerUpdates(current,page(4)).conversation.revision,4);
 const receipt=normalizeConsumerUpdateReceipt({mutationId:id,ticketId:id,eventId:id,acceptedAt:'2026-10-26T01:00Z',reviewVersion:1,conversation:current.conversation},id,id);
 assert.equal(receipt.conversation.revision,3);
});
