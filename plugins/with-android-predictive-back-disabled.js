const { AndroidConfig, withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withAndroidPredictiveBackDisabled(config) {
  return withAndroidManifest(config, (nextConfig) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
      nextConfig.modResults,
    );

    mainApplication.$["android:enableOnBackInvokedCallback"] = "false";

    return nextConfig;
  });
};
