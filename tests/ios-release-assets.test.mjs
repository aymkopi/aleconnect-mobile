import assert from 'node:assert/strict';
import {Buffer} from 'node:buffer';
import {createHash} from 'node:crypto';
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename, join} from 'node:path';
import test from 'node:test';
import * as releases from '../scripts/release-version.mjs';

const source = 'a'.repeat(40), other = 'b'.repeat(40), tag = 'v1.2.2-alpha.1';
const sha = value => createHash('sha256').update(value).digest('hex');
function fixture(t, options = {}) {
 const cwd = mkdtempSync(join(tmpdir(), 'aleconnect-ios-assets-'));
 t.after(() => rmSync(cwd, {recursive:true, force:true}));
 const folder = join(cwd, 'release/ios'); mkdirSync(folder, {recursive:true});
 writeFileSync(join(cwd,'release.config.json'),JSON.stringify({name:'aleconnect-mobile',branch:'master'}));
 writeFileSync(join(cwd,'app.json'),JSON.stringify({expo:{ios:{bundleIdentifier:'com.kapecakes.aleconnectmobile'}}}));
 const payload = Buffer.from('verified-unsigned-IPA-test-double');
 const metadata = {sourceCommit:source,bundleIdentifier:'com.kapecakes.aleconnectmobile',platform:'iPhoneOS',architecture:'arm64',signing:'unsigned; sign locally before USB installation',remotePushSupported:false,apiOrigin:'https://api.aleconnect.app',sha256:sha(payload),...options.ios};
 writeFileSync(join(folder,'Aleconnect-unsigned.ipa'),payload);
 writeFileSync(join(folder,'build-metadata.json'),JSON.stringify(metadata));
 writeFileSync(join(folder,'SHA256SUMS'),`${sha(payload)}  Aleconnect-unsigned.ipa\n`);
 const published = {tag_name:tag,draft:options.draft??false,assets:[]};
 if (options.partial) published.assets.push({name:'Aleconnect-unsigned.ipa',digest:`sha256:${options.collision?'0'.repeat(64):sha(payload)}`});
 let uploads = 0;
 const env = {GITHUB_SHA:source,GITHUB_REPOSITORY:'aymkopi/aleconnect-mobile',GITHUB_REF:'refs/heads/master',RELEASE_TAG:tag};
 const run = (program,args) => {
  assert.equal(program,'gh');
  if(args[0]==='api' && args[1].includes('git/matching-refs')) return JSON.stringify([{ref:`refs/tags/${tag}`,object:{type:'commit',sha:options.tagSource??source}}]);
  if(args[0]==='api') return JSON.stringify([[published]]);
  if(args[1]==='download') return JSON.stringify({sourceCommit:options.releaseSource??source});
  if(args[1]==='upload') {
   assert.equal(args[2],tag); assert.ok(!args.includes('--clobber')); uploads++;
   for(const path of args.filter(arg=>arg.startsWith(folder))) {
    assert.ok(!published.assets.some(asset=>asset.name===basename(path)),'Never replace a published asset');
    published.assets.push({name:basename(path),digest:`sha256:${options.badReadback?'0'.repeat(64):sha(readFileSync(path))}`});
   }
   return '';
  }
  assert.fail(`Unexpected external action: ${args.join(' ')}`);
 };
 return {cwd,env,run,folder,published,get uploads(){return uploads;}};
}

test('IPA release upload verifies source/digests and safely resumes without replacing assets',t=>{
 for(const partial of [false,true]) {
  const f=fixture(t,{partial});
  assert.deepEqual(releases.publishIosRelease(f),{skip:false,tag});
  assert.deepEqual(f.published.assets.map(asset=>asset.name).sort(),['Aleconnect-unsigned.ipa','ios-SHA256SUMS','ios-build-metadata.json']);
  assert.equal(f.uploads,1);
  assert.deepEqual(releases.publishIosRelease(f),{skip:true,tag});
  assert.equal(f.uploads,1);
 }
});

test('IPA upload refuses foreign source, invalid identity, corruption and asset collisions before upload',t=>{
 for(const options of [
  {tagSource:other},{releaseSource:other},{draft:true},{partial:true,collision:true},
  {ios:{sourceCommit:other}},{ios:{sha256:'0'.repeat(64)}},
  {ios:{bundleIdentifier:'wrong.app'}},{ios:{architecture:'x86_64'}},
  {ios:{platform:'iPhoneSimulator'}},{ios:{apiOrigin:'http://wrong.example'}},
  {ios:{signing:'signed'}},{ios:{remotePushSupported:true}},
 ]) {
  const f=fixture(t,options);
  assert.throws(()=>releases.publishIosRelease(f));
  assert.equal(f.uploads,0);
 }
 const malformed=fixture(t); malformed.env.RELEASE_TAG='latest';
 assert.throws(()=>releases.publishIosRelease(malformed)); assert.equal(malformed.uploads,0);
 const wrongBranch=fixture(t); wrongBranch.env.GITHUB_REF='refs/heads/feature';
 assert.throws(()=>releases.publishIosRelease(wrongBranch)); assert.equal(wrongBranch.uploads,0);
 const corrupt=fixture(t); writeFileSync(join(corrupt.folder,'Aleconnect-unsigned.ipa'),'corrupt');
 assert.throws(()=>releases.publishIosRelease(corrupt)); assert.equal(corrupt.uploads,0);
});

test('IPA publication reports a remote digest mismatch as failure',t=>{
 const f=fixture(t,{badReadback:true});
 assert.throws(()=>releases.publishIosRelease(f),/digest mismatch/i);
 assert.equal(f.uploads,1);
});
