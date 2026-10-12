import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function moduleAt(path, mocks) {
  const source = await readFile(new URL("../" + path, import.meta.url), "utf8");
  const exports = {};
  new Function("require", "exports", ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText)(id => { assert.ok(id in mocks, "Unmocked " + id); return mocks[id]; }, exports);
  return exports;
}
const jsx = (type, props) => ({ type, props });
const find = (node, type) => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(n => find(n, type)) : [...(node.type === type ? [node] : []), ...find(node.props?.children, type)];

test("content skeletons reserve Figma geometry, scale for text and announce each region once", async () => {
  let fontScale = 1, focused = true;
  const { ContentSkeleton } = await moduleAt("src/components/content-skeleton.tsx", {
    "react/jsx-runtime": { jsx, jsxs: jsx }, "react-native": { View: "View", useWindowDimensions: () => ({ fontScale }) },
    "expo-router/react-navigation": { useIsFocused: () => focused }, "@/components/panelui/skeleton": { Skeleton: "Skeleton" },
  });
  for (const [layout, height] of Object.entries({ report:112, advisory:112, contact:136, notification:96, profile:176, identity:80, selection:56, settings:116, form:180, detail:152 })) {
    const tree = ContentSkeleton({ layout, count:2, label:"Loading " + layout });
    const bones = find(tree,"Skeleton");
    assert.equal(tree.props.accessibilityState.busy, true);
    assert.equal(tree.props.accessibilityLabel,"Loading " + layout);
    assert.equal(bones.length,2);
    assert.equal(tree.props.children[0].props.style.minHeight,height);
    assert.equal(bones[0].props.style.minHeight,height-(layout === "identity" ? 16 : 25.5));
    assert.ok(bones.every(n => n.props.label == null && n.props.animated));
    for (const row of bones[0].props.children.props.children) {
      const widths = row.props.children.filter(n => typeof n?.props.style.width === "string").map(n => parseFloat(n.props.style.width));
      assert.ok(widths.reduce((a,b)=>a+b,0)<=100,"placeholder row fits width");
    }
  }
  assert.equal(find(ContentSkeleton({layout:"identity",count:1,label:"Loading profile"}),"Skeleton")[0].props.children.props.children[0].props.children[0].props.style.width,64);
  fontScale=1.3; focused=false;
  const large=ContentSkeleton({ layout:"advisory",count:1,label:"Loading updates" });
  assert.equal(large.props.children[0].props.style.minHeight,145.6);
  assert.equal(find(large,"Skeleton")[0].props.animated,false);
});

test("PanelUI skeleton pauses in background, off-route and reduced motion; cleanup cancels animation", async () => {
  for (const reducedMotion of [false,true]) for (const animated of [false,true]) {
    let currentState="active", listener, cleanup, removed=false, repeats=0, cancellations=0;
    const opacity={value:1};
    const { Skeleton }=await moduleAt("src/components/panelui/skeleton.tsx",{
      "react/jsx-runtime":{jsx,jsxs:jsx}, "react":{memo:fn=>fn,useEffect:fn=>{cleanup=fn();}},
      "react-native":{AppState:{get currentState(){return currentState;},addEventListener:(name,fn)=>{assert.equal(name,"change");listener=fn;return {remove:()=>{removed=true;}};}}},
      "react-native-reanimated":{default:{View:"Animated.View"},cancelAnimation:()=>{cancellations++;},useAnimatedStyle:fn=>fn(),useReducedMotion:()=>reducedMotion,useSharedValue:()=>opacity,withRepeat:()=>{repeats++;return "pulse";},withTiming:value=>value},
      "@/lib/cn":{cn:(...values)=>values.filter(Boolean).join(" ")},
    });
    const tree=Skeleton({animated,children:"content"});
    assert.equal(tree.props.accessibilityElementsHidden,true);
    assert.equal(tree.props.children,"content");
    assert.equal(repeats,!reducedMotion&&animated?1:0);
    listener("background"); assert.equal(opacity.value,0.7);
    listener("active"); assert.equal(opacity.value,!reducedMotion&&animated?"pulse":0.7);
    cleanup(); assert.equal(removed,true); assert.ok(cancellations>=4);
  }
});

test("route recovery retries without deleting saved work and unknown routes return Home", async () => {
  const actions=[];let busy=false;
  const {default:RecoveryScreen,ErrorBoundary}=await moduleAt("src/features/recovery/recovery-screen.tsx",{
    "react/jsx-runtime":{jsx,jsxs:jsx},"react":{useState:()=>[busy,()=>{}]},"react-native":{View:"View",ScrollView:"ScrollView"},
    "expo-router":{useRouter:()=>({replace:path=>actions.push(path)})},"react-native-safe-area-context":{useSafeAreaInsets:()=>({top:24,bottom:24})},
    "lucide-react-native":{ArrowLeft:"ArrowLeft",CircleAlert:"CircleAlert",MapPinOff:"MapPinOff"},
    "@/components/panelui/button":{Button:"Button"},"@/components/panelui/text":{Text:"Text"},
    "@/components/panelui/panel-ui-provider":{PanelUIProvider:"PanelUIProvider"},"@/components/data-state":{DataState:"DataState"},
    "@/components/app-status-bar":{AppStatusBar:"AppStatusBar"},"@/hooks/use-app-colors":{useAppColors:()=>["#fff"]},
  });
  const tree=RecoveryScreen({});
  const viewport=find(tree,"ScrollView")[0];
  assert.ok(viewport);assert.equal(viewport.props.showsVerticalScrollIndicator,false);
  assert.equal(viewport.props.showsHorizontalScrollIndicator,false);
  assert.equal(find(viewport,"Button").length,0,"header remains outside scrolling recovery content");
  const missing=find(tree,"DataState")[0];
  assert.equal(missing.props.actionLabel,"Back to Home");missing.props.onAction();assert.deepEqual(actions,["/home"]);
  let retries=0;
  const props={retry:async()=>{retries++;throw Error("Private crash");},error:Error("Private crash")};
  const boundary=ErrorBoundary(props);assert.equal(boundary.type,"PanelUIProvider");
  const state=find(RecoveryScreen(props),"DataState")[0];state.props.onAction();await new Promise(setImmediate);assert.equal(retries,1);
  assert.ok(state.props.description.includes("Saved reports"));assert.doesNotMatch(JSON.stringify(state),/Private crash/);
  busy=true;find(RecoveryScreen(props),"DataState")[0].props.onAction();await new Promise(setImmediate);assert.equal(retries,1);
});
