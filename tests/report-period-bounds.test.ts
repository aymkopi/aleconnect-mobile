import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchedReportDateBounds, dateRangeWithinBounds } from '../src/features/reports/browse-filter.ts';
test('range bounds use only valid fetched submissions through Manila today', () => {
  const bounds = fetchedReportDateBounds([{createdAt:'2026-10-09T16:30:00Z'},{createdAt:'2026-09-02T15:10:00Z'},{createdAt:'invalid'},{createdAt:'2027-01-01T00:00:00Z'}],new Date('2026-10-12T00:00:00Z'));
  assert.deepEqual(bounds,{start:'2026-09-02',end:'2026-10-12'});
  assert.equal(dateRangeWithinBounds('2026-09-02','2026-10-12',bounds),true);
  assert.equal(dateRangeWithinBounds('2026-09-01','2026-10-12',bounds),false);
  assert.equal(dateRangeWithinBounds('2026-09-02','2026-10-13',bounds),false);
  assert.equal(dateRangeWithinBounds('2026-10-12','2026-09-02',bounds),false);
  assert.equal(fetchedReportDateBounds([],new Date('2026-10-12T00:00:00Z')),null);
});
