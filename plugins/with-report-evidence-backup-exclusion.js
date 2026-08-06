const { withAppDelegate } = require("@expo/config-plugins");
const { mergeContents } = require("@expo/config-plugins/build/utils/generateCode");

const nativeCode = `
    // Offline report evidence must remain local but must not enter device backups.
    let reportEvidenceDirectory = FileManager.default.urls(
        for: .documentDirectory,
        in: .userDomainMask
      )[0].appendingPathComponent("report-evidence", isDirectory: true)
    let applicationSupportDirectory = FileManager.default.urls(
      for: .applicationSupportDirectory,
      in: .userDomainMask
    )[0]
    for var localDataDirectory in [
      reportEvidenceDirectory,
      applicationSupportDirectory,
    ] {
      do {
        try FileManager.default.createDirectory(
          at: localDataDirectory,
          withIntermediateDirectories: true,
          attributes: nil
        )
        var localDataResourceValues = URLResourceValues()
        localDataResourceValues.isExcludedFromBackup = true
        try localDataDirectory.setResourceValues(localDataResourceValues)
      } catch {
        NSLog("Unable to exclude local Aleconnect data from backup: \\(error)")
      }
    }
`;

module.exports = function withReportEvidenceBackupExclusion(config) {
  return withAppDelegate(config, (nextConfig) => {
    if (nextConfig.modResults.language !== "swift") {
      throw new Error("Report evidence backup exclusion requires Swift AppDelegate.");
    }

    nextConfig.modResults.contents = mergeContents({
      tag: "aleconnect-report-evidence-backup-exclusion",
      src: nextConfig.modResults.contents,
      newSrc: nativeCode,
      anchor: /return super\.application\(/,
      offset: 0,
      comment: "//",
    }).contents;

    return nextConfig;
  });
};
