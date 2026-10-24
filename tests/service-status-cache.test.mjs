import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import * as contract from '../src/features/home/service-status-contract.ts';
async function harness() {
  const storage = new Map(); let token = 'session-a', result, failure;
  const module = { exports: {} };
  const source = await readFile(new URL('../src/services/service-status.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  new Function('require', 'module', 'exports', compiled)(name => {
    if (name === '@react-native-async-storage/async-storage') return { __esModule: true, default: { getItem: async key => storage.get(key) ?? null, setItem: async (key,value) => { storage.set(key,value); }, removeItem: async key => { storage.delete(key); } } };
    if (name === '@/services/api') return { getAuthToken: async () => token, apiRequest: async () => { if (failure) throw failure; return result; } };
    if (name === '@/features/home/service-status-contract') return contract;
    throw new Error(`Unexpected dependency ${name}`);
  }, module, module.exports);
  return { ...module.exports, storage, respond(value) { result=value; failure=null; }, fail(value) { failure=value; }, token(value) { token=value; } };
}
const scope = { principalId:'p',identityUserId:'i',serviceAccountId:'a',accessRevision:2 };
const value = { enabled:true,canAcknowledge:true,version:1,serviceAccountId:'a',asOf:new Date().toISOString(),matchState:'coverage_unknown',multipleFeeders:false,hasMore:false,items:[] };
test('saved outage context is account scoped, bounded and never permits acknowledgement', async()=>{
  const h = await harness();h.respond(value);assert.equal((await h.fetchServiceStatus(scope)).canAcknowledge,true);
  h.fail(new Error('offline'));const saved=await h.fetchServiceStatus(scope);assert.equal(saved.isStale,true);assert.equal(saved.canAcknowledge,false);
  for(const patch of [{serviceAccountId:'b'},{accessRevision:3},{principalId:'other'},{identityUserId:'other'}]) await assert.rejects(h.fetchServiceStatus({...scope,...patch}));
  for(const status of [401,403,409]){h.fail(Object.assign(new Error('access changed'),{status}));await assert.rejects(h.fetchServiceStatus(scope));}
  h.fail(new Error('offline'));for(const [key,raw] of h.storage){const row=JSON.parse(raw);row.savedAt=Date.now()-86400001;h.storage.set(key,JSON.stringify(row));}await assert.rejects(h.fetchServiceStatus(scope));
});
test('disabled service status removes only its own cache and old capabilities normalize safely', async()=>{
  const h=await harness();h.respond(value);await h.fetchServiceStatus(scope);h.respond({enabled:false});assert.deepEqual(await h.fetchServiceStatus(scope),{enabled:false});assert.equal(h.storage.size,0);
  h.token(null);await assert.rejects(h.fetchServiceStatus(scope));
});
