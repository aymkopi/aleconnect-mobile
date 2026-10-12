import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import ts from "typescript";
test("linked accounts stay masked and absent account details stay explicit",async()=>{
 const source=await readFile(new URL("../src/features/profile/account-screen.tsx",import.meta.url),"utf8");
 const fn=source.match(/export function maskAccountNumber[\s\S]*?\n}/)?.[0];
 assert.ok(fn);
 const exports={};
 new Function("exports",ts.transpileModule(fn,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(exports);
 assert.equal(exports.maskAccountNumber("123456789012"),"••9012");
 assert.equal(exports.maskAccountNumber(null),"Not available");
 assert.equal(exports.maskAccountNumber(undefined),"Not available");
 assert.equal(exports.maskAccountNumber(""),"Not available");
 assert.doesNotMatch(source,/updateConsumerProfile|linkServiceAccount|submitAccountLink/);
 assert.match(source,/useConsumerProfile/);assert.match(source,/useConsumerAccount/);
});
