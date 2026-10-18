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

test("iPhone IPA and Android release run independently after the same default-branch app checks",async()=>{
 const workflow=await readFile(new URL("../.github/workflows/android-alpha-release.yml",import.meta.url),"utf8");
 const ios=await readFile(new URL("../.github/workflows/ios-usb-ipa.yml",import.meta.url),"utf8");
 const jobs=workflow.split(/^  (?=[\w-]+:)/m);
 const iphone=jobs.find(job=>job.startsWith("ios:"));
 const android=jobs.find(job=>job.startsWith("release:"));
 assert.ok(iphone,"automatic release workflow must call the iOS builder");
 for(const job of [iphone,android]) {
  assert.match(job,/needs: checks/);
  assert.match(job,/github.event.repository.default_branch/);
  assert.match(job,/needs.checks.outputs.app_changed == 'true'/);
  assert.match(job,/github.event_name == 'workflow_dispatch'/);
 }
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
