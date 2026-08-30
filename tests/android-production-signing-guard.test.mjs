import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import test from "node:test"

const require = createRequire(import.meta.url)
const pluginPath = new URL("../plugins/with-android-production-signing-guard.js", import.meta.url)
const pluginFile = fileURLToPath(pluginPath)
const packageName = "com.kapecakes.aleconnectmobile"
const prefix = "ALECONNECT_MOBILE"

const baseGradle = `android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.debug
            minifyEnabled false
        }
    }
}`

function transform() {
  assert.equal(existsSync(pluginPath), true, "production signing guard plugin must exist")
  return require(pluginFile).transformAndroidAppBuildGradle(baseGradle, { prefix })
}

test("Mobile release build is never assigned the debug signing config", () => {
  const output = transform()
  const buildTypes = output.indexOf("buildTypes {")
  const releaseStart = output.indexOf("release {", buildTypes)
  const release = output.slice(releaseStart, output.indexOf("\n        }", releaseStart) + 10)
  assert.match(release, /signingConfig signingConfigs\.release/)
  assert.doesNotMatch(release, /signingConfigs\.debug/)
})

test("Mobile guard resolves app-scoped local and managed Gradle signing properties at build time", () => {
  const output = transform()
  for (const property of [
    `${prefix}_KEYSTORE_PATH`,
    `${prefix}_KEYSTORE_PASSWORD`,
    `${prefix}_KEY_ALIAS`,
    `${prefix}_KEY_PASSWORD`,
    "MYAPP_UPLOAD_STORE_FILE",
    "MYAPP_UPLOAD_STORE_PASSWORD",
    "MYAPP_UPLOAD_KEY_ALIAS",
    "MYAPP_UPLOAD_KEY_PASSWORD",
  ]) {
    assert.match(output, new RegExp(property))
  }
  assert.match(output, /project\.findProperty\(propertyName\)/)
  assert.match(output, /System\.getenv\(propertyName\)/)
})

test("Mobile guard fails release tasks without complete local or managed signing and permits debug tasks", () => {
  const output = transform()
  assert.match(output, /gradle\.startParameter\.taskNames\.any/)
  assert.match(output, /aleconnectReleaseTaskRequested && !aleconnectLocalSigningReady && !aleconnectManagedSigningReady/)
  assert.match(output, /throw new GradleException/)
  assert.match(output, /taskName\.toLowerCase\(\).*contains\("release"\)/)
  assert.doesNotMatch(output, /if \(.*debug.*GradleException/)
})

test("Mobile guard recognizes only verified EAS signing injection", () => {
  const { isVerifiedEasInjection } = require(pluginFile)
  const output = transform()
  assert.match(output, /System\.getenv\("EAS_BUILD"\)/)
  assert.match(output, /project\.file\("eas-build\.gradle"\)/)
  assert.match(output, /rootProject\.file\("\.\.\/credentials\.json"\)/)
  assert.match(output, /aleconnectEasScript\.contains\("credentials\.json"\)/)
  assert.match(output, /aleconnectEasScript\.contains\("signingConfigs\.release"\)/)
  assert.match(output, /!aleconnectEasSigningReady/)
  const complete = {
    easBuild: "true",
    easBuildGradleExists: true,
    easBuildGradleContents: "credentials.json signingConfigs.release",
    credentialsFileExists: true,
  }
  assert.equal(isVerifiedEasInjection(complete), true)
  assert.equal(isVerifiedEasInjection({ ...complete, easBuildGradleExists: false }), false)
  assert.equal(isVerifiedEasInjection({ ...complete, easBuildGradleContents: "" }), false)
  assert.equal(isVerifiedEasInjection({ ...complete, credentialsFileExists: false }), false)
  assert.equal(isVerifiedEasInjection({ ...complete, easBuild: "false" }), false)
})

test("Mobile guard rejects partial or unsafe existing marker state", () => {
  const { transformAndroidAppBuildGradle } = require(pluginFile)
  const first = transform()
  assert.throws(
    () => transformAndroidAppBuildGradle(
      first.replace("// @generated aleconnect-production-signing-guard:end", ""),
      { prefix },
    ),
    /markers are incomplete/,
  )
  assert.throws(
    () => transformAndroidAppBuildGradle(
      first.replace("// @generated aleconnect-production-signing-guard:start", ""),
      { prefix },
    ),
    /markers are incomplete/,
  )
  assert.throws(
    () => transformAndroidAppBuildGradle(
      first.replace("signingConfig signingConfigs.release", "signingConfig signingConfigs.debug"),
      { prefix },
    ),
    /markers.*release|release.*markers/,
  )
})

test("Mobile signing guard transformation is idempotent and embeds no secret values", () => {
  const first = transform()
  const second = require(pluginFile).transformAndroidAppBuildGradle(first, { prefix })
  assert.equal(second, first)
  assert.doesNotMatch(first, /SUPER_SECRET|local-password|private-keystore-value/)
  assert.equal((first.match(/aleconnect-production-signing-guard:start/g) ?? []).length, 1)
})

test("Mobile package can only use its own app-scoped signing prefix", () => {
  assert.equal(existsSync(pluginPath), true, "production signing guard plugin must exist")
  const { validateSigningPrefix } = require(pluginFile)
  assert.equal(validateSigningPrefix(packageName, prefix), prefix)
  assert.throws(
    () => validateSigningPrefix(packageName, "ALECONNECT_LINEMAN"),
    /does not match Android package/,
  )
})
