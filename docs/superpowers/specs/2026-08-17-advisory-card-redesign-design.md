# Advisory Card Redesign Design

Date: 2026-08-17

## Goal

Redesign consumer-facing advisory cards so they match the compact visual language of the redesigned report cards while surfacing the operational information consumers need at a glance.

The card should prioritize advisory identity, interruption timing, publication timing, audience, and severity. The existing advisory title and body remain available in advisory details but are not shown in the list card.

## Scope

This change covers:

- the shared mobile advisory list card
- the advisories list route
- the home-screen active-advisories section that reuses the shared card
- additive mobile advisory API data needed to display the audience
- Manila-time formatting for interruption and publication timestamps
- focused tests and implementation-history updates in both repositories

This change does not redesign the advisory detail screen, alter advisory publication rules, change targeting eligibility, change pagination semantics, or introduce a database migration.

## Card Information Hierarchy

The compact card uses the same overall density and spacing language as the report-card redesign.

Example:

```text
AD26-081701                              High

Scheduled Outage · 2:00 PM, Today – 5:00 PM, Today

Published 9:30 AM, August 17
Bitano Feeder 1 & 2, Ligao Feeder 1…          ›
```

### Top row

- Left: advisory control number.
- Right: severity badge.
- The control number is subdued metadata, not a headline.
- Severity is the only badge on the card.

### Primary line

The existing advisory title is not shown on the card.

If the advisory has both `scheduledStartAt` and `scheduledEndAt`, render:

```text
<Advisory Type> · <Interruption Start> – <Interruption End>
```

Example:

```text
Scheduled Outage · 2:00 PM, Today – 5:00 PM, Today
```

If either interruption endpoint is unavailable, render only the advisory type.

Example:

```text
General Advisory
```

Do not fall back to `effectiveAt` or `expiresAt` for interruption timing because those fields describe advisory visibility/effectiveness rather than a confirmed interruption window.

### Publication metadata

Render an explicitly labeled publication timestamp:

```text
Published 9:30 AM, August 17
```

### Audience

Render the actual advisory target as one muted, single-line value with ellipsis when it exceeds the available width.

Examples:

```text
All consumers
Bitano Feeder 1 & 2
Bitano Feeder 1 & 2, Ligao Feeder 1
Daraga Substation, Bitano Feeder 2
```

The audience value must come from authoritative advisory target data returned by the backend. Mobile must not infer audience from the current user's eligibility or subscriptions.

### Trailing affordance

Use a small muted `ChevronRight`, matching the report-card interaction pattern. The whole card remains tappable and opens the advisory detail route.

## Visual System

Use the compact report-card scale as the baseline:

- card: neutral `bg-card` with border
- radius: `rounded-lg`
- horizontal padding: approximately `px-4`
- vertical padding: approximately `py-3`
- internal vertical gap: approximately `gap-2`
- control number: `text-xs`, muted
- primary line: `text-base`, semibold
- publication and audience metadata: `text-xs`
- severity badge: compact, approximately 11px label text with small horizontal and vertical padding
- chevron: approximately 18px, muted foreground

Do not restore the existing leading megaphone icon. Removing the icon preserves horizontal space and aligns advisories with the compact report-card pattern.

The card itself stays visually neutral. Urgency is communicated through the severity badge rather than tinting the whole card.

## Severity Treatment

Severity maps to the existing semantic design tokens:

- Critical / High: destructive
- Medium: warning
- Low: secondary
- Info or unknown informational severity: subtle accent/secondary treatment

The API severity value remains authoritative; the UI only normalizes casing/spacing for presentation.

## Date and Time Formatting

All advisory card timestamps are interpreted and formatted in `Asia/Manila`.

### Interruption range

Each endpoint includes a time plus a compact relative/absolute date label.

Examples:

```text
2:00 PM, Today – 5:00 PM, Today
2:00 PM, Aug. 18 – 5:00 PM, Aug. 18
10:00 PM, Aug. 18 – 4:00 AM, Aug. 19
```

`Today` is determined from the current calendar date in `Asia/Manila`, not from the device timezone.

Do not collapse the second endpoint's date label even when both endpoints occur on the same day. Keeping both endpoints self-contained avoids ambiguity and follows the approved card wording.

### Publication timestamp

Use the longer month style already approved for report-list metadata:

```text
Published 9:30 AM, August 17
```

Malformed or offset-free API timestamps should continue to follow the application's strict timestamp handling rather than being silently interpreted in the device timezone.

## Backend Contract

The current mobile advisory response already exposes:

- `controlNumber`
- `type`
- `severity`
- `scheduledStartAt`
- `scheduledEndAt`
- `publishedAt`

Add one backward-compatible field:

```ts
audience: string | null
```

`audience` is a display-oriented summary built server-side from the advisory's authoritative target scope, feeder targets, and substation targets.

### Audience rules

- `target_scope = 'all'` -> `All consumers`
- targeted feeders -> feeder display names
- targeted substations -> substation display names
- mixed targets -> combine names into one comma-separated display string
- deduplicate repeated names before joining
- if no usable target names can be resolved, return `null` rather than inventing a label

The audience projection must not multiply advisory rows or alter keyset pagination. Target aggregation must be performed with scalar/aggregated subqueries or otherwise deduplicated before joining into the paginated advisory query.

The backend continues to determine whether the current consumer is eligible to receive each advisory using the existing targeting logic. `audience` is informational only and must not replace or weaken that filtering.

## Mobile Contract

Extend `MobileAdvisory` additively:

```ts
readonly audience?: string | null;
```

The field is optional on mobile so an updated app remains compatible with an older backend and older persisted advisory cache entries.

When `audience` is absent or empty, omit the audience line rather than displaying placeholder text.

No additional per-card or per-row network request is allowed. The list response must contain everything required to render the card.

## Shared Component Behavior

`src/features/advisories/advisory-list-item.tsx` remains the shared advisory-list component used by both:

- the dedicated `/advisories` route
- the Home screen's Active advisories section

The component should move away from `ListSectionItem` and render a compact tappable card directly, similar to the shared report-card implementation. This prevents the legacy list-section padding/icon treatment from fighting the new density.

The component interface should remain small: advisory data plus `onPress`. Any legacy `showDivider` behavior should be removed if no longer needed because cards are separated by external list gaps rather than internal dividers.

## Route Integration

### Advisories route

Preserve:

- authentication boundary
- pull to refresh
- stale/offline advisory cache notice
- pagination/load-more behavior
- empty state
- detail navigation

Change only the row presentation and matching skeleton density. Cards should be separated with the same compact gap used by report cards.

### Home route

The existing Active advisories section should reuse the same card component rather than maintaining a second advisory presentation.

If the surrounding `ListSection` container visually conflicts with standalone bordered cards, simplify only that advisory subsection enough to let the shared cards render naturally. Do not redesign unrelated Quick actions or other Home content.

## Error and Missing-Data Behavior

- Missing control number: omit the control-number text area or use the existing backend-provided value only; do not fabricate a control number.
- Missing advisory type: use a concise fallback such as `Advisory`.
- Missing interruption start or end: show only the advisory type.
- Invalid interruption timestamp: do not show a partial or misleading interruption range.
- Missing/empty audience: omit the audience line.
- Missing/invalid publication timestamp: use the application's existing unavailable-date fallback rather than device-local parsing.
- Unknown severity: render a neutral informational badge.

## Testing

### Mobile focused tests

Add or update tests to cover:

- shared advisory card no longer uses `Megaphone` or `ListSectionItem`
- control number is present in the card contract
- severity badge remains present
- advisory title/content are not part of the list-card presentation
- scheduled start/end are formatted as the approved interruption range
- missing interruption endpoint falls back to advisory type only
- publication label starts with `Published`
- `audience` is optional and missing values are safely omitted
- audience text is constrained to one line
- card still routes to `/advisory/[id]`
- Home and full Advisories routes both reuse the shared advisory card
- Manila-time formatter distinguishes `Today` using the Manila calendar day
- strict offset-aware timestamp parsing remains intact

### Backend focused tests

Cover:

- global advisory -> `All consumers`
- feeder-targeted advisory -> feeder names
- substation-targeted advisory -> substation names
- mixed targets are combined and deduplicated
- no usable target names -> `null`
- list cardinality remains one row per advisory
- cursor ordering/pagination is unchanged
- existing consumer targeting/eligibility predicates remain intact

## Harness and Documentation

Because product files change, append a 2026-08-17 implementation-history entry in each repository when implementation begins:

- `aleconnect-mobile/docs/agent-harness/implementation-history.md`
- `Aleconnect/docs/agent-harness/implementation-history.md`

Do not add a database migration because the required targeting tables and advisory fields already exist.

## Rollout

Recommended deployment order:

1. deploy the additive backend `audience` field
2. ship the compatible mobile UI

The mobile field is optional so rollout remains safe if the app and API versions overlap temporarily. An older backend simply results in the audience line being omitted until the new response is available and cached advisory data refreshes.

## Non-Goals

- redesigning advisory details
- changing advisory creation/editing workflows
- changing publish scheduling semantics
- changing advisory audience eligibility rules
- changing notification delivery
- changing database schema
- adding per-card detail requests
- showing the advisory title or body on the list card
