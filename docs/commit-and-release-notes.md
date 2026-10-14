# Commit messages and release notes

Use a short Conventional Commit title with a categorized patch-note body
for substantial changes. Small, self-explanatory commits can keep only the
title. Describe the resulting behavior and why the change matters.

Include only applicable sections:

| Section | Content |
| --- | --- |
| Added | New features and their purpose |
| Changed | Changes to existing behavior or presentation |
| Updated | Dependency/configuration versions and compatibility |
| Fixed | Bug trigger and corrected behavior |
| Security | Authorization, validation, and security protections |
| Deprecated | Still-supported features planned for removal, with replacement/timeline |
| Removed | Features actually removed, with an upgrade path when needed |
| Validation | Actual checks and outcomes; distinguish source, CI, artifact, device, and production acceptance |
| Migration | Required schema/data/client steps and deployment order |

Omit empty sections. Use Changed for behavior and Updated for dependencies
or configuration. Do not call removed features deprecated. Security fixes,
data migrations, and breaking changes need enough detail to explain their
impact and upgrade path. Never include secrets or private production data.

For example, a product commit from the consumer security release could read:

```text
feat(mobile): add secure password flow and fluid navigation

Added
- Show unread notification counts and add Security settings.

Changed
- Glide one active navigation pill between existing tab positions.
- Label Reports KPIs as fetched data for the selected period/filters.

Updated
- Align five Expo 57 patch dependencies with the installed SDK.

Security
- Verify the current password before setting its replacement.
- Keep sensitive fields in memory; enforce verification limits server-side.

Validation
- 456 tests, typecheck, Doctor 21/21, and production exports pass.
- Exact-release device/private-password acceptance remains unverified.

Migration
- Deploy the compatible Staff API before Mobile; no database DDL.

Refs: #9
```

Each actual commit describes its own diff. Use `fix` for bug patches,
`feat` for additions, and `!` plus a `BREAKING CHANGE:` footer only for real
incompatibilities. Detailed notes do not change versioning automatically;
the existing release workflows keep their version-allocation policy.

Use the same categories in PR descriptions, changelogs, and GitHub release
notes. Releases summarize changes since the previous published version and
link their PRs. Keep merged commit SHAs, published tags, and binary assets
intact; correct release-note text without amending history or force-pushing.

Enable the checked-in editor template for this clone:

```powershell
git config --local commit.template docs/commit-message-template.txt
```

The template assists editor-created commits. For `git commit -m`,
`git commit -F`, and GitHub merges, supply the categorized body explicitly.
No hook or dependency is needed.

References: [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/),
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
[Expo changelog](https://github.com/expo/expo/blob/main/packages/expo/CHANGELOG.md),
and [Tauri releases](https://github.com/tauri-apps/tauri/releases).
