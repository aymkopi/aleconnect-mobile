# Non-onboarding application coverage audit

Read-only source audit refreshed on 2026-10-10 against `C:/Users/Justine/VSCodeProjects/aleconnect-panelui` and the Staff source in `C:/Users/Justine/.codex/worktrees/profile-update-auth/aleconnect`. The authoritative `figma-screen-inventory.json` contains 389 distinct frame IDs. `figma-coverage-map.json` maps each frame once to its feature, scope and source status. This audit changed only those two external evidence files.

The refreshed map contains **337 source-covered frames, 0 source-partial frames, 3 capability-limited frames, and 49 excluded frames**. Previously reported G1-G5 and L1 now have implementations in the inspected source. No remaining missing source screen was identified in this bounded refresh. Source-covered means a reachable screen/state or shared equivalent exists; it does not certify 1:1 visual fidelity, all rendered permutations, final test completion, deployment or device acceptance. Final auth late-handoff guards and regression tests are implemented; the full integrated Mobile suite passes 418/418. Render/native/live acceptance remains separate.

| Resolved source gap | Inventory frames | Current source evidence |
| --- | --- | --- |
| G1 - ALECO contacts sheet | 94:3764, 492:8439 | `ContactCard` has a View ALECO contacts action. `HotlinesScreen` opens the existing category sheet with an ALECO category, contact search and no-match state; guest and authenticated flows share this source. |
| G2 - Guest report continuation | 493:11904, 493:7629, 493:12089, 612:15048, 612:15178 | Guest Reports main now has a sign-in CTA. Main, list and new-report launchers pass `/reports`, `/reports/list` and `/reports/new`; the auth helper allowlists destinations and retains required-password gating. |
| G3 - Session ended / resume report | 540:9342, 540:9392 | `ForcedLogoutRedirect` captures an allowlisted return intent, passes `session-ended`, and guards a late stored logout reason against a newer session. Sign-in has persistent explanation, method selection and resume form. Copy promises access to scoped saved queue entries and explicitly says unsaved changes may need re-entry. |
| G4 - Linking password-reset continuation | 179:3071, 179:3110, 179:3155, 179:3189 | Auth parses `linking=1` and carries `/profile/link-account`; a legacy linking session receives required-password guidance. Continue signs out of the target service account and returns to email sign-in with the linking destination. Late login/token/session guards now have passing concurrency regressions. |
| G5 - Required-password confirmed success | 604:15799 | Password update awaits a refreshed same-principal session with an explicit cleared requirement, then presents a stable Password updated page with Continue. Accepted-but-unconfirmed changes use a separate Confirm session retry state. |
| L1 - Recently updated report sort | 638:16560, 647:17024 | Both Mobile pickers and deep-link parsing expose `sort=updated`. Staff source orders by `updated_at DESC, ticket_id DESC`, continues on the same tuple with an exact six-digit timestamp cursor, and adds serialized `updatedAt`. Mobile preserves real server ordering; fixture ordering has compatible fallback for older payloads. |

Recently updated is now source-covered across the assigned Mobile and Staff worktrees. Backward-compatible Staff support must be released before the Mobile reader is published. This audit did not inspect deployed support, fresh live schema or the database query plan.

The remaining truthful capability limitations are:

| Limit | Frames | Evidence |
| --- | --- | --- |
| L2 - Production email ownership verification | 177:2801, 177:2877 | Email setup/form/review and verification-unavailable UI exist. The current capability-gated contract still provides mock verification only; production ownership verification is unavailable. |
| L3 - Approved app terms | 549:11984 | The legal-unavailable screen exists and directs consumers to ALECO. ALEConnect-specific approved terms have not been supplied. |

The feeder search states **689:18273, 690:18160, and 694:17904** remain source-covered: search/clear, station-and-feeder matching, no-match copy, overall selection count, and draft-preserving selection actions exist in `alerts-screen.tsx`. Public/guest services, directory/search, notification filters/inbox/message/resilience states, and service guides retain actual feature modules and thin routes. Shared states reuse screens and sheets. External-open failure and copy success use existing toasts; permission return uses the existing photo/alerts settings actions.

Exclusions remain the three Welcome frames; first-run confirmation/account-detail/setup frames; section 466:6132 optional setup; section 466:6134 duplicate first-run linking; setup-skipped and onboarding-contact variants; section 561:12826 superseded/archive; and password/loading foundation specimens. Required password/security/help, profile maintenance, account linking, main/child app screens, appearance, and application dark/accessibility variants remain included.

Verification: 389 unique inventory identities map exactly once; source pointers and resolved issue rows were refreshed from current owning files. The initial Graphify launcher was unavailable and its graph included older snapshots while new feature modules were absent; source remains authoritative. Git status was read at entry and exit and unrelated work was preserved. No application tests were run by this evidence-only audit.

Recorded evidence, distinct from this audit: `recent-sort-handoff.md` reports Mobile focused tests 37/37 and Staff focused tests 24/24. The inspected `staff-tests-final.log` reports 47/47. Root closeout refreshed `tests-v30.log`:418/418 pass with no skips/failures after the foundation mock repair and shared token/session race fix. TypeScript and scoped lint pass (0 errors/14 documented warnings), including the final shared-sheet checks. Web and iOS Hermes exports pass; native acceptance is recorded separately.

Not checked: 1:1 visual fidelity for all 389 frames, every rendered permutation, real login/provider verification, live mutations, real camera/push/payment/connection operations, physical devices or native iOS. Labelled fixtures establish presentation states only; the billing notification fixture still targets a generic advisory and does not independently establish billing-reminder content after opening.


2026-10-10 release follow-up: real ARM64/x86_64 v33 APK and compatible API Worker339/a2e1d186 are delivered.56 Staff focused checks and25 read-only production assertions pass. Guest native Home/Advisories/detail load live on clean Android16. Coverage remains source-level; old Android15 ART crash, physical/native-iOS/authenticated/provider acceptance and the three capability limitations stay open.
