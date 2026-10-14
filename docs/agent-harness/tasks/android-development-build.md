# Android development build

Scope: reproduce `expo prebuild` / `expo run:android --device` failures and run the Expo development client on the connected Android phone. Preserve the user's Account screen edit, installed consumer data, signing material and sibling Metro/emulator work.

Root causes: Windows Ninja cannot create long generated C++ object paths; the local version code 55 is below the installed alpha.8/code 62; Metro retained old Worklets transforms.

Resolution: the Expo config plugin moves Windows app CMake staging into a short project-specific system temporary directory. The app config matches the published alpha.8/code 62. Metro uses a project-local cache so stale Worklets 0.10.1 transforms are replaced by the installed 0.10.4 plugin without clearing sibling caches. Generated `.cache` files are excluded from its watcher, preventing cache/build writes from causing watch churn; source files remain watched. Linux native builds retain their default staging directory; dependencies and API contracts are unchanged.

Verification: repeated prebuild retains exactly one generated path block and the original key hash. TypeScript and 14 focused signing/runtime/release checks pass. Both the long-path isolated build and canonical-project Gradle build pass. The phone has alpha.8/code 62 with DEBUGGABLE and the original certificate SHA-256 fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c. The in-place install kept the signed-in consumer profile; Home and Account render without the Worklets mismatch after a fresh 4,651-module bundle. Live Metro serves the canonical project at 127.0.0.1:8081 through wireless ADB reverse with Node 24.21.0 and IPv4-first DNS. No uninstall, storage reset or manual call/report submission was used.

Baseline warning: online Expo Doctor is 20/21 because five newer patch releases are available (Expo, dev-client, location, router and splash-screen). The installed dependency versions were retained; the local SDK map passes alignment. This warning did not cause the native path failure or version downgrade. Existing Gradle 10 deprecation and terminal color warnings are not blocking.

Next: keep Metro running for development; after dependency changes, clear this project's cache with `npx expo start --dev-client --clear`. When using localhost over ADB reverse on this Windows host, select IPv4-first DNS (`node --dns-result-order=ipv4first node_modules/expo/bin/cli start --dev-client --localhost`). Keep local version codes at least as high as the installed APK.

Limits: this is local development setup, not a new APK release, Staff deployment or store publication. Broader authenticated API, push delivery, GPS and iOS acceptance are separate.

Closeout: the temporary worktree, short alias and task branch were removed after source-copy/hash checks and a saved recovery patch. Generated graph/build evidence is preserved separately in the task's `mobile-dev-build-2026-10-13` evidence directory. Canonical changes remain uncommitted alongside the unchanged manual Account edit; Metro is running from the canonical project.

Final watcher acceptance: cache exclusion/source inclusion assertions pass; three consecutive Metro health requests return `packager-status:running` in 133ms, 7ms and 1ms after excluding generated files.
