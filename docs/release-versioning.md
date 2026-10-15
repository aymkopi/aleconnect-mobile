# Alpha release versioning

Implementation tracker (2026-10-16):

- [x] Pin independent alpha versions and Android build-code floors.
- [x] Test Conventional Commit classification, version ordering, reruns and failed-publication recovery.
- [x] Wire Staff deployment and both Android workflows to the tested allocator and publisher.
- [x] Run local workflow/harness/regression checks and record remaining native/live acceptance.

All products remain alpha releases. Staff and Lineman start at `1.0.0-alpha.1`;
Mobile retains its published alpha history. CI/review run numbers never determine
product versions. Existing release assets, native identities, signers, queues and
unrelated local edits are preserved. This change does not deploy production,
publish an APK, apply a database migration or modify API contracts.

## Policy

Each repository has an independent release stream. Version allocation uses the
highest published `vMAJOR.MINOR.PATCH-alpha.N` GitHub release, never a workflow
run number, review run, timestamp or commit count. Historic reserve/date/preview
tags are retained and excluded from this alpha stream. Mobile continues from
`1.0.0-alpha.10` rather than resetting existing tags.

The highest-impact Conventional Commit since the last published alpha wins:

| Change | Example commit | After `1.2.3-alpha.4` |
| --- | --- | --- |
| Compatible fix/performance fix/revert | `fix(reports): correct count` | `1.2.4-alpha.1` |
| Compatible feature | `feat(accounts): add search` | `1.3.0-alpha.1` |
| Breaking contract | `feat(api)!: remove legacy field` or a `BREAKING CHANGE:` footer | `2.0.0-alpha.1` |
| Another alpha for the same target | manual `bump=alpha` | `1.2.3-alpha.5` |

Every new core starts at alpha.1. `auto` is the default on application changes.
Legacy/unclassified app commits fall back to patch, so authors must use
Conventional Commits (including squash/merge messages) or select a manual impact
when a change adds functionality or breaks compatibility. A manual impact is an
explicit override. The first alpha for a repository always initializes at
`1.0.0-alpha.1`. This workflow never promotes to beta/rc/stable automatically.

Documentation/changelog/harness-only pushes do not publish. All other changed
paths retain the existing conservative application-check gate. Release notes
group actual commit summaries under Added, Fixed, Changed and Breaking changes;
keep human-curated deprecations, removals and security details in CHANGELOG.md.

## CI and platform behavior

- Staff's existing Cloudflare workflow checks the source, allocates its alpha,
  deploys the existing Workers/Pages in their existing order, then publishes the
  GitHub prerelease. Generated `public/release.json` identifies the web build;
  `build-metadata.json` is attached to its release. No database migration is run.
- Both Android pipelines reuse their application checks and build the existing
  standalone `preview` variant for ARM64 phones and x86_64 emulators. They retain
  package IDs, provider files and the original preview certificate. API origin
  remains `https://api.aleconnect.app`; no new credential or PAT is required.
- Android `versionCode` is one greater than the maximum of the published APK
  code, checked-in native configuration and observed platform floor. Mobile's
  floor is 64; Lineman's is 1. A new SemVer core never resets the Android code.
  Raising a locally distributed code requires raising the configured floor too.
- Both native and Staff manifests/lockfile root versions are updated together in
  the ephemeral build checkout; dependency versions are unchanged. No automated
  version commit is pushed back, avoiding recursive release runs.
- Publication is serialized within each existing deployment/release concurrency
  group. Published artifacts/tags are immutable. Every uploaded asset's digest
  must match locally before its draft becomes a public prerelease.
- The same published source skips a rerun. Older queued runs skip before building
  or deploying when a newer release contains that source. Diverged history,
  missing/invalid native metadata and API failures stop before file mutation.
- A failed build reserves no version. After build/deploy verification, publication
  atomically reserves an exact-source tag and creates a draft. A failed GitHub
  operation can leave that unpublished tag and/or a draft for inspection: compare
  source/assets against the recorded workflow before completing or removing only
  that unpublished reservation. Never overwrite published
  assets. A failure after Staff deploy but before publication must be checked
  against the deployed source; a GitHub release alone is not deployment proof.

## Manual use

On the default branch, run **Deploy Cloudflare** (Staff) or **Android Alpha
Release** (Mobile/Lineman), then choose `auto`, `patch`, `minor`, `major` or
`alpha`. For example:

```sh
gh workflow run cloudflare-deploy.yml --repo aymkopi/Aleconnect --ref main -f bump=minor
gh workflow run android-alpha-release.yml --repo aymkopi/aleconnect-mobile --ref master -f bump=patch
gh workflow run android-alpha-release.yml --repo aymkopi/aleconnect-lineman --ref main -f bump=alpha
```

These commands deploy/publish and require release authorization. PR validation
only runs checks; it receives no publication or production credentials. A run
against an already published source skips even if a manual bump was selected.
Use a new reviewed commit for a changed artifact.

## Standards

- [Semantic Versioning](https://semver.org/spec/v2.0.0.html) defines compatibility impact.
- [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) supplies machine-readable intent.
- [Android versioning](https://developer.android.com/studio/publish/versioning) defines monotonic installation codes.

## Verification

Verified locally on the pinned Node24.21.0 runtime with clean lockfile installs:

| Product | Passed checks |
| --- | --- |
| Staff | 118 deployment/harness tests; final release regressions; production frontend build; scoped lint and harness |
| Mobile | 464/464 application tests; TypeScript; Expo lint (zero errors, 181 existing warnings); release-file lint; 2/2 Python verifier tests; harness and resolved alpha10/code64 Expo config |
| Lineman | 344 application passes, one existing skip; TypeScript; Expo lint (zero errors, 50 existing warnings); release-file lint; 2/2 Python verifier tests; resolved alpha1/code1 Expo config |
| Shared | All six changed workflows parse; allocator files are identical; whitespace checks; read-only GitHub inventory/metadata/tag lookup; scoped read-only review with all findings resolved |

Review regressions include mixed-case Conventional Commit types, existing tags
without releases, explicit tag reservation (a draft alone need not create a tag),
wrong-source draft tags, malformed metadata, transient API failures, stale sources,
unchanged-source reruns, native code floors and corrupt uploaded digests. API ref
lookups use the scoped GitHub token and support annotated/private-repository tags.
All three code graphs were refreshed; generated churn is retained separately.

The primary dependency folders were incomplete for the current remote code. Fresh
installations were confined to the task worktrees; no dependency resolution or
primary installation changed. The overly broad direct ESLint scan included
generated MapLibre vendor code; the actual Expo CI lint command passes.

Remaining baseline findings: Lineman's explicit cross-repo shared-contract-doc
comparison differs from current Staff (both files are unchanged by this task).
Its normal isolated CI/harness validation remains separate from that comparison.
Existing npm audit findings in the unchanged dependency locks remain: Staff30,
Mobile41 and Lineman43; this CI-only change does not upgrade those dependencies.

No production/native publication, actual new APK build, installed-device or store
acceptance is claimed. Hosted PR validation and the first authorized default-branch
deployment/native publication are distinct remaining integration gates. Failed
publication can leave the documented unpublished tag/draft for inspection.
