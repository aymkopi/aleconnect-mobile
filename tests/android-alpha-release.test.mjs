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
