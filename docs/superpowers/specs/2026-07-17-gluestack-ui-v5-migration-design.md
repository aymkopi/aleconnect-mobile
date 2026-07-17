# GlueStack UI v5 Migration Design

**Date:** 2026-07-17

**Status:** Approved for implementation planning

## Goal

Replace HeroUI Native throughout Aleconnect Mobile with locally owned GlueStack UI v5 components while retaining Expo Router, React Native, UniWind, and Tailwind CSS v4. Preserve the Aleconnect visual identity and existing workflows, but improve spacing, hierarchy, interaction states, accessibility, and consistency as each screen is rebuilt.

The completed migration must contain no HeroUI Native provider, imports, styles, generated compatibility API, or package dependency.

## Approved Decisions

- Use GlueStack UI v5.
- Source GlueStack components only from the official repository's current `main` branch. Resolve and record the remote `main` SHA before copying files; never allow CLI auto-detection to choose a different source branch.
- Keep UniWind as the Tailwind CSS v4 styling engine.
- Do not migrate to NativeWind v5. Aleconnect Mobile is Expo-only, UniWind is already configured, and NativeWind v5 would add preview dependencies and a PostCSS build path without adding required capability.
- Preserve and polish the current Aleconnect visual identity rather than adopting GlueStack defaults or performing an unrelated full redesign.
- Migrate in vertical slices so each completed phase leaves runnable routes.
- Temporarily allow HeroUI Native and GlueStack providers to coexist during migration. Remove HeroUI completely in the final phase.
- Add only the GlueStack components used by the application.

## Current State

Aleconnect Mobile currently uses:

- Expo 55 and Expo Router.
- React 19 and React Native 0.83.
- UniWind 1.6 and Tailwind CSS 4.2.
- HeroUI Native 1.0.4.
- Gorhom Bottom Sheet, React Native Keyboard Controller, React Native Reanimated, and Gesture Handler.
- A Satoshi font family and an Aleconnect light/dark color system defined in `global.css`.

HeroUI Native is imported by 18 source files. It currently supplies the root provider, theme-color hook, typography, buttons, surfaces, lists, forms, validation messages, alerts, dialogs, selects, menus, avatars, skeletons, and bottom sheets. Complaints is the highest-risk migration area because it combines multi-step forms, validation, image processing, map selection, progress feedback, keyboard-aware scrolling, and multiple sheets.

The worktree already contains unrelated and in-progress changes. Migration commits must stage only files intentionally changed by that phase and must preserve existing complaint, notification, map, backend, and Graphify work.

Baseline verification on 2026-07-17 found that `npx tsc --noEmit`, `npm run lint`, and the existing notification-navigation test pass. `npx expo-doctor` passes 17 of 19 checks; it reports Expo SDK 55 patch-version drift and duplicate `expo-constants` installations. Dependency alignment is therefore a Phase 0 prerequisite rather than a GlueStack regression.

## Scope

### In Scope

- Root UI provider and theme integration.
- Shared navigation bars, headers, app bars, feedback, and list patterns.
- Sign-in, Home, Notifications, Complaints, Hotlines, and Profile routes.
- All child routes and overlays owned by those areas.
- Light, dark, and system theme modes.
- Android, iOS, and Expo Web component behavior.
- Required, invalid, disabled, loading, empty, error, and success states.
- Keyboard-aware forms and scrollable bottom sheets.
- Removal of HeroUI Native after all consumers migrate.

### Out of Scope

- Changes to Aleconnect backend endpoints, Better Auth, Aiven MySQL, Cloudflare R2, PSGC, or MapLibre data flows.
- A navigation architecture rewrite.
- Feature additions unrelated to replacing HeroUI Native.
- A NativeWind migration.
- A HeroUI-compatible facade over GlueStack components.
- Broad service, model, or state-management refactors.

## Migration Strategy

### Considered Approaches

#### Big-bang replacement

Replace every HeroUI import and provider in one change. This reaches the final dependency state quickly but makes route failures difficult to isolate and combines unrelated regressions in forms, overlays, themes, and navigation. It is rejected.

#### HeroUI compatibility facade

Implement local components that reproduce HeroUI's compound API while using GlueStack internally. This reduces initial screen edits but keeps the old mental model, creates an application-owned compatibility library, and delays proper use of GlueStack APIs. It is rejected.

#### Phased vertical slices

Install the GlueStack foundation, migrate shared shell components, then convert complete feature areas one at a time. HeroUI and GlueStack coexist only while routes remain unmigrated. This is the selected approach because each phase can be type-checked, rendered, and reviewed independently.

## Target Architecture

### Local GlueStack Components

GlueStack components will be copied from the verified `apps/starter-kit-expo-uniwind/components/ui` directory on the official repository's current `main` branch. The resolved commit SHA will be recorded in `docs/gluestack-ui-source.json`, and copied components will live under `src/components/ui/` and be imported directly, for example:

```tsx
import { Button, ButtonText } from "@/components/ui/button";
import {
  FormControl,
  FormControlError,
  FormControlErrorText,
  FormControlLabel,
  FormControlLabelText,
} from "@/components/ui/form-control";
```

Only required components will be added. Generated source remains locally owned and may receive small Aleconnect-specific styling changes. Screen code will not import GlueStack internals or recreate HeroUI's namespace API.

Expected GlueStack components:

- Provider: `gluestack-ui-provider`.
- Typography and layout: `text`, `heading`, `box`, `vstack`, `hstack`, `divider`, and `card` only where content is genuinely framed.
- Interaction: `button`, `pressable`, `fab`, and `menu`.
- Feedback: `alert`, `toast`, `progress`, `spinner`, and `skeleton`.
- Forms: `form-control`, `input`, `textarea`, `checkbox`, and `select`.
- Overlays: `modal`, `alert-dialog`, `popover`, `actionsheet`, and `bottomsheet`.
- Data display: `avatar` and `badge`.

Two app-level compositions are justified because they repeat across several routes:

- `src/components/ui/search-field.tsx`: a GlueStack Input composition with search icon, clear action, accessibility label, and consistent field height.
- `src/components/ui/list-section.tsx`: a grouped-list composition built from VStack, Pressable, Divider, Heading, and Text. It replaces HeroUI ListGroup without pretending to be a general-purpose compatibility layer.

No wrapper will be created for one-off component use.

### Theme System

`global.css` remains the single Tailwind CSS v4 theme source.

The migration will:

- Remove `@import "heroui-native/styles"`.
- Remove the HeroUI `@source` directive.
- Replace HeroUI-specific variables with GlueStack semantic variables.
- Define `.light` and `.dark` at the top level of `@layer theme`, as required by UniWind.
- Preserve system-theme fallback selectors.
- Preserve Aleconnect's blue accent, neutral backgrounds, success, warning, danger, border, and surface hierarchy.
- Preserve the Satoshi font tokens.
- Keep radii at or below the existing restrained design-system values unless an established Aleconnect component requires otherwise.

`metro.config.js` will continue to use `withUniwindConfig` and explicitly register the `light` and `dark` themes.

HeroUI's `useThemeColor` is used where React Navigation, MapLibre, icons, and inline native styles require resolved values. It will be replaced by `src/hooks/use-app-colors.ts`, a small typed hook over UniWind's `useCSSVariable`:

```ts
export type AppColorToken =
  | "background"
  | "foreground"
  | "muted-foreground"
  | "primary"
  | "primary-foreground"
  | "border"
  | "card"
  | "destructive";

export function useAppColors<const T extends readonly AppColorToken[]>(
  names: T,
): { [K in keyof T]: string };
```

The hook validates missing or non-string values in development and returns stable native/web color strings. Most view styling will continue to use `className`; this hook is only for APIs that cannot consume Tailwind classes.

### Provider Tree

The root provider order remains compatible with gestures, keyboards, and authentication:

```text
GestureHandlerRootView
  KeyboardProvider
    GluestackUIProvider
      HeroUINativeProvider (temporary only)
        AuthSessionProvider
          global feedback hosts
          notification bridge
          Expo Router Stack
```

After the last route migrates, `HeroUINativeProvider` is removed without changing the surrounding provider order.

### Component Mapping

| HeroUI Native usage | GlueStack target |
| --- | --- |
| `Typography` | `Heading`, `Text` |
| `Surface` | `Box`, `VStack`, or `Card` according to semantics |
| `Button` | `Button`, `ButtonText`, `ButtonIcon` |
| `PressableFeedback` | `Pressable` with explicit pressed state |
| `Label`, `Description`, `FieldError` | `FormControlLabelText`, `FormControlHelperText`, `FormControlErrorText` |
| `TextField`, `Input` | `FormControl` with `Input` or `Textarea` |
| `ControlField`, `Checkbox` | GlueStack `Checkbox` composition inside `FormControl` when validation applies |
| `SearchField` | Local `SearchField` composition using GlueStack `Input` |
| `ListGroup` | Local `ListSection` composition using GlueStack layout and interaction primitives |
| `Separator` | `Divider` |
| `Alert` | `Alert` for persistent inline feedback; `Toast` for transient global feedback |
| `Dialog` | `Modal` or `AlertDialog` according to whether confirmation is destructive |
| `Select` | GlueStack `Select`; native Actionsheet and web select behavior are retained |
| `Menu` | GlueStack `Menu` or `Popover` according to interaction semantics |
| `BottomSheet` | GlueStack `BottomSheet` and its exported scroll/list/input primitives |
| `Avatar` | GlueStack `Avatar` |
| `Skeleton` | GlueStack `Skeleton` |
| `useThemeColor` | Local `useAppColors` over UniWind variables |
| `HeroUINativeProvider` | `GluestackUIProvider` |

GlueStack BottomSheet is built on the already-installed Gorhom Bottom Sheet. Application code should import its scroll, list, and text-input exports from the local GlueStack component instead of mixing HeroUI sheets with direct Gorhom children.

## UX Rules

- Preserve current route names, back behavior, tab ownership, and data-loading flows.
- Preserve the complaint wizard's behavior and validations while rebuilding its controls.
- Preserve Aleconnect's blue identity without turning the entire interface into a one-color palette.
- Use Heading for page and section hierarchy; use Text for content and metadata.
- Use cards only for genuinely framed entities or tools. Grouped reports and settings remain list-based.
- Use icon-only controls for familiar compact actions and provide accessible labels.
- Keep interactive targets at least 44 by 44 points.
- Required fields use GlueStack FormControl's `isRequired`; invalid fields use `isInvalid` and visible error text.
- Disabled fields remain legible and expose disabled semantics.
- Loading, empty, error, and offline states must not shift navigation or obscure primary actions.
- Bottom sheets dynamically size to short content, cap long content at the intended viewport height, and expose a scrollable list.
- Inputs inside pages and sheets must remain visible above the keyboard.
- Dark mode must preserve contrast, hierarchy, and readable disabled states.

## Feature Phases

### Phase 0: Baseline and migration contract

- Record the HeroUI import inventory and route smoke matrix.
- Capture representative light/dark screenshots for visual comparison.
- Confirm current TypeScript and lint status before dependency changes.
- Establish zero-HeroUI completion checks.

### Phase 1: GlueStack foundation

- Resolve and verify the official repository's current `main` commit, then record that SHA.
- Copy only required Expo UniWind components from that verified checkout.
- Convert theme variables and add the GlueStack provider.
- Add `useAppColors`, `SearchField`, and `ListSection`.
- Keep HeroUI available for unmigrated routes.

### Phase 2: Root shell and authentication

- Migrate root alerts to GlueStack Toast/Alert.
- Migrate the floating app bar and floating tabs bar.
- Migrate root and nested route layouts.
- Migrate Sign In.
- Verify navigation, forced logout, notification deep links, fonts, theme switching, and safe areas.

### Phase 3: Complaints

- Migrate shared report lists and status presentation.
- Migrate complaints main page, archive, and ticket details.
- Migrate the complaint wizard forms, selects, validation, evidence controls, preview modal, progress UI, map sheet, success state, and failure state.
- Verify keyboard autoscroll, short and long selects, long sheet scrolling, map interaction, photo removal, background submission feedback, and returned ticket navigation.

### Phase 4: Home, Notifications, and Hotlines

- Migrate Home grouped content and notification badge.
- Migrate Notifications search, grouping, unread states, actions, and empty state.
- Migrate Hotlines search, emergency action, agency lists, category sheets, all-hotlines sheet, contact actions, and keyboard behavior.

### Phase 5: Profile and settings

- Migrate profile overview, account details, profile editing sheets, push notification settings, theme menu, avatars, validation, and feedback.
- Verify every profile entry point opens the intended route or sheet exactly once.

### Phase 6: Removal and release verification

- Remove the temporary HeroUI provider.
- Remove HeroUI CSS imports and source directives.
- Remove `heroui-native` from `package.json` and lockfile.
- Confirm no source or configuration file references HeroUI.
- Run complete static, web, Android, and iOS verification.
- Compare final screenshots against the approved preserve-and-polish direction.

## Data and Error Flow

No API contract changes are part of this migration. Existing services continue to own authentication, complaints, notifications, hotlines, profile, R2 uploads, and session invalidation.

Screens continue to:

1. Read data through existing service functions.
2. Keep existing loading and mutation state.
3. Render those states with GlueStack components.
4. Route global transient outcomes through GlueStack Toast.
5. Render field validation next to the relevant GlueStack FormControl.
6. Preserve current retry and navigation behavior.

UI migration must not convert server errors into generic success states or suppress existing validation messages.

## Verification Strategy

Each phase must pass before the next phase begins:

- `npx tsc --noEmit`
- `npm run lint`
- Targeted route tests where reusable logic or navigation behavior changes.
- Expo Web render and browser-console check in light and dark modes.
- Android development build smoke test for routes changed in the phase.

Final verification additionally requires:

- `npx expo-doctor`
- Production Expo Web export.
- Android clean rebuild because UI dependencies include native animation and gesture packages.
- iOS build through EAS or macOS CI because local Windows cannot compile iOS.
- Manual route matrix covering Sign In, Home, Notifications, Complaints and all complaint child routes, Hotlines and its sheets, Profile and its child routes, back navigation, theme switching, keyboard behavior, loading, empty, error, and offline states.
- Browser and Metro logs contain no GlueStack, UniWind, color conversion, invalid prop, provider, portal, or hydration warnings.

## Completion Criteria

The migration is complete only when all of the following are true:

- `rg -n "heroui-native|HeroUINativeProvider" src global.css package.json` returns no matches.
- `npm ls heroui-native` confirms the package is absent.
- All application routes use local GlueStack components or React Native/Expo primitives where GlueStack does not add value.
- UniWind and Tailwind CSS v4 remain the styling engine.
- Light, dark, and system themes work on Android, iOS, and Expo Web.
- Every form exposes required, invalid, disabled, and loading states accessibly.
- Bottom sheets support dynamic short content, capped long content, scrolling, keyboard input, and dismissal.
- Existing backend, auth, complaint submission, map, upload, notification, hotline, and profile behavior remains functional.
- TypeScript, lint, Expo Doctor, web export, Android build, iOS build, and the manual route matrix pass.

## Risks and Controls

- **Source drift:** Resolve `refs/heads/main` at execution time, verify the sparse checkout SHA, record it, and abort on any mismatch. Do not invoke a CLI path that can select a non-`main` branch.
- **Theme drift:** Map existing Aleconnect tokens before migrating routes and verify light/dark screenshots at every phase.
- **Overlay regressions:** Migrate sheets, selects, modals, and portals as complete feature units and test keyboard plus long-list behavior on native and web.
- **Generated component volume:** Add only components used by a planned phase. Do not install the entire component catalog.
- **Mixed provider state:** Keep dual providers only during active migration. The final zero-HeroUI checks prevent the temporary state from becoming permanent.
- **Dirty worktree collisions:** Inspect every overlapping file before editing and stage migration commits selectively.
