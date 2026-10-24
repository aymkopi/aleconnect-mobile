import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
const jsx=(type,props)=>({type,props});
async function load(path,modules){const source=await readFile(new URL("../"+path,import.meta.url),"utf8");const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;const exports={};vm.runInNewContext(code,{exports,require:name=>{if(name==="react/jsx-runtime")return{jsx,jsxs:jsx,Fragment:"Fragment"};if(!(name in modules))throw new Error(name);return modules[name];}});return exports;}
const children=node=>[node,...[node?.props?.children].flat().filter(Boolean).flatMap(children)].filter(Boolean);
test("native status bar adapts to app theme, photographs and device safe area without intercepting touches",async()=>{
 let top=52,theme="dark",background="#00060F";
 const{AppStatusBar}=await load("src/components/app-status-bar.tsx",{"react-native":{View:"View"},"expo-status-bar":{StatusBar:"StatusBar"},"react-native-safe-area-context":{useSafeAreaInsets:()=>({top})},"uniwind":{useUniwind:()=>({theme})},"@/hooks/use-app-colors":{useAppColors:()=>[background]}});
 const inspect=props=>{const nodes=children(AppStatusBar(props));return{bar:nodes.find(n=>n.type==="StatusBar").props,band:nodes.find(n=>n.type==="View")?.props};};
 let r=inspect({});assert.equal(r.bar.style,"light");assert.equal(r.band.style.height,52);assert.equal(r.band.style.backgroundColor,"#00060F");assert.equal(r.band.pointerEvents,"none");assert.equal(r.band.accessible,false);
 theme="light";background="#F6F7F9";r=inspect({});assert.equal(r.bar.style,"dark");assert.equal(r.band.style.backgroundColor,background);
 r=inspect({photo:true});assert.equal(r.bar.style,"light");assert.equal(r.band,undefined,"photo must remain visible behind native status icons");
 theme="dark";r=inspect({photo:true});assert.equal(r.bar.style,"light");assert.equal(r.band,undefined);
 theme="moon-dark";top=24;assert.equal(inspect({}).bar.style,"light");assert.equal(inspect({}).band.style.height,24);
 top=0;assert.equal(inspect({}).band.style.height,0);
});
test("PanelUI ScrollFade keeps list refs, measurements and animated consumer handlers; edges clamp during bounce and fitting content",async()=>{
 const shared=[];let wrapperCount=0;
 const reanimated={__esModule:true,default:{createAnimatedComponent:type=>{wrapperCount++;return "Animated("+type.name+")";},View:"Animated.View"},useSharedValue:value=>{const v={value};shared.push(v);return v;},useDerivedValue:fn=>({get value(){return fn();}}),useAnimatedScrollHandler:handlers=>Object.assign(event=>handlers.onScroll(event),{workletEventHandler:true}),useComposedEventHandler:handlers=>event=>handlers.filter(h=>h?.workletEventHandler).forEach(h=>h(event)),useAnimatedStyle:fn=>fn()};
 const{ScrollFade}=await load("src/components/panelui/scroll-fade.tsx",{"react":{createElement:jsx,Children:{only:x=>x},isValidElement:x=>!!x?.type,useMemo:fn=>fn()},"react-native":{View:"View",StyleSheet:{absoluteFill:{position:"absolute"}}},"expo-linear-gradient":{LinearGradient:"LinearGradient"},"react-native-reanimated":reanimated,"uniwind":{useCSSVariable:()=>"#00060F"}});
 let layouts=0,sizes=0,scrolls=0;const ref={current:{scrollTo(){}}};const child=jsx(function FlatList(){},{ref,onLayout:()=>layouts++,onContentSizeChange:()=>sizes++,onScroll:Object.assign(()=>scrolls++,{workletEventHandler:true})});
 const tree=ScrollFade({children:child,size:16,edges:"both"});const[list,start,end]=tree.props.children;
 const rerender=ScrollFade({children:child,size:16,edges:"start"});assert.equal(rerender.props.children[0].type,list.type);assert.equal(wrapperCount,1);
 assert.equal(list.props.ref,ref);list.props.onLayout({nativeEvent:{layout:{width:400,height:600}}});list.props.onContentSizeChange(400,1200);assert.equal(layouts,1);assert.equal(sizes,1);assert.equal(start.props.opacity.value,0);assert.equal(end.props.opacity.value,1);
 list.props.onScroll({contentOffset:{x:0,y:24},contentSize:{width:400,height:1200},layoutMeasurement:{width:400,height:600}});assert.equal(scrolls,1);assert.equal(start.props.opacity.value,1);
 shared[0].value=-30;assert.equal(start.props.opacity.value,0);shared[0].value=900;assert.equal(end.props.opacity.value,0);
 shared[1].value=500;assert.equal(start.props.opacity.value,0);assert.equal(end.props.opacity.value,0);
 shared[0].value=-24;shared[1].value=600;shared[2].value=600;assert.equal(end.props.opacity.value,0,"fitting content never fades during a top bounce");
 const fade=start.type(start.props);assert.equal(fade.props.pointerEvents,"none");assert.deepEqual(Array.from(fade.props.children.props.colors),["rgba(0, 6, 15, 1)","rgba(0, 6, 15, 0)"]);
});
test("main and child layouts scroll directly without fade overlays while retaining native safe areas",async()=>{
 const paths=["home/home-screen.tsx","profile/account-screen.tsx","reports/main-screen.tsx","advisories/advisories-screen.tsx","hotlines/hotlines-screen.tsx","reports/components/report-page.tsx"];
 for(const path of paths){const s=await readFile(new URL("../src/features/"+path,import.meta.url),"utf8");assert.ok(!/ScrollFade|ScrollBlur/.test(s),path);assert.ok(s.includes('className="flex-1"'),path);if(!path.startsWith('home/'))assert.ok(s.includes('showsVerticalScrollIndicator={false}'),path);else assert.ok(s.includes('scrollEnabled={layout.scrollRequired || showOutage || hasSavedOutage}') && s.includes('showsVerticalScrollIndicator={false}'),path);if(!path.startsWith("home/"))assert.ok(s.includes('style={{ paddingTop: insets.top }}'),path);}
 const root=await readFile(new URL("../src/app/_layout.tsx",import.meta.url),"utf8");assert.ok(root.includes('<AppStatusBar photo={photo} />'));assert.ok(root.includes('params.context !== "session-ended"'));
 const signIn=await readFile(new URL("../src/features/auth/sign-in-screen.tsx",import.meta.url),"utf8");assert.ok(!signIn.includes('<StatusBar'));
});
