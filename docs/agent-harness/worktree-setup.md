# Worktree setup

Docs/harness work needs Git and Node, with no app dependency install. Start from the intended commit in sibling directories named `aleconnect`, `aleconnect-mobile` and `aleconnect-lineman`; inspect branch/base and local changes before starting. Another task's source or handoff can advance independently.

`npm run harness:doctor` checks Git status, lockfile presence and sibling identity without reading environment files, installing packages, starting processes or calling a network service. Warnings identify existing changes or absent optional siblings. An explicitly supplied invalid sibling fails. `--app` also requires stable Node 22.13+ or 24.3+, a valid .node-version pin and local CLI/TypeScript files; their presence does not prove installed dependencies match the lockfile.

For app work in this checkout:

```powershell
node --version
npm ci
npm run harness:doctor -- --app
npm run start -- --port 8082
```

The port is a suggested worktree-specific example; choose another free port when necessary. Metro serves JavaScript; it does not rebuild native dependencies. Use the current app config and development build for native capability changes. Android previews use Node 24.21.0 from .node-version, Java/Android SDK and existing signing material.

Configure required secrets through the approved local configuration outside Git. Do not copy another checkout's environment files or signing data as routine setup. Do not use prebuild/reset/uninstall as a generic startup step.

With another layout, use `npm run harness:doctor -- --sibling <path>` and `npm run harness:check -- --sibling <path>`. The sibling flag selects Staff; --staff is unsupported.

Run the change-specific checks from [AGENTS](../../AGENTS.md) and [the harness map](index.md). Use `npm run harness:check` for links, contracts, skill metadata, privacy and history evidence. Diagnostics do not establish app health, live schema, deployment or device acceptance.

[Runtime policy and reviewed dependency commits](runtime.md) distinguish supported versions from the validated CI/native default.

For concurrent Windows preview bundles, isolate the temporary Metro cache in this worktree before running the preview command:

```powershell
$buildTemp = Join-Path (Get-Location) ".expo/preview-temp"
New-Item -ItemType Directory -Path $buildTemp -Force | Out-Null
$env:TEMP = $buildTemp
$env:TMP = $buildTemp
```

Use Node 24.21.0 from .node-version on PATH. This avoids the shared-cache EPERM observed during concurrent Gradle bundle checks without deleting another process's cache.
