const { withAppBuildGradle } = require("@expo/config-plugins");

const PACKAGE_PREFIXES = Object.freeze({
  "com.kapecakes.aleconnectmobile": "ALECONNECT_MOBILE",
  "com.aleconnect.lineman": "ALECONNECT_LINEMAN",
});

const START_MARKER = "// @generated aleconnect-production-signing-guard:start";
const END_MARKER = "// @generated aleconnect-production-signing-guard:end";

function validateSigningPrefix(androidPackage, prefix) {
  const expectedPrefix = PACKAGE_PREFIXES[androidPackage];
  if (!expectedPrefix) {
    throw new Error(`Unsupported Android package for production signing guard: ${androidPackage || "missing package"}.`);
  }
  if (prefix !== expectedPrefix) {
    throw new Error(`Signing prefix ${prefix || "missing prefix"} does not match Android package ${androidPackage}.`);
  }
  return expectedPrefix;
}

function validateTransformPrefix(prefix) {
  if (!/^ALECONNECT_(?:MOBILE|LINEMAN)$/.test(prefix || "")) {
    throw new Error(`Invalid app-scoped signing prefix: ${prefix || "missing prefix"}.`);
  }
  return prefix;
}

function isVerifiedEasInjection({
  easBuild,
  easBuildGradleExists,
  easBuildGradleContents,
  credentialsFileExists,
} = {}) {
  const script = typeof easBuildGradleContents === "string" ? easBuildGradleContents : "";
  return String(easBuild || "").trim().toLowerCase() === "true" &&
    easBuildGradleExists === true &&
    credentialsFileExists === true &&
    script.includes("credentials.json") &&
    script.includes("signingConfigs.release");
}

function signingGuardBlock(prefix) {
  const localProperties = {
    storeFile: `${prefix}_KEYSTORE_PATH`,
    storePassword: `${prefix}_KEYSTORE_PASSWORD`,
    keyAlias: `${prefix}_KEY_ALIAS`,
    keyPassword: `${prefix}_KEY_PASSWORD`,
  };
  const managedProperties = {
    storeFile: "MYAPP_UPLOAD_STORE_FILE",
    storePassword: "MYAPP_UPLOAD_STORE_PASSWORD",
    keyAlias: "MYAPP_UPLOAD_KEY_ALIAS",
    keyPassword: "MYAPP_UPLOAD_KEY_PASSWORD",
  };

  return [
    `        ${START_MARKER}`,
    "        def aleconnectProductionSigningValue = { String propertyName ->",
    "            def projectValue = project.findProperty(propertyName)?.toString()?.trim()",
    "            projectValue ?: System.getenv(propertyName)?.trim()",
    "        }",
    "        def aleconnectLocalSigning = [",
    `            storeFile: aleconnectProductionSigningValue('${localProperties.storeFile}'),`,
    `            storePassword: aleconnectProductionSigningValue('${localProperties.storePassword}'),`,
    `            keyAlias: aleconnectProductionSigningValue('${localProperties.keyAlias}'),`,
    `            keyPassword: aleconnectProductionSigningValue('${localProperties.keyPassword}'),`,
    "        ]",
    "        def aleconnectManagedSigning = [",
    `            storeFile: aleconnectProductionSigningValue('${managedProperties.storeFile}'),`,
    `            storePassword: aleconnectProductionSigningValue('${managedProperties.storePassword}'),`,
    `            keyAlias: aleconnectProductionSigningValue('${managedProperties.keyAlias}'),`,
    `            keyPassword: aleconnectProductionSigningValue('${managedProperties.keyPassword}'),`,
    "        ]",
    "        def aleconnectSigningValuesComplete = { Map values ->",
    "            values.values().every { value -> value != null && value.toString().trim() }",
    "        }",
    "        def aleconnectLocalSigningReady = aleconnectSigningValuesComplete(aleconnectLocalSigning)",
    "        def aleconnectManagedSigningReady = aleconnectSigningValuesComplete(aleconnectManagedSigning)",
    "        def aleconnectEasBuild = System.getenv(\"EAS_BUILD\")?.toString()?.trim()?.equalsIgnoreCase(\"true\")",
    "        def aleconnectEasBuildGradle = project.file(\"eas-build.gradle\")",
    "        def aleconnectEasCredentials = rootProject.file(\"../credentials.json\")",
    "        def aleconnectEasScript = aleconnectEasBuildGradle.isFile() ? aleconnectEasBuildGradle.getText(\"UTF-8\") : \"\"",
    "        def aleconnectEasSigningReady = aleconnectEasBuild &&",
    "            aleconnectEasBuildGradle.isFile() &&",
    "            aleconnectEasCredentials.isFile() &&",
    "            aleconnectEasScript.contains(\"credentials.json\") &&",
    "            aleconnectEasScript.contains(\"signingConfigs.release\")",
    "        def aleconnectReleaseTaskRequested = gradle.startParameter.taskNames.any { taskName ->",
    "            taskName.toLowerCase().contains(\"release\")",
    "        }",
    "        if (aleconnectReleaseTaskRequested && !aleconnectLocalSigningReady && !aleconnectManagedSigningReady && !aleconnectEasSigningReady) {",
    "            throw new GradleException(\"ALEConnect release signing is unavailable. Configure the app-scoped local keystore properties, legacy MYAPP_UPLOAD_* Gradle properties, or verified EAS signing injection.\")",
    "        }",
    "        def aleconnectReleaseSigning = aleconnectLocalSigningReady ? aleconnectLocalSigning : (aleconnectManagedSigningReady ? aleconnectManagedSigning : null)",
    "        release {",
    "            if (aleconnectReleaseSigning) {",
    "                storeFile file(aleconnectReleaseSigning.storeFile)",
    "                storePassword aleconnectReleaseSigning.storePassword",
    "                keyAlias aleconnectReleaseSigning.keyAlias",
    "                keyPassword aleconnectReleaseSigning.keyPassword",
    "            }",
    "        }",
    `        ${END_MARKER}`,
  ].join("\n");
}

function transformAndroidAppBuildGradle(contents, options = {}) {
  const prefix = validateTransformPrefix(options.prefix);
  const hasStartMarker = contents.includes(START_MARKER);
  const hasEndMarker = contents.includes(END_MARKER);
  if (hasStartMarker !== hasEndMarker) {
    throw new Error("Android production signing guard markers are incomplete.");
  }
  if (hasStartMarker && hasEndMarker) {
    const releaseBuildType = contents.match(
      /\bbuildTypes\s*\{[\s\S]*?\brelease\s*\{[\s\S]*?signingConfig\s+signingConfigs\.(\w+)/,
    );
    if (!releaseBuildType || releaseBuildType[1] !== "release") {
      throw new Error("Android production signing guard markers are present but release is not configured with signingConfigs.release.");
    }
    return contents;
  }

  const releaseAssignment = /(\brelease\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/;
  if (!releaseAssignment.test(contents)) {
    throw new Error("Android app Gradle file has no debug-signed release build to guard.");
  }
  const withoutDebugReleaseSigning = contents.replace(
    releaseAssignment,
    "$1signingConfig signingConfigs.release",
  );
  const signingConfigsClose = /\r?\n    \}\r?\n    buildTypes\s*\{/;
  if (!signingConfigsClose.test(withoutDebugReleaseSigning)) {
    throw new Error("Android app Gradle file has no signingConfigs/buildTypes boundary.");
  }

  return withoutDebugReleaseSigning.replace(
    signingConfigsClose,
    `\n${signingGuardBlock(prefix)}\n    }\n    buildTypes {`,
  );
}

function withAndroidProductionSigningGuard(config, options = {}) {
  const androidPackage = config.android && config.android.package;
  const prefix = validateSigningPrefix(androidPackage, options.prefix || PACKAGE_PREFIXES[androidPackage]);
  return withAppBuildGradle(config, (nextConfig) => {
    if (nextConfig.modResults.language && nextConfig.modResults.language !== "groovy") {
      throw new Error("Android production signing guard requires a Groovy app/build.gradle file.");
    }
    nextConfig.modResults.contents = transformAndroidAppBuildGradle(nextConfig.modResults.contents, { prefix });
    return nextConfig;
  });
}

module.exports = withAndroidProductionSigningGuard;
module.exports.PACKAGE_PREFIXES = PACKAGE_PREFIXES;
module.exports.transformAndroidAppBuildGradle = transformAndroidAppBuildGradle;
module.exports.validateSigningPrefix = validateSigningPrefix;
module.exports.isVerifiedEasInjection = isVerifiedEasInjection;
