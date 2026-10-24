import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as reminderContract from '../src/features/advisories/reminder-contract.ts';
async function load(file,modules={}) {
 const source=await readFile(new URL("../src/"+file,import.meta.url),"utf8");
 const exports={};const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(code,{exports,require:name=>{if(name==='@/features/advisories/reminder-contract')return reminderContract;if(name in modules)return modules[name];throw Error(name)},Map,Set,Date,URL,console});
 return exports;
}
test("Topic readers retain legacy cached posts and expose topics consistently in search",async()=>{
 const advisory=await load("services/advisories.ts",{"@react-native-async-storage/async-storage":{},"@/services/api":{},"@/utils/refresh-cooldown":{},"@/utils/human-reference":{normalizeHumanReference:value=>value??null}});
 const {normalizeMobilePublicUpdate}=await load("services/public-updates.ts",{"@react-native-async-storage/async-storage":{},"@/services/advisories":advisory,"@/services/api":{},"@/utils/refresh-cooldown":{}});
 const {matchesUpdate,updateTopicLabel}=await load("features/advisories/presentation.ts");
 for(const [value,expected] of [[undefined,null],[null,null],[42,null],["billing","billing"],["communications","communications"],["  Community programs  ","Community programs"]]){
  const post=normalizeMobilePublicUpdate({kind:"facebook_post",id:"post",message:"Unchanged Page message",topic:value,photos:[]});
  assert.equal(post.topic,expected);
  assert.equal(post.message,"Unchanged Page message");
  assert.equal(matchesUpdate(post,"billing","feed"),expected==="billing");
  assert.equal(matchesUpdate(post,"","advisories"),false);
  assert.equal(advisory.normalizeMobileAdvisory({id:"advisory",topic:value}).topic,expected);
 }
 assert.equal(updateTopicLabel("billing"),"Billing");
 assert.equal(updateTopicLabel("communications"),"Communications");
 assert.equal(updateTopicLabel("Community programs"),"Community programs");
 assert.equal(updateTopicLabel(undefined),"ALECO feed");
 for (const topic of ["__proto__", "constructor", "toString"]) assert.equal(updateTopicLabel(topic), topic);
});
