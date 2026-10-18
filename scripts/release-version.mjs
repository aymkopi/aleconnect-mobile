import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const alphaPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)-alpha\.([1-9]\d*)$/;
const isAlphaTag = tag => typeof tag === 'string' && tag.startsWith('v') && alphaPattern.test(tag.slice(1));
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const writeJson = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
const digest = path => createHash('sha256').update(readFileSync(path)).digest('hex');

function alphaParts(version) {
  const match = alphaPattern.exec(version);
  assert.ok(match, `Require an alpha SemVer, received ${version}`);
  const parts = match.slice(1).map(Number);
  assert.ok(parts.every(Number.isSafeInteger), 'Version component exceeds safe integer range');
  return parts;
}

function compareVersions(left, right) {
  const a = alphaParts(left), b = alphaParts(right);
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  return 0;
}

export function classifyCommits(messages) {
  if (messages.some(message => /^[\w-]+(?:\([^\r\n)]+\))?!:/.test(message) || /^BREAKING[ -]CHANGE:\s*\S/m.test(message))) return 'major';
  if (messages.some(message => /^feat(?:\([^\r\n)]+\))?:/i.test(message))) return 'minor';
  if (messages.some(message => /^(?:fix|perf|revert)(?:\([^\r\n)]+\))?:/i.test(message))) return 'patch';
  return null;
}

export function nextRelease({current, messages = [], bump = 'auto', androidFloor} = {}) {
  assert.ok(['auto', 'alpha', 'patch', 'minor', 'major'].includes(bump), 'Invalid release bump');
  let version = '1.0.0-alpha.1';
  let impact = 'initial';
  if (current) {
    const parts = alphaParts(current.version);
    // shortcut: unclassified app commits default to patch; use Conventional Commits or a manual bump for higher impact.
    impact = bump === 'auto' ? classifyCommits(messages) ?? 'patch' : bump;
    if (impact === 'alpha') parts[3]++;
    else {
      const index = {major: 0, minor: 1, patch: 2}[impact];
      parts[index]++;
      for (let i = index + 1; i < 3; i++) parts[i] = 0;
      parts[3] = 1;
    }
    version = `${parts.slice(0, 3).join('.')}-alpha.${parts[3]}`;
    alphaParts(version);
  }
  const result = {version, bump: impact};
  if (androidFloor !== undefined) {
    assert.ok(Number.isInteger(androidFloor) && androidFloor >= 0, 'Invalid Android code floor');
    if (current) assert.ok(Number.isInteger(current.versionCode) && current.versionCode > 0, 'Missing published Android code');
    result.versionCode = Math.max(androidFloor, current?.versionCode ?? 0) + 1;
    assert.ok(result.versionCode <= 2100000000, 'Android versionCode exceeds the Play limit');
  }
  return result;
}

function runtime({cwd = process.cwd(), env = process.env, run = execFileSync} = {}) {
  const config = readJson(join(cwd, 'release.config.json'));
  assert.ok(['aleconnect', 'aleconnect-mobile', 'aleconnect-lineman'].includes(config.name), 'Unexpected release product');
  if (config.android) assert.match(config.android.certificateSha256 ?? '', /^[a-f0-9]{64}$/, 'Pin the public Android certificate digest');
  assert.match(env.GITHUB_SHA ?? '', /^[a-f0-9]{40}$/, 'Pin the full source SHA');
  assert.match(env.GITHUB_REPOSITORY ?? '', /^[\w.-]+\/[\w.-]+$/, 'Invalid repository');
  assert.equal(env.GITHUB_REPOSITORY.split('/')[1].toLowerCase(), config.name, 'Wrong release repository');
  assert.equal(env.GITHUB_REF, `refs/heads/${config.branch}`, 'Only the default release branch may publish');
  const command = (program, args) => String(run(program, args, {cwd, env, encoding: 'utf8', stdio: 'pipe', maxBuffer: 32 * 1024 * 1024, timeout: 60000})).trim();
  const inventory = () => JSON.parse(command('gh', ['api', '--paginate', '--slurp', `repos/${env.GITHUB_REPOSITORY}/releases?per_page=100`])).flat();
  const metadata = tag => JSON.parse(command('gh', ['release', 'download', tag, '--repo', env.GITHUB_REPOSITORY, '--pattern', 'build-metadata.json', '--output', '-']));
  return {cwd, env, config, command, inventory, metadata};
}

function publishedAlphas(releases) {
  return releases.filter(release => !release.draft && isAlphaTag(release.tag_name))
    .sort((a, b) => compareVersions(b.tag_name.slice(1), a.tag_name.slice(1)));
}

function remoteTagTarget(command, repository, tag) {
  const refs = JSON.parse(command('gh', ['api', `repos/${repository}/git/matching-refs/tags/${tag}`]));
  let target = refs.find(item => item.ref === `refs/tags/${tag}`)?.object;
  if (!target) return null;
  // Resolve annotated tags too, using the scoped token even in private repositories.
  for (let depth = 0; target.type === 'tag' && depth < 5; depth++) {
    assert.match(target.sha ?? '', /^[a-f0-9]{40}$/, 'Invalid annotated tag target');
    target = JSON.parse(command('gh', ['api', `repos/${repository}/git/tags/${target.sha}`])).object;
  }
  assert.equal(target.type, 'commit', 'Release tag must resolve to a commit');
  assert.match(target.sha ?? '', /^[a-f0-9]{40}$/, 'Invalid remote tag target');
  return target.sha;
}

function outputs(env, values) {
  if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, Object.entries(values).map(([key, value]) => `${key}=${value}\n`).join(''));
  console.log(JSON.stringify(values));
  return values;
}

function releaseNotes(release, messages) {
  const groups = {Added: [], Fixed: [], Changed: [], 'Breaking changes': []};
  for (const message of messages) {
    const title = message.split('\n')[0].replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    const impact = classifyCommits([message]);
    groups[impact === 'major' ? 'Breaking changes' : impact === 'minor' ? 'Added' : impact === 'patch' ? 'Fixed' : 'Changed'].push(title);
  }
  const sections = Object.entries(groups).filter(([, items]) => items.length).map(([title, items]) => `### ${title}\n\n${[...new Set(items)].map(item => `- ${item}`).join('\n')}`);
  return [`# ${release.version}`, `Source: \`${release.sourceCommit}\`\n\nBump: ${release.bump}. All releases remain alpha prereleases.`, ...sections,
    release.versionCode ? `Android code: ${release.versionCode}. Package/signing identities are retained. Download the APK with SHA256SUMS and build-metadata.json; native/provider acceptance is separate.` : 'This release identifies the coordinated Staff/API deployment. Database migrations remain separately reviewed operations.'
  ].join('\n\n') + '\n';
}

const iosAssetNames = ['Aleconnect-unsigned.ipa', 'ios-build-metadata.json', 'ios-SHA256SUMS'];

function stageRelease(cwd, release, notes, app) {
  const pkg = readJson(join(cwd, 'package.json'));
  const lockPath = join(cwd, 'package-lock.json');
  const lock = existsSync(lockPath) ? readJson(lockPath) : null;
  mkdirSync(join(cwd, 'release'), {recursive: true});
  writeJson(join(cwd, 'package.json'), {...pkg, version: release.version});
  if (lock) {
    lock.version = release.version;
    if (lock.packages?.['']) lock.packages[''].version = release.version;
    writeJson(lockPath, lock);
  }
  if (app) {
    app.expo.version = release.version;
    app.expo.android.versionCode = release.versionCode;
    writeJson(join(cwd, 'app.json'), app);
  } else {
    mkdirSync(join(cwd, 'public'), {recursive: true});
    writeJson(join(cwd, 'public/release.json'), release);
  }
  writeJson(join(cwd, 'release/build-metadata.json'), release);
  writeFileSync(join(cwd, 'release/notes.md'), notes);
}

export function prepareRelease(options) {
  const {cwd, env, config, command, inventory, metadata} = runtime(options);
  const includeIos = config.name === 'aleconnect-mobile' && env.RELEASE_INCLUDE_IOS === 'true';
  assert.equal(command('git', ['rev-parse', 'HEAD']), env.GITHUB_SHA, 'Checkout must match the workflow SHA');
  const releases = inventory();
  assert.ok(!releases.some(release => release.draft && isAlphaTag(release.tag_name)), 'Inspect the unresolved alpha draft before releasing again');
  const latest = publishedAlphas(releases)[0];
  let current;
  if (latest) {
    const previousSource = command('git', ['rev-parse', `${latest.tag_name}^{commit}`]);
    if (previousSource === env.GITHUB_SHA) {
      const published = metadata(latest.tag_name);
      assert.equal(published.sourceCommit, env.GITHUB_SHA, 'Published metadata has a different source');
      assert.equal(remoteTagTarget(command, env.GITHUB_REPOSITORY, latest.tag_name), env.GITHUB_SHA, 'Published tag points to a different source');
      if (includeIos) {
        const existing = iosAssetNames.filter(name => latest.assets?.some(asset => asset.name === name));
        assert.ok(existing.length === 0 || existing.length === iosAssetNames.length,
          'Incomplete IPA assets: rerun failed publish-ios with its original artifact; never replace published bytes');
        if (!existing.length) {
          assert.equal(published.version, latest.tag_name.slice(1), 'Published recovery version mismatch');
          alphaParts(published.version);
          assert.ok(Number.isInteger(published.versionCode) && published.versionCode > 0 && published.versionCode <= 2100000000, 'Invalid published iOS build');
          assert.equal(published.tag, latest.tag_name, 'Published recovery tag mismatch');
          assert.equal(published.fileName, `${config.name}-${published.version}.apk`, 'Published recovery filename mismatch');
          assert.equal(published.package, config.android.package, 'Published recovery package mismatch');
          assert.equal(published.certificateSha256, config.android.certificateSha256, 'Published recovery signer mismatch');
          const app = readJson(join(cwd, 'app.json'));
          assert.equal(app.expo.android.package, config.android.package, 'Keep the installed app identity');
          stageRelease(cwd, published, latest.body ?? `# ${published.version}\n`, app);
          return outputs(env, {...published, tag: latest.tag_name, skip: true, ios_needed: true});
        }
      }
      return outputs(env, {skip: true, reason: 'Source already published', tag: latest.tag_name, ...(includeIos ? {ios_needed: false} : {})});
    }
    try { command('git', ['merge-base', '--is-ancestor', previousSource, env.GITHUB_SHA]); }
    catch {
      command('git', ['merge-base', '--is-ancestor', env.GITHUB_SHA, previousSource]);
      return outputs(env, {skip: true, reason: 'Newer source is already published'});
    }
    current = {version: latest.tag_name.slice(1)};
    if (config.android) {
      const published = metadata(latest.tag_name);
      assert.equal(published.version, current.version, 'Published version metadata mismatch');
      assert.equal(published.sourceCommit, previousSource, 'Published source metadata mismatch');
      assert.equal(published.package, config.android.package, 'Published Android package mismatch');
      current.versionCode = published.versionCode;
    }
  }
  const messages = command('git', ['log', ...(latest ? [`${latest.tag_name}..${env.GITHUB_SHA}`] : ['-1', env.GITHUB_SHA]), '--format=%B%x00']).split('\0').map(value => value.trim()).filter(Boolean);
  let app, androidFloor;
  if (config.android) {
    app = readJson(join(cwd, 'app.json'));
    assert.equal(app.expo.android.package, config.android.package, 'Keep the installed app identity');
    assert.ok(Number.isInteger(config.android.minimumVersionCode) && config.android.minimumVersionCode > 0, 'Configure the observed Android code floor');
    assert.ok(app.expo.android.versionCode === undefined || Number.isInteger(app.expo.android.versionCode) && app.expo.android.versionCode > 0, 'Invalid configured Android code');
    androidFloor = Math.max(config.android.minimumVersionCode, app.expo.android.versionCode ?? 0);
  }
  const release = {...nextRelease({current, messages, bump: env.RELEASE_BUMP ?? 'auto', androidFloor}), sourceCommit: env.GITHUB_SHA, baseTag: latest?.tag_name ?? null};
  release.tag = `v${release.version}`;
  if (config.android) {
    release.fileName = `${config.name}-${release.version}.apk`;
    release.package = config.android.package;
  }
  assert.ok(!releases.some(item => item.tag_name === release.tag), 'Version tag already reserved');
  assert.equal(remoteTagTarget(command, env.GITHUB_REPOSITORY, release.tag), null, 'An existing tag without a release requires inspection');
  stageRelease(cwd, release, releaseNotes(release, messages), app);
  outputs(env, {skip: false, ...release, ...(includeIos ? {ios_needed: true} : {})});
  return release;
}

export function publishRelease(options) {
  const {cwd, env, config, command, inventory, metadata} = runtime(options);
  const release = readJson(join(cwd, 'release/build-metadata.json'));
  alphaParts(release.version);
  assert.equal(release.tag, `v${release.version}`);
  assert.equal(release.sourceCommit, env.GITHUB_SHA);
  const files = ['build-metadata.json'];
  if (config.android) {
    assert.equal(release.fileName, `${config.name}-${release.version}.apk`);
    assert.equal(release.package, config.android.package, 'Unverified APK package');
    assert.equal(release.certificateSha256, config.android.certificateSha256, 'Unverified APK signer');
    assert.equal(release.debuggable, false, 'APK must be a standalone release runtime');
    assert.equal(release.elf16KbAligned, true, 'APK native alignment must be verified');
    assert.equal(release.zip16KbAligned, true, 'APK ZIP alignment must be verified');
    if (config.name === 'aleconnect-mobile') assert.equal(release.fixtureMode, false, 'APK fixtures must be disabled');
    assert.equal(digest(join(cwd, 'release', release.fileName)), release.sha256, 'APK checksum differs from verification');
    assert.equal(readFileSync(join(cwd, 'release/SHA256SUMS'), 'utf8'), `${release.sha256}  ${release.fileName}\n`, 'APK checksum manifest mismatch');
    files.push(release.fileName, 'SHA256SUMS');
  } else assert.equal(env.RELEASE_DEPLOYED, 'true', 'Publish Staff only after deployment succeeds');
  const releases = inventory();
  const existing = releases.find(item => item.tag_name === release.tag);
  if (existing) {
    assert.ok(!existing.draft, 'Inspect the existing draft; never overwrite its assets');
    const published = metadata(release.tag);
    assert.equal(published.sourceCommit, release.sourceCommit, 'Published tag has a different source');
    assert.equal(published.sha256, release.sha256, 'Published tag has different artifacts');
    return {skip: true};
  }
  const latest = publishedAlphas(releases)[0];
  assert.ok(!latest || compareVersions(release.version, latest.tag_name.slice(1)) > 0, 'A newer alpha is already published');
  assert.equal(remoteTagTarget(command, env.GITHUB_REPOSITORY, release.tag), null, 'An existing tag without a release requires inspection');
  // Draft releases need not create their tag; reserve the exact commit atomically first.
  command('gh', ['api', '--method', 'POST', `repos/${env.GITHUB_REPOSITORY}/git/refs`, '--raw-field', `ref=refs/tags/${release.tag}`, '--raw-field', `sha=${env.GITHUB_SHA}`]);
  assert.equal(remoteTagTarget(command, env.GITHUB_REPOSITORY, release.tag), release.sourceCommit, 'Reserved tag points to a different source');
  command('gh', ['release', 'create', release.tag, ...files.map(file => join(cwd, 'release', file)), '--repo', env.GITHUB_REPOSITORY,
    '--target', env.GITHUB_SHA, '--verify-tag', '--prerelease', '--draft', '--latest=false', '--title', `${config.name} ${release.version}`, '--notes-file', join(cwd, 'release/notes.md')]);
  let uploaded;
  // GitHub can briefly omit a newly created draft from its release listing.
  for (let attempt = 0; attempt < 10 && !uploaded; attempt++) {
    if (attempt) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
    uploaded = inventory().find(item => item.tag_name === release.tag);
  }
  assert.ok(uploaded?.draft, 'Expected a draft release before publication');
  assert.equal(remoteTagTarget(command, env.GITHUB_REPOSITORY, release.tag), release.sourceCommit, 'Draft tag points to a different source');
  for (const file of files) {
    const asset = uploaded.assets.find(item => item.name === file);
    assert.equal(asset?.digest, `sha256:${digest(join(cwd, 'release', file))}`, `Uploaded digest mismatch for ${file}`);
  }
  command('gh', ['release', 'edit', release.tag, '--repo', env.GITHUB_REPOSITORY, '--draft=false']);
  assert.equal(remoteTagTarget(command, env.GITHUB_REPOSITORY, release.tag), release.sourceCommit, 'Published tag points to a different source');
  return {skip: false, tag: release.tag};
}

export function prepareIosReleaseConfig({cwd = process.cwd(), env = process.env} = {}) {
  const version = env.RELEASE_VERSION;
  const nativeVersion = alphaParts(version).slice(0, 3).join('.');
  const buildNumber = env.RELEASE_BUILD_NUMBER;
  assert.match(buildNumber ?? '', /^[1-9]\d*$/, 'Require an explicit positive native build number');
  assert.ok(Number(buildNumber) <= 2100000000, 'Native build exceeds the shared Android code limit');
  assert.match(env.GITHUB_SHA ?? '', /^[a-f0-9]{40}$/, 'Pin the full source SHA');
  if (env.RELEASE_CONTEXT_REQUIRED === 'true') {
    const release = readJson(join(cwd, 'release/build-metadata.json'));
    assert.equal(release.sourceCommit, env.GITHUB_SHA, 'iOS release context has a different source');
    assert.equal(release.version, version, 'iOS release context has a different version');
    assert.equal(String(release.versionCode), buildNumber, 'iOS release context has a different build');
  }
  const app = readJson(join(cwd, 'app.json'));
  assert.equal(app.expo.ios?.bundleIdentifier, 'com.kapecakes.aleconnectmobile', 'Wrong iPhone app identity');
  app.expo.version = nativeVersion;
  app.expo.ios.buildNumber = buildNumber;
  app.expo.extra = {...app.expo.extra, releaseVersion: version};
  writeJson(join(cwd, 'app.json'), app);
  return {releaseVersion: version, nativeVersion, buildNumber};
}

export function publishIosRelease(options) {
  const {cwd, env, config, command, inventory, metadata} = runtime(options);
  assert.equal(config.name, 'aleconnect-mobile', 'iPhone assets belong to Mobile');
  const tag = env.RELEASE_TAG;
  assert.ok(isAlphaTag(tag), 'Require the exact Android alpha tag');
  const published = inventory().find(release => release.tag_name === tag);
  assert.ok(published && !published.draft, 'Require the published Android release');
  const android = metadata(tag);
  assert.equal(android.sourceCommit, env.GITHUB_SHA, 'Android release has a different source');
  assert.equal(`v${android.version}`, tag, 'Android release version differs from its tag');
  assert.equal(remoteTagTarget(command, env.GITHUB_REPOSITORY, tag), env.GITHUB_SHA, 'Release tag points to a different source');
  const folder = join(cwd, 'release/ios');
  const ios = readJson(join(folder, 'build-metadata.json'));
  assert.equal(ios.sourceCommit, env.GITHUB_SHA, 'IPA has a different source');
  assert.equal(ios.releaseVersion, android.version, 'IPA has a different alpha version');
  assert.equal(ios.version, alphaParts(android.version).slice(0, 3).join('.'), 'IPA has a different native version');
  assert.equal(ios.buildNumber, String(android.versionCode), 'IPA has a different native build');
  assert.equal(ios.bundleIdentifier, readJson(join(cwd, 'app.json')).expo.ios.bundleIdentifier, 'Wrong iPhone app identity');
  assert.equal(ios.platform, 'iPhoneOS', 'Require a physical-iPhone build');
  assert.equal(ios.architecture, 'arm64', 'Require ARM64');
  assert.equal(ios.apiOrigin, 'https://api.aleconnect.app', 'Require the live HTTPS API');
  assert.equal(ios.signing, 'unsigned; sign locally before USB installation', 'Keep Apple signing local');
  assert.equal(ios.remotePushSupported, false, 'Personal signing does not support remote push');
  assert.equal(digest(join(folder, 'Aleconnect-unsigned.ipa')), ios.sha256, 'IPA checksum mismatch');
  assert.equal(readFileSync(join(folder, 'SHA256SUMS'), 'utf8'), `${ios.sha256}  Aleconnect-unsigned.ipa\n`, 'IPA checksum manifest mismatch');
  writeJson(join(folder, 'ios-build-metadata.json'), ios);
  writeFileSync(join(folder, 'ios-SHA256SUMS'), readFileSync(join(folder, 'SHA256SUMS')));
  const files = iosAssetNames;
  // Keep Android metadata/checksums intact, and never replace an existing asset.
  const missing = files.filter(file => {
    const asset = published.assets.find(item => item.name === file);
    if (asset) assert.equal(asset.digest, `sha256:${digest(join(folder, file))}`, `Published digest mismatch for ${file}`);
    return !asset;
  });
  if (missing.length) command('gh', ['release', 'upload', tag, ...missing.map(file => join(folder, file)), '--repo', env.GITHUB_REPOSITORY]);
  const uploaded = inventory().find(release => release.tag_name === tag);
  for (const file of files) assert.equal(uploaded?.assets.find(asset => asset.name === file)?.digest, `sha256:${digest(join(folder, file))}`, `Uploaded digest mismatch for ${file}`);
  assert.equal(remoteTagTarget(command, env.GITHUB_REPOSITORY, tag), env.GITHUB_SHA, 'Release tag changed during IPA upload');
  return {skip: missing.length === 0, tag};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  assert.ok(['prepare', 'publish', 'prepare-ios', 'publish-ios'].includes(process.argv[2]), 'Use prepare, publish, prepare-ios or publish-ios');
  if (process.argv[2] === 'prepare') prepareRelease();
  else if (process.argv[2] === 'publish') publishRelease();
  else if (process.argv[2] === 'prepare-ios') console.log(JSON.stringify(prepareIosReleaseConfig()));
  else publishIosRelease();
}
