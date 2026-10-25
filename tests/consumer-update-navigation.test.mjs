import assert from 'node:assert/strict'
import test from 'node:test'
import { consumerReportUpdatePushFromData, ticketStatusChangedEventFromPushData } from '../src/services/notification-navigation.ts'
test('a public response opens its original service account without projecting status', () => {
  const push = { context: 'ticket', event: 'ticket.consumer_update', version: 1, ticketId: '11111111-1111-4111-8111-111111111111', serviceAccountId: 'account-b', status: 'resolved' }
  assert.deepEqual(consumerReportUpdatePushFromData(push), { ticketId: push.ticketId, serviceAccountId: 'account-b', pathname: '/reports/follow-up' })
  assert.equal(ticketStatusChangedEventFromPushData(push), null)
  assert.equal(consumerReportUpdatePushFromData({ ...push, version: 2 }), null)
  assert.equal(consumerReportUpdatePushFromData({ ...push, serviceAccountId: null }), null)
})
