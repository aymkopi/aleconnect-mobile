# Simpler outage reporting

- Scope: approved October27 plan and Figma flow in Staff/API and consumer Mobile. Billing excluded.
- Worktrees: Staff `saved-report-api-hotfix/aleconnect` and Mobile `.cache/consumer-service-phase4`, both `codex/outage-reporting`, bases e8924b0c/ad67a3c. Preserve primary edits, generated graphs, prior APKs and all queues/device state.
- Staff: Affected accounts tab, count and named row action; one filter toolbar, linked account table/own Light/Dark map, complete viewport paging, weight1 native heatmap, exact-coordinate overlap and receipt Sheet. Existing schema/indexes and canonical receipt/audit records; no migration or role expansion.
- Mobile: any No Light/Power type, one10-second draft/account/session capture, at most three active notices, exact advisory date/coverage, ActivityCard plus two-choice sheet, intent before IO, receipt-only success, separate-report escape, Saved recovery and exact ccbdb0d^ Home.
- Verification: Staff8 authorization/date contracts,14 disposable MySQL checks, production build/types/scoped lint and paired harness pass. Mobile632 full tests/types/scoped lint and paired harness pass. All10 controlled browser journeys pass across phone/tablet/desktop and Light/Dark, including doubled tablet text, own-map heatmap/overlaps, real Advisory navigation, list/receipt pagination, cache reuse, bounded lookup failure, separate reports, explicit stale review and original-key recovery. Four review findings and the visual dark-icon issue are fixed.
- Graphify: update attempted in both repos; configured Python is inaccessible and the available fallback lacks a compatible tree-sitter parser. Existing Mobile graph changes are preserved separately; no successful graph refresh claimed.
- Evidence: Staff `.superpowers/outage-reporting`; Mobile `.cache/outage-reporting`. Fixtures use synthetic API/account data. Current production schema was inspected read-only against the pinned identity.
- Release checklist: commit/review source, separately authorize push/deploy; deploy compatible Staff/API first; verify actual version/read-only boundaries, then build/sign/hash Mobile APK and perform authorized native acceptance. Preserve old payload readers and original mutation IDs; rollback source without deleting queues/records.
- Not performed: push, production writes/migration/deployment, flags/provider changes, APK build/install or new device/consumer submission.


## Authorized release preparation (October 27)

- User authorizes scoped commits/pushes to Staff main and public Mobile master using `[skip ci]`, followed by direct ALEConnect API/Pages deployment. No billing, native build/distribution, provider test post, migration or production business command.
- Fresh review found and resolved two release blockers: React Native abort signals lack `throwIfAborted`, and automatic Facebook destination round trips could restore an earlier review checkmark. Native-shaped actual-reader regressions pass; Staff now permanently invalidates review on destination transitions. Four controlled Facebook browser checks pass, including the round-trip case.
- Production API/Pages, runtime/settings and all31 bindings are snapshotted privately before deployment; no runtime flags or unrelated Workers should change. Preserve dirty primary checkouts, generated graph/Uniwind output, test artifacts and every saved queue/device/APK.
- Release execution completed October28; final source/version evidence follows below. Staff's private runbook and backup evidence: `.superpowers/outage-reporting/release-20261027`.


## Production closeout (October 28)

- Source: Staff feature85ea04c7, integrated/pushed main3910d4af with the concurrent Command Center icon release1685f5fd preserved; Mobile public master58069cb. All commits use `[skip ci]`; zero Actions runs were verified for the source heads. No GitHub tag/release or native distribution was created.
- Live Staff1.7.0-alpha.1 identifies source3910d4af. Compatible APIbe2bf212-e0df-4d74-9272-048ae095d564 deployed before Pages6db62da2-6b25-4770-9c7e-2dc361d5d03c (immutable6db62da2.aleconnect-web.pages.dev). The October27 Pages attempt was not executed because automatic approval review hit a usage limit; October28 continuation refreshed the existing OAuth session, rechecked unchanged targets, and completed the upload.
- Verification:634 Mobile tests,36 focused Staff checks, source/production builds, types/scoped lint and paired harness pass. Fresh review fixes have native-shaped cache/capture and actual browser regressions. Production source/version metadata,50 public/immutable asset comparisons (including own map styles) and22 read-only authorization probes pass. All31 API bindings, runtime flags/settings, schedules, Pages config and the operations service are preserved. Signed-in production reads show one affected account, its saved pin, complete map data and working heatmap selection with zero browser errors.
- Preserved: private evidence and rollback bundles, all dirty primary work, Mobile graph/Uniwind output, prior APKs, saved reports/queues and device state. Temporary build-manifest versions were restored after hashing/archiving the exact141-file build.
- Rollback: prior Pagese1b05ff7-d845-4b11-bf10-53ec7975d791, then APIa10569eb-962f-4083-8e87-a3215232b2d5; retain queues/receipts and schema. Private Staff evidence: `.superpowers/outage-reporting/release-20261027`.
- Remaining: the live Facebook Page token is expired, so real provider recovery/posting is unverified. Mobile APK/build/install and native device acceptance were not requested in this release. Billing, migrations, production business test commands and unrelated Worker deployments remain excluded.
- Next: use a separately authorized Mobile build/device acceptance task when ready; renew and verify the Page connection before provider acceptance. No requested push/deployment work remains after documentation publication.
