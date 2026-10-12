import assert from "node:assert/strict";
import {appendFileSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {pathToFileURL} from "node:url";

export function alphaRelease(runNumber) {
  assert.match(String(runNumber), /^[1-9]\d*$/, "A positive CI run number is required");
  const ordinal = Number(runNumber);
  assert.ok(Number.isSafeInteger(ordinal) && ordinal + 54 <= 2100000000, "Android version code exceeds its supported range");
  const version = `1.0.0-alpha.${ordinal}`;
  return {version, versionCode: 54 + ordinal, tag: `v${version}`, fileName: `aleconnect-mobile-${version}.apk`};
}

export function configureAlphaRelease(config, release) {
  assert.equal(config.expo.android.package, "com.kapecakes.aleconnectmobile", "Keep the installed app identity");
  assert.ok(release.versionCode >= config.expo.android.versionCode, "Refuse an Android version-code downgrade");
  return {...config, expo: {...config.expo, version: release.version, android: {...config.expo.android, versionCode: release.versionCode}}};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  assert.equal(process.argv[2], "prepare");
  const release = alphaRelease(process.env.GITHUB_RUN_NUMBER);
  assert.match(process.env.GITHUB_SHA ?? "", /^[a-f0-9]{40}$/, "Pin the full source commit");
  const config = configureAlphaRelease(JSON.parse(readFileSync("app.json", "utf8")), release);
  writeFileSync("app.json", JSON.stringify(config, null, 2) + "\n");
  mkdirSync("release", {recursive: true});
  writeFileSync("release/build-metadata.json", JSON.stringify({...release, sourceCommit: process.env.GITHUB_SHA}, null, 2) + "\n");
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(release).map(([key,value]) => `${key}=${value}\n`).join(""));
  }
  console.log(JSON.stringify(release));
}
