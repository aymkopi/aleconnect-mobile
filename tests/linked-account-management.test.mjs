import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("profile reads and cache keys are scoped to identity, service account, and access revision", async () => {
  const [profileService, profileHook] = await Promise.all([
    readFile(new URL("../src/services/profile.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/hooks/use-consumer-profile.ts", import.meta.url), "utf8"),
  ]);

  assert.match(profileService, /serviceAccountId/);
  assert.match(profileService, /accessRevision/);
  assert.match(profileService, /URLSearchParams/);
  assert.match(profileHook, /identityUserId/);
  assert.match(profileHook, /serviceAccountId/);
  assert.match(profileHook, /accessRevision/);
});

test("linked-account mutations carry revision and unlink requires a current account password without persistence", async () => {
  const source = await readFile(
    new URL("../src/services/linked-accounts.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /action:\s*"setDefault"/);
  assert.match(source, /action:\s*"unlink"/);
  assert.match(source, /currentAccountPassword/);
  assert.match(source, /reauthenticationRequired/);
  assert.doesNotMatch(source, /AsyncStorage/);
});

test("account-link requests preserve consumer reasons and never persist a submitted password", async () => {
  const source = await readFile(
    new URL("../src/services/account-link-requests.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /consumerReason/);
  assert.match(source, /idempotencyKey/);
  assert.match(source, /parseConsumerAccountLinkRequestStatus/);
  assert.doesNotMatch(source, /AsyncStorage/);
});

test("link-request reader tolerates old and malformed current-link metadata; retries retain intent", async () => {
  const ts = (await import("typescript")).default;
  const status = await import("../src/features/accounts/status.ts");
  const source = await readFile(new URL("../src/services/account-link-requests.ts", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS}});
  let metadata, nextId=0;
  const calls=[];
  const module={exports:{}};
  new Function("require","module","exports",outputText)((id)=>{
    if(id.includes("features/accounts/status")) return status;
    return {createApiRequestId:()=>"intent-"+(++nextId),apiRequest:async(path,options,auth)=>{
      calls.push({path,options,auth});
      return options ? {requestId:"request",status:"pending",replayed:false} : {accessRevision:3,requests:[{requestId:"request",status:"approved",consumerReason:"Public note",...(metadata===undefined?{}:{isCurrentLink:metadata})}]};
    }};
  },module,module.exports);
  for(const value of [true,false,undefined,"true",1]){
    metadata=value;
    const read=await module.exports.fetchAccountLinkRequests();
    assert.equal(read.requests[0].isCurrentLink, typeof value==="boolean"?value:undefined);
    assert.equal(read.requests[0].consumerReason,"Public note");
    assert.equal(read.accessRevision,3);
  }
  const input={accountNumber:"123",registeredName:"Name",password:"private account password",idempotencyKey:"same-intent",verificationFlowId:"verified-flow"};
  await module.exports.submitAccountLinkRequest(input,"pinned-session");
  await module.exports.submitAccountLinkRequest(input,"pinned-session");
  const sent=calls.filter(c=>c.options).map(c=>JSON.parse(c.options.body));
  assert.deepEqual(sent.map(b=>b.idempotencyKey),["same-intent","same-intent"]);
  assert.ok(sent.every(b=>b.verificationFlowId==="verified-flow"));
  assert.ok(calls.filter(c=>c.options).every(c=>c.auth.authToken==="pinned-session"));
});
