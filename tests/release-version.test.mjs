import assert from 'node:assert/strict';
import {Buffer} from 'node:buffer';
import {createHash} from 'node:crypto';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename, join} from 'node:path';
import test from 'node:test';
import {classifyCommits, nextRelease, prepareRelease, publishRelease} from '../scripts/release-version.mjs';

const source = 'a'.repeat(40);
const previous = 'b'.repeat(40);
const config = {name: 'aleconnect-mobile', branch: 'master', android: {package: 'com.kapecakes.aleconnectmobile', minimumVersionCode: 64, certificateSha256: 'f'.repeat(64)}};

test('Conventional Commits use the highest impact across the entire release', () => {
  assert.equal(classifyCommits(['fix: correct badge']), 'patch');
  assert.equal(classifyCommits(['FIX: correct badge']), 'patch');
  assert.equal(classifyCommits(['Feat(accounts): add search']), 'minor');
  assert.equal(classifyCommits(['FEAT: add search']), 'minor');
  assert.equal(classifyCommits(['fix: correct badge', 'feat(reports): add exports']), 'minor');
  for (const message of ['feat(api)!: remove endpoint', 'chore: migrate\n\nBREAKING CHANGE: old clients need updating', 'refactor: migrate\n\nBREAKING-CHANGE: remove format']) {
    assert.equal(classifyCommits([message]), 'major');
  }
  assert.equal(classifyCommits(['perf: reduce requests']), 'patch');
  assert.equal(classifyCommits(['docs: update guide', 'chore(ci): review']), null);
});

test('alpha cores follow impact and alpha retries advance by one independently of CI', () => {
  assert.deepEqual(nextRelease({}), {version: '1.0.0-alpha.1', bump: 'initial'});
  const current = {version: '1.0.0-alpha.10'};
  assert.equal(nextRelease({current, messages: ['fix: align icon']}).version, '1.0.1-alpha.1');
  assert.equal(nextRelease({current, messages: ['feat: add search']}).version, '1.1.0-alpha.1');
  assert.equal(nextRelease({current, messages: ['fix!: remove old API']}).version, '2.0.0-alpha.1');
  assert.equal(nextRelease({current, bump: 'alpha'}).version, '1.0.0-alpha.11');
  assert.equal(nextRelease({current, bump: 'minor', messages: ['fix: badge']}).version, '1.1.0-alpha.1');
  assert.equal(nextRelease({current, messages: ['Update existing app behavior']}).bump, 'patch');
  for (const bump of ['stable', 'beta', 'patch;exit', '']) assert.throws(() => nextRelease({current, bump}));
  for (const version of ['1.0.0', '1.0.0-alpha.01', '1.0.0-alpha.0', 'v1.0.0-alpha.2', '9007199254740992.0.0-alpha.1']) {
    assert.throws(() => nextRelease({current: {version}, bump: 'alpha'}));
  }
});

test('Android codes never follow semver or reset when the alpha core changes', () => {
  assert.equal(nextRelease({androidFloor: 1}).versionCode, 2);
  assert.equal(nextRelease({current: {version: '1.0.0-alpha.10', versionCode: 64}, androidFloor: 62, messages: ['feat!: change API']}).versionCode, 65);
  assert.equal(nextRelease({current: {version: '1.0.0-alpha.10', versionCode: 64}, androidFloor: 90}).versionCode, 91);
  assert.throws(() => nextRelease({androidFloor: 2100000000}));
  assert.throws(() => nextRelease({androidFloor: -1}));
  assert.throws(() => nextRelease({current: {version: '1.0.0-alpha.10', versionCode: '64'}, androidFloor: 1}));
});

function fixture(t, options = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'aleconnect-version-'));
  t.after(() => rmSync(cwd, {recursive: true, force: true}));
  writeFileSync(join(cwd, 'release.config.json'), JSON.stringify(config));
  writeFileSync(join(cwd, 'package.json'), JSON.stringify({name: config.name, version: '1.0.0-alpha.8'}));
  writeFileSync(join(cwd, 'package-lock.json'), JSON.stringify({version: '1.0.0-alpha.8', packages: {'': {version: '1.0.0-alpha.8'}}}));
  writeFileSync(join(cwd, 'app.json'), JSON.stringify({expo: {version: '1.0.0-alpha.8', android: {package: config.android.package, versionCode: 62, googleServicesFile: './google-services.json'}, extra: {retained: true}}}));
  const calls = [];
  const releases = options.releases ?? [{tag_name: 'v1.0.0-alpha.10', draft: false, assets: []}, {tag_name: 'v1.0.0-alpha.8', draft: false, assets: []}, {tag_name: 'v2.0.0-preview.1', draft: false}];
  const env = {GITHUB_SHA: source, GITHUB_REPOSITORY: 'aymkopi/aleconnect-mobile', GITHUB_REF: 'refs/heads/master', GITHUB_OUTPUT: join(cwd, 'output')};
  const run = (command, args) => {
    calls.push([command, ...args]);
    if (command === 'gh' && args[0] === 'api' && args[1].includes('/git/matching-refs/')) return JSON.stringify(options.tagSource ? [{ref: `refs/tags/${args[1].split('/').pop()}`, object: {type: 'commit', sha: options.tagSource}}] : []);
    if (command === 'gh' && args[0] === 'api') return JSON.stringify([releases]);
    if (command === 'gh' && args[0] === 'release' && args[1] === 'download') return JSON.stringify(options.metadata ?? {version: '1.0.0-alpha.10', versionCode: 64, sourceCommit: previous, package: config.android.package});
    if (command === 'git' && args[0] === 'rev-parse') return args[1] === 'HEAD' ? source : (options.previousSource ?? previous);
    if (command === 'git' && args[0] === 'merge-base') { if (options.diverged && args[2] !== source) throw new Error('Not ancestor'); return ''; }
    if (command === 'git' && args[0] === 'log') return 'fix: correct badge\0feat(reports): add exports\0';
    throw new Error(`Unexpected call ${command} ${args.join(' ')}`);
  };
  return {cwd, env, run, calls};
}

test('prepare uses published metadata, keeps providers and updates all version manifests', t => {
  const f = fixture(t);
  const result = prepareRelease(f);
  assert.equal(result.version, '1.1.0-alpha.1');
  assert.equal(result.versionCode, 65);
  assert.equal(result.sourceCommit, source);
  const app = JSON.parse(readFileSync(join(f.cwd, 'app.json')));
  assert.equal(app.expo.android.googleServicesFile, './google-services.json');
  assert.equal(app.expo.extra.retained, true);
  assert.equal(app.expo.android.versionCode, 65);
  assert.equal(JSON.parse(readFileSync(join(f.cwd, 'package-lock.json'))).packages[''].version, result.version);
  assert.match(readFileSync(join(f.cwd, 'output'), 'utf8'), /skip=false/);
  assert.match(readFileSync(join(f.cwd, 'release/notes.md'), 'utf8'), /### Added[\s\S]*### Fixed/);
});

test('a published source is idempotent and stale runs cannot release or deploy backwards', t => {
  const f = fixture(t, {previousSource: source, tagSource: source, metadata: {sourceCommit: source}});
  const repeated = prepareRelease(f);
  assert.equal(repeated.skip, true);
  assert.equal(repeated.tag, 'v1.0.0-alpha.10', 'Keep the exact tag available for unfinished IPA upload');
  assert.match(readFileSync(join(f.cwd, 'output'), 'utf8'), /tag=v1\.0\.0-alpha\.10/);
  const stale = fixture(t, {diverged: true});
  assert.equal(prepareRelease(stale).skip, true);
  assert.equal(prepareRelease(stale).tag, undefined, 'Older source must not attach an IPA to a newer release');
  assert.equal(JSON.parse(readFileSync(join(stale.cwd, 'app.json'))).expo.android.versionCode, 62);
});

test('published-source recovery refuses mismatched remote tag or metadata',t=>{
 for(const options of [
  {previousSource:source,tagSource:previous,metadata:{sourceCommit:source}},
  {previousSource:source,tagSource:source,metadata:{sourceCommit:previous}},
 ]) assert.throws(()=>prepareRelease(fixture(t,options)),/different source/);
});

test('same-source combined recovery keeps the published version and only resumes a missing IPA',t=>{
 const published={version:'1.0.0-alpha.10',tag:'v1.0.0-alpha.10',versionCode:64,sourceCommit:source,package:config.android.package,certificateSha256:config.android.certificateSha256,fileName:'aleconnect-mobile-1.0.0-alpha.10.apk'};
 const f=fixture(t,{previousSource:source,tagSource:source,metadata:published});
 f.env.RELEASE_INCLUDE_IOS='true';
 const resumed=prepareRelease(f);
 assert.equal(resumed.skip,true,'Do not rebuild or republish Android');
 assert.equal(resumed.ios_needed,true);
 assert.equal(resumed.version,published.version);
 assert.equal(resumed.versionCode,published.versionCode);
 assert.deepEqual(JSON.parse(readFileSync(join(f.cwd,'release/build-metadata.json'))),published);
 assert.equal(JSON.parse(readFileSync(join(f.cwd,'app.json'))).expo.version,published.version);
 const complete=fixture(t,{previousSource:source,tagSource:source,metadata:published,releases:[{tag_name:published.tag,draft:false,assets:['Aleconnect-unsigned.ipa','ios-build-metadata.json','ios-SHA256SUMS'].map(name=>({name}))}]});
 complete.env.RELEASE_INCLUDE_IOS='true';
 assert.equal(prepareRelease(complete).ios_needed,false);
 for(const patch of [{version:'1.0.0-alpha.9'},{versionCode:0},{package:'foreign.app'}]) {
  const bad=fixture(t,{previousSource:source,tagSource:source,metadata:{...published,...patch}});
  bad.env.RELEASE_INCLUDE_IOS='true';
  assert.throws(()=>prepareRelease(bad));
  assert.equal(JSON.parse(readFileSync(join(bad.cwd,'app.json'))).expo.android.versionCode,62);
 }
 const partial=fixture(t,{previousSource:source,tagSource:source,metadata:published,releases:[{tag_name:published.tag,draft:false,assets:[{name:'Aleconnect-unsigned.ipa'}]}]});
 partial.env.RELEASE_INCLUDE_IOS='true';
 assert.throws(()=>prepareRelease(partial),/rerun.*publish-ios.*original/i);
});

test('network failures, unresolved drafts, invalid metadata and wrong branches fail before mutation', t => {
  for (const options of [{releases: [{tag_name: 'v1.0.0-alpha.11', draft: true}]}, {metadata: {version: '1.0.0-alpha.8', versionCode: 64}}, {metadata: {version: '1.0.0-alpha.10', versionCode: 0, sourceCommit: previous}}]) {
    const f = fixture(t, options);
    assert.throws(() => prepareRelease(f));
    assert.equal(JSON.parse(readFileSync(join(f.cwd, 'app.json'))).expo.android.versionCode, 62);
  }
  const f = fixture(t);
  assert.throws(() => prepareRelease({...f, run: () => { throw new Error('Network unavailable'); }}));
  assert.throws(() => prepareRelease({...f, env: {...f.env, GITHUB_REF: 'refs/heads/feature'}}));
  const collision = fixture(t, {tagSource: previous});
  assert.throws(() => prepareRelease(collision), /existing tag/);
  assert.equal(JSON.parse(readFileSync(join(collision.cwd, 'app.json'))).expo.android.versionCode, 62);
});

test('failed builds consume no version and both native and Staff can bootstrap', t => {
  const f = fixture(t, {releases: [{tag_name: 'reserve/sms-support-2026-10-02', draft: false}]});
  const first = prepareRelease(f);
  assert.equal(first.version, '1.0.0-alpha.1');
  assert.equal(first.versionCode, 65);
  // A rerun starts from a fresh checkout, as GitHub Actions does.
  const retry = fixture(t, {releases: []});
  assert.deepEqual(prepareRelease(retry), first);
  const staff = fixture(t, {releases: []});
  writeFileSync(join(staff.cwd, 'release.config.json'), JSON.stringify({name: 'aleconnect', branch: 'master'}));
  staff.env.GITHUB_REPOSITORY = 'aymkopi/Aleconnect';
  assert.equal(prepareRelease(staff).versionCode, undefined);
});

test('publisher refuses an APK without verification evidence', t => {
  const f = fixture(t);
  prepareRelease(f);
  assert.throws(() => publishRelease(f), /verif|APK|artifact/i);
});

function verifiedFixture(t) {
  const f = fixture(t, {releases: []});
  const release = prepareRelease(f);
  const payload = Buffer.from('verified-artifact-test-double');
  const sha256 = createHash('sha256').update(payload).digest('hex');
  Object.assign(release, {sha256, certificateSha256: config.android.certificateSha256, debuggable: false, elf16KbAligned: true, zip16KbAligned: true, fixtureMode: false});
  writeFileSync(join(f.cwd, 'release', release.fileName), payload);
  writeFileSync(join(f.cwd, 'release/SHA256SUMS'), `${sha256}  ${release.fileName}\n`);
  writeFileSync(join(f.cwd, 'release/build-metadata.json'), JSON.stringify(release));
  return {...f, release};
}

test('publication verifies every uploaded digest and the actual tag source before publishing', t => {
  for (const outcome of ['valid', 'delayed', 'digest', 'tag']) {
    const f = verifiedFixture(t);
    let uploaded;
    let tagCreated = false;
    let readbacks = 0;
    const calls = [];
    const run = (command, args) => {
      calls.push(args);
      assert.equal(command, 'gh');
      if (args[0] === 'api' && args.includes('POST')) { tagCreated = true; return ''; }
      if (args[0] === 'api' && args[1].includes('/git/matching-refs/')) return JSON.stringify(tagCreated ? [{ref: `refs/tags/${f.release.tag}`, object: {type: 'commit', sha: outcome === 'tag' && uploaded ? previous : source}}] : []);
      if (args[0] === 'api') return JSON.stringify([[...(uploaded && (outcome !== 'delayed' || readbacks++ > 0) ? [uploaded] : [])]]);
      if (args[1] === 'create') {
        assert.equal(tagCreated, true, 'Explicitly create the tag; a draft alone may not create it');
        assert.ok(args.includes('--verify-tag'));
        const assets = args.filter(arg => arg.startsWith(join(f.cwd, 'release')) && !arg.endsWith('notes.md'));
        uploaded = {tag_name: f.release.tag, draft: true, assets: assets.map(path => ({name: basename(path), digest: `sha256:${outcome === 'digest' ? '0'.repeat(64) : createHash('sha256').update(readFileSync(path)).digest('hex')}`}))};
        return '';
      }
      if (args[1] === 'edit') return '';
      assert.fail(`Unexpected call ${args}`);
    };
    if (!['valid', 'delayed'].includes(outcome)) assert.throws(() => publishRelease({...f, run}), /digest mismatch|tag points/);
    else assert.deepEqual(publishRelease({...f, run}), {skip: false, tag: f.release.tag});
    assert.equal(calls.some(args => args.includes('--draft=false')), ['valid', 'delayed'].includes(outcome));
  }
});

test('published assets are immutable; a failed draft requires inspection', t => {
  const f = verifiedFixture(t);
  for (const state of ['published', 'draft', 'collision']) {
    const run = (_command, args) => {
      if (args[0] === 'api') return JSON.stringify([[{tag_name: f.release.tag, draft: state === 'draft'}]]);
      if (args[1] === 'download') return JSON.stringify({...f.release, sourceCommit: state === 'collision' ? previous : source});
      assert.fail('Never create or edit an existing release');
    };
    if (state === 'published') assert.equal(publishRelease({...f, run}).skip, true);
    else assert.throws(() => publishRelease({...f, run}), /draft|different source/);
  }
});
