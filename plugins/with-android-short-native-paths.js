const { withAppBuildGradle } = require("@expo/config-plugins");
const { mergeContents } = require("@expo/config-plugins/build/utils/generateCode");

module.exports = function withAndroidShortNativePaths(config) {
  return withAppBuildGradle(config, (nextConfig) => {
    nextConfig.modResults.contents = mergeContents({
      tag: "aleconnect-short-native-paths",
      src: nextConfig.modResults.contents,
      newSrc: `    // Windows Ninja cannot create the long default codegen object paths.
    if (System.getProperty("os.name").startsWith("Windows")) {
        externalNativeBuild {
            cmake {
                buildStagingDirectory new File(System.getProperty("java.io.tmpdir"), "acm-cxx-" + rootDir.absolutePath.hashCode())
            }
        }
    }`,
      anchor: /^android \{/m,
      offset: 1,
      comment: "//",
    }).contents;
    return nextConfig;
  });
};
