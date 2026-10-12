import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { singleCategoryTypeId } from '../src/features/reports/creation-state.ts';
const read=(path: string)=>readFile(new URL('../'+path,import.meta.url),'utf8');
test('category transition automatically chooses exactly one type and prompts for multiple or absent types',()=>{
 const types=[{id:'A1',categoryId:'A'},{id:'B1',categoryId:'B'},{id:'B2',categoryId:'B'}];
 assert.equal(singleCategoryTypeId(types,'A'),'A1');
 assert.equal(singleCategoryTypeId(types,'B'),'');
 assert.equal(singleCategoryTypeId(types,'unknown'),'');
});
test('report account field stays mounted while the selected profile is loading',async()=>{
 const source=await read('src/features/reports/new-report-screen.tsx');
 assert.ok(!source.includes('{accountReady ? ('));
});
test('map pin address stays visible during geocoding and confirmation remains gated',async()=>{
 const source=await read('src/features/maps/report-location-picker.tsx');
 assert.ok(!source.includes('{resolving || locating ? ('));
 assert.ok(source.includes('{address}'));
 assert.ok(source.includes('disabled={!resolved || resolving || locating || Boolean(error)}'));
});
test('reports main uses the existing cached first-page shape and subscribes to submission changes',async()=>{
 const source=await read('src/features/reports/main-screen.tsx');
 assert.ok(source.includes('limit: 25'));
 assert.ok(source.includes('subscribeReportRevalidationRequested'));
 assert.ok(source.includes('revalidate: force'));
});

test('both Reports account selectors show registered names and complete account numbers',async()=>{
 const source=await read('src/features/reports/main-screen.tsx');
 assert.ok(!source.includes('accountNumber.slice(-4)'));
 assert.equal(source.split("label={`${a.registeredName} · ${a.accountNumber || \"Number unavailable\"}`}").length - 1,2);
});
