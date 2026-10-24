import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import * as contract from '../src/features/profile/app-feedback-contract.ts'
const scope={principalId:'principal',identityUserId:'identity',serviceAccountId:'account',accessRevision:1}
const draft={version:1,principalId:'principal',identityUserId:'identity',clientMutationId:'11111111-1111-4111-8111-111111111111',category:'suggestion',text:'Please improve the app.',appVersion:'1.5.0-alpha.1',platform:'android',status:'draft',receipt:null}
function fixture({writeFailure,networkFailure=false}={}){
 const entries=new Map(),events=[],requests=[];let writes=0
 const storage={async getItem(key){return entries.get(key)??null},async setItem(key,value){writes++;events.push('write:'+JSON.parse(value).status);if(writeFailure===writes)throw new Error('Disk unavailable');entries.set(key,value)}}
 const module={exports:{}};
 const compiled=ts.transpileModule(fs.readFileSync('src/services/feedback.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText
 new Function('require','module','exports',compiled)(name=>{
  if(name==='@react-native-async-storage/async-storage')return storage
  if(name==='./consumer-intent')return{consumerIntentToken:async()=>{events.push('identity IO');return 'pinned-token'}}
  if(name==='@/services/api')return{apiRequest:async(url,init,options)=>{events.push('POST');requests.push({url,input:JSON.parse(init.body),token:options.authToken});if(networkFailure){networkFailure=false;throw new Error('Connection lost')};return{mutationId:draft.clientMutationId,feedbackId:'22222222-2222-4222-8222-222222222222',kind:'app',identityUserId:'identity',acceptedAt:'2026-10-24T02:00:00Z'}}}
  if(name==='@/features/profile/app-feedback-contract')return contract
  if(name==='@/features/reports/service-feedback-contract')return{}
  throw new Error('Unexpected dependency '+name)
 },module,module.exports)
 return{...module.exports,events,requests,entries}
}
test('app feedback persists intent before all IO and a failed save cannot send',async()=>{
 const failed=fixture({writeFailure:1});await assert.rejects(failed.sendAppFeedback(scope,draft),/Disk unavailable/);assert.deepEqual(failed.events,['write:pending']);assert.equal(failed.requests.length,0)
 const good=fixture();const received=await good.sendAppFeedback(scope,draft);assert.equal(received.status,'received');assert.deepEqual(good.events,['write:pending','identity IO','POST','write:received']);assert.equal(good.requests[0].token,'pinned-token');assert.deepEqual(Object.keys(good.requests[0].input).sort(),['appVersion','category','clientMutationId','kind','platform','text'])
})
test('lost responses replay the same submission; receipt save failures retain pending recovery',async()=>{
 const retry=fixture({networkFailure:true});await assert.rejects(retry.sendAppFeedback(scope,draft),/Connection lost/);const pending=await retry.readAppFeedbackDraft(scope);assert.equal(pending.status,'pending');await retry.sendAppFeedback(scope,pending);assert.deepEqual(retry.requests[0].input,retry.requests[1].input)
 const disk=fixture({writeFailure:2});await assert.rejects(disk.sendAppFeedback(scope,draft),/Disk unavailable/);assert.equal((await disk.readAppFeedbackDraft(scope)).status,'pending')
 const changed=fixture();await assert.rejects(changed.sendAppFeedback({...scope,identityUserId:'foreign'},draft),/needs review/);assert.deepEqual(changed.events,[])
})
