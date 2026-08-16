# Report list card redesign

Date: 2026-08-17
Status: approved design
Scope: ALEConnect mobile report list UI plus additive staff/mobile report-list contract support for display address

## Goal

Redesign consumer report list cards to match the approved reference: ticket number at the top left, compact status badge at the top right, strong report title, dedicated date/time line, muted one-line address, and a trailing chevron. Preserve existing report navigation, archive grouping, search, sort, filters, queue behavior, and status synchronization.

## Current state

Mobile `ReportListGroup` renders each report through `ListSectionItem` with a colored file icon, combined type/date description, title, and status badge. The list-level `Report` model does not currently contain address data. Full location fields are available only on report detail responses, so reproducing the reference exactly from the current list contract would otherwise require per-row detail fetches.

## Chosen approach

Add one nullable, consumer-facing `displayAddress` field to each report returned by the staff-owned `/api/mobile/complaints` list endpoint. The staff API composes this string from the authoritative stored complaint location fields. Mobile consumes the field opportunistically and omits the address row when it is absent.

This avoids N+1 detail requests, keeps address formatting consistent across clients, and preserves additive rollout compatibility.

## Cross-repository contract

### Staff/API

The report-list payload gains:

```ts
displayAddress: string | null
```

The field is additive. Existing mobile clients must continue to work when it is present, and updated mobile clients must continue to work against an older backend where it is absent.

The address is derived only from authoritative complaint location data already available to the server. No database migration is required unless inspection proves the list query does not currently expose the needed stored fields.

Preferred composition order:

1. purok/street
2. barangay
3. municipality/city

Empty components are skipped rather than replaced with placeholder text. If no usable location components exist, return `null`.

Example:

```text
Purok 5, Brgy. 28 - Victory Village North, City of Legazpi
```

### Mobile

The list-level `Report` type gains:

```ts
displayAddress?: string | null
```

The field remains optional at the mobile boundary for compatibility with cached/older responses. Missing, blank, or invalid values normalize to `null` or remain omitted. No detail request is made solely to populate the card address.

## Card design

Each tappable report card follows this vertical hierarchy:

1. top row: ticket number on the left, status badge on the right
2. report title as the strongest text
3. date/time on its own line
4. muted single-line address with ellipsis
5. chevron aligned at the far right of the lower content area

Approximate anatomy:

```text
AL26-081701                         Verified

Primary Line

9:00 AM, August 15

Purok 5, Brgy. 28 - Victory...            >
```

### Visual behavior

- Remove the colored circular file icon from official report cards.
- Keep the whole card tappable.
- Use the existing themed card/background/border primitives.
- Ticket number uses compact regular-to-medium foreground text.
- Title uses a larger semibold/bold treatment than the ticket number.
- Date/time uses regular foreground text and a compact consumer-friendly formatter.
- Address uses muted text, one line, with truncation.
- Status remains compact and visually distinct but should resemble the approved rounded-rectangle badge rather than a large pill.
- Chevron is decorative; accessibility remains on the card press target.
- If `displayAddress` is unavailable, omit that row entirely instead of showing `Unknown address`.

## Shared-component scope

Implement the visual change in the shared `ReportListGroup` so report-list presentation stays consistent across consumers of that component. Do not create an archive-only duplicate.

The archive route keeps:

- week grouping
- search
- sort menu
- category filter
- pagination
- pull-to-refresh
- stale/offline messaging
- queued local reports section
- current report-detail navigation

Queued/offline draft report rows are out of scope unless they already reuse `ReportListGroup`.

## Date formatting

Do not regress Manila-time handling. Add or reuse a compact Manila formatter suitable for the reference style, for example:

```text
9:00 AM, August 15
```

The full detail/history date format remains unchanged unless it intentionally shares the same helper and tests prove compatibility.

## Error and compatibility behavior

- Older backend: card renders without address.
- Missing address fields: server returns `null`; mobile omits the row.
- Invalid/blank address string: mobile does not render it.
- Network/cache behavior remains unchanged.
- Status push synchronization continues to update only report status and must not clear `displayAddress` from existing report objects.

## Testing

### Staff/API

Add focused contract coverage proving that:

- report-list items include `displayAddress` when location data exists
- missing components are skipped cleanly
- no location data produces `null`
- existing pagination/search/sort behavior is unchanged
- consumer ownership/auth boundaries are unchanged

### Mobile

Add focused coverage proving that:

- list response parsing accepts `displayAddress`
- absence of `displayAddress` remains valid
- blank address does not render
- `ReportListGroup` no longer renders the colored file icon for official reports
- ticket number, status, title, date, optional address, and chevron are represented in the card structure
- status synchronization preserves the rest of the report object

Run the normal mobile harness/type/lint/test gates and the relevant staff API tests before commit.

## Deployment and rollout

This is an additive contract change. Preferred order:

1. deploy staff/API support for `displayAddress`
2. release mobile UI support

Updated mobile remains safe against an older backend because the field is optional and the address row is omitted when absent.

No database migration, destructive API change, or mobile secret/native configuration change is planned.

## Non-goals

- no report-detail redesign
- no archive grouping redesign
- no extra per-row detail requests
- no database schema change unless implementation inspection proves unavoidable
- no changes to complaint ownership/authentication
- no changes to queue submission behavior
- no changes to push event contracts
