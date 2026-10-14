import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
async function load(path,mocks){
  const exports={},source=await readFile(new URL("../"+path,import.meta.url),"utf8");
  new Function("require","exports",ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(id=>mocks[id]??{},exports);
  return exports;
}
test("unread badge refresh serializes invalidations, retains network fallback and never exposes another identity's count",async()=>{
  let value,focus,listener;
  let session={user:{id:"consumer-a"},session:{id:"session-a"}};
  const requests=[];
  const module=await load("src/hooks/use-unread-notification-count.ts",{
    react:{useState:initial=>{value??=initial;return [value,next=>{value=next;}];},useCallback:fn=>fn},
    "expo-router":{useFocusEffect:fn=>{focus=fn;}},
    "@/hooks/use-auth-session":{useAuthSession:()=>({session})},
    "@/hooks/use-consumer-account":{useConsumerAccount:()=>({accountContext:{identityUserId:session?.user.id,accessRevision:1}})},
    "@/services/notifications":{fetchNotifications:options=>{const d=deferred();requests.push({options,...d});return d.promise;},subscribeNotificationsChanged:fn=>{listener=fn;return ()=>{listener=null;};}},
  });
  assert.equal(module.useUnreadNotificationCount(),0);
  const cleanup=focus();
  assert.equal(requests.length,1);
  listener();listener();assert.equal(requests.length,1);
  requests[0].resolve({unreadCount:99});await tick();
  assert.equal(requests.length,2);assert.equal(module.useUnreadNotificationCount(),0);
  requests[1].resolve({unreadCount:7});await tick();
  assert.equal(module.useUnreadNotificationCount(),7);
  listener();requests[2].reject(Error("offline"));await tick();
  assert.equal(module.useUnreadNotificationCount(),7);
  assert.equal(requests[2].options.force,true);
  cleanup();assert.equal(requests[2].options.isCurrent(),false);
  session={user:{id:"consumer-b"},session:{id:"session-b"}};
  assert.equal(module.useUnreadNotificationCount(),0);
  const nextCleanup=focus();requests[3].resolve({unreadCount:2});await tick();
  assert.equal(module.useUnreadNotificationCount(),2);
  nextCleanup();session=null;assert.equal(module.useUnreadNotificationCount(),0);
});
test("notification button uses PanelUI's numeric badge and exposes the full unread count to assistive technology",async()=>{
  const jsx=(type,props)=>({type,props});
  let count=128;
  const module=await load("src/components/notification-button.tsx",{
    "react/jsx-runtime":{jsx,jsxs:jsx},"react-native":{View:"View"},"lucide-react-native":{Bell:"Bell"},
    "@/components/panelui/badge":{Badge:"Badge"},"@/components/panelui/button":{Button:"Button"},
    "@/context/guest-access-context":{useGuestAccess:()=>({openFeature(){}})},
    "@/hooks/use-unread-notification-count":{useUnreadNotificationCount:()=>count},
    "@/hooks/use-app-colors":{useAppColors:()=>["#102030"]},
  });
  let tree=module.NotificationButton({});
  assert.equal(tree.props.children[0].props.accessibilityLabel,"Notifications, 128 unread");
  assert.equal(tree.props.children[1].props.count,128);
  assert.equal(tree.props.children[1].props.pointerEvents,"none");
  count=0;tree=module.NotificationButton({overImage:true});
  assert.equal(tree.props.children[1],null);assert.equal(tree.props.children[0].props.style.width,44);
});

