import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import * as contract from '../src/features/reports/consumer-updates-contract.ts';
import * as policy from '../src/features/reports/consumer-updates-cache-policy.ts';
import * as rate from '../src/utils/rate-limit.ts';
const id='11111111-1111-4111-8111-111111111111',scope={principalId:'principal',identityUserId:'identity',accessRevision:2,authorizedServiceAccountIds:['account']};
const head=revision=>contract.normalizeConsumerUpdates({enabled:true,canWrite:true,serviceFeedbackEnabled:true,serviceFeedbackCanWrite:true,resolutionCheck:{cycleId:id,responseVersion:1,answer:'still_exists',reviewState:'pending'},conversation:{version:1,cycleId:id,revision,state:'awaiting_consumer',consumerUpdateId:id,replyTo:id,canSubmitUpdate:true,canConfirmResolution:true}});
async function harness(storage=new Map()){
 let calls=0,now=100000,revision=0,pending=null,snapshot=head(1);
 class ApiRequestError extends Error{constructor(message,status,...rest){super(message);this.status=status;this.retryAfterSeconds=rest.at(-1);}}
 const modules={
  '@react-native-async-storage/async-storage':{__esModule:true,default:{getItem:async key=>storage.get(key)??null,setItem:async(key,value)=>{storage.set(key,value);},removeItem:async key=>storage.delete(key)}},
  './api':{ApiRequestError,getAuthToken:async()=>'token',getAuthTokenRevision:()=>revision},
  './consumer-updates':{fetchConsumerUpdates:async()=>{calls++;const response=snapshot;if(pending)await pending;return response;}},
  '@/features/reports/consumer-updates-contract':contract,'@/features/reports/consumer-updates-cache-policy':policy,'@/utils/rate-limit':rate,
 };
 const source=await readFile(new URL('../src/services/consumer-updates-cache.ts',import.meta.url),'utf8'),module={exports:{}};
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
 class Clock extends Date{static now(){return now;}}
 new Function('require','module','exports','Date',code)(key=>{assert.ok(key in modules,'Unexpected '+key);return modules[key];},module,module.exports,Clock);
 return {api:module.exports,storage,get calls(){return calls;},time(value){now=value;},pause(value){pending=value;},value(value){snapshot=value;},invalidate(){revision++;}};
}
test('first cache miss reads once; revisits and restart reuse scope; pull is single flight and cooled down',async()=>{
 const h=await harness();let release;h.pause(new Promise(resolve=>{release=resolve;}));
 const reads=[h.api.readConsumerUpdateHead(scope,id,'account'),h.api.readConsumerUpdateHead(scope,id,'account')];await new Promise(resolve=>setImmediate(resolve));assert.equal(h.calls,1);release();await Promise.all(reads);
 await h.api.readConsumerUpdateHead(scope,id,'account');assert.equal(h.calls,1);
 await assert.rejects(h.api.readConsumerUpdateHead(scope,id,'account',true),error=>error.message===rate.RATE_LIMIT_MESSAGE);
 h.time(110001);await h.api.readConsumerUpdateHead(scope,id,'account',true);assert.equal(h.calls,2);
 const restarted=await harness(h.storage);await restarted.api.readConsumerUpdateHead(scope,id,'account');assert.equal(restarted.calls,0);
 await restarted.api.readConsumerUpdateHead({...scope,principalId:'other'},id,'account');assert.equal(restarted.calls,1);
 await assert.rejects(h.api.readConsumerUpdateHead(scope,id,'foreign'),/unavailable/);
});
test('accepted receipt closes cached exchange without GET and older receipts cannot restore a consumer turn',async()=>{
 const h=await harness();await h.api.readConsumerUpdateHead(scope,id,'account');
 const item={...scope,serviceAccountId:'account',ticketId:id,payload:{kind:'resolution_confirmed',text:''},receipt:{mutationId:id,eventId:id,ticketId:id,acceptedAt:'2026-10-26T01:00Z',reviewVersion:0,conversation:{...head(3).conversation,state:'confirmed',canSubmitUpdate:false,canConfirmResolution:false},resolutionCheck:{cycleId:id,responseVersion:2,answer:'confirmed',reviewState:null}}};
 await h.api.cacheConsumerUpdateReceipt(item);assert.equal(h.api.peekConsumerUpdateHead(scope,id,'account').conversation.state,'confirmed');assert.equal(h.calls,1);
 await h.api.cacheConsumerUpdateReceipt({...item,receipt:{...item.receipt,conversation:head(1).conversation}});
 assert.equal(h.api.peekConsumerUpdateHead(scope,id,'account').conversation.state,'confirmed');
});
test('a background receipt repairs an unmounted disk head after restart',async()=>{
 const first=await harness();await first.api.readConsumerUpdateHead(scope,id,'account');const restarted=await harness(first.storage);
 await restarted.api.cacheConsumerUpdateReceipt({...scope,serviceAccountId:'account',ticketId:id,payload:{kind:'resolution_confirmed',text:''},receipt:{mutationId:id,eventId:id,ticketId:id,acceptedAt:'2026-10-26T01:00Z',reviewVersion:0,conversation:{...head(3).conversation,state:'confirmed',canSubmitUpdate:false,canConfirmResolution:false},resolutionCheck:{cycleId:id,responseVersion:2,answer:'confirmed',reviewState:null}}});
 assert.equal((await restarted.api.readConsumerUpdateHead(scope,id,'account')).conversation.state,'confirmed');assert.equal(restarted.calls,0);
});
test('a delayed same-revision head cannot erase an accepted rating',async()=>{
 const h=await harness();h.value({...head(1),conversation:{...head(1).conversation,state:'confirmed'},resolutionCheck:{...head(1).resolutionCheck,answer:'confirmed'},canRate:true});await h.api.readConsumerUpdateHead(scope,id,'account');
 let release;h.pause(new Promise(resolve=>{release=resolve;}));h.time(110001);const read=h.api.readConsumerUpdateHead(scope,id,'account',true);await new Promise(resolve=>setImmediate(resolve));
 await h.api.cacheServiceFeedback(scope,id,'account',{feedbackId:id,ticketId:id,cycleId:id,serviceAccountId:'account',rating:5,comment:'',version:1,responseVersion:1,updatedAt:'2026-10-26T01:00Z'});release();await read;
 const received=h.api.peekConsumerUpdateHead(scope,id,'account');assert.equal(received.serviceFeedback.rating,5);assert.equal(received.canRate,false);
});

test('a replayed legacy rating cannot erase the authoritative closing deadline',async()=>{
 const h=await harness(),closesAt='2026-10-30T12:00:00Z';
 h.value({...head(1),closurePolicy:{version:1,cycleId:id,closesAt,canRate:true}});
 await h.api.readConsumerUpdateHead(scope,id,'account');
 await h.api.cacheServiceFeedback(scope,id,'account',{feedbackId:id,ticketId:id,cycleId:id,serviceAccountId:'account',rating:4,comment:'',version:1,responseVersion:1,updatedAt:'2026-10-26T01:00Z'});
 const page=h.api.peekConsumerUpdateHead(scope,id,'account');
 assert.equal(page.closurePolicy.closesAt,closesAt);
 assert.equal(page.closurePolicy.canRate,false);
});
