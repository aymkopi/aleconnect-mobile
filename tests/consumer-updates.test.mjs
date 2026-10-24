import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeConsumerUpdates, normalizeConsumerUpdateReceipt, createConsumerUpdateId } from '../src/features/reports/consumer-updates-contract.ts'
const uuid = '11111111-1111-4111-8111-111111111111'
test('older and unsupported responses disable the feature safely', () => {
  assert.equal(normalizeConsumerUpdates({}).enabled, false)
  assert.equal(normalizeConsumerUpdates({ version: 2, enabled: true }).enabled, false)
  const page = normalizeConsumerUpdates({ enabled: true, canWrite: true, events: [{ id: uuid, kind: 'staff_reply', text: 'Hello', imageUrls: ['javascript:alert(1)', 'https://example.test/photo'], createdAt: '2026-10-23T00:00:00Z', reviewVersion: 0 }], resolutionCheck: { cycleId: uuid, responseVersion: -1, answer: 'confirmed' } })
  assert.equal(page.events[0].author, 'ALECO'); assert.deepEqual(page.events[0].imageUrls, ['https://example.test/photo']); assert.equal(page.resolutionCheck, null)
})
test('only a receipt for this exact action can confirm delivery', () => {
  const receipt = { mutationId: uuid, eventId: uuid, ticketId: uuid, acceptedAt: '2026-10-23T00:00:00Z', reviewVersion: 1 }
  assert.equal(normalizeConsumerUpdateReceipt(receipt, uuid, uuid).mutationId, uuid)
  assert.throws(() => normalizeConsumerUpdateReceipt({ ...receipt, mutationId: 'other' }, uuid, uuid))
  assert.throws(() => normalizeConsumerUpdateReceipt({ ...receipt, acceptedAt: 'bad' }, uuid, uuid))
})
test('native retry IDs remain UUIDs even without Web Crypto', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
  try { Object.defineProperty(globalThis, 'crypto', { configurable: true, value: undefined }); assert.match(createConsumerUpdateId(), /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/) }
  finally { if (descriptor) Object.defineProperty(globalThis, 'crypto', descriptor) }
})
