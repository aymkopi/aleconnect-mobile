import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { CHILD_STATE, getFocusedRouteNameFromRoute } from './focused-route-harness.mjs';
const read = path => readFile(new URL('../'+path, import.meta.url), 'utf8');
async function load(path, mocks) {
 const exports = {};
 new Function('require','exports','React',ts.transpileModule(await read(path), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React}}).outputText)(id=>id==='expo-router/react-navigation'?{getFocusedRouteNameFromRoute,...mocks[id]}:mocks[id]??{},exports,react);
 return exports;
}
const react = {createElement:(type,props,...children)=>({type,props:{...props,children}})};
function find(node,type) { if(node?.type===type) return node; for(const child of node?.props?.children?.flat(Infinity)??[]) {const found=find(child,type); if(found)return found;} }

test('hidden tabs retain the same bar subtree and disable touch and accessibility until Back', async () => {
 let pathname='/reports';
 const module=await load('src/components/floating-tabs-bar.tsx',{'react-native':{View:'View'},'expo-router':{usePathname:()=>pathname},'@/components/floating-app-bar':{FloatingAppBar:'FloatingAppBar'},'@/context/guest-access-context':{useGuestAccess:()=>({guest:false})}});
 const route={name:'reports',state:{index:0,routes:[{name:'index'}]}};
 const props={state:{index:0,routes:[route]},navigation:{}};
 const initial=module.FloatingTabsBar(props);
 for(let visit=0;visit<3;visit++) {
  route.state={index:1,routes:[{name:'index'},{name:'[id]'}]}; pathname='/reports/ticket-1';
  const hidden=module.FloatingTabsBar(props);
  assert.ok(find(hidden,'FloatingAppBar'),'hiding must retain the animated bar instead of unmounting it');
  assert.equal(hidden.type,initial.type);
  assert.equal(hidden.props.style.opacity,0);
  assert.equal(hidden.props.pointerEvents,'none');
  assert.equal(hidden.props.accessibilityElementsHidden,true);
  assert.equal(hidden.props.importantForAccessibility,'no-hide-descendants');
  assert.equal(find(hidden,'FloatingAppBar').props.hidden,true);
  route.state={index:0,routes:[{name:'index'}]};
  const shown=module.FloatingTabsBar(props);
  assert.equal(shown.type,initial.type);
  assert.equal(shown.props.style.opacity,1);
  assert.equal(shown.props.pointerEvents,'box-none');
  assert.equal(shown.props.accessibilityElementsHidden,false);
  assert.equal(shown.props.importantForAccessibility,'auto');
  assert.equal(find(shown,'FloatingAppBar').props.hidden,false);
 }
});

test('tab visibility follows the focused stack through details and Back even when the URL lags', async () => {
 let pathname='/reports';
 const module=await load('src/components/floating-tabs-bar.tsx',{'react-native':{View:'View'},'expo-router':{usePathname:()=>pathname},'@/components/floating-app-bar':{FloatingAppBar:'FloatingAppBar'},'@/context/guest-access-context':{useGuestAccess:()=>({guest:false})}});
 const route={name:'reports',state:{type:'stack',index:0,routes:[{name:'index'}]}};
 const props={state:{index:0,routes:[route]},navigation:{}};
 assert.equal(module.FloatingTabsBar(props).props.style.opacity,1);
 route.state={type:'stack',index:1,routes:[{name:'index'},{name:'[id]'}]};
 assert.equal(module.FloatingTabsBar(props).props.style.opacity,0,'pushing details hides tabs before the URL updates');
 pathname='/reports/ticket-1';
 assert.equal(module.FloatingTabsBar(props).props.style.opacity,0);
 route.state={type:'stack',index:0,routes:[{name:'index'}]};
 assert.equal(module.FloatingTabsBar(props).props.style.opacity,1,'Back shows tabs before the URL updates');
 pathname='/reports/list';
 assert.equal(module.FloatingTabsBar(props).props.style.opacity,1,'a stale utility URL cannot hide the focused main page');
 route[CHILD_STATE]={type:'stack',index:1,routes:[{name:'index'},{name:'[id]'}]};
 assert.equal(module.FloatingTabsBar(props).props.style.opacity,0,'the navigator child state takes precedence over its cached route state');
});

test('tab visibility resolves partial stacks and pending navigation without borrowing another tab URL', async () => {
 let pathname='/reports';
 const module=await load('src/components/floating-tabs-bar.tsx',{'react-native':{View:'View'},'expo-router':{usePathname:()=>pathname},'@/components/floating-app-bar':{FloatingAppBar:'FloatingAppBar'},'@/context/guest-access-context':{useGuestAccess:()=>({guest:false})}});
 const route={name:'reports',state:{routes:[{name:'index'},{name:'[id]'}]}};
 const props={state:{index:0,routes:[route]},navigation:{}};
 assert.equal(module.FloatingTabsBar(props).props.style.opacity,0,'the last route is focused in a partial stack');
 delete route.state;
 route.params={screen:'[id]'};
 assert.equal(module.FloatingTabsBar(props).props.style.opacity,0,'a pending child screen hides tabs before its state arrives');
 route.params={screen:'index'};
 pathname='/reports/ticket-1';
 assert.equal(module.FloatingTabsBar(props).props.style.opacity,1,'an explicit root target wins over the old URL');
 delete route.params;
 route.name='home';
 pathname='/profile/accounts';
 assert.equal(module.FloatingTabsBar(props).props.style.opacity,1,'an unfocused tab URL cannot hide Home');
});
test('tab selection emits cancellable tabPress and explicitly targets nested roots',async()=>{
 const calls=[]; let prevented=false; const bar='FloatingAppBar';
 const module=await load('src/components/floating-tabs-bar.tsx',{'react-native':{View:'View'},'expo-router':{usePathname:()=>'/home'},'@/components/floating-app-bar':{FloatingAppBar:bar},'@/context/guest-access-context':{useGuestAccess:()=>({guest:false})}});
 const state={index:0,routes:[{key:'home-key',name:'home'},{key:'reports-key',name:'reports'},{key:'profile-key',name:'profile'}]};
 const navigation={navigate:(...args)=>calls.push(args),emit:event=>{calls.push(event);return {defaultPrevented:prevented};}};
 const onSelect=find(module.FloatingTabsBar({state,navigation}),bar).props.onSelect;
 onSelect(1); assert.deepEqual(calls,[{type:'tabPress',target:'reports-key',canPreventDefault:true},['reports',{screen:'index'}]]);
 calls.length=0; onSelect(2); assert.deepEqual(calls[1],['profile',{screen:'index'}]);
 calls.length=0; prevented=true;onSelect(0);assert.equal(calls.length,1);
 calls.length=0;onSelect(99);assert.equal(calls.length,0);
});
test('notification settings stays outside the Account tab and discard returns to the caller',async()=>{
 assert.ok((await read('src/features/notifications/notifications-screen.tsx')).includes('router.push("/notification-settings")'));
 const alerts=await read('src/features/profile/alerts-screen.tsx');
 assert.ok(alerts.includes('allowLeave();') && alerts.includes('leave();'));
});
test('main scroll surfaces reset on focus and repeated tab selection',async()=>{
 let focus,listener;const calls=[];const ref={current:{scrollToOffset:x=>calls.push(x)}};
 const module=await load('src/hooks/use-main-page-scroll.ts',{'react':{useRef:value=>value===false?{current:false}:ref,useCallback:fn=>fn,useEffect:fn=>fn()},'expo-router':{useFocusEffect:fn=>{focus=fn;},useNavigation:()=>({isFocused:()=>true,getState:()=>({type:"stack"}),getParent:()=>({addListener:(name,fn)=>{assert.equal(name,'tabPress');listener=fn;return()=>{};}})})}});
 assert.equal(module.useMainPageScroll(),ref);focus();listener();assert.deepEqual(calls,[{offset:0,animated:false},{offset:0,animated:false}]);
 for(const file of ['reports/main-screen','advisories/advisories-screen','hotlines/hotlines-screen','profile/account-screen'])assert.ok((await read('src/features/'+file+'.tsx')).includes('ref={scrollRef}'));
 assert.match(await read('src/features/home/home-screen.tsx'), /useMainPageScroll(?:<ScrollView>)?\(updates\.reload\)/);
});
test('all implicit toast calls default to top while explicit placement is retained',async()=>{
 const module=await load('src/components/panelui/toast-store.ts',{});const store=new module.ToastStore();
 store.show({label:'Saved',duration:0});store.show({label:'Explicit',duration:0,placement:'bottom'});
 assert.deepEqual(store.getSnapshot().map(x=>x.placement),['top','bottom']);store.hideAll();
});

test('guest Reports tab opens the feature sheet without navigating into private reports',async()=>{
 const calls=[], bar='FloatingAppBar';
 const module=await load('src/components/floating-tabs-bar.tsx',{'react-native':{View:'View'},'expo-router':{usePathname:()=>'/home'},'@/components/floating-app-bar':{FloatingAppBar:bar},'@/context/guest-access-context':{useGuestAccess:()=>({guest:true,requestSignIn:(...args)=>calls.push(['gate',...args])})}});
 const state={index:0,routes:[{key:'home',name:'home'},{key:'reports',name:'reports'},{key:'profile',name:'profile'}]};
 const navigation={navigate:(...args)=>calls.push(['navigate',...args]),emit:()=>({defaultPrevented:false})};
 const onSelect=find(module.FloatingTabsBar({state,navigation}),bar).props.onSelect;
 onSelect(1);assert.deepEqual(calls,[['gate','/reports','reports']]);
 calls.length=0;onSelect(2);assert.deepEqual(calls,[['navigate','profile',{screen:'index'}]]);
});

test('guest gate clears for auth recovery and protects a direct appearance URL',async()=>{
  let pathname='/reports', params={}, gate=null; const effects=[], calls=[];
  const router={replace:(...args)=>calls.push(args)};
  const contextReact={...react,createContext:()=>({Provider:'Provider'}),useCallback:fn=>fn,useState:()=>[gate,value=>{gate=value;}],useEffect:fn=>effects.push(fn)};
  const policy=await import('../src/features/auth/guest-access.ts');
  const module=await load('src/context/guest-access-context.tsx',{'react':contextReact,'expo-router':{useRouter:()=>router,usePathname:()=>pathname,useGlobalSearchParams:()=>params},'@/hooks/use-auth-session':{useAuthSession:()=>({session:null,isLoading:false})},'@/context/visual-preview-context':{useVisualPreview:()=>({fixtures:false})},'@/features/auth/guest-access':policy,'@/components/panelui/bottom-sheet':{BottomSheet:Object.assign(()=>{}, {Content:'Content',Body:'Body'})}});
  const render=()=>{module.GuestAccessProvider({});while(effects.length)effects.shift()();};
  render();assert.equal(gate.kind,'reports');assert.deepEqual(calls,[['/home']]);
  pathname='/sign-in';render();assert.equal(gate,null);
  pathname='/profile';params={appearance:'1'};render();assert.equal(gate.path,'/profile?appearance=1');
});
test('global service search uses guest gating, public previews and external contact handling',async()=>{
  const calls=[];
  const module=await load('src/features/services/search-screen.tsx',{'react':{...react,useState:()=>['Appearance',()=>{}],useEffect:()=>{}},'react-native':{View:'View'},'expo-router':{useRouter:()=>({push:(...args)=>calls.push(['push',...args])}),useLocalSearchParams:()=>({})},'@/context/guest-access-context':{useGuestAccess:()=>({openFeature:(...args)=>calls.push(['gate',...args])})},'@/hooks/use-auth-session':{useAuthSession:()=>({session:null})},'@/hooks/use-consumer-account':{useConsumerAccount:()=>({})},'@/context/visual-preview-context':{useVisualPreview:()=>({fixtures:false,publicFixtures:true})},'@/hooks/use-scoped-read':{useScopedRead:()=>({})},'@/features/main-fixtures':{fixtureHotlines:[]},'./catalog':{searchServices:()=>[{id:'appearance',title:'Appearance',route:'/profile?appearance=1'},{id:'website',title:'Website',route:'https://web.alecoinc.com.ph/'}]},'./service-row':{ServiceRow:'ServiceRow'},'@/features/hotlines/contact-card':{openContact:url=>calls.push(['external',url])}});
  const tree=module.default(), rows=[];
  const walk=node=>{if(node?.type==='ServiceRow')rows.push(node);for(const child of node?.props?.children?.flat(Infinity)??[])walk(child);};walk(tree);
  rows.find(row=>row.props.title==='Appearance').props.onPress();rows.find(row=>row.props.title==='Website').props.onPress();rows.find(row=>row.props.title==='Sign in to search your reports').props.onPress();
  assert.deepEqual(calls,[['gate','/profile?appearance=1',true],['external','https://web.alecoinc.com.ph/'],['gate','/reports']]);
});
