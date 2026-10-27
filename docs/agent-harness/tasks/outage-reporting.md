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
- Release execution and final source/version evidence are pending below. Staff's private runbook and backup evidence: `.superpowers/outage-reporting/release-20261027`.
