# Consumer password policy

Status: implementation complete on `codex/consumer-password-policy`; paired PRs and Staff-first rollout are authorized, with final hosted checks pending. Staff owns the paired API policy and must deploy before the next Mobile release. Preserve primary/manual changes, previous APK/IPA/signing/device evidence and the separate pending documentation-only branch.

Final gates: Mobile TypeScript, scoped lint, both harness validators, Staff production build and whitespace checks pass. Initial implementation stayed isolated and uncommitted. The authorized release phase now proceeds through reviewed PRs, Staff deployment and verification, then Mobile alpha publication.

- Regular two-step changes, mandatory password replacement and email sign-in setup share the same 8–128-character policy and live checklist. Require ASCII uppercase, lowercase, number, a special character, matching confirmation, a non-common choice and no known personal/account details. Minimum length counts NFKC-normalized Unicode code points; passwords of 64 and 128 ordinary characters are accepted.
- Reuse existing PanelUI fields, visibility controls, buttons and semantic colors. Keep new-password drafts on retryable errors; clear secrets on completion, cancellation, blur or principal change. Do not persist passwords or verification proofs.
- Send actual confirmation in mandatory replacement and setup requests. The server revalidates policy/current personal information and checks known breaches only on submission; the UI does not claim a completed breach check while typing.
- Existing five-minute session-bound verification, cooldowns, forced-login threshold, current-password reuse prevention and other-session revocation remain in place. No secure password-history store exists, so recent-history enforcement is not claimed. Production email verification remains unavailable; do not bypass its existing capability guard.

Verification: full Mobile suite554 tests,553 passed, zero failed, one existing skipped test; TypeScript and scoped lint pass. Strict auth/Alerts fixtures use the real pure validator. Staff lifecycle948 tests includes946 passed, zero failed, two existing skipped tests. Matching Staff/Mobile policy digests, real HIBP rejection of the public `Password123!` example and independent read-only review pass. Browser fixture interactions verify common-password blocking, live feedback, visibility and preserved drafts across expiry; no real password changes or device activity occurred.

Remaining: integration approval, Staff-first deployment, then native release and device acceptance. HIBP outages leave the password unchanged and return a retryable error. Physical devices, native builds and production MySQL mutation/concurrency were not tested in this task.


## Authorized release tracker (2026-10-19)

- [x] Preserve primary/manual changes with private path/hash inventories; Staff192 files and Mobile5 documentation files remain separate from feature changes.
- [x] Confirm current default branches and latest published releases: Staff66e4b34c /1.2.0-alpha.1; Mobileff011146 /1.3.1-alpha.1. Preserve unrelated Mobile documentation PR21.
- [x] Trace ALECO directory and user-detail consumer reset to the same policy form and server writer; add browser coverage for common-password rejection, confirmation and retry.
- [x] Mobile full suite554:553 pass, zero failures, one existing skip; fresh TypeScript/scoped lint/harness/whitespace and24 focused tests on Node24.21 pass. Independent read-only review reports no blockers. Staff final hosted checks remain required before its merge.
- [ ] Create paired PRs with detailed Added/Changed/Security/Compatibility/Validation descriptions; retain all exact-head required checks.
- [ ] Merge Staff, verify deployed source/version, runtime/bindings and public read-only boundaries. Rollback: previous immutable Staff release1.2.0-alpha.1; no schema rollback.
- [ ] Merge Mobile only after Staff is verified; publish one shared alpha/build context for APK and unsigned IPA. Verify source, versions, hashes, original Android certificate and native metadata.
- [ ] Sync primary default branches while restoring/hash-verifying manual work; retain previous release/device/signing and security-audit evidence.

Expected compatible feature versions, subject to the published-release allocator: Staff1.3.0-alpha.1 and Mobile1.4.0-alpha.1. Native build codes remain monotonic; workflow run numbers never determine versions. No password-history table or claim of recent-history enforcement is added. Free personal-team signing still does not provide iOS remote-push entitlement.
