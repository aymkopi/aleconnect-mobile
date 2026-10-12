# Profile child-page implementation

Worktree: C:/Users/Justine/VSCodeProjects/aleconnect-panelui; branch codex/panelui-five-main.
Staff safeguard: C:/Users/Justine/.codex/worktrees/profile-update-auth/aleconnect; branch codex/profile-update-auth.
Accepted Figma: https://www.figma.com/design/6uIaVRM63oHA723WKgjo5k/Untitled?node-id=94-2045

PanelUI is the only active UI component library. Native View/Image/Pressable, Lucide, MapLibre and Expo media/permission APIs compose the screens. No active GluestackUI/HeroUI imports; archived legacy presentation remains retained. Child pages reuse ReportPage, InputGroup, Field, Select, Dialog, one BottomSheet host, Switch, Checkbox, Spinner, Button and Text. Inter body/forms and Jakarta shared headers remain; 16px side gutters, 12px rhythm/card radius, semantic light/dark surfaces, hidden scrollbars, matching 48px field icon slots and keyboard-sticky measured footers.

## Routes and accepted designs

| Journey | Route / state | Figma node |
|---|---|---|
| Information and active-report lock | /profile/details; serviceAccountId; fixture state=locked |403:4407,4447|
| Contact / supported service-account email / location | details edit/location/review/saved; full MapLibre picker |403:4487,4527,4567|
| Linked accounts / default / unlink | /profile/accounts; unlink password; replacement default Select; confirmation |94:4754;179:3328,3371|
| Link account | /profile/link-account; form/review/received/errors/password-reset guidance |177:2539,2583,2627,2801|
| Requests / canonical status detail | /profile/link-requests; requestId |177:2988;549:11834|
| Routine password change | /profile/change-password; saved/discard/errors |548:11814|
| Profile photo | /profile/photo?serviceAccountId=; choose/permission/preview/save/retry/discard |548:11933,11993|
| Alerts and broadcast areas | /profile/push-notifications; /notification-settings alias; one sheet with substations/feeders/back |426:4616;430:4891;703:17922|
| Help / About / Privacy / Terms | /profile/help,about,privacy,terms |549:12019;566:12905|
| Appearance | existing Account sheet -> embedded theme selection / Back |725:19613|
| Email setup dependency | /email-setup; supported setup/review/result/discard/verification-unavailable | Existing source flow, same child foundations |

## Contracts and rollout

Private screens require current principal, authorized service account and access revision. Keyed state and mounted/current guards discard stale read/write results. Selected-account photo uploads retain that account in upload and completion; changing default does not retarget existing reports. Exact secrets stay in memory and clear on attempts/blur. Auth redirects intentionally survive clearing the old scope. Synthetic fixtures require explicit labelled preview entry; their writes never call live services. Queue replay stays paused.

Verified detail editing is an additive Staff profile capability, version1. GET supplies activeReportCount. PATCH field:details requires explicit serviceAccountId/accessRevision, a selected-service password and an atomic batch of reviewed fields. Ownership/revision/membership locks, active-status locks and password verification precede updates; any failure rolls back. Resolved/closed/rejected are terminal; unknown statuses block editing. The active-report rule is scoped to the edited service account. Old single-field shapes remain compatible and receive the active-report gate.

Release Staff before Mobile. It is NOT deployed in this task: production editing remains locked when metadata is absent. Unified identity email is deliberately read-only: source rejects service-account edits to sign-in email and has no real re-verification endpoint. Existing email setup exposes only a capability-gated mock verification contract; production verification unavailable is explicit. Never describe mock setup as verified email ownership. No schema migration or live writes.

Notification choices use server-confirmed caches. 401/403 never fall back to private cached settings. A newer draft survives an in-flight save; a post-save scoped reload supersedes old reads. Offline drafts are kept on the open screen, with discard confirmation on leave; no new durable preference queue. Push permission/token registration is separate from saved subscriptions.

Privacy links the official ALECO privacy notice; an ALEConnect-specific approved Terms document was not supplied, so the Terms page identifies that gap rather than inventing legal text.

## Verification and acceptance

Final results and APK metadata are recorded below after native inspection. External evidence: C:/Users/Justine/.codex/visualizations/2026/10/06/01a11159-52ae-76a2-8dfa-7672826bbaea/outputs/redesign-04/native-implementation/profile-child-pages.

Independent reviews found and corrected selected-photo scope, intentional sign-out redirect, settings draft/refresh races, reviewed-payload/busy navigation, stale email account refresh and late token handoff. Actual late-token tests exercise newer login/scope invalidation/success. Original security-handler RED4 failed, restored GREEN passes.

Preview24 is diagnostic and superseded: device entry reproduced a JavaScript exception because three child screens depended on an unmounted ConsumerProfileProvider. The rebuilt app uses direct profile loading. Removed those context reads; Account refreshes on focus and child mutations clear profile caches. The root-cause regression and native retry are required for closeout. Prior native SIGSEGVs remain a separate, unresolved release acceptance gate.

Live authenticated saves/link/unlink/passwords, real camera/gallery/crop/R2/push, production database transaction concurrency, physical phone, native iOS, spoken accessibility and every Figma permutation require disposable authenticated acceptance. Successful labelled fixtures and bundles do not establish those gates. No commit, push, merge, deployment or real-account mutation is included.
