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
const jsx=(type,props)=>typeof type==="function"?type(props):({type,props});
const nodes=tree=>!tree||typeof tree!=="object"?[]:Array.isArray(tree)?tree.flatMap(nodes):[tree,...nodes(tree.props?.children),...nodes(tree.props?.footer)];
async function fixture(t,responder,mode="link") {
  const h=hooks(),calls=[],submissions=[],routes=[],timers=new Map();let scoped=true,token="pinned-session",revision=0;const current=()=>scoped;
  const api={ApiRequestError:class extends Error{constructor(message,code){super(message);this.code=code;}},getAuthToken:async()=>token,getAuthTokenRevision:()=>revision,createApiRequestId:()=>"intent"};
  const status={state:"verify",serverNow:new Date().toISOString()};
  const dialog=Object.assign("Dialog",{Content:"Content",Title:"Title",Description:"Description",Footer:"Footer"});
  const mocks={react:h.react,"react/jsx-runtime":{jsx,jsxs:jsx,Fragment:"Fragment"},"react-native":{View:"View"},
    "expo-router":{useRouter:()=>({canGoBack:()=>false,replace:p=>routes.push(p)}),useFocusEffect:fn=>h.react.useEffect(fn,[fn])},
    "lucide-react-native":{IdCard:"IdCard",UserRound:"User",Link:"Link"},
    "@/components/panelui/button":{Button:"Button"},"@/components/panelui/text":{Text:"Text"},"@/components/panelui/dialog":{Dialog:dialog},
    "@/features/reports/components/report-page":{ReportPage:"Page"},
    "@/hooks/use-auth-session":{useAuthSession:()=>({signOut:async()=>{routes.push("signOut");token=null;revision++;}})},"@/constants/panelui-preview":{PANELUI_PREVIEW:false},
    "@/hooks/use-consumer-account":{useConsumerAccount:()=>({refreshConsumerAccount:async()=>{},clearConsumerAccount:()=>{}})},
    "@/hooks/use-consumer-profile":{clearConsumerProfileCaches:async()=>{}},"@/hooks/use-app-colors":{useAppColors:()=>["white"]},
    "@/components/panelui/select":{Select:Object.assign("Select",{Item:"SelectItem"})},"@/components/panelui/field":{Field:Object.assign("FieldGroup",{Label:"Label"})},
    "./service-account-card":{ServiceAccountCard:"ServiceCard"},
    "./profile-ui":{ProfileGate:"Gate",ProfileHeading:"Heading",ProfileNotice:"Notice",ProfileField:"Field",DetailRow:"Row",useProfileTask:()=>current,useProfileBackGuard:()=>()=>{}},
    "@/services/api":api,
    "@/features/accounts/contract":{presentAccountLinkError:e=>({message:e.message,kind:"unknown"}),presentAccountUnlinkError:e=>({message:e.message})},
    "@/features/accounts/status":{consumerAccountLinkRequestStatusLabel:()=>"Under review"},
    "@/services/auth":{requestAccountVerification:async(purpose,body,token)=>{calls.push({purpose,body,token});if(responder)return responder(body,{api});return body.action==="verify"?{...status,state:"verified",flowId:"proof",verificationExpiresAt:new Date(Date.now()+300000).toISOString()}:status;}},
    "@/services/linked-accounts":{setDefaultLinkedAccount:async()=>{},unlinkLinkedAccount:async(body,token)=>{submissions.push({body,token});if(responder){const result=await responder({action:"submit"},{api});if(result)return result;}return {reauthenticationRequired:true};}},
    "@/services/account-link-requests":{
      submitAccountLinkRequest:async(body,token)=>{submissions.push({body,token});if(responder){const result=await responder({action:"submit"},{api});if(result)return result;}return {status:"pending"};},
    },
  };
  const load=async(path)=>{const exports={};const code=await readFile(new URL("../src/features/profile/"+path,import.meta.url),"utf8");new Function("require","exports","setInterval","clearInterval",ts.transpileModule(code.replace("function LinkAccount(","export function LinkAccount(").replace("function Accounts(","export function Accounts("),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText)(id=>mocks[id]??{},exports,callback=>{const id=Symbol();timers.set(id,callback);return id;},id=>timers.delete(id));return exports;};
  mocks["./account-password-verification"]=await load("account-password-verification.tsx");
  const exports=await load(mode==="link"?"link-account-screen.tsx":"accounts-screen.tsx");
  const identity={key:"identity",fixture:false,account:{sessionMode:"identity",accessRevision:4,capabilities:{accountLinking:true},accounts:[{id:"service-a",registeredName:"A",accountNumber:"111",isDefault:true},{id:"service-b",registeredName:"B",accountNumber:"222",isDefault:false}]}};
  const render=()=>{h.start();const tree=(mode==="link"?exports.LinkAccount:exports.Accounts)({identity});h.flush();return tree;};
  t.after(()=>h.dispose());render();await tick();return {render,calls,submissions,routes,h,timers,api,setCurrent:value=>{scoped=value;},setToken:value=>{token=value;revision++;}};
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
test("a committed link is acknowledged when its success response arrives after local expiry",async t=>{
  const pending=deferred();const f=await fixture(t,body=>body.action==="submit"?pending.promise:{state:body.action==="verify"?"verified":"verify",flowId:"proof",serverNow:new Date().toISOString(),verificationExpiresAt:new Date(Date.now()+300000).toISOString()});
  await verify(f);let tree=details(f);button(tree,"Send request").props.onPress();await tick();
  const later=Date.now()+600000;t.mock.method(Date,"now",()=>later);for(const callback of f.timers.values())callback();f.render();
  pending.resolve({status:"pending"});await tick();assert.ok(button(f.render(),"View link requests"));assert.equal(f.submissions.length,1);
});

async function startUnlink(f,index=1){const buttons=nodes(f.render()).filter(n=>n.type==="Button"&&n.props.children==="Unlink");buttons[index].props.onPress();f.render();await tick();return f.render();}
test("unlink has its own password gate before service credentials and submits both checks with the pinned session",async t=>{
  const f=await fixture(t,undefined,"unlink");let tree=await startUnlink(f);assert.ok(field(tree,"Current password"));assert.equal(field(tree,"ALECO account password"),undefined);
  tree=await verify(f);field(tree,"ALECO account password").props.onChangeText("service-secret");tree=f.render();const submit=button(tree,"Unlink account");submit.props.onPress();submit.props.onPress();await tick();
  assert.equal(f.submissions.length,1);assert.deepEqual(f.submissions[0],{body:{serviceAccountId:"service-b",currentAccountPassword:"service-secret",accessRevision:4,replacementDefaultServiceAccountId:undefined,verificationFlowId:"proof"},token:"pinned-session"});
  assert.ok(f.calls.every(c=>c.purpose==="account-unlink"));assert.ok(!f.h.slots.includes("sign-in-secret")&&!f.h.slots.includes("service-secret"));assert.deepEqual(f.routes,["signOut","/sign-in"]);
});
test("unlink preserves replacement selection but returns to verification after server expiry",async t=>{
  const f=await fixture(t,(body,{api})=>{if(body.action==="submit")throw new api.ApiRequestError("Verify again","CURRENT_PASSWORD_VERIFICATION_REQUIRED");return {state:body.action==="verify"?"verified":"verify",flowId:"proof",serverNow:new Date().toISOString(),verificationExpiresAt:new Date(Date.now()+300000).toISOString()};},"unlink");
  await startUnlink(f,0);let tree=await verify(f);assert.equal(button(tree,"Unlink account").props.disabled,true);
  nodes(tree).find(n=>n.props?.title==="New default account").props.onValueChange("service-b");field(tree,"ALECO account password").props.onChangeText("service-secret");tree=f.render();button(tree,"Unlink account").props.onPress();await tick();tree=f.render();assert.ok(field(tree,"Current password"));
  tree=await verify(f);assert.equal(field(tree,"ALECO account password").props.value,"");assert.equal(nodes(tree).find(n=>n.props?.title==="New default account").props.value,"service-b");
});
for(const mutation of ["identity","token"])test("a late unlink response cannot sign out a changed "+mutation+" during token lookup",async t=>{
  const f=await fixture(t,undefined,"unlink");await startUnlink(f);let tree=await verify(f);field(tree,"ALECO account password").props.onChangeText("service-secret");tree=f.render();
  const pending=deferred();f.api.getAuthToken=()=>pending.promise;
  button(tree,"Unlink account").props.onPress();await tick();if(mutation==="identity")f.setCurrent(false);else f.setToken("new-session");pending.resolve("pinned-session");await tick();
  assert.deepEqual(f.routes,[]);
});
