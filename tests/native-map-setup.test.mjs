import assert from 'node:assert/strict';
import test from 'node:test';
const policy=await import('../src/features/onboarding/map-setup-policy.ts').catch(()=>({}));
function fixture(){
 const data=new Map();let ready=false,online=true;
 const dependencies={storage:{getItem:async key=>data.get(key)??null,setItem:async(key,value)=>{data.set(key,value);},removeItem:async key=>{data.delete(key);}},status:async()=>({state:ready?'ready':'paused'}),online:async()=>online};
 return {data,dependencies,ready(value){ready=value;},online(value){online=value;}};
}
test('unfinished native setup survives Back and restart independently of optional guide hints',async()=>{
 assert.equal(typeof policy.createNativeMapSetup,'function');const f=fixture();
 f.data.set('aleconnect_get_started_offered_v1:account:one','1');
 const setup=policy.createNativeMapSetup(f.dependencies);
 assert.equal(await setup.offer('one','session'),true);
 assert.equal(await setup.offer('one','session'),false,'do not trap Home after Back');
 assert.equal(await policy.createNativeMapSetup(f.dependencies).offer('one','session'),true,'restart resumes the required setup');
 await assert.rejects(setup.finish('one'),/download/i);
 assert.equal([...f.data.values()].includes('required'),true);
 f.ready(true);await setup.finish('one');
 assert.equal(await policy.createNativeMapSetup(f.dependencies).offer('one','next-session'),false);
})
test('offline drafting stays accessible and one account cannot complete another pending setup',async()=>{
 assert.equal(typeof policy.createNativeMapSetup,'function');const f=fixture(),setup=policy.createNativeMapSetup(f.dependencies);
 f.online(false);assert.equal(await setup.offer('one','offline-session'),false);
 f.online(true);assert.equal(await setup.offer('one','offline-session'),true,'connectivity recovery may show setup once');
 assert.equal(await setup.offer('two','other-session'),true);
 f.ready(true);await setup.finish('one');
 assert.equal([...f.data.values()].filter(value=>value==='required').length,1);
})
