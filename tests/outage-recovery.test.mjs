import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
test('Home recovery keeps every pending acknowledgement visible beyond recent receipt limits',async()=>{
  const items=Array.from({length:11},(_,index)=>({id:String(index),status:'needs_attention',accessRevision:2,createdAt:'2026-10-23T00:00:00Z',payload:{advisoryId:'notice'},receipt:null}));
  let slot=0;const jsx=(type,props)=>({type,props});
  const modules={
    'react/jsx-runtime':{jsx,jsxs:jsx},'react':{useState:initial=>[slot++===0?items:initial,()=>{}],useEffect(){}},
    'react-native':{View:'View'},'expo-router':{useRouter:()=>({push(){}})},
    '@/components/panelui/button':{Button:'Button'},'@/components/panelui/text':{Text:'Text'},
    '@/services/consumer-update-queue':{},'./data':{formatReportDate:value=>value},
  };
  const exports={},source=await readFile(new URL('../src/features/reports/saved-outage-acknowledgements.tsx',import.meta.url),'utf8');
  new Function('require','exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(name=>{assert.ok(name in modules,name);return modules[name]},exports);
  const root=exports.SavedOutageAcknowledgements({scope:{accessRevision:2},serviceAccountId:'a',accountLabel:'Home',canRetry:false});
  const text=node=>Array.isArray(node)?node.flatMap(text):node&&typeof node==='object'?text(node.props?.children):[node];
  assert.equal(text(root).filter(value=>value==='Saved acknowledgement needs review').length,11);
});
