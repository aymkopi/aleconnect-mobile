# Aleconnect Mobile Release Hardening Plan

Date: 2026-07-28

## Approved Decisions

- Complete stabilization and security before feature work, then finish every approved item.
- Enforce one active device per consumer.
- Keep queued evidence as a local file, then use private R2 storage with short-lived authenticated URLs after submission.
- Drive conditional report fields from backend metadata.
- For KWHM transfer, collect free-text current and requested registered names. Never expose consumer search or account-existence responses.
- Persist optional report intake fields in a versioned Aiven MySQL JSON column.
- Require a valid Albay pin and verify that the resolved barangay agrees with the submitted PSGC.
- Target advisories using the consumer home area plus manually selected subscriptions.
- Show active advisories on Home and in a dedicated feed/detail route.
- Publish scheduled advisories within one minute. Attempt ticket pushes immediately and retry durably.
- Show only sanitized consumer milestones in report history.
- Persist offline reports and synchronize on reconnect/resume plus best-effort OS background execution.
- Autosave notification settings.
- Use cursor pagination with 25 rows by default.
- Treat Android and iOS as production targets; web remains a development/debugging target.

## Delivery Phases

### Phase 1: Security And Data Integrity

1. Transfer and revoke Expo token ownership atomically.
2. Move bearer tokens to Expo SecureStore and exclude sensitive data from device backups.
3. Scope request deduplication and queue synchronization by consumer.
4. Serialize persistent queue writes and protect account changes during submission.
5. Replace permanent evidence URLs with short-lived authenticated reads.

### Phase 2: Report Contract

1. Add metadata-driven conditional field rules.
2. Add the versioned JSON intake-details migration.
3. Validate Others descriptions and KWHM transfer names on mobile and server.
4. Align text and evidence-size limits.
5. Validate pin, Albay boundary, PSGC, and reverse-geocoded barangay agreement.
6. Add report cursor pagination and consumer-safe history.

### Phase 3: Consumer Experience

1. Implement Home advisory preview, advisory feed, and advisory details.
2. Make scheduled publication and push retries durable.
3. Fix report evidence rendering, local/remote transitions, and static report map.
4. Improve report list copy, status semantics, archive/queue presentation, and destructive-action safety.
5. Fix bottom sheets, keyboard behavior, notification settings, toast layout, avatar fallback, theming, contrast, and accessibility.

### Phase 4: Offline, Performance, And Release

1. Add refresh cooldowns, cache freshness metadata, and request timeouts.
2. Add best-effort Expo background queue synchronization and persisted completion notices.
3. Add cursor-backed virtualized lists.
4. Add behavioral tests for races, ownership, conditional validation, notifications, and background queue completion.
5. Apply the backup-first database migration.
6. Build, deploy the backend, rebuild the Android development app, and verify on the connected device.

## Completion Rule

A tracker item is complete only when its implementation, focused automated test, integration/build check, and required runtime or deployment evidence all pass.
