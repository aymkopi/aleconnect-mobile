import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import * as releases from '../scripts/release-version.mjs';

const source='a'.repeat(40);
function fixture(t,context=true) {
 const cwd=mkdtempSync(join(tmpdir(),'aleconnect-ios-version-'));
 t.after(()=>rmSync(cwd,{recursive:true,force:true}));
 const original={expo:{version:'1.0.0-alpha.10',ios:{bundleIdentifier:'com.kapecakes.aleconnectmobile',infoPlist:{retained:true}},android:{versionCode:71},extra:{eas:{projectId:'retained'}}}};
 writeFileSync(join(cwd,'app.json'),JSON.stringify(original));
 const metadata={version:'1.3.1-alpha.2',versionCode:72,sourceCommit:source};
 mkdirSync(join(cwd,'release'));
 writeFileSync(join(cwd,'release/build-metadata.json'),JSON.stringify(metadata));
 const env={GITHUB_SHA:source,RELEASE_VERSION:metadata.version,RELEASE_BUILD_NUMBER:String(metadata.versionCode),RELEASE_CONTEXT_REQUIRED:String(context),GITHUB_RUN_NUMBER:'999'};
 return {cwd,env,original,metadata};
}

test('iOS uses the allocated native core/build and retains the full alpha for the app label',t=>{
 const f=fixture(t);
 releases.prepareIosReleaseConfig(f);
 const app=JSON.parse(readFileSync(join(f.cwd,'app.json'),'utf8')).expo;
 assert.equal(app.version,'1.3.1');
 assert.equal(app.ios.buildNumber,'72');
 assert.equal(app.extra.releaseVersion,'1.3.1-alpha.2');
 assert.equal(app.extra.eas.projectId,'retained');
 assert.deepEqual(app.ios.infoPlist,f.original.expo.ios.infoPlist);
 assert.equal(app.ios.bundleIdentifier,f.original.expo.ios.bundleIdentifier);
 assert.deepEqual(app.android,f.original.expo.android);
});

test('standalone iOS builds require explicit alpha and build inputs without a release context',t=>{
 const f=fixture(t,false);
 releases.prepareIosReleaseConfig(f);
 assert.equal(JSON.parse(readFileSync(join(f.cwd,'app.json'),'utf8')).expo.ios.buildNumber,'72');
});

test('invalid native release inputs fail before changing app configuration',t=>{
 for(const patch of [{RELEASE_VERSION:''},{RELEASE_VERSION:'1.3.1'},{RELEASE_VERSION:'1.3.1-alpha.01'},
  {RELEASE_BUILD_NUMBER:'0'},{RELEASE_BUILD_NUMBER:'072'},{RELEASE_BUILD_NUMBER:'2100000001'},{RELEASE_BUILD_NUMBER:''},{GITHUB_SHA:'wrong'}]) {
  const f=fixture(t,false);
  const before=readFileSync(join(f.cwd,'app.json'),'utf8');
  assert.throws(()=>releases.prepareIosReleaseConfig({...f,env:{...f.env,...patch}}));
  assert.equal(readFileSync(join(f.cwd,'app.json'),'utf8'),before);
 }
});

test('shared release context must match the exact source, alpha and monotonic native build',t=>{
 for(const patch of [{sourceCommit:'b'.repeat(40)},{version:'1.3.0-alpha.1'},{versionCode:71}]) {
  const f=fixture(t);
  const before=readFileSync(join(f.cwd,'app.json'),'utf8');
  writeFileSync(join(f.cwd,'release/build-metadata.json'),JSON.stringify({...f.metadata,...patch}));
  assert.throws(()=>releases.prepareIosReleaseConfig(f),/source|version|build/i);
  assert.equal(readFileSync(join(f.cwd,'app.json'),'utf8'),before);
 }
});
