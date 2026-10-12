# Profile child pages implementation plan
> Execution: superpowers:executing-plans, solo; independent final review through requesting-code-review.

Goal: Replace every Account child boundary with accepted Figma flows using PanelUI.
Architecture: Preserve identity/account scope and existing services. Reuse ReportPage, InputGroup, map picker, one BottomSheet host, Dialog, Switch and Checkbox. Label fixtures and prohibit preview writes.
Stack: Expo Router, React Native, PanelUI, Inter/Jakarta, Lucide, MapLibre.
Spec: Figma 6uIaVRM63oHA723WKgjo5k page94:2045; exact references in external profile-child-pages evidence.
- [ ] Validation/selection/old-server safety tests RED, then helpers.
- [ ] Information/edit/location/review/save and photo preview/upload/errors.
- [ ] Accounts/default/unlink, link review/results, requests/detail/password help.
- [ ] Routine password change and alert subscriptions/offline/retry/device setup.
- [ ] Account routes, About/help/privacy/terms and existing Appearance.
- [ ] Isolated Staff verified-edit version1: atomic details PATCH, password, active-report gate, ownership/revision revalidation. Release backend first; old servers keep editing locked.
- [ ] Tests/typecheck/lint/build, final review, Android light/dark/large text/retained data, Graphify/handoff/history.

Callers: Account rows/avatar, Expo children, notification-settings alias. Model metadata/services/tests/fixtures update together. Preserve legacy presentation, queues/native signing.
Rollback: revert scoped files; old profile PATCH shapes remain. Backend before Mobile release. Deployment/live writes excluded.
