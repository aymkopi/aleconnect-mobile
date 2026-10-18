import assert from "node:assert/strict";
import test from "node:test";
import {readFile} from "node:fs/promises";

test("release job is gated by reusable CI, default branch, app changes and fixture-free verification",async()=>{
 const checks=await readFile(new URL("../.github/workflows/agent-harness.yml",import.meta.url),"utf8");
 const workflow=await readFile(new URL("../.github/workflows/android-alpha-release.yml",import.meta.url),"utf8");
 assert.match(checks,/workflow_call:/);assert.match(checks,/app_changed:/);
 assert.match(workflow,/needs: checks/);assert.match(workflow,/needs.checks.outputs.app_changed == 'true'/);
 assert.match(workflow,/github.event.repository.default_branch/);assert.doesNotMatch(workflow,/pull_request_target|secrets: inherit/);
 assert.match(workflow,/EXPO_PUBLIC_PANELUI_PREVIEW: '0'/);assert.match(workflow,/EXPO_NO_DOTENV: '1'/);
 assert.match(workflow,/contents: write/);assert.match(workflow,/verify-android-release.py/);
 const publisher=await readFile(new URL("../scripts/release-version.mjs",import.meta.url),"utf8");
 assert.match(publisher,/--draft/);assert.match(publisher,/--draft=false/);assert.doesNotMatch(publisher,/--clobber/);
 assert.match(workflow,/options: \[auto, patch, minor, major, alpha\]/);assert.doesNotMatch(workflow,/GITHUB_RUN_NUMBER/);
 assert.match(workflow,/java-version: '21'/);assert.match(workflow,/node-version-file: .node-version/);
});

test("IPA publication waits for both parallel builds and uses the exact Android release tag",async()=>{
 const workflow=await readFile(new URL("../.github/workflows/android-alpha-release.yml",import.meta.url),"utf8");
 const job=workflow.split(/^  (?=[\w-]+:)/m).find(part=>part.startsWith("publish-ios:"));
 assert.ok(job,"IPA must be attached to GitHub Releases");
 assert.match(job,/needs: \[version, release, ios\]/);
 assert.match(job,/needs.version.outputs.tag != ''/);
 assert.match(job,/RELEASE_TAG: \$\{\{ needs.version.outputs.tag \}\}/);
 assert.match(job,/always\(\).*needs.version.result == 'success'.*needs.ios.result == 'success'/);
 assert.match(job,/needs.release.result == 'success'.*needs.release.result == 'skipped'/);
 assert.match(job,/actions\/download-artifact@/);
 assert.match(job,/name: \$\{\{ needs.ios.outputs.ipa_artifact \}\}/);
 assert.match(job,/path: release\/ios/);
 assert.match(job,/contents: write/);
 assert.match(job,/node scripts\/release-version.mjs publish-ios/);
 assert.match(workflow,/tag: \$\{\{ needs.version.outputs.tag \}\}/);
});

test("iPhone IPA and Android release run independently after the same checked version allocation",async()=>{
 const workflow=await readFile(new URL("../.github/workflows/android-alpha-release.yml",import.meta.url),"utf8");
 const ios=await readFile(new URL("../.github/workflows/ios-usb-ipa.yml",import.meta.url),"utf8");
 const jobs=workflow.split(/^  (?=[\w-]+:)/m);
 const iphone=jobs.find(job=>job.startsWith("ios:"));
 const android=jobs.find(job=>job.startsWith("release:"));
 assert.ok(iphone,"automatic release workflow must call the iOS builder");
 for(const job of [iphone,android]) {
  assert.match(job,/needs: \[checks, version\]/);
  assert.match(job,/github.event.repository.default_branch/);
  assert.match(job,/needs.checks.outputs.app_changed == 'true'/);
  assert.match(job,/github.event_name == 'workflow_dispatch'/);
 }
 assert.match(iphone,/needs.version.outputs.ios_needed == 'true'/);
 assert.match(android,/needs.version.outputs.skip == 'false'/);
 assert.match(iphone,/uses: \.\/\.github\/workflows\/ios-usb-ipa.yml/);
 assert.match(iphone,/contents: read/);
 assert.doesNotMatch(iphone,/needs:.*release|contents: write|secrets: inherit/);
 assert.doesNotMatch(android,/needs:.*ios/);
 assert.match(workflow,/branches: \[main, master\]/);
 assert.match(ios,/workflow_call:/);
 assert.match(ios,/workflow_dispatch:/);
 assert.doesNotMatch(ios,/^  push:|secrets\./m);
 assert.match(ios,/tests\/tab-stack-boundary.test.mjs/);
 assert.match(ios,/CODE_SIGNING_ALLOWED=NO/);
 assert.match(ios,/name: Aleconnect-iPhone-unsigned/);
 assert.match(ios,/release\/ios\/SHA256SUMS/);
 assert.match(ios,/release\/ios\/build-metadata.json/);
});

test("one serialized allocation supplies both native builds and iOS verifies its packaged versions",async()=>{
 const workflow=await readFile(new URL("../.github/workflows/android-alpha-release.yml",import.meta.url),"utf8");
 const ios=await readFile(new URL("../.github/workflows/ios-usb-ipa.yml",import.meta.url),"utf8");
 const jobs=workflow.split(/^  (?=[\w-]+:)/m);
 const version=jobs.find(job=>job.startsWith("version:"));
 assert.ok(version,"allocate once before both native jobs");
 assert.match(version,/needs: checks/);
 assert.equal(workflow.match(/node scripts\/release-version.mjs prepare\b/g)?.length,1);
 assert.match(version,/name: mobile-alpha-version-\$\{\{ github.run_attempt \}\}/);
 assert.match(workflow,/release_context_artifact: \$\{\{ needs.version.outputs.context_artifact \}\}/);
 assert.match(workflow,/RELEASE_INCLUDE_IOS: 'true'/);
 for(const path of ['app.json','package.json','package-lock.json','release/build-metadata.json','release/notes.md']) assert.ok(version.includes(path),path);
 assert.match(workflow,/^concurrency:\r?\n  group: android-alpha-publication\r?\n  cancel-in-progress: false/m);
 assert.match(workflow,/release_version: \$\{\{ needs.version.outputs.version \}\}/);
 assert.match(workflow,/build_number: \$\{\{ needs.version.outputs.versionCode \}\}/);
 assert.match(ios,/node scripts\/release-version.mjs prepare-ios/);
 assert.match(ios,/info\['CFBundleShortVersionString'\].*release_version/);
 assert.match(ios,/info\['CFBundleVersion'\].*RELEASE_BUILD_NUMBER/);
 assert.match(ios,/releaseVersion=release_version/);
 assert.match(ios,/value: \$\{\{ jobs.build.outputs.artifact_name \}\}/);
 assert.match(ios,/artifact_name: Aleconnect-iPhone-unsigned-\$\{\{ github.run_attempt \}\}/);
 assert.doesNotMatch(ios,/GITHUB_RUN_NUMBER/);
});
