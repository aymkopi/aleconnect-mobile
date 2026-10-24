import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeReminderOccurrences, reminderAvailability } from '../src/features/advisories/reminder-contract.ts';
test('structured schedules keep multiple, date-only, and cancelled entries without invented legacy dates',()=>{
 const rows=normalizeReminderOccurrences([{id:'a',date:'2026-10-24',kind:'interval',startTime:'13:00',endDate:'2026-10-24',endTime:'15:00',status:'scheduled'},{id:'b',date:'2026-10-25',kind:'date_only',status:'scheduled'},{id:'c',date:'2026-10-26',kind:'interval',startTime:'13:00',status:'cancelled'}]);
 assert.equal(rows.length,3);assert.equal(reminderAvailability(rows[0],Date.parse('2026-10-24T03:59:59.999Z')),'available');assert.equal(reminderAvailability(rows[0],Date.parse('2026-10-24T04:00Z')),'too_late');assert.equal(reminderAvailability(rows[1],0),'date_only');assert.equal(reminderAvailability(rows[2],0),'cancelled');assert.deepEqual(normalizeReminderOccurrences(undefined),[]);
});
