# iPhone USB build

Scope: build the current consumer app for an iPhone 11 from Windows, then sign and install over USB with the user's free Apple account. Read-only pymobiledevice3 USB discovery independently confirms product `iPhone12,1` (iPhone 11), iOS27.2 and a USB connection; private device identifiers are omitted here.

## Build

- Branch: `codex/ios-usb-ipa`; base `b129b1e595b8102c444efd06184f8470fd98e7a5`.
- Workflow: `.github/workflows/ios-usb-ipa.yml`, standard `macos-26` runner. It runs on this build branch's workflow changes and can be dispatched after integration. No default-branch merge is needed for the initial build.
- Expo prebuild and CocoaPods generate the Xcode workspace. Release archive targets physical ARM64 iPhones, embeds the JavaScript bundle and uses `https://api.aleconnect.app` with fixture mode disabled.
- Only the runner's app config normalizes the numeric iOS version and sets a build number. Only generated Personal Team test entitlements omit APNs. Tracked application configuration, Android signing and release numbering are unchanged.
- The downloadable artifact contains `Aleconnect-unsigned.ipa`, `SHA256SUMS`, and `build-metadata.json`. It needs local signing before installation. Apple credentials, certificates and provisioning profiles are not sent to CI.

## Windows installation

1. Install [iloader](https://github.com/nab138/iloader/releases) from its official repository and the Apple USB drivers required by its [instructions](https://github.com/nab138/iloader#how-to-use).
2. Connect the unlocked iPhone by USB and accept **Trust This Computer** on the phone.
3. Open iloader and enter the Apple account and any two-factor prompt locally. Import the verified IPA and install it on the connected phone.
4. Follow any required **Settings > General > VPN & Device Management** trust prompt and **Settings > Privacy & Security > Developer Mode** prompt, then restart if requested.
5. Launch ALEConnect. Check guest pages, maps, sign-in, camera/photo permissions and location. Preserve existing app data; do not uninstall or revoke other certificates to troubleshoot without inspecting their owners.

[AltServer](https://github.com/altstoreio/AltStore) is an alternative: its [release notes](https://github.com/altstoreio/FAQ/blob/main/release-notes/altserver.md) describe holding Shift while clicking the Windows tray icon to reveal **Sideload .ipa**. It can directly sign/install an IPA without first installing AltStore.

Free [Apple Personal Team provisioning](https://developer.apple.com/help/account/basics/about-your-developer-account) expires after seven days and permits up to three installed apps per device. Refresh/re-sign before expiry. This personal build does not support APNs remote push or establish App Store/TestFlight readiness. Compatibility with the reported iOS version and native behavior remains unverified until installation.

## Tool findings

| Tool | Role and fit |
| --- | --- |
| [xtool](https://github.com/xtool-org/xtool) | Cross-platform SwiftPM compilation, signing and installation; its documented build path does not build this Expo/CocoaPods project unchanged. |
| [GitHub runner images](https://github.com/actions/runner-images) | macOS with Xcode; selected native compiler for this app. Standard public-repository runners have free build minutes. |
| [Fastlane](https://github.com/fastlane/fastlane) | Automates Xcode builds/signing on macOS; direct `xcodebuild` is sufficient for this one build. |
| [iloader](https://github.com/nab138/iloader) | Windows signing and USB installation of an existing IPA; selected installation route. |
| [AltStore/AltServer](https://github.com/altstoreio/AltStore) | Alternative Windows signing, USB sideloading and refresh workflow. |
| [SideStore](https://github.com/SideStore/SideStore) | Optional on-phone refresh after initial installation; unnecessary for first USB installation. |
| [pymobiledevice3](https://github.com/doronz88/pymobiledevice3), [ideviceinstaller](https://github.com/libimobiledevice/ideviceinstaller) | Device communication/diagnostics and installation of already provisioned apps; neither compiles the Expo app or replaces Apple provisioning. |

## Evidence and remaining work

- First [run 39033064614](https://github.com/aymkopi/aleconnect-mobile/actions/runs/39033064614): npm install and TypeScript passed. Alignment stopped on six existing patch recommendations (Expo, Asset, Constants, Linking, Notifications, Router). Locked dependencies are retained; alignment is advisory and Doctor skips only that same version recommendation check. Other Doctor/native checks remain required.
- Local harness/whitespace and workflow YAML, trigger/permission, Bash/Python/Node syntax checks passed. Graphify code refresh completed (4,349 nodes / 8,151 edges); generated output is retained separately under ignored `.cache/ios-ipa/graphify-refresh`, with tracked graph files restored.
- Apple Mobile Device Service is running; after the user connected/trusted the phone, Windows reports healthy Apple USB/WPD devices and read-only pymobiledevice3 confirms the model/OS over USB. Mobile MCP lists only the existing Android tablet, so it does not establish iPhone UI automation availability.
- [Retry 39033231341](https://github.com/aymkopi/aleconnect-mobile/actions/runs/39033231341) **passed** from source `ac9cae8c675da66f35cd1bcf6ad4dfb1c11c79ef`: dependency install, TypeScript, alignment reporting, Doctor, native iOS generation, CocoaPods, Xcode archive and IPA verification/upload. Doctor skips only dependency-version recommendations; the other checks passed. Official iloader2.3.9 Windows MSI is downloaded under ignored `release/ios/tools`, with GitHub's published SHA256 `774ed8c14b74530d278ec229a861a8719d92827508b2871bb90fd0d52be85f16` verified. It has not been installed or authenticated.
- Exact local artifact: `release/ios/39033231341/Aleconnect-unsigned.ipa`, 21,051,493 bytes, SHA256 `39e3ed98b8cada45af256e7a16cb48399de9ab2be001e189a64750f32e541d44`. Version1.0.0/build2, bundle `com.kapecakes.aleconnectmobile`, minimum iOS16.4. Local ZIP/Info.plist/Mach-O platform2/ARM64, exact source/hash, bundled Hermes9,650,506 bytes, live API URL, required permission descriptions and absent signing/provisioning checks pass. The existing Hermes disassembler and compiled fixture-mode assertion independently confirm fixtures are disabled. `local-verification.json` is beside the IPA; the local verifier/build log are under `.cache/ios-ipa`.
- The extra local bytecode-header check initially used the reversed magic constant; Hermes source confirmed its little-endian encoding, and the corrected header plus actual disassembler/fixture check passed. A sandbox temporary-file denial was resolved by checking in a task-specific temp directory outside the sandbox; it was not a native-build failure.
- Pending: local Apple signing, USB installation, Developer Mode and native-device acceptance. A later read-only Developer Mode query could not reach the phone, so its state is unknown. No Apple account login, device writes, public release, API deployment or store submission has occurred.
