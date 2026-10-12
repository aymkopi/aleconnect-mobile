import assert from "node:assert/strict";
import test from "node:test";
import {readFile} from "node:fs/promises";
import {alphaRelease, configureAlphaRelease} from "../scripts/android-alpha-release.mjs";

test("alpha restart retains monotonically increasing Android codes above v54",()=>{
 assert.deepEqual(alphaRelease("1"),{version:"1.0.0-alpha.1",versionCode:55,tag:"v1.0.0-alpha.1",fileName:"aleconnect-mobile-1.0.0-alpha.1.apk"});
 assert.equal(alphaRelease("2").versionCode,56);
 for(const input of ["0","-1","1.2","1;exit","9007199254740993","2099999999",undefined]) assert.throws(()=>alphaRelease(input));
});

test("CI versioning preserves provider/package config and refuses Android downgrade",()=>{
 const source={expo:{name:"Aleconnect",android:{package:"com.kapecakes.aleconnectmobile",versionCode:55,googleServicesFile:"./google-services.json"},extra:{eas:{projectId:"retained"}}}};
 const result=configureAlphaRelease(source,alphaRelease("3"));
 assert.equal(result.expo.version,"1.0.0-alpha.3");assert.equal(result.expo.android.versionCode,57);
 assert.equal(result.expo.extra,source.expo.extra);assert.equal(result.expo.android.googleServicesFile,source.expo.android.googleServicesFile);
 assert.equal(source.expo.android.versionCode,55);
 assert.throws(()=>configureAlphaRelease({...source,expo:{...source.expo,android:{...source.expo.android,versionCode:90}}},alphaRelease("1")));
 assert.throws(()=>configureAlphaRelease({...source,expo:{...source.expo,android:{package:"other"}}},alphaRelease("1")));
});

test("release job is gated by reusable CI, default branch, app changes and fixture-free verification",async()=>{
 const checks=await readFile(new URL("../.github/workflows/agent-harness.yml",import.meta.url),"utf8");
 const workflow=await readFile(new URL("../.github/workflows/android-alpha-release.yml",import.meta.url),"utf8");
 assert.match(checks,/workflow_call:/);assert.match(checks,/app_changed:/);
 assert.match(workflow,/needs: checks/);assert.match(workflow,/needs.checks.outputs.app_changed == 'true'/);
 assert.match(workflow,/github.event.repository.default_branch/);assert.doesNotMatch(workflow,/pull_request_target|secrets: inherit/);
 assert.match(workflow,/EXPO_PUBLIC_PANELUI_PREVIEW: '0'/);assert.match(workflow,/EXPO_NO_DOTENV: '1'/);
 assert.match(workflow,/contents: write/);assert.match(workflow,/verify-android-release.py/);
 assert.match(workflow,/--draft/);assert.match(workflow,/--draft=false/);assert.doesNotMatch(workflow,/release upload.*--clobber/);
 assert.match(workflow,/java-version: '21'/);assert.match(workflow,/node-version-file: .node-version/);
});
