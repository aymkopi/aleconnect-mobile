# Account-link password confirmation

Date: 2026-10-18. Status: isolated implementation; not released.

## Scope

Link an account begins with current signed-in email-password verification, using the existing PanelUI secret field and child-page layout. Only successful verification reveals ALECO account number, registered name and the separate target account password. Existing Review → Send → Staff approval is retained.

The server owns proof issuance, expiry, rate limits and final authorization. Verification lasts five minutes and is bound to the current session/credential and one idempotent linking intent. Five failures in ten minutes cause a ten-minute cooldown; ten in 24 hours require fresh login without banning ordinary login. Status uses the server clock; no secret or proof is persisted. Cancel and late responses clear/revoke only their own generation. Expired verification keeps non-secret account details for retry.

## Contract and rollout

Staff adds `/api/mobile/auth/account-link-verification` (`status|verify|cancel`) and requires `verificationFlowId` on `/api/mobile/account-link-requests` POST. Both requests pin the entry session. Missing/expired proof returns409 `CURRENT_PASSWORD_VERIFICATION_REQUIRED`; fresh-login response uses `ACCOUNT_LINK_REAUTHENTICATE`.

Deploy the server endpoint and guard before publishing this client. Older clients cannot create linking requests after that deployment and need an update; existing accounts and reads remain supported. No database migration, dependency, signing or native change. Rollback must preserve the server protection or explicitly revert the security requirement; never add an insecure legacy bypass.

## Verification

Executable interaction/service tests cover the entry gate, duplicate presses, secret clearing, pinned session/proof submission, server-expired verification preserving number/name, navigation and late-response cancellation. Final suite512 checks:511 pass,zero failures,one existing missing-sibling skip; explicit paired harness passes against the actual Staff path. TypeScript, scoped lint and independent security re-review pass. Review caught and fixed late submission errors after blur/local expiry; both races now have executable regressions.

Figma connector is read-only: existing reference screens were inspected, but new Light/Dark verification/cooldown/expiry frames could not be added. Browser/device visual acceptance, production credentials, new APK and live mutations are unverified. No release/merge/deployment occurred.

## Next

Prepare coordinated draft PRs, enable Figma edit access/local browser use and verify the designed/rendered states before merge/release. Preserve primary manual/iOS work and device state.
