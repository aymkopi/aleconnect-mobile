import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return {promise,resolve}; }
function hooks() {
  const slots=[], effects=[]; let cursor=0;
  const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
  return { slots, react: {
    useState(value){const i=cursor++;if(!(i in slots))slots[i]=typeof value==="function"?value():value;return [slots[i],next=>{slots[i]=typeof next==="function"?next(slots[i]):next;}];},
    useRef(value){const i=cursor++;return slots[i]??(slots[i]={current:value});},
    useCallback(fn,deps){const i=cursor++;if(!same(slots[i]?.deps,deps))slots[i]={deps,fn};return slots[i].fn;},
    useEffect(fn,deps){const i=cursor++;if(!same(slots[i]?.deps,deps))effects.push(()=>{slots[i]?.cleanup?.();slots[i]={deps,cleanup:fn()};});},
  }, start(){cursor=0;}, flush(){while(effects.length)effects.shift()();}, dispose(){for(const slot of slots)slot?.cleanup?.();} };
}
const jsx=(type,props)=>({type,props});
const nodes=tree=>!tree||typeof tree!=="object"?[]:Array.isArray(tree)?tree.flatMap(nodes):[tree,...nodes(tree.props?.children),...nodes(tree.props?.footer)];
async function fixture(t,responder) {
  const h=hooks(),calls=[],submissions=[],routes=[],timers=new Map();const current=()=>true;
  const api={ApiRequestError:class extends Error{constructor(message,code){super(message);this.code=code;}},getAuthToken:async()=>"pinned-session",createApiRequestId:()=>"intent"};
  const status={state:"verify",serverNow:new Date().toISOString()};
  const dialog=Object.assign("Dialog",{Content:"Content",Title:"Title",Description:"Description",Footer:"Footer"});
  const mocks={react:h.react,"react/jsx-runtime":{jsx,jsxs:jsx,Fragment:"Fragment"},"react-native":{View:"View"},
    "expo-router":{useRouter:()=>({canGoBack:()=>false,replace:p=>routes.push(p)}),useFocusEffect:fn=>h.react.useEffect(fn,[fn])},
    "lucide-react-native":{IdCard:"IdCard",UserRound:"User"},
    "@/components/panelui/button":{Button:"Button"},"@/components/panelui/text":{Text:"Text"},"@/components/panelui/dialog":{Dialog:dialog},
    "@/features/reports/components/report-page":{ReportPage:"Page"},
    "@/hooks/use-auth-session":{useAuthSession:()=>({signOut:async()=>{}})},"@/constants/panelui-preview":{PANELUI_PREVIEW:false},
    "./profile-ui":{ProfileGate:"Gate",ProfileHeading:"Heading",ProfileNotice:"Notice",ProfileField:"Field",DetailRow:"Row",useProfileTask:()=>current,useProfileBackGuard:()=>()=>{}},
    "@/services/api":api,
    "@/features/accounts/contract":{presentAccountLinkError:e=>({message:e.message,kind:"unknown"})},
    "@/features/accounts/status":{consumerAccountLinkRequestStatusLabel:()=>"Under review"},
    "@/services/account-link-requests":{
      requestAccountLinkVerification:async(body,token)=>{calls.push({body,token});if(responder)return responder(body,{api});return body.action==="verify"?{...status,state:"verified",flowId:"proof",verificationExpiresAt:new Date(Date.now()+300000).toISOString()}:status;},
      submitAccountLinkRequest:async(body,token)=>{submissions.push({body,token});if(responder){const result=await responder({action:"submit"},{api});if(result)return result;}return {status:"pending"};},
    },
  };
  let code=await readFile(new URL("../src/features/profile/link-account-screen.tsx",import.meta.url),"utf8");code=code.replace("function LinkAccount(","export function LinkAccount(");
  const exports={};new Function("require","exports","setInterval","clearInterval",ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(id=>mocks[id]??{},exports,callback=>{const id=Symbol();timers.set(id,callback);return id;},id=>timers.delete(id));
  const identity={key:"identity",fixture:false,account:{sessionMode:"identity",capabilities:{accountLinking:true},accounts:[]}};
  const render=()=>{h.start();const tree=exports.LinkAccount({identity});h.flush();return tree;};
  t.after(()=>h.dispose());render();await tick();return {render,calls,submissions,routes,h,timers};
}
const field=(tree,label)=>nodes(tree).find(n=>n.type==="Field"&&n.props.label===label);
const button=(tree,label)=>nodes(tree).find(n=>n.type==="Button"&&n.props.children===label);
async function verify(f){let tree=f.render();field(tree,"Current password").props.onChangeText("sign-in-secret");tree=f.render();const b=button(tree,"Verify and continue");b.props.onPress();b.props.onPress();await tick();return f.render();}
function details(f){let tree=f.render();field(tree,"Account number").props.onChangeText("123456");field(tree,"Registered name").props.onChangeText("Registered Name");field(tree,"ALECO account password").props.onChangeText("service-secret");tree=f.render();button(tree,"Review request").props.onPress();return f.render();}

test("identity password gates account fields; confirmed submission carries proof and the pinned session, not the identity password",async t=>{
  const f=await fixture(t);assert.equal(field(f.render(),"Account number"),undefined);
  let tree=await verify(f);assert.ok(field(tree,"Account number"));assert.equal(f.calls.filter(c=>c.body.action==="verify").length,1);
  assert.ok(!f.h.slots.includes("sign-in-secret"));tree=details(f);button(tree,"Send request").props.onPress();await tick();tree=f.render();
  assert.ok(button(tree,"View link requests"));assert.equal(f.submissions[0].token,"pinned-session");
  assert.equal(f.submissions[0].body.verificationFlowId,"proof");assert.equal(f.submissions[0].body.password,"service-secret");
  assert.equal(f.submissions[0].body.currentPassword,undefined);assert.ok(!f.h.slots.includes("service-secret"));
});
test("incorrect verification leaves the account form gated and clears the attempted password",async t=>{
  const f=await fixture(t,body=>{if(body.action==="verify")throw Error("Current password is incorrect.");return {state:"verify",serverNow:new Date().toISOString()};});
  const tree=await verify(f);assert.equal(field(tree,"Account number"),undefined);assert.equal(field(tree,"Current password").props.value,"");assert.equal(f.submissions.length,0);
});
test("server-expired proof returns to verification while retaining non-secret account details",async t=>{
  const f=await fixture(t,(body,{api})=>{if(body.action==="submit")throw new api.ApiRequestError("Verify again","CURRENT_PASSWORD_VERIFICATION_REQUIRED");return {state:body.action==="verify"?"verified":"verify",flowId:"proof",serverNow:new Date().toISOString(),verificationExpiresAt:new Date(Date.now()+300000).toISOString()};});
  await verify(f);let tree=details(f);button(tree,"Send request").props.onPress();await tick();tree=f.render();assert.ok(field(tree,"Current password"));assert.equal(field(tree,"Account number"),undefined);
  tree=await verify(f);assert.equal(field(tree,"Account number").props.value,"123456");assert.equal(field(tree,"ALECO account password").props.value,"");
});
test("leaving during verification cancels the late-issued proof and cannot advance the screen",async t=>{
  const pending=deferred();const f=await fixture(t,body=>body.action==="verify"?pending.promise:{state:"verify",serverNow:new Date().toISOString()});
  let tree=f.render();field(tree,"Current password").props.onChangeText("sign-in-secret");tree=f.render();button(tree,"Verify and continue").props.onPress();await tick();f.h.dispose();
  pending.resolve({state:"verified",flowId:"late-proof",serverNow:new Date().toISOString(),verificationExpiresAt:new Date(Date.now()+300000).toISOString()});await tick();
  assert.ok(f.calls.some(c=>c.body.action==="cancel"&&c.body.flowId==="late-proof"&&c.token==="pinned-session"));assert.ok(!f.h.slots.includes("sign-in-secret"));
});
test("late submission failure after blur cannot reveal an unverified account form",async t=>{
  let reject;const pending=new Promise((_resolve,fail)=>{reject=fail;});
  const f=await fixture(t,body=>body.action==="submit"?pending:{state:body.action==="verify"?"verified":"verify",flowId:"proof",serverNow:new Date().toISOString(),verificationExpiresAt:new Date(Date.now()+300000).toISOString()});
  await verify(f);let tree=details(f);button(tree,"Send request").props.onPress();await tick();f.h.dispose();
  reject(Error("Check the account details"));await tick();tree=f.render();
  assert.ok(field(tree,"Current password"));assert.equal(field(tree,"Account number"),undefined);
  assert.ok(f.calls.some(c=>c.body.action==="cancel"&&c.body.flowId==="proof"));
});
test("submission rejection after local expiry keeps the password gate and non-secret draft",async t=>{
  let reject;const pending=new Promise((_resolve,fail)=>{reject=fail;});
  const f=await fixture(t,body=>body.action==="submit"?pending:{state:body.action==="verify"?"verified":"verify",flowId:"proof",serverNow:new Date().toISOString(),verificationExpiresAt:new Date(Date.now()+300000).toISOString()});
  await verify(f);let tree=details(f);button(tree,"Send request").props.onPress();await tick();
  const later=Date.now()+600000;t.mock.method(Date,"now",()=>later);for(const callback of f.timers.values())callback();tree=f.render();assert.ok(field(tree,"Current password"));
  reject(Error("Check the account details"));await tick();tree=f.render();assert.ok(field(tree,"Current password"));assert.equal(field(tree,"Account number"),undefined);assert.ok(f.h.slots.includes("123456"));
});
