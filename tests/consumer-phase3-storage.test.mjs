import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import * as accountContract from '../src/features/accounts/contract.ts';
import * as feedbackContract from '../src/features/reports/service-feedback-contract.ts';
import * as appFeedbackContract from '../src/features/profile/app-feedback-contract.ts';
async function harness(){
 const storage=new Map(),calls=[];let principal='principal',token='token',revision=0,mode='lost';
 const modules={
  '@react-native-async-storage/async-storage':{__esModule:true,default:{getItem:async k=>storage.get(k)??null,setItem:async(k,v)=>storage.set(k,v),removeItem:async k=>storage.delete(k)}},
  '@/features/accounts/contract':accountContract,'@/features/reports/service-feedback-contract':feedbackContract,'@/features/profile/app-feedback-contract':appFeedbackContract,
  '@/services/api':{getAuthToken:async()=>token,getAuthTokenRevision:()=>revision,apiRequest:async(path,init={},options={})=>{
   calls.push({path,init,options});if(path==='/api/auth/get-session')return {user:{id:principal}};
   if(path==='/api/mobile/consumer-identity')return {sessionMode:'identity',identityUserId:'identity',accessRevision:2,defaultServiceAccountId:'account',authorizedServiceAccountIds:['account'],accounts:[{id:'account'}],capabilities:{}};
   const input=JSON.parse(init.body);assert.ok([...storage.values()].some(raw=>raw.includes(input.clientMutationId)),'intent must exist before the mutation');assert.equal(options.authToken,'token');
   if(mode==='lost')throw Error('Receipt lost');
   return {mutationId:mode==='wrong'?'wrong':input.clientMutationId,advisoryId:input.advisoryId,occurrenceId:input.occurrenceId,enabled:input.enabled,serviceAccountId:input.serviceAccountId,feedbackId:'feedback',ticketId:input.ticketId,cycleId:input.cycleId,version:1,acceptedAt:'2026-10-24T04:00Z'};
  }},
 };
 for(const name of ['consumer-intent','advisory-reminders','feedback']){
  const source=await readFile(new URL(`../src/services/${name}.ts`,import.meta.url),'utf8'),module={exports:{}};
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
  new Function('require','module','exports',code)(id=>{assert.ok(id in modules,`Unexpected ${id}`);return modules[id];},module,module.exports);modules[`./${name}`]=module.exports;
 }
 return {storage,calls,reminders:modules['./advisory-reminders'],feedback:modules['./feedback'],mode(v){mode=v;},principal(v){principal=v;},token(v){token=v;revision++;}};
}
const scope={principalId:'principal',identityUserId:'identity',serviceAccountId:'account',accessRevision:2};
test('reminder receipt loss and restart preserve exact intent; account switches never retarget it',async()=>{
 const h=await harness(),value={clientMutationId:'mutation',serviceAccountId:'account',accessRevision:2,advisoryId:'advisory',occurrenceId:'occurrence',enabled:true,leadMinutes:60};
 await assert.rejects(h.reminders.sendAdvisoryReminder(scope,value),/Receipt lost/);
 const saved=await h.reminders.readReminderChoice(scope,'advisory','occurrence');assert.deepEqual(saved,value);
 h.principal('other');await assert.rejects(h.reminders.sendAdvisoryReminder(scope,saved),/account changed/);assert.equal(h.calls.filter(c=>c.path==='/api/mobile/advisory-reminders').length,1);
 h.principal('principal');h.mode('wrong');await assert.rejects(h.reminders.sendAdvisoryReminder(scope,saved),/not confirmed/);assert.equal(h.storage.size,1);
 h.mode('ok');await h.reminders.sendAdvisoryReminder(scope,saved);assert.equal(h.storage.size,0);
 assert.equal(await h.reminders.readReminderChoice({...scope,principalId:'other'},'advisory','occurrence'),null);
});
test('optional feedback stays durable after uncertainty and only a matching receipt clears its original draft',async()=>{
 const h=await harness(),value={kind:'service',clientMutationId:'mutation',ticketId:'ticket',cycleId:'cycle',serviceAccountId:'account',accessRevision:2,responseVersion:1,expectedVersion:0,rating:4,comment:''};
 await assert.rejects(h.feedback.sendServiceFeedback(scope,value),/Receipt lost/);assert.deepEqual((await h.feedback.readServiceFeedbackDraft(scope,'ticket')).input,value);
 await assert.rejects(h.feedback.sendServiceFeedback({...scope,accessRevision:3},value),/Review/);
 h.mode('ok');await h.feedback.sendServiceFeedback(scope,value);assert.equal(await h.feedback.readServiceFeedbackDraft(scope,'ticket'),null);
});
