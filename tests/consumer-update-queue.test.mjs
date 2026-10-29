import assert from 'node:assert/strict'
import test from 'node:test'
import { runQueuedConsumerUpdate, consumerUpdateScopeCurrent, parseConsumerWorkQueue, isOutageAcknowledgement } from '../src/services/consumer-update-queue-core.ts'
import * as queue from '../src/services/consumer-update-queue-core.ts'
const id = '11111111-1111-4111-8111-111111111111'
const scope = { principalId: 'identity', identityUserId: 'identity', serviceAccountId: 'account-a', accessRevision: 2, authorizedServiceAccountIds: ['account-a'] }
const item = () => ({ id, principalId: 'identity', identityUserId: 'identity', serviceAccountId: 'account-a', accessRevision: 2, ticketId: id, createdAt: '2026-10-23T00:00:00Z', status: 'queued', attempts: 0, error: null, nextAttemptAt: 0, payload: { kind: 'consumer_update', text: 'Still no power', cycleId: null, responseVersion: 0 }, evidence: [{ id: 'photo', uri: 'file:///prepared.webp', size: 42 }], imageKeys: [], draftIds: [], receipt: null })
const receipt = { mutationId: id, eventId: id, ticketId: id, acceptedAt: '2026-10-23T01:00:00Z', reviewVersion: 1 }

test('retired saved work recovers only a matching owned receipt and retains its original photos',async()=>{
 assert.equal(typeof queue.recoverQueuedConsumerReceipt,'function')
 const saved={...item(),status:'failed'},writes=[]
 const result=await queue.recoverQueuedConsumerReceipt(saved,{...scope,accessRevision:3},{read:async()=>receipt,current:()=>true,persist:async value=>writes.push(value)})
 assert.equal(result.status,'sent');assert.equal(result.accessRevision,2);assert.deepEqual(result.evidence,saved.evidence);assert.deepEqual(result.payload,saved.payload);assert.equal(writes.length,1)
 const absent=await queue.recoverQueuedConsumerReceipt(saved,scope,{read:async()=>null,current:()=>true,persist:async()=>assert.fail('unconfirmed work changed')})
 assert.equal(absent,saved)
 for(const changed of [{principalId:'foreign'},{identityUserId:'foreign'},{authorizedServiceAccountIds:[]}])await assert.rejects(queue.recoverQueuedConsumerReceipt(saved,{...scope,...changed},{read:async()=>assert.fail('foreign receipt requested'),current:()=>true,persist:async()=>assert.fail('foreign work changed')}))
 await assert.rejects(queue.recoverQueuedConsumerReceipt(saved,scope,{read:async()=>({...receipt,mutationId:'wrong'}),current:()=>true,persist:async()=>assert.fail('bad receipt stored')}))
 await assert.rejects(queue.recoverQueuedConsumerReceipt(saved,scope,{read:async()=>undefined,current:()=>true,persist:async()=>assert.fail('unavailable reader treated as a receipt')}))
 await assert.rejects(queue.recoverQueuedConsumerReceipt(saved,scope,{read:async()=>receipt,current:()=>false,persist:async()=>assert.fail('late receipt stored after signout')}))
})
test('save precedes network; receipt precedes deleting evidence', async () => {
  const order = []
  const result = await runQueuedConsumerUpdate(item(), scope, { persist: async value => order.push(value.status), send: async () => { order.push('network'); return receipt }, cleanup: async () => order.push('delete') })
  assert.deepEqual(order, ['sending','network','sent','delete','sent']); assert.equal(result.status, 'sent'); assert.deepEqual(result.evidence, [])
})
test('a failed local save cannot send or delete anything', async () => {
  let io = 0
  await assert.rejects(runQueuedConsumerUpdate(item(), scope, { persist: async () => { throw new Error('disk full') }, send: async () => { io++; return receipt }, cleanup: async () => io++ }))
  assert.equal(io, 0)
})
test('lost response and restart retain the key, prepared upload and evidence', async () => {
  let saved = item(), calls = 0
  const deps = { persist: async value => { saved = structuredClone(value) }, send: async (value, prepared) => { calls++; if (calls === 1) { await prepared({ imageKeys: ['uploaded'], draftIds: [id] }); throw new Error('connection lost after commit') }; assert.deepEqual(value.imageKeys, ['uploaded']); assert.equal(value.id, id); return receipt }, cleanup: async () => {} }
  await runQueuedConsumerUpdate(saved, scope, deps)
  assert.equal(saved.status, 'failed'); assert.equal(saved.evidence.length, 1)
  saved = { ...saved, status: 'sending' }
  await runQueuedConsumerUpdate(saved, scope, deps)
  assert.equal(saved.status, 'sent'); assert.equal(calls, 2)
})
test('another identity, account revocation or changed access cannot retarget saved work', async () => {
  for (const change of [{ principalId: 'other' }, { identityUserId: 'other' }, { accessRevision: 3 }, { authorizedServiceAccountIds: [] }]) {
    let sent = false
    assert.equal(consumerUpdateScopeCurrent(item(), { ...scope, ...change }), false)
    const result = await runQueuedConsumerUpdate(item(), { ...scope, ...change }, { persist: async () => {}, send: async () => { sent = true; return receipt }, cleanup: async () => {} })
    assert.equal(sent, false); assert.equal(result.status, 'needs_attention'); assert.equal(result.evidence.length, 1)
  }
})
test('cycle conflicts preserve the original answer and require review', async () => {
  const value = item(); value.payload = { kind: 'resolution_disputed', text: 'Still unresolved', cycleId: id, responseVersion: 0 }
  const result = await runQueuedConsumerUpdate(value, scope, { persist: async () => {}, send: async () => { throw Object.assign(new Error('Resolution changed'), { status: 409, code: 'STALE_RESOLUTION' }) }, cleanup: async () => assert.fail('must preserve evidence') })
  assert.equal(result.status, 'needs_attention'); assert.equal(result.payload.cycleId, id); assert.equal(result.payload.responseVersion, 0)
})
test('receipt stays accepted if local evidence cleanup fails', async () => {
  let saved
  const result = await runQueuedConsumerUpdate(item(), scope, { persist: async value => { saved = value }, send: async () => receipt, cleanup: async () => { throw new Error('file busy') } })
  assert.equal(result.status, 'sent'); assert.equal(saved.receipt.eventId, id); assert.equal(result.evidence.length, 1)
})

test('outage acknowledgements survive lost receipts with their original scope and never use report receipts', async () => {
  const value = { ...item(), evidence: [], payload: { kind: 'outage_acknowledgement', advisoryId: id, occurrenceId: null, publicationRevision: 2 } }; delete value.ticketId;
  let saved = value, calls = 0;
  const accepted = { mutationId: id, acknowledgementId: id, advisoryId: id, occurrenceId: null, serviceAccountId: 'account-a', acceptedAt: receipt.acceptedAt };
  const work = { persist: async next => { saved = structuredClone(next) }, send: async next => { calls++; assert.equal(next.id, id); if (calls === 1) throw new Error('response lost'); return accepted }, cleanup: async () => assert.fail('no evidence cleanup') };
  await runQueuedConsumerUpdate(saved, scope, work);
  assert.equal(saved.status, 'failed');
  saved = parseConsumerWorkQueue(JSON.stringify([saved]))[0]; assert.equal(isOutageAcknowledgement(saved), true);
  await runQueuedConsumerUpdate(saved, scope, work); assert.equal(saved.status, 'sent'); assert.equal(saved.receipt.acknowledgementId, id);
  const wrong = await runQueuedConsumerUpdate(value, scope, { ...work, send: async () => receipt }); assert.equal(wrong.status, 'failed');
  await runQueuedConsumerUpdate(value, { ...scope, accessRevision: 3 }, { ...work, send: async () => assert.fail('stale intent sent') }); assert.equal(saved.status, 'needs_attention');
  const bad = { ...value, payload: { ...value.payload, occurrenceId: 'bad' } }; assert.throws(() => parseConsumerWorkQueue(JSON.stringify([bad])));
});
test('existing report queue entries remain readable without a new discriminator', () => {
  const old = { ...item(), evidence: [] };
  assert.equal(isOutageAcknowledgement(parseConsumerWorkQueue(JSON.stringify([old]))[0]), false);
});

test('saved acknowledgement cannot claim receipt without a matching durable receipt', () => {
  const value = { ...item(), status: 'sent', evidence: [], payload: { kind: 'outage_acknowledgement', advisoryId: id, occurrenceId: null, publicationRevision: 2 } }; delete value.ticketId;
  assert.throws(() => parseConsumerWorkQueue(JSON.stringify([value])));
  value.receipt = { mutationId: id, acknowledgementId: id, advisoryId: id, occurrenceId: null, serviceAccountId: 'account-a', acceptedAt: receipt.acceptedAt };
  assert.equal(parseConsumerWorkQueue(JSON.stringify([value]))[0].status, 'sent');
  value.receipt.serviceAccountId = 'account-b'; assert.throws(() => parseConsumerWorkQueue(JSON.stringify([value])));
});
