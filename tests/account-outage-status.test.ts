import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeServiceStatus, normalizeOutageReceipt, serviceStatusScopeKey } from '../src/features/home/service-status-contract.ts';
const id = '11111111-1111-4111-8111-111111111111';
const item = { advisoryId: id, occurrenceId: null, controlNumber: 'AD261023-0001', title: 'Official outage', note: 'Work in progress', state: 'active', matchBasis: 'area_mapping', publicationRevision: 2, publishedAt: '2026-10-23T00:00:00Z', scheduledStartAt: null, scheduledEndAt: null, dateOnly: false, occurrenceDate: null };
const dto = { enabled: true, canAcknowledge: true, version: 1, serviceAccountId: 'a', asOf: '2026-10-23T00:00:00Z', matchState: 'matched', multipleFeeders: true, hasMore: false, items: [item] };
test('old capability payload stays unavailable; matched notices retain source identity and uncertainty', () => {
  assert.deepEqual(normalizeServiceStatus({ enabled: false }, 'a'), { enabled: false });
  const value = normalizeServiceStatus(dto, 'a');
  assert.equal(value.enabled && value.items[0].publicationRevision, 2);
  assert.equal(value.enabled && value.multipleFeeders, true);
  for (const patch of [{ serviceAccountId: 'b' }, { version: 2 }, { items: [] }, { matchState: 'invented' }, { items: [{ ...item, advisoryId: 'bad' }] }]) assert.throws(() => normalizeServiceStatus({ ...dto, ...patch }, 'a'));
  for (const matchState of ['coverage_unknown', 'no_confirmed_match']) assert.equal(normalizeServiceStatus({ ...dto, matchState, items: [] }, 'a').enabled, true);
});
test('cache keys include principal, identity, access revision and selected account', () => {
  const scope = { principalId: 'p', identityUserId: 'i', accessRevision: 3, serviceAccountId: 'a' };
  for (const patch of [{ principalId: 'q' }, { identityUserId: 'j' }, { accessRevision: 4 }, { serviceAccountId: 'b' }]) assert.notEqual(serviceStatusScopeKey(scope), serviceStatusScopeKey({ ...scope, ...patch }));
});
test('acknowledgement receipts must match the original mutation, notice, occurrence and account', () => {
  const expected = { id, serviceAccountId: 'a', payload: { advisoryId: id, occurrenceId: null } };
  const receipt = { mutationId: id, acknowledgementId: id, advisoryId: id, occurrenceId: null, serviceAccountId: 'a', acceptedAt: '2026-10-23T00:00:00Z' };
  assert.equal(normalizeOutageReceipt(receipt, expected).acknowledgementId, id);
  for (const patch of [{ mutationId: 'bad' }, { serviceAccountId: 'b' }, { occurrenceId: id }, { acceptedAt: 'bad' }]) assert.throws(() => normalizeOutageReceipt({ ...receipt, ...patch }, expected));
});

test('optional outage deadlines are validated while old payloads remain readable',()=>{
 for(const patch of [{outageDate:'invalid'},{outageDate:'2026-02-31'},{expiresAt:'tomorrow'}]) assert.throws(()=>normalizeServiceStatus({...dto,items:[{...item,...patch}]},'a'));
 assert.equal(normalizeServiceStatus({...dto,items:[{...item,outageDate:'2026-10-27',expiresAt:null}]},'a').enabled,true);
});
