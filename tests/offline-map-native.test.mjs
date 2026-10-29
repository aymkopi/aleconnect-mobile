import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
async function loadNative(capabilities) {
 const source=await readFile(new URL('../src/services/offline-map-native.ts',import.meta.url),'utf8');
 const mocks={
  '@react-native-community/netinfo':{},'expo-file-system':{},
  'expo-modules-core':{requireOptionalNativeModule:()=>({capabilities})},
  'react-native':{Platform:{OS:'android'},AppState:{}},
  '@/assets/maps/albay-bright.json':{},'./api':{},
  './offline-maps':{createOfflineMaps:()=>({})},'@/features/maps/map-runtime':{},
 };
 const exports={};
 new Function('require','exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(id=>{assert.ok(id in mocks,'Missing '+id);return mocks[id];},exports);
 return exports;
}
test('Retry checks native support again after temporary initialization failure',async()=>{
 let attempts=0;
 const native=await loadNative(async()=>{if(++attempts===1)throw Error('Map context temporarily unavailable');return{version:1,platform:'android'};});
 assert.equal(await native.offlineMapSupport(),false);
 assert.equal(await native.offlineMapSupport(),true,'Retry must recover without restarting the app');
 assert.equal(attempts,2);
});
test('concurrent native support checks share initialization and keep a successful result',async()=>{
 let attempts=0;
 const native=await loadNative(async()=>{attempts++;return{version:1,platform:'android'};});
 assert.deepEqual(await Promise.all([native.offlineMapSupport(),native.offlineMapSupport()]),[true,true]);
 assert.equal(await native.offlineMapSupport(),true);assert.equal(attempts,1);
});
