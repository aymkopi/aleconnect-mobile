import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import ts from 'typescript';
import { findDivergentState, getPayloadFromStateRoute } from '../node_modules/expo-router/build/global-state/stateUtils.js';
import { StackRouter } from '../node_modules/expo-router/build/react-navigation/routers/StackRouter.js';

const app = new URL('../src/app/', import.meta.url);
async function routes(folder = app, parts = []) {
 const result=[];
 for(const entry of await readdir(folder,{withFileTypes:true})) {
  const next=new URL(entry.name+(entry.isDirectory()?'/':''),folder);
  if(entry.isDirectory()) result.push(...await routes(next,[...parts,entry.name]));
  else if(entry.name.endsWith('.tsx')&&!entry.name.startsWith('_')) result.push([...parts,entry.name.slice(0,-4)]);
 }
 return result;
}

test('only the five main pages live in tabs; private children are native-stack siblings', async () => {
 const entries=await routes();
 const tabs=entries.filter(parts=>parts[0]==='(tabs)').map(parts=>parts.slice(1).join('/')).sort();
 assert.deepEqual(tabs,['advisories','home','hotlines','profile','reports']);
 for(const name of ['[id]','list','new','period','queue','timeline']) {
  assert.ok(entries.some(parts=>parts.join('/')===`(private)/reports/${name}`));
 }
 for(const name of ['accounts','link-account','details','security','change-password','photo','link-requests','push-notifications','help','about','privacy','terms']) {
  assert.ok(entries.some(parts=>parts.join('/')===`(private)/profile/${name}`));
 }
 const paths=entries.map(parts=>'/'+parts.filter(part=>!part.startsWith('(')&&part!=='index').join('/'));
 assert.equal(new Set(paths).size,paths.length,'preserved public URLs must have one route each');
});

test('private native-stack pages retain mandatory-password redirect and the original return URL', async () => {
 const file=new URL('(private)/_layout.tsx',app);
 const source=await readFile(file,'utf8');
 let session={user:{mustChangePassword:false}};
 const jsx=(type,props)=>({type,props});
 const modules={
  'react/jsx-runtime':{jsx,jsxs:jsx},
  'expo-router':{Stack:'Stack',Redirect:'Redirect',usePathname:()=>'/reports/ticket-1'},
  '@/hooks/use-auth-session':{useAuthSession:()=>({session})},
  '@/hooks/use-app-colors':{useAppColors:()=>['white']},
  '@/features/auth/auth-state':{authReturnRoute:path=>path},
 };
 const exports={};
 new Function('require','exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(id=>modules[id]??{},exports);
 assert.equal(exports.default().type,'Stack');
 session={user:{mustChangePassword:true}};
 assert.deepEqual(exports.default(),{type:'Redirect',props:{href:{pathname:'/required-password',params:{returnTo:'/reports/ticket-1'}}}});
});

const stack = StackRouter({});
const options = { routeParamList: {}, routeGetIdList: {} };
function rootState(withTabs = true) {
 const tabs = { key: 'tabs-retained', name: '(tabs)', state: { type: 'tab', key: 'main-tabs', index: 4,
  routes: ['home','advisories','hotlines','reports','profile'].map(name => ({ name, key: `${name}-retained` })) } };
 const routes = [...(withTabs ? [tabs] : []), { key: 'private-page', name: '(private)' }];
 return { stale: false, type: 'stack', key: 'root', routeNames: ['(tabs)','(private)'], index: routes.length - 1, routes, preloadedRoutes: [] };
}
function returnToMain(state, type, name, params = {}) {
 const destination = { routes: [{ name: '(tabs)', state: { routes: [{ name, params }] } }] };
 const { actionStateRoute, navigationState } = findDivergentState(destination, state);
 const payload = getPayloadFromStateRoute(actionStateRoute);
 return stack.getStateForAction(state, { type, target: navigationState.key,
  payload: { name: payload.screen, params: payload.params } }, options);
}

test('Security Back reveals the original tabs without remounting other loaded pages', async () => {
 let state = rootState();
 const retained = state.routes[0];
 const navigate = type => path => { state = returnToMain(state, type, path.slice(1)); };
 const jsx = (type, props) => ({ type, props });
 const mocks = {
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'expo-router': { useRouter: () => ({ replace: navigate('REPLACE'), dismissTo: navigate('POP_TO') }) },
  '@/hooks/use-app-colors': { useAppColors: () => ['blue'] },
 };
 const source = await readFile(new URL('../src/features/profile/security-screen.tsx', import.meta.url), 'utf8');
 const exports = {};
 new Function('require','exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(id=>mocks[id]??{},exports);
 exports.default().props.children({ account: { sessionMode: 'identity' } }).props.onBack();
 assert.deepEqual(state.routes.map(route => route.key), [retained.key]);
 assert.equal(state.routes[0].state, retained.state);
 assert.equal(state.routes[0].params.screen, 'profile');
});

test('return-to-main keeps period parameters and supports a cold private deep link', () => {
 const original = rootState();
 const params = { period: 'custom', start: '2026-10-01', end: '2026-10-18' };
 const returned = returnToMain(original, 'POP_TO', 'reports', params);
 assert.equal(returned.routes.length, 1);
 assert.equal(returned.routes[0].state, original.routes[0].state);
 assert.equal(returned.routes[0].params.screen, 'reports');
 assert.deepEqual(returned.routes[0].params.params, params);
 const cold = returnToMain(rootState(false), 'POP_TO', 'reports');
 assert.deepEqual(cold.routes.map(route => route.name), ['(tabs)']);
 assert.equal(cold.routes[0].params.screen, 'reports');
});
