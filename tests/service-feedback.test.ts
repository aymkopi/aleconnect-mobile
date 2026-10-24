import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeServiceFeedback, validServiceFeedback, feedbackReceiptMatches } from '../src/features/reports/service-feedback-contract.ts';
test('optional feedback readers tolerate old responses and reject invalid ratings and mismatched receipts',()=>{
 assert.equal(normalizeServiceFeedback(undefined),null);assert.equal(validServiceFeedback(0,''),false);assert.equal(validServiceFeedback(5,'x'.repeat(1001)),false);assert.equal(validServiceFeedback(4,''),true);
 const expected={clientMutationId:'m',ticketId:'t',cycleId:'c',serviceAccountId:'a'};
 assert.equal(feedbackReceiptMatches({mutationId:'m',ticketId:'t',cycleId:'c',serviceAccountId:'a',feedbackId:'f',version:1,acceptedAt:'2026-10-24T04:00Z'},expected),true);
 assert.equal(feedbackReceiptMatches({mutationId:'other',ticketId:'t',cycleId:'c',serviceAccountId:'a'},expected),false);
});
