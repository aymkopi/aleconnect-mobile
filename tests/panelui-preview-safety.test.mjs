import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function background(preview) {
  const source = await readFile(new URL("../src/services/report-background-sync.ts", import.meta.url), "utf8");
  const calls = [];
  let task;
  const queue = [{id:"retained", status:"queued", evidence:[{localUri:"private://evidence/a"}], accessRevision:3}];
  const before = JSON.stringify(queue);
  const mocks = {
    "@/services/consumer-update-queue": {syncConsumerUpdateQueue:async()=>{calls.push(["follow-up-sync"]);return [];}},
    "expo-background-task": {BackgroundTaskResult:{Success:"success",Failed:"failed"}},
    "expo-task-manager": {defineTask:(_name, fn)=>{task=fn;}},
    "react-native": {Platform:{OS:"android"}},
    "@/constants/panelui-preview": {PANELUI_PREVIEW:preview},
    "@/services/api": {getAuthToken:async()=>{calls.push("token");return "secret";},apiRequest:async(path)=> path.includes("identity") ? {identityUserId:"owner", authorizedServiceAccountIds:["service"],accessRevision:3} : {user:{id:"owner"}}},
    "@/services/report-queue": {syncReportQueue:async(scope)=>{calls.push(["sync",scope]);return queue;}},
    "@/services/report-submission-events": {recordReportSubmissionCompletions:async(items)=>{calls.push(["completion",items]);}}
  };
  const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  new Function("require","exports",js)((id)=>{assert.ok(mocks[id],id);return mocks[id];},{});
  const result=await task();
  return {calls,result,before,after:JSON.stringify(queue)};
}
test("paused background callback leaves nonempty queue and evidence untouched",async()=>{
  const r=await background(true);
  assert.equal(r.result,"success"); assert.deepEqual(r.calls,[]); assert.equal(r.before,r.after);
});
test("normal background callback retains authorization and completion behavior",async()=>{
  const r=await background(false);
  assert.deepEqual(r.calls[1],["sync",{identityUserId:"owner",authorizedServiceAccountIds:["service"],accessRevision:3}]);
  assert.equal(r.calls[2][0],"completion");
  assert.equal(r.calls[3][0],"follow-up-sync");
});
test("preview provider defers replay, retry/removal and pending receipt consumption",async()=>{
  const source=await readFile(new URL("../src/context/report-queue-context.tsx",import.meta.url),"utf8");
  assert.match(source,/syncEnabled = true/);
  assert.ok(/if\s*\(!syncEnabled\s*\|\|\s*!queueScope\)\s*return\s*\[\]/.test(source));
  assert.ok(/if\s*\(!syncEnabled\s*\|\|\s*!userId\)\s*return/.test(source));
  assert.ok(/if\s*\(!syncEnabled\)\s*return/.test(source));
});
test("preview notification capture does not consume pending intents or register tokens",async()=>{
 const source=await readFile(new URL("../src/components/push-notifications-receiver.tsx",import.meta.url),"utf8");
 assert.ok(source.includes("if (!PANELUI_PREVIEW)"));
 assert.match(source,/consumeLastNotificationResponseAsync/);
 const root=await readFile(new URL("../src/app/_layout.tsx",import.meta.url),"utf8");
 assert.match(root,/PANELUI_PREVIEW/);
});
