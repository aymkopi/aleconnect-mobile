import assert from 'node:assert/strict';
import test from 'node:test';
import {createOutageCapture,outageCaptureKey,matchingOutageNotices} from '../src/features/reports/outage-capture.ts';
const scope={principalId:'p',identityUserId:'i',accessRevision:1,serviceAccountId:'a'};
const status={enabled:true as const,version:1 as const,serviceAccountId:'a',asOf:new Date().toISOString(),matchState:'matched' as const,multipleFeeders:false,hasMore:false,canAcknowledge:true,items:Array.from({length:5},(_,i)=>({advisoryId:String(i),occurrenceId:null,state:'active' as const,controlNumber:'AD'+i,title:'Outage',note:'',publicationRevision:1,publishedAt:'2026-10-27T00:00:00Z',scheduledStartAt:null,scheduledEndAt:null,dateOnly:false,occurrenceDate:null,matchBasis:'all' as const}))};
test('one draft capture coalesces in-flight reads and reuses settled matches, failures and no-match',async()=>{
 let count=0;const capture=createOutageCapture(async()=>{count++;return status});const key=outageCaptureKey('draft','session',scope);
 const [a,b]=await Promise.all([capture.read(key,scope),capture.read(key,scope)]);assert.equal(a,b);assert.equal(count,1);
 assert.equal(await capture.read(key,scope),a);assert.equal(count,1);assert.equal(matchingOutageNotices(a).length,3);
 for(const read of [async()=>{throw new Error('offline')},async()=>({...status,matchState:'no_confirmed_match' as const,items:[]})]){let requests=0;const c=createOutageCapture(async()=>{requests++;return read()});await c.read(key,scope);await c.read(key,scope);assert.equal(requests,1)}
});
test('capture boundaries include draft, session and original account access; old work cannot populate another scope',async()=>{
 let resolve!:(v:typeof status)=>void,calls=0;const capture=createOutageCapture(async()=>{calls++;return calls===1?new Promise<typeof status>(done=>resolve=done):{enabled:false}});
 const key=outageCaptureKey('draft','session',scope),old=capture.read(key,scope),next=outageCaptureKey('new','session',scope);await capture.read(next,scope);resolve(status);await old;assert.deepEqual(await capture.read(next,scope),{enabled:false});assert.equal(calls,2);
 for(const [draft,session,s]of [['other','session',scope],['draft','other',scope],['draft','session',{...scope,accessRevision:2}],['draft','session',{...scope,serviceAccountId:'b'}]] as const)assert.notEqual(outageCaptureKey(draft,session,s),key);
});
test('bounded lookup aborts and fails open once; explicit stale-notice review is the only same-draft refresh',async()=>{
 let signal:AbortSignal|undefined,calls=0;const capture=createOutageCapture(async(_scope,s)=>{signal=s;calls++;return new Promise(()=>{})},20),key=outageCaptureKey('draft','session',scope);
 assert.deepEqual(await capture.read(key,scope),{enabled:false});assert.equal(signal?.aborted,true);await capture.read(key,scope);assert.equal(calls,1);
 capture.invalidate(key);await capture.read(key,scope);assert.equal(calls,2);
 assert.deepEqual(matchingOutageNotices({...status,isStale:true}),[]);assert.deepEqual(matchingOutageNotices({...status,items:status.items.map(i=>({...i,state:'planned' as const}))}),[]);
});

test('captured notices stop diverting at the actual end or Philippine day boundary',()=>{
 const item=status.items[0];
 for(const deadline of [{scheduledEndAt:'2026-10-27T08:00:00Z'},{outageDate:'2026-10-27'},{expiresAt:'2026-10-27T08:00:00Z'}]){
 const value={...status,items:[{...item,...deadline}]};assert.equal(matchingOutageNotices(value,Date.parse('2026-10-27T07:59:59Z')).length,1);assert.equal(matchingOutageNotices(value,Date.parse('2026-10-27T16:00:00Z')).length,0);
 }
});
