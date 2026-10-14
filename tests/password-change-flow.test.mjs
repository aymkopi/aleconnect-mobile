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
    useState(value){const i=cursor++;if(!(i in slots))slots[i]=value;return [slots[i],next=>{slots[i]=typeof next==="function"?next(slots[i]):next;}];},
    useRef(value){const i=cursor++;return slots[i]??(slots[i]={current:value});},
    useCallback(fn,deps){const i=cursor++;if(!same(slots[i]?.deps,deps))slots[i]={deps,fn};return slots[i].fn;},
    useEffect(fn,deps){const i=cursor++;if(!same(slots[i]?.deps,deps))effects.push(()=>{slots[i]?.cleanup?.();slots[i]={deps,cleanup:fn()};});},
  }, start(){cursor=0;}, flush(){while(effects.length)effects.shift()();}, dispose(){for(const slot of slots)slot?.cleanup?.();} };
}
const jsx=(type,props)=>({type,props});
const nodes=tree=>!tree||typeof tree!=="object"?[]:Array.isArray(tree)?tree.flatMap(nodes):[tree,...nodes(tree.props?.children),...nodes(tree.props?.footer)];
async function fixture(t, responder) {
  const h=hooks(), calls=[], routes=[], toasts=[];
  let status={state:"verify",flowId:null,serverNow:new Date().toISOString()};
  const api={ApiRequestError:class extends Error { constructor(message,code){super(message);this.code=code;} },getAuthToken:async()=>"signed-session-fixture"};
  const mocks={
    react:h.react,"react/jsx-runtime":{jsx,jsxs:jsx,Fragment:"Fragment"},"react-native":{View:"View"},
    "expo-router":{useRouter:()=>({replace:path=>routes.push(path)}),useFocusEffect:fn=>h.react.useEffect(fn,[fn])},
    "lucide-react-native":{Check:"Check",Circle:"Circle",ShieldCheck:"Shield"},
    "@/components/panelui/button":{Button:"Button"},"@/components/panelui/text":{Text:"Text"},
    "@/components/panelui/dialog":{Dialog:Object.assign("Dialog",{Content:"DialogContent",Title:"DialogTitle",Description:"DialogDescription",Footer:"DialogFooter"})},
    "@/components/panelui/toast":{toast:{show:options=>toasts.push(options)}},
    "@/features/reports/components/report-page":{ReportPage:"Page"},
    "@/hooks/use-auth-session":{useAuthSession:()=>({refreshSession:async()=>{}})},
    "@/hooks/use-app-colors":{useAppColors:()=>["#006DBB","#64748B"]},
    "./profile-ui":{ProfileGate:"Gate",ProfileHeading:"Heading",ProfileNotice:"Notice",ProfileField:"Field",useProfileTask:()=>()=>true,useProfileBackGuard:()=>()=>{}},
    "@/services/api":api,
    "@/services/auth":{requestPasswordChange:async(body,token)=>{
      calls.push({body,token});if(responder)return responder(body,{status,setStatus:next=>{status=next;},api});
      if(body.action==="verify")status={...status,state:"verified",flowId:"grant-a",verificationExpiresAt:new Date(Date.now()+300_000).toISOString()};
      if(body.action==="change")status={...status,state:"complete"};
      if(body.action==="cancel")status={...status,state:"verify",flowId:null};
      return {...status};
    }},
  };
  let code=await readFile(new URL("../src/features/profile/password-screen.tsx",import.meta.url),"utf8");
  code=code.replace("function Password(","export function Password(");
  const exports={};new Function("require","exports",ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(id=>mocks[id]??{},exports);
  const identity={key:"consumer-fixture",fixture:false,account:{sessionMode:"identity"}};
  const render=()=>{h.start();const tree=exports.Password({identity});h.flush();return tree;};
  t.after(()=>h.dispose());render();await tick();
  return {render,calls,routes,toasts,h};
}
const field=(tree,label)=>nodes(tree).find(n=>n.type==="Field"&&n.props.label===label);
const button=(tree,label)=>nodes(tree).find(n=>n.type==="Button"&&n.props.children===label);
test("two-step password flow verifies once, validates matching new values, clears secrets and returns to Security settings",async t=>{
  const f=await fixture(t);let tree=f.render();
  assert.equal(field(tree,"New password"),undefined);
  field(tree,"Current password").props.onChangeText("fixture-current");
  tree=f.render();const verify=button(tree,"Verify current password");
  verify.props.onPress();verify.props.onPress();await tick();tree=f.render();
  assert.equal(f.calls.filter(c=>c.body.action==="verify").length,1);
  assert.equal(field(tree,"Current password"),undefined);
  field(tree,"New password").props.onChangeText("fixture-new");
  field(tree,"Confirm new password").props.onChangeText("mismatch");tree=f.render();
  assert.equal(button(tree,"Update password").props.disabled,true);
  field(tree,"Confirm new password").props.onChangeText("fixture-new");tree=f.render();
  assert.equal(button(tree,"Update password").props.disabled,false);
  button(tree,"Update password").props.onPress();await tick();tree=f.render();
  assert.ok(button(tree,"Back to Security settings"));
  assert.ok(!f.h.slots.includes("fixture-current")&&!f.h.slots.includes("fixture-new"));
  assert.equal(f.calls.find(c=>c.body.action==="change").body.flowId,"grant-a");
  assert.equal(f.calls.find(c=>c.body.action==="change").body.currentPassword,undefined);
  assert.equal(f.toasts[0].label,"Password updated");
  button(tree,"Back to Security settings").props.onPress();await tick();
  assert.deepEqual(f.routes,["/profile/security"]);
});
test("expired server authorization returns to verification and keeps the legitimate new-password draft",async t=>{
  let verified=false;
  const f=await fixture(t,(body,{api})=>{
    if(body.action==="verify")verified=true;
    if(body.action==="change"){verified=false;throw new api.ApiRequestError("Verify again","PASSWORD_VERIFICATION_EXPIRED");}
    return {state:verified?"verified":"verify",flowId:verified?"grant-a":null,serverNow:new Date().toISOString(),verificationExpiresAt:new Date(Date.now()+300_000).toISOString()};
  });
  let tree=f.render();field(tree,"Current password").props.onChangeText("fixture-current");tree=f.render();
  button(tree,"Verify current password").props.onPress();await tick();tree=f.render();
  field(tree,"New password").props.onChangeText("fixture-draft");field(tree,"Confirm new password").props.onChangeText("fixture-draft");
  tree=f.render();button(tree,"Update password").props.onPress();await tick();tree=f.render();
  assert.ok(field(tree,"Current password"));assert.ok(f.h.slots.includes("fixture-draft"));
  field(tree,"Current password").props.onChangeText("fixture-current");tree=f.render();
  button(tree,"Verify current password").props.onPress();await tick();tree=f.render();
  assert.equal(field(tree,"New password").props.value,"fixture-draft");
});
test("discard clears values immediately and waits for generation-bound server cancellation before leaving",async t=>{
  const cancel=deferred();
  const f=await fixture(t,body=>{
    if(body.action==="cancel")return cancel.promise;
    return {state:body.action==="verify"?"verified":"verify",flowId:body.action==="verify"?"grant-a":null,serverNow:new Date().toISOString(),verificationExpiresAt:new Date(Date.now()+300_000).toISOString()};
  });
  let tree=f.render();field(tree,"Current password").props.onChangeText("fixture-current");tree=f.render();
  button(tree,"Verify current password").props.onPress();await tick();tree=f.render();
  field(tree,"New password").props.onChangeText("fixture-draft");tree=f.render();
  nodes(tree).find(n=>n.type==="Page").props.onBack();tree=f.render();button(tree,"Discard").props.onPress();tree=f.render();
  assert.ok(!f.h.slots.includes("fixture-draft"));assert.deepEqual(f.routes,[]);
  assert.equal(f.calls.at(-1).body.flowId,"grant-a");
  cancel.resolve({state:"verify",serverNow:new Date().toISOString()});await tick();
  assert.deepEqual(f.routes,["/profile/security"]);
});
test("an uncertain commit response recovers completion without repeating the mutation",async t=>{
  let changed=false,verified=false;
  const f=await fixture(t,(body,{api})=>{
    if(body.action==="verify")verified=true;
    if(body.action==="change"){changed=true;throw new api.ApiRequestError("Connection interrupted","NETWORK");}
    return {state:changed?"complete":verified?"verified":"verify",flowId:"grant-a",serverNow:new Date().toISOString(),verificationExpiresAt:new Date(Date.now()+300_000).toISOString()};
  });
  let tree=f.render();field(tree,"Current password").props.onChangeText("fixture-current");tree=f.render();button(tree,"Verify current password").props.onPress();await tick();
  tree=f.render();field(tree,"New password").props.onChangeText("fixture-new");field(tree,"Confirm new password").props.onChangeText("fixture-new");
  tree=f.render();button(tree,"Update password").props.onPress();await tick();tree=f.render();
  assert.ok(button(tree,"Back to Security settings"));assert.equal(f.calls.filter(c=>c.body.action==="change").length,1);
  assert.ok(!f.h.slots.includes("fixture-new"));
});


test("a verification cooldown does not block saving an already verified password",async t=>{
  const f=await fixture(t,body=>({state:body.action==="change"?"complete":"verified",flowId:"grant-a",
    serverNow:new Date().toISOString(),cooldownUntil:new Date(Date.now()+600_000).toISOString(),
    verificationExpiresAt:new Date(Date.now()+300_000).toISOString()}));
  let tree=f.render();
  field(tree,"New password").props.onChangeText("fixture-new");
  field(tree,"Confirm new password").props.onChangeText("fixture-new");tree=f.render();
  assert.equal(button(tree,"Update password").props.disabled,false);
  button(tree,"Update password").props.onPress();await tick();tree=f.render();
  assert.equal(f.calls.filter(c=>c.body.action==="change").length,1);
  assert.ok(button(tree,"Back to Security settings"));
});
