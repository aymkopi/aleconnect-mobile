import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import * as transport from '../src/utils/report-transport.ts';
import {presentQueuedReport,fixtureSavedReport} from '../src/features/reports/queue-presentation.ts';
import * as coordination from '../src/utils/async-coordination.ts';
import * as access from '../src/services/report-queue-access.ts';
import * as retry from '../src/utils/http-retry.ts';
import * as rateLimit from '../src/utils/rate-limit.ts';

test('a known rejected submission can be discarded; unknown legacy attempts remain protected',()=>{
 const row={...fixtureSavedReport,status:'failed',attempts:2,lastErrorPhase:'final submit',lastErrorStatus:400,lastError:'Invalid report',receiptUncertain:false};
 assert.equal(presentQueuedReport(row,false).canDiscard,true);
 assert.equal(presentQueuedReport({...row,receiptUncertain:true},false).canDiscard,false);
 assert.equal(presentQueuedReport({...row,receiptUncertain:undefined},false).canDiscard,false);
 assert.equal(presentQueuedReport(row,true).canDiscard,false);
});

test('saved-report causes are concise and never expose raw server or local details',()=>{
 assert.equal(transport.reportFailureMessage({status:500,message:'SQL host=private user=private'}),'Server error. Try again later.');
 assert.equal(transport.reportFailureMessage({status:429}),'Too many requests. Try again later.');
 assert.equal(transport.reportFailureMessage({status:401}),'Sign in again to send your report.');
 assert.equal(transport.reportFailureMessage({status:400,message:'Report location is required'}),'Choose a report location in Albay.');
 assert.equal(transport.reportFailureMessage({message:'Read failed at file:///private/photo.webp'}),'Couldn’t send your report. Try again.');
});

async function load(path,mocks){const source=await readFile(new URL('../'+path,import.meta.url),'utf8'),exports={};new Function('require','exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText)(id=>{assert.ok(id in mocks,'Missing mock '+id);return mocks[id]},exports);return exports;}
class Failure extends Error{constructor(status,retryable=false,phase='final submit'){super('Private implementation detail');Object.assign(this,{status,retryable,phase,requestId:'safe-reference'});}}
async function queueFixture(data=new Map(),submit=async()=>({ticketId:'ticket',ticketNumber:'TK-1'})){
 const calls={submitted:[],deleted:[],metadataError:null};
 const api={ApiRequestError:Failure,getAuthToken:async()=>'token',apiRequest:async()=>{if(calls.metadataError)throw calls.metadataError;return{}}};
 const queue=await load('src/services/report-queue.ts',{
  '@react-native-async-storage/async-storage':{getItem:async key=>data.get(key)??null,setItem:async(key,value)=>data.set(key,value)},
  '@react-native-community/netinfo':{fetch:async()=>({isConnected:true,isInternetReachable:true})},'@/services/api':api,
  '@/features/accounts/contract':{normalizeConsumerIdentity:v=>v,normalizeLinkedAccounts:v=>v,readConsistentConsumerAccountSnapshot:async({readIdentity})=>{await readIdentity();return{identityUserId:'identity',authorizedServiceAccountIds:['account'],accessRevision:1}}},
  '@/services/report-sync-events':{requestReportRevalidation:()=>{}},'@/services/report-queue-access':access,
  '@/services/reports':{clearReportListCache:async()=>{},createEvidenceUploads:async()=>({draftId:'draft',uploads:[{key:'photo-key',uploadUrl:'https://fixture.invalid/photo'}]}),submitComplaint:async input=>{calls.submitted.push(input);return submit(input)},uploadEvidenceToR2:async()=>{}},
  '@/utils/async-coordination':coordination,'@/utils/evidence-image-processing':{readEvidencePhoto:async()=>new ArrayBuffer(1),deleteReportEvidence:id=>calls.deleted.push(id)},'@/utils/report-transport':transport,
 });
 const input={...fixtureSavedReport,id:'saved',idempotencyKey:'stable-original-key',userId:'identity',identityUserId:'identity',serviceAccountId:'account',accessRevision:1,evidence:[{id:'photo',uri:'private://photo',size:1}]};
 return{queue,calls,data,input};
}
test('a rejected final submit preserves evidence and allows an intentional discard',async()=>{
 const f=await queueFixture(undefined,async()=>{throw new Failure(400)});await f.queue.enqueueReport(f.input);await f.queue.syncReportQueue('identity');const[row]=await f.queue.listReportQueue('identity');
 assert.equal(row.receiptUncertain,false);assert.equal(row.lastErrorStatus,400);assert.ok(!row.lastError.includes('Private'));assert.deepEqual(f.calls.deleted,[]);await f.queue.removeQueuedReport('saved');assert.deepEqual(f.calls.deleted,['saved']);
});
test('uncertain receipt protection survives a retry failing earlier and a process restart',async()=>{
 const f=await queueFixture(undefined,async()=>{throw new Failure(undefined,true)});await f.queue.enqueueReport(f.input);await f.queue.syncReportQueue('identity');assert.equal((await f.queue.listReportQueue('identity'))[0].receiptUncertain,true);
 f.calls.metadataError=new Failure(400,false,'metadata');await f.queue.syncReportQueue('identity');const restarted=await queueFixture(f.data);const[row]=await restarted.queue.listReportQueue('identity');assert.equal(row.receiptUncertain,true);await assert.rejects(restarted.queue.removeQueuedReport('saved'));assert.equal((await restarted.queue.listReportQueue('identity')).length,1);assert.deepEqual(f.calls.deleted,[]);
});
test('a successful retry uses the original submission key and only then releases local evidence',async()=>{
 let fail=true;const f=await queueFixture(undefined,async()=>{if(fail)throw new Failure(400);return{ticketId:'ticket',ticketNumber:'TK-1'}});await f.queue.enqueueReport(f.input);await f.queue.syncReportQueue('identity');fail=false;await f.queue.retryQueuedReport('saved');await f.queue.syncReportQueue('identity');assert.deepEqual(f.calls.submitted.map(p=>p.idempotencyKey),['stable-original-key','stable-original-key']);assert.deepEqual(await f.queue.listReportQueue('identity'),[]);assert.deepEqual(f.calls.deleted,['saved']);
});
test('discard cannot race an active upload or final submission',async()=>{
 let release;const pause=new Promise(done=>release=done),f=await queueFixture(undefined,async()=>{await pause;return{ticketId:'ticket',ticketNumber:'TK-1'}});await f.queue.enqueueReport(f.input);const pending=f.queue.syncReportQueue('identity');while(!f.calls.submitted.length)await new Promise(done=>setImmediate(done));await assert.rejects(f.queue.removeQueuedReport('saved'));assert.deepEqual(f.calls.deleted,[]);release();await pending;
});
test('HTTP retries retain uncertainty when an earlier mutation response was lost or failed',async t=>{
 const api=await load('src/services/api.ts',{'@react-native-async-storage/async-storage':{getItem:async()=>null},'expo-secure-store':{},'react-native':{Platform:{OS:'web'}},'@/constants':{aleconnectApiBaseUrl:'https://fixture.invalid'},'@/utils/rate-limit':rateLimit,'@/utils/http-retry':retry,'@/utils/report-transport':transport});
 const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);let attempts=0;globalThis.fetch=async()=>new Response(JSON.stringify({error:'Rejected'}),{status:++attempts===1?500:400});
 await assert.rejects(api.apiRequest('/complaints',{method:'POST',body:'{}'},{idempotent:true}),error=>error.status===400&&error.outcomeUnknown===true);assert.equal(attempts,2);
});
test('a success response without a report receipt remains unconfirmed',async()=>{
 const source=await readFile(new URL('../src/services/reports.ts',import.meta.url),'utf8'),ast=ts.createSourceFile('reports.ts',source,ts.ScriptTarget.Latest,true),node=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='submitComplaint');assert.ok(node);
 const compiled=ts.transpileModule(node.getText(ast).replace(/^export /,''),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 let response={};const submit=new Function('apiRequest','ApiRequestError','assertServiceRequestReceipt','let complaintReportsMemoryCache;\n'+compiled+'\nreturn submitComplaint;')(async()=>response,class extends Error{constructor(message,status){super(message);this.status=status}},()=>{});
 await assert.rejects(submit({}),error=>error.status===409);response={ticketId:'ticket',ticketNumber:'TK-1'};assert.deepEqual(await submit({}),response);
});

test('an already cancelled request never starts another transport attempt',async t=>{
 const api=await load('src/services/api.ts',{'@react-native-async-storage/async-storage':{getItem:async()=>null},'expo-secure-store':{},'react-native':{Platform:{OS:'web'}},'@/constants':{aleconnectApiBaseUrl:'https://fixture.invalid'},'@/utils/rate-limit':rateLimit,'@/utils/http-retry':retry,'@/utils/report-transport':transport});
 const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);let calls=0;globalThis.fetch=async()=>{calls++;return new Response('{}')};
 const controller=new AbortController();controller.abort();
 await assert.rejects(api.apiRequest('/service-status',{signal:controller.signal}),/cancelled/);assert.equal(calls,0);
});
