# Account linking and unlinking password confirmation

Date: 2026-10-18. Status: isolated implementation; not released.

## Scope

Link an account begins with current signed-in email-password verification, using the existing PanelUI secret field and child-page layout. Only successful verification reveals ALECO account number, registered name and the separate target account password. Existing Review → Send → Staff approval is retained.

The server owns proof issuance, expiry, rate limits and final authorization. Verification lasts five minutes and is bound to the current session/credential and one idempotent linking intent. Five failures in ten minutes cause a ten-minute cooldown; ten in 24 hours require fresh login without banning ordinary login. Status uses the server clock; no secret or proof is persisted. Cancel and late responses clear/revoke only their own generation. Expired verification keeps non-secret account details for retry.

## Contract and rollout

Unlink uses the same UI/hook with a separate `account-unlink` proof from `/api/mobile/auth/account-unlink-verification`. PATCH `/api/mobile/linked-accounts` action `unlink` now carries `verificationFlowId` and pins the verification session. Confirm the current email password before revealing existing service-account password/replacement-default controls. Keep at least one linked account; require an owned replacement when removing the default. Historical reports remain. The existing server mutation/revision/audit/session-revocation protocol is retained, and delayed unlink responses cannot sign out or redirect a newer login. Set-default and read requests remain unchanged. Older clients must also update before unlinking after the server guard deploys.

Staff adds `/api/mobile/auth/account-link-verification` (`status|verify|cancel`) and requires `verificationFlowId` on `/api/mobile/account-link-requests` POST. Both requests pin the entry session. Missing/expired proof returns409 `CURRENT_PASSWORD_VERIFICATION_REQUIRED`; fresh-login response uses `ACCOUNT_LINK_REAUTHENTICATE`.

Deploy the server endpoint and guard before publishing this client. Older clients cannot create linking requests after that deployment and need an update; existing accounts and reads remain supported. No database migration, dependency, signing or native change. Rollback must preserve the server protection or explicitly revert the security requirement; never add an insecure legacy bypass.

## Verification

Executable interaction/service tests cover the entry gate, duplicate presses, secret clearing, pinned session/proof submission, server-expired verification preserving number/name, navigation and late-response cancellation. Final suite520 checks:519 pass,zero failures,one existing missing-sibling skip; explicit paired harness passes against the actual Staff path. TypeScript and independent security re-review pass; scoped lint has no errors and two baseline auth-context warnings. Review caught and fixed late submission errors after blur/local expiry; both races now have executable regressions.

Figma editing was restored on October18. [Account confirmation states](https://www.figma.com/design/6uIaVRM63oHA723WKgjo5k/Aleconnect-mobile?node-id=1295-24615) contains12 editable402×874 screens: linking/unlinking verification, cooldown and expired verification in Light/Dark. Reused child headers, secret fields, labels/helpers,48px buttons and conditional context-notice instances; retained16px gutters,12px section gaps, Inter/Plus Jakarta Sans and #00060F Dark background. The session-information card and Security check eyebrow remain removed. Balanced copy explains why confirmation is needed in one sentence; the field helper distinguishes the ALEConnect sign-in password from the ALECO account password. Cooldown explains when to retry and that sign-in remains available; expiry explains that account details are kept. Figma and the shared app component match. Updated visual review passes;113 editable text layers/140 instances, no image-filled nodes or content overflow. Cooldown/empty expired fields keep Continue disabled. Existing account details, review and destructive confirmation designs remain unchanged. These are static state designs, without new prototype connections. Browser/device app acceptance, production credentials, new APK and live mutations remain unverified. No release/merge/deployment occurred.

## Next

October18 extension verification:26 focused gate/auth-token/service tests independently pass on re-review, covering purpose isolation, duplicate presses, expiry/default-selection recovery, late success, cancellation and session replacement. Full suite520:519 pass,zero failed,one existing sibling-path skip; explicit paired harness/types pass. Scoped lint has no errors with two baseline auth-context warnings. Server64 focused checks/build/scoped lint/harness pass. Refreshed code maps and Figma state ledger stay outside commits. No schema/dependency/native/signing change, deployment or APK.

Mobile15/Staff55 remain coordinated draft PRs. Finish rendered-app/browser and authorized device acceptance before merge/release; Figma design acceptance is now verified. Preserve primary manual/iOS work and device state.

### Approved profile-editor extension — completed source/Figma pass

- [x] Figma first: unified photo/contact/service-email/location editor with review, saving, permission, partial-save, source-picker and completion states in both themes. [18 editable frames](https://www.figma.com/design/6uIaVRM63oHA723WKgjo5k/Aleconnect-mobile?node-id=1309-24926).
- [x] Staff: additive serviceAccountEmail/serviceAccountEmailEditable; explicit selected-service email update under existing password/ownership/revision checks. Identity-email guard and legacy fields retained; no migration.
- [x] Mobile: one scoped edit/review/save flow; photo-only save, partial-success retry, discarded-picker generation guard, session-pinned uploads and compatible photo-route redirect.
- [x] All seven class definitions match Staff: RM Residential Mainland; RI Residential Island; LVM Low Voltage Mainland; LVI Low Voltage Island; HV High Voltage; CM Commercial Mainland; CI Commercial Island. Unknown values remain readable.
- [x] Focused/full source checks and read-only review; CI includes new Staff profile tests. Final evidence and acceptance limits are in implementation history. Both PRs remain drafts; no merge/deploy/release.


## 2026-10-18 — Approved unified profile editor

- Scope: combine profile photo selection/preview with contact number, service-account email and home location; shorten labels without removing password/account context. Redirect old photo links with the selected service account. Decode RM/RI/LVM/LVI/HV/CM/CI exactly as Staff, preserving unknown values.
- Figma: [18 editable Light/Dark editor, review and recovery frames](https://www.figma.com/design/6uIaVRM63oHA723WKgjo5k/Aleconnect-mobile?node-id=1309-24926); reused one photo-editor component with camera badge, choice/undo states, crop source sheet, photo-only review, saving, permission, partial-save and completion states. Canonical Edit profile is updated; the standalone photo-only section is marked as superseded. Final visual checks include Dark notice contrast and Camera/Image prefixes; 282 text layers/218 instances. No prototype connections added.
- Contract: additive selected-service email fields retain identity email separation, legacy fields, password checks, ownership/revision locks and audit. Photo-only upload does not add a password requirement; combined saves handle partial success honestly and pin session/scope. Late discarded picker callbacks cannot replace a newer draft. No migration/dependency/native/signing change.
- Verification: Mobile full suite529:528 pass,zero failed,one existing isolated-sibling skip; final11 editor/picker tests, TypeScript and scoped lint pass. Staff16 profile tests, production build and scoped lint pass; the existing account-audit workflow now includes all profile tests. Independent read-only re-review found no remaining actionable issue. Paired harness, whitespace and source-map refresh accompany the scoped commits.
- Remaining risks: local browser use is disabled in Work settings, so rendered-app acceptance is unverified. Native camera/library/crop/real upload, live DB and new APK acceptance remain separate. Draft Staff55/Mobile15 are not merged or deployed; preserve primary/manual/iOS/device work.
- Next: run draft CI and complete app/native acceptance, then separately authorize coordinated Staff-first merge/release.
