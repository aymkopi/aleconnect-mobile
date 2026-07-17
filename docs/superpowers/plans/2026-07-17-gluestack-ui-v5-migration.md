# GlueStack UI v5 Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every HeroUI Native dependency and UI usage in Aleconnect Mobile with locally owned GlueStack UI v5 components while preserving and polishing the existing app experience.

**Architecture:** Resolve the official GlueStack repository's current `main` commit and copy its Expo UniWind component source into the existing UniWind/Tailwind CSS v4 pipeline, then migrate complete route groups behind a temporary dual-provider state. Shared Aleconnect patterns use two small GlueStack compositions (`SearchField` and `ListSection`), while screens import all other copied components directly. The final phase removes the temporary HeroUI provider, styles, imports, and package.

**Tech Stack:** Expo 55, Expo Router, React 19, React Native 0.83, GlueStack UI v5, UniWind 1.6, Tailwind CSS 4.2, React Native Reanimated, Gesture Handler, Gorhom Bottom Sheet, React Native Keyboard Controller, TypeScript.

## Global Constraints

- Use only the official `gluestack/gluestack-ui` repository's current `main` branch. Resolve `refs/heads/main`, verify the checkout SHA, and record it before copying components.
- Do not use `gluestack-ui init` or `gluestack-ui add`; CLI styling-engine detection can select a source branch other than the required current `main`.
- Keep UniWind and Tailwind CSS v4; do not install NativeWind or PostCSS.
- Keep existing Expo Router paths, backend contracts, authentication, MapLibre, R2 uploads, notifications, and state flows unchanged.
- Preserve and polish Aleconnect's existing identity; do not replace it with GlueStack defaults.
- Copy only components used by the app plus their local source dependencies; do not copy the entire starter kit.
- Do not create a HeroUI compatibility facade.
- Keep existing dirty worktree changes and stage each migration commit selectively.
- Maintain Android, iOS, and Expo Web behavior.
- Final state must contain no `heroui-native`, `HeroUINativeProvider`, HeroUI CSS import, or HeroUI source directive.

---

## Phase 0: Establish a Clean Dependency Baseline

### Task 1: Align Expo SDK 55 patch dependencies

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Verify: `tests/notification-navigation.test.mjs`

**Interfaces:**
- Consumes: the current Expo SDK 55 application and lockfile.
- Produces: a dependency tree that passes Expo Doctor before GlueStack is introduced.

- [ ] **Step 1: Confirm the recorded baseline**

Run:

```powershell
npx tsc --noEmit
npm run lint
node --test tests/notification-navigation.test.mjs
npx expo-doctor
```

Expected: TypeScript, lint, and one test pass. Expo Doctor reports 17/19 with duplicate `expo-constants` and Expo SDK 55 patch mismatches.

- [ ] **Step 2: Align Expo-managed packages and deduplicate the tree**

Run:

```powershell
npx expo install --fix
npm dedupe
```

Expected: Expo packages move to the SDK 55-compatible patch versions and duplicate `expo-constants` is removed when the dependency ranges permit it.

- [ ] **Step 3: Verify the repaired baseline**

Run:

```powershell
npx tsc --noEmit
npm run lint
node --test tests/notification-navigation.test.mjs
npx expo-doctor
```

Expected: all commands exit `0`; Expo Doctor passes 19/19. If Expo Doctor still reports a duplicate nested package, inspect `npm ls expo-constants` and resolve the owning package before continuing.

- [ ] **Step 4: Commit only dependency alignment**

```powershell
git add package.json package-lock.json
git commit -m "chore: align expo dependencies"
```

---

## Phase 1: Install the GlueStack Foundation

### Task 2: Import GlueStack UI v5 from verified `main`

**Files:**
- Create: `docs/gluestack-ui-source.json`
- Create: `src/components/ui/gluestack-ui-provider/index.tsx`
- Create: `src/components/ui/*` for the exact component list below
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `metro.config.js`
- Modify: `global.css`
- Modify: `src/app/_layout.tsx`

**Interfaces:**
- Consumes: the repaired Expo/UniWind baseline from Task 1.
- Produces: locally owned GlueStack components and a temporary dual-provider root that later tasks can consume.

- [ ] **Step 1: Resolve and verify the latest official `main` commit**

Run:

```powershell
$remote = "https://github.com/gluestack/gluestack-ui.git"
$mainSha = (git ls-remote $remote refs/heads/main).Split("`t")[0]
if (-not $mainSha) { throw "Could not resolve GlueStack main" }

$source = Join-Path $env:TEMP "gluestack-ui-main-$mainSha"
if (Test-Path -LiteralPath $source) {
  $existingSha = git -C $source rev-parse HEAD
  if ($existingSha -ne $mainSha) {
    throw "Existing GlueStack checkout does not match current main: $existingSha"
  }
} else {
  git clone --depth 1 --filter=blob:none --sparse --branch main $remote $source
}

git -C $source sparse-checkout set apps/starter-kit-expo-uniwind
$checkoutSha = git -C $source rev-parse HEAD
if ($checkoutSha -ne $mainSha) {
  throw "GlueStack checkout is not current main: expected $mainSha, got $checkoutSha"
}
```

Expected: `$checkoutSha` exactly matches the SHA returned for `refs/heads/main`. On 2026-07-17 the planning-time SHA was `be060b5d184826d34623e490447a467ffb5cfe56`; execution must resolve it again rather than assuming that value is still current.

- [ ] **Step 2: Record source provenance and install the current main dependencies**

Create `docs/gluestack-ui-source.json` with the resolved source, branch, commit, and component path:

```json
{
  "repository": "https://github.com/gluestack/gluestack-ui.git",
  "branch": "main",
  "commit": "REPLACE_WITH_RESOLVED_MAIN_SHA",
  "componentPath": "apps/starter-kit-expo-uniwind/components/ui"
}
```

Read `$source/apps/starter-kit-expo-uniwind/package.json`, verify the registry's stable tags, then install only packages imported by the selected current-main component sources:

```powershell
$coreVersion = npm view @gluestack-ui/core dist-tags.latest
$utilsVersion = npm view @gluestack-ui/utils dist-tags.latest
if ($coreVersion -match "alpha|beta|rc" -or $utilsVersion -match "alpha|beta|rc") {
  throw "GlueStack latest tag unexpectedly resolves to a prerelease"
}
npm install "@gluestack-ui/core@$coreVersion" "@gluestack-ui/utils@$utilsVersion" @expo/html-elements @legendapp/motion @react-aria/utils tailwind-variants
```

On 2026-07-17 the stable tags resolve to `@gluestack-ui/core@5.0.15` and `@gluestack-ui/utils@5.0.6`; execution must query them again. Keep existing compatible UniWind, Tailwind, Gorhom, Reanimated, SVG, Gesture Handler, and Lucide packages instead of replacing them with the starter's older ranges.

- [ ] **Step 3: Copy only the required current-main components**

Run from the mobile repository:

```powershell
$componentSource = Join-Path $source "apps\starter-kit-expo-uniwind\components\ui"
$componentTarget = Join-Path (Get-Location) "src\components\ui"
$components = @(
  "gluestack-ui-provider", "text", "heading", "box", "vstack", "hstack",
  "divider", "card", "button", "pressable", "fab", "alert", "toast",
  "progress", "spinner", "skeleton", "form-control", "input", "textarea",
  "checkbox", "select", "menu", "popover", "modal", "actionsheet",
  "bottomsheet", "avatar", "badge"
)

New-Item -ItemType Directory -Force -Path $componentTarget | Out-Null
foreach ($component in $components) {
  $from = Join-Path $componentSource $component
  $to = Join-Path $componentTarget $component
  if (-not (Test-Path -LiteralPath $from)) {
    throw "Component missing from GlueStack main: $component"
  }
  Copy-Item -LiteralPath $from -Destination $to -Recurse
}
```

Expected: each named component is copied verbatim from the verified current-main checkout. `select` includes its current-main Actionsheet implementation; `bottomsheet` uses the existing Gorhom package.

- [ ] **Step 4: Verify source integrity before editing**

Run:

```powershell
$recordedSha = (Get-Content docs/gluestack-ui-source.json | ConvertFrom-Json).commit
if ($recordedSha -ne $mainSha) { throw "Recorded GlueStack SHA does not match resolved main" }

foreach ($component in $components) {
  $sourceHash = Get-FileHash -Algorithm SHA256 (Get-ChildItem (Join-Path $componentSource $component) -File -Recurse | Sort-Object FullName | ForEach-Object FullName)
  $targetHash = Get-FileHash -Algorithm SHA256 (Get-ChildItem (Join-Path $componentTarget $component) -File -Recurse | Sort-Object FullName | ForEach-Object FullName)
  if (Compare-Object $sourceHash.Hash $targetHash.Hash) {
    throw "Copied component differs from GlueStack main: $component"
  }
}

git status --short docs/gluestack-ui-source.json src/components/ui package.json package-lock.json
```

Expected: provenance names `main` and the exact resolved SHA, every copied component matches its source, and only intentional files appear. If current `main` changes its dependency names or component layout, stop and adapt this task to that commit instead of falling back to an older branch.

- [ ] **Step 5: Register explicit UniWind themes**

Set `metro.config.js` to:

```js
const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withUniwindConfig(config, {
  cssEntryFile: "./global.css",
  extraThemes: ["dark"],
});
```

- [ ] **Step 6: Add the temporary dual-provider root**

Import the generated provider in `src/app/_layout.tsx`:

```tsx
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { useUniwind } from "uniwind";
```

Add a provider bridge that follows the app's existing system/light/dark setting:

```tsx
function AppUIProvider({ children }: { children: React.ReactNode }) {
  const { theme, hasAdaptiveThemes } = useUniwind();
  const mode = hasAdaptiveThemes ? "system" : theme === "dark" ? "dark" : "light";

  return (
    <GluestackUIProvider mode={mode}>
      <HeroUINativeProvider>{children}</HeroUINativeProvider>
    </GluestackUIProvider>
  );
}
```

Wrap the existing app content without changing the surrounding order:

```tsx
<GestureHandlerRootView style={{ flex: 1 }}>
  <KeyboardProvider>
    <AppUIProvider>
      <AuthSessionProvider>{/* existing hosts and Stack */}</AuthSessionProvider>
    </AppUIProvider>
  </KeyboardProvider>
</GestureHandlerRootView>
```

Keep `HeroUINativeProvider` only for routes not yet migrated.

- [ ] **Step 7: Verify copied code and providers**

Run:

```powershell
npx tsc --noEmit
npm run lint
npx expo-doctor
```

Expected: all commands exit `0` and no provider/import errors appear.

- [ ] **Step 8: Commit the foundation selectively**

```powershell
git add package.json package-lock.json metro.config.js global.css docs/gluestack-ui-source.json src/components/ui src/app/_layout.tsx
git commit -m "feat: add gluestack ui foundation"
```

### Task 3: Add Aleconnect theme tokens and shared compositions

**Files:**
- Modify: `global.css`
- Create: `src/hooks/use-app-colors.ts`
- Create: `src/components/ui/search-field.tsx`
- Create: `src/components/ui/list-section.tsx`
- Create: `tests/ui-theme-contract.test.mjs`

**Interfaces:**
- Consumes: generated GlueStack `Input`, `Pressable`, `Text`, `Heading`, `VStack`, `HStack`, and `Divider`.
- Produces: `useAppColors(names)`, `SearchField`, `ListSection`, and `ListSectionItem` for route migrations.

- [ ] **Step 1: Write the theme contract test**

Create `tests/ui-theme-contract.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("GlueStack theme exposes Aleconnect light and dark semantic tokens", async () => {
  const css = await readFile(new URL("../global.css", import.meta.url), "utf8");

  assert.match(css, /@layer theme/);
  assert.match(css, /:where\(\.light, \.light \*\)/);
  assert.match(css, /:where\(\.dark, \.dark \*\)/);
  for (const token of [
    "--background",
    "--foreground",
    "--primary",
    "--primary-foreground",
    "--muted-foreground",
    "--card",
    "--border",
    "--destructive",
  ]) {
    assert.ok(css.includes(token), `missing ${token}`);
  }
  assert.match(css, /@theme inline/);
  assert.match(css, /--color-primary:\s*rgb\(var\(--primary\)\)/);
});
```

- [ ] **Step 2: Run the contract test and confirm it fails**

Run:

```powershell
node --test tests/ui-theme-contract.test.mjs
```

Expected: failure identifying the first missing GlueStack semantic token or top-level theme selector.

- [ ] **Step 3: Convert the theme without breaking unmigrated HeroUI routes**

In `global.css`:

- Keep `@import "heroui-native/styles"` and its `@source` temporarily.
- Keep `@import "tailwindcss"` and `@import "uniwind"`.
- Follow the verified current-main UniWind selectors: `:where(.light, .light *)` and `:where(.dark, .dark *)` inside `@layer theme`.
- Store theme values as space-separated RGB channels in raw semantic variables, then map them through `@theme inline` to Tailwind `--color-*` values.
- Keep temporary aliases such as `--accent`, `--surface`, and `--muted` until HeroUI is removed.
- Preserve Satoshi font variables.

Use these core light variables:

```css
:where(.light, .light *) {
  --background: 246 248 249;
  --foreground: 24 27 29;
  --primary: 107 196 255;
  --primary-foreground: 4 25 42;
  --card: 255 255 255;
  --card-foreground: 24 27 29;
  --muted: 238 241 243;
  --muted-foreground: 103 110 115;
  --border: 221 225 228;
  --destructive: 255 56 67;
  --success: 38 201 91;
  --warning: 245 166 35;
}
```

Use these core dark variables:

```css
:where(.dark, .dark *) {
  --background: 7 9 10;
  --foreground: 248 250 251;
  --primary: 107 196 255;
  --primary-foreground: 4 25 42;
  --card: 20 23 25;
  --card-foreground: 248 250 251;
  --muted: 34 38 41;
  --muted-foreground: 166 173 178;
  --border: 44 49 53;
  --destructive: 222 65 73;
  --success: 38 201 91;
  --warning: 250 184 68;
}
```

Map each raw variable once:

```css
@theme inline {
  --color-background: rgb(var(--background));
  --color-foreground: rgb(var(--foreground));
  --color-primary: rgb(var(--primary));
  --color-primary-foreground: rgb(var(--primary-foreground));
  --color-card: rgb(var(--card));
  --color-card-foreground: rgb(var(--card-foreground));
  --color-muted: rgb(var(--muted));
  --color-muted-foreground: rgb(var(--muted-foreground));
  --color-border: rgb(var(--border));
  --color-destructive: rgb(var(--destructive));
  --color-success: rgb(var(--success));
  --color-warning: rgb(var(--warning));
}
```

- [ ] **Step 4: Implement the typed native color hook**

Create `src/hooks/use-app-colors.ts`:

```ts
import { useCSSVariable } from "uniwind";

export type AppColorToken =
  | "background"
  | "foreground"
  | "primary"
  | "primary-foreground"
  | "card"
  | "card-foreground"
  | "muted"
  | "muted-foreground"
  | "border"
  | "destructive"
  | "success"
  | "warning";

export function useAppColors<const T extends readonly AppColorToken[]>(
  names: T,
): { [K in keyof T]: string } {
  const variables = names.map((name) => `--${name}`);
  const values = useCSSVariable(variables);

  return values.map((value, index) => {
    if (typeof value !== "string" && !Array.isArray(value)) {
      throw new Error(`Missing color token: ${names[index]}`);
    }
    if (Array.isArray(value)) return `rgb(${value.join(" ")})`;

    const channels = value.trim();
    return /^\d+(?:\.\d+)?(?:\s+\d+(?:\.\d+)?){2}(?:\s*\/\s*[\d.]+)?$/.test(
      channels,
    )
      ? `rgb(${channels})`
      : channels;
  }) as { [K in keyof T]: string };
}
```

- [ ] **Step 5: Implement the shared SearchField composition**

Create `src/components/ui/search-field.tsx` using the generated Input API:

```tsx
import { Search, X } from "lucide-react-native";
import type { ComponentProps } from "react";
import { Pressable } from "react-native";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";

type SearchFieldProps = Omit<ComponentProps<typeof Input>, "children"> & {
  accessibilityLabel: string;
  value: string;
  onChangeText: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
};

export function SearchField({
  accessibilityLabel,
  value,
  onChangeText,
  onClear,
  placeholder = "Search",
  className,
  ...props
}: SearchFieldProps) {
  return (
    <Input className={`h-12 rounded-xl ${className ?? ""}`} {...props}>
      <InputSlot className="pl-3">
        <InputIcon as={Search} />
      </InputSlot>
      <InputField
        accessibilityLabel={accessibilityLabel}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        returnKeyType="search"
      />
      {value.length > 0 && onClear ? (
        <InputSlot className="pr-2">
          <Pressable
            accessibilityLabel="Clear search"
            accessibilityRole="button"
            className="h-10 w-10 items-center justify-center"
            onPress={onClear}
          >
            <X size={18} />
          </Pressable>
        </InputSlot>
      ) : null}
    </Input>
  );
}
```

- [ ] **Step 6: Implement the shared grouped-list composition**

Create `src/components/ui/list-section.tsx`:

```tsx
import type { ReactNode } from "react";
import { Pressable } from "@/components/ui/pressable";
import { Divider } from "@/components/ui/divider";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

export function ListSection({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <VStack className="gap-2">
      {title ? <Heading size="sm" className="px-1">{title}</Heading> : null}
      <VStack className="overflow-hidden rounded-lg border border-border bg-card">
        {children}
      </VStack>
    </VStack>
  );
}

export function ListSectionItem({
  title,
  description,
  trailing,
  onPress,
  showDivider = true,
}: {
  title: ReactNode;
  description?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  showDivider?: boolean;
}) {
  return (
    <>
      <Pressable
        accessibilityRole={onPress ? "button" : undefined}
        className="min-h-14 flex-row items-center gap-3 px-4 py-3"
        onPress={onPress}
      >
        <VStack className="flex-1 gap-0.5">
          <Text className="font-semibold text-foreground">{title}</Text>
          {description ? (
            <Text size="sm" className="text-muted-foreground">{description}</Text>
          ) : null}
        </VStack>
        {trailing}
      </Pressable>
      {showDivider ? <Divider className="ml-4" /> : null}
    </>
  );
}
```

- [ ] **Step 7: Verify the shared foundation**

Run:

```powershell
node --test tests/ui-theme-contract.test.mjs
npx tsc --noEmit
npm run lint
```

Expected: all commands exit `0`.

- [ ] **Step 8: Commit the theme and shared primitives**

```powershell
git add global.css src/hooks/use-app-colors.ts src/components/ui/search-field.tsx src/components/ui/list-section.tsx tests/ui-theme-contract.test.mjs
git commit -m "feat: add aleconnect gluestack theme primitives"
```

---

## Phase 2: Migrate the Root Shell and Authentication

### Task 4: Convert providers, global feedback, navigation chrome, and Sign In

**Files:**
- Modify: `src/app/_layout.tsx`
- Modify: `src/app/(tabs)/_layout.tsx`
- Modify: `src/app/(tabs)/profile/_layout.tsx`
- Modify: `src/components/floating-app-bar.tsx`
- Modify: `src/app/sign-in.tsx`
- Verify: `tests/notification-navigation.test.mjs`

**Interfaces:**
- Consumes: GlueStack provider, theme tokens, `useAppColors`, generated Toast, Button, FormControl, Input, Pressable, Heading, and Text.
- Produces: a HeroUI-free app shell and authentication route. HeroUI remains mounted only for feature routes still awaiting migration.

- [ ] **Step 1: Replace root HeroUI alerts with GlueStack Toast**

In `src/app/_layout.tsx`, replace the rendered absolute HeroUI Alert hosts with `useToast().show(...)`. Use this render shape for forced logout and complaint submission feedback:

```tsx
toast.show({
  placement: "top",
  duration: 5000,
  render: ({ id }) => (
    <Toast nativeID={`app-toast-${id}`} action={action} variant="solid">
      <ToastTitle>{title}</ToastTitle>
      <ToastDescription>{message}</ToastDescription>
    </Toast>
  ),
});
```

Map success to `action="success"` and failure/logout to `action="error"`. Return `null` from both host components after dispatching the toast in their effects.

- [ ] **Step 2: Migrate shell colors and navigation controls**

- Replace all shell `useThemeColor` calls with `useAppColors`.
- Replace `PressableFeedback` with GlueStack `Pressable`.
- Replace `Typography` with GlueStack `Text` or `Heading`.
- Keep the floating bar geometry, blur/glass behavior, safe-area spacing, routes, and icons unchanged.
- Keep tab screens lazy and do not mount feature-heavy children outside Expo Router ownership.

- [ ] **Step 3: Migrate Sign In form semantics**

Use this structure for Account number and Password:

```tsx
<FormControl isRequired isInvalid={Boolean(error)}>
  <FormControlLabel>
    <FormControlLabelText>Account number</FormControlLabelText>
  </FormControlLabel>
  <Input size="lg">
    <InputField
      autoCapitalize="none"
      autoCorrect={false}
      keyboardType="number-pad"
      value={username}
      onChangeText={setUsername}
    />
  </Input>
  {error ? (
    <FormControlError>
      <FormControlErrorText>{error}</FormControlErrorText>
    </FormControlError>
  ) : null}
</FormControl>
```

Use GlueStack Button loading/disabled presentation but keep the current login-only Better Auth call and redirect behavior.

- [ ] **Step 4: Verify shell behavior**

Run:

```powershell
node --test tests/notification-navigation.test.mjs tests/ui-theme-contract.test.mjs
npx tsc --noEmit
npm run lint
```

Then smoke-test Expo Web and Android:

- Sign In renders in light and dark modes.
- Account number and password remain visible above the keyboard.
- Forced logout displays one error toast and redirects once.
- Notification taps still route to a ticket or Notifications.
- Back from child routes returns to the parent instead of exiting.

- [ ] **Step 5: Commit the shell migration**

```powershell
git add src/app/_layout.tsx "src/app/(tabs)/_layout.tsx" "src/app/(tabs)/profile/_layout.tsx" src/components/floating-app-bar.tsx src/app/sign-in.tsx
git commit -m "refactor: migrate app shell to gluestack ui"
```

Quote paths containing parentheses when running these commands in PowerShell.

---

## Phase 3: Migrate Complaints

### Task 5: Convert complaint lists and ticket details

**Files:**
- Modify: `src/features/complaints/report-list.tsx`
- Modify: `src/app/(tabs)/complaints/index.tsx`
- Modify: `src/app/(tabs)/complaints/list.tsx`
- Modify: `src/app/(tabs)/complaints/[id].tsx`

**Interfaces:**
- Consumes: `ListSection`, `SearchField`, `useAppColors`, and generated Badge, Button, Heading, Menu, Pressable, Skeleton, Text, and layout components.
- Produces: HeroUI-free complaints overview, archive, grouped report rows, and ticket detail route.

- [ ] **Step 1: Rebuild shared report rows with ListSection primitives**

In `src/features/complaints/report-list.tsx`:

- Replace ListGroup and Separator with `ListSection`, `ListSectionItem`, and Divider.
- Replace `PressableFeedback` with Pressable.
- Replace Typography with Heading/Text.
- Keep status text, ticket number, category, date, unread/current indicators, and route callback unchanged.
- Implement status chips with Badge and existing status-color mapping; do not turn every row into a Card.

- [ ] **Step 2: Migrate the complaints main page**

In `src/app/(tabs)/complaints/index.tsx`:

- Keep the accent header geometry, notification bell, recent-month query, Create Report action, and View all navigation.
- Use Heading/Text for hierarchy, Button/Fab for commands, and Skeleton for loading.
- Use the shared report list without extra card containers.

- [ ] **Step 3: Migrate archive search, sort, and filters**

In `src/app/(tabs)/complaints/list.tsx`:

- Replace HeroUI SearchField with the local SearchField.
- Replace HeroUI Menu with GlueStack Menu/Popover.
- Keep weekly grouping, sort direction, category/status filters, filter counts, and clear behavior.
- Use icon-only sort/filter controls with accessibility labels and 44-point targets.

- [ ] **Step 4: Migrate ticket details and timeline**

In `src/app/(tabs)/complaints/[id].tsx`:

- Replace Surface/Typography/Button/Skeleton with GlueStack layout, Heading/Text/Button/Skeleton.
- Keep ticket fetching, retry, back route, metadata, coordinates, evidence, and timeline ordering unchanged.
- Render the timeline as an unframed vertical sequence; use one card only for the ticket summary if the current information boundary warrants it.

- [ ] **Step 5: Verify complaint read routes**

Run:

```powershell
npx tsc --noEmit
npm run lint
```

Smoke-test:

- Main page shows only recent reports.
- View all opens the archive at the top.
- Search, sort, and every filter can be combined and cleared.
- Report rows open the correct ticket.
- Ticket detail handles loading, not found, server error, and loaded timeline states.
- Android back returns to the correct complaints parent.

- [ ] **Step 6: Commit complaint read routes**

```powershell
git add src/features/complaints/report-list.tsx "src/app/(tabs)/complaints/index.tsx" "src/app/(tabs)/complaints/list.tsx" "src/app/(tabs)/complaints/[id].tsx"
git commit -m "refactor: migrate complaint views to gluestack ui"
```

### Task 6: Convert the complaint submission wizard and overlays

**Files:**
- Modify: `src/app/(tabs)/complaints/new.tsx`

**Interfaces:**
- Consumes: generated BottomSheet, Modal, Progress, FormControl, Input, Textarea, Checkbox, Select, Button, Fab, Toast-compatible submission events, and existing KeyboardAwareScrollView.
- Produces: a HeroUI-free five-stage complaint submission flow with unchanged API, map, image, validation, and background-submission behavior.

- [ ] **Step 1: Replace all field compounds with FormControl**

For every required field, use:

```tsx
<FormControl isRequired isInvalid={Boolean(errors.description)}>
  <FormControlLabel>
    <FormControlLabelText>Description</FormControlLabelText>
  </FormControlLabel>
  <Textarea>
    <TextareaInput
      value={form.description}
      onChangeText={(description) => updateForm({ description })}
    />
  </Textarea>
  {errors.description ? (
    <FormControlError>
      <FormControlErrorText>{errors.description}</FormControlErrorText>
    </FormControlError>
  ) : null}
</FormControl>
```

Preserve the existing first-press validation behavior: the FAB remains enabled, the first invalid press reveals errors and focuses/scrolls to the first invalid field, and a later valid press advances.

- [ ] **Step 2: Replace category, complaint type, municipality, and barangay controls**

- Keep category cards as accessible Pressables with existing descriptions and selected state.
- Use GlueStack Select for complaint type, municipality, and barangay.
- Use `SelectScrollView` for long lists.
- Set a content `maxHeight` so short lists size to content and long lists stop at 50% of the screen and scroll.
- Keep complaint type filtered by category and barangay filtered by municipality.
- Keep the single account-number field disabled and autofilled.

- [ ] **Step 3: Replace checkbox and address fields**

- Use GlueStack Checkbox with visible label text.
- Keep Use home address selected by default.
- Preserve autofill/disable behavior for municipality, barangay, purok, landmark, and default coordinates.
- Keep manual-address controls enabled only when the checkbox is cleared.

- [ ] **Step 4: Convert submission progress to Modal and Progress**

Replace HeroUI Dialog with a non-dismissible GlueStack Modal while `isSubmitting` is true:

```tsx
<Modal isOpen={isSubmitting} closeOnOverlayClick={false}>
  <ModalBackdrop />
  <ModalContent className="mx-5 p-5">
    <ModalHeader>
      <Heading size="md">Submitting report</Heading>
    </ModalHeader>
    <ModalBody className="gap-4">
      <Text>{submissionMessage}</Text>
      <Progress value={submissionProgress} size="sm">
        <ProgressFilledTrack />
      </Progress>
    </ModalBody>
  </ModalContent>
</Modal>
```

Keep image compression/upload before final ticket insertion, the wait/go-home choice, background toast event, returned DB ticket number, and success navigation unchanged.

- [ ] **Step 5: Convert the map to GlueStack BottomSheet**

- Use `BottomSheet`, `BottomSheetPortal`, `BottomSheetBackdrop`, `BottomSheetContent`, and `BottomSheetFooter` from `@/components/ui/bottomsheet`.
- Use `snapPoints={["100%"]}` for the map only.
- Keep MapLibre, Albay bounds, current-location marker, selected marker, latitude/longitude preview, and Confirm coordinates button unchanged.
- Mount MapLibre only while the sheet is open and release location watchers on close.

- [ ] **Step 6: Preserve keyboard and evidence interaction**

- Keep `KeyboardAwareScrollView` and its scroll ref.
- Use GlueStack field inputs without adding a second KeyboardAvoidingView if it causes double inset.
- Keep 1-2 minimum evidence requirement and 3-photo maximum as currently implemented.
- Keep immediate compression, removal badges, upload progress, retry, and R2 submission behavior unchanged.

- [ ] **Step 7: Verify complaint submission end to end**

Run:

```powershell
npx tsc --noEmit
npm run lint
```

On Android and Expo Web verify:

- Every stage begins at the top.
- Required errors appear on the first invalid FAB press.
- Keyboard never hides focused fields.
- Short selects size to their items; long selects cap and scroll.
- Map opens full-screen, selects coordinates, and unmounts when closed.
- One to three photos can be selected, compressed, removed, uploaded, and submitted.
- Waiting shows progress; leaving shows one completion/failure toast.
- Successful submission displays the database-generated ticket number and both navigation actions.

- [ ] **Step 8: Commit the wizard migration**

```powershell
git add "src/app/(tabs)/complaints/new.tsx"
git commit -m "refactor: migrate complaint submission to gluestack ui"
```

---

## Phase 4: Migrate Home, Notifications, and Hotlines

### Task 7: Convert Home and Notifications

**Files:**
- Modify: `src/app/(tabs)/home.tsx`
- Modify: `src/app/notifications.tsx`

**Interfaces:**
- Consumes: `ListSection`, `SearchField`, `useAppColors`, and generated Alert, Badge, Button, Heading, Pressable, Skeleton, Text, and layout components.
- Produces: HeroUI-free Home and Notifications routes with unchanged unread and deep-link behavior.

- [ ] **Step 1: Migrate Home**

- Preserve the current header, bell navigation, unread badge, authenticated/guest states, quick actions, service data, and bottom spacing.
- Replace Label/ListGroup/Surface/Typography/Button with GlueStack primitives and `ListSection` where rows are grouped.
- Keep the bell as an icon button with an accessible label.

- [ ] **Step 2: Migrate Notifications**

- Replace SearchField with the local composition.
- Replace HeroUI grouped lists with ListSection.
- Use Badge for unread/severity state, Button for Mark all read and row actions, Alert for persistent load errors, and Skeleton for loading.
- Preserve Today, Yesterday, Last weekend, This week, Last week, Last month, and Older grouping.
- Preserve rich ticket-number emphasis, mark-read requests, settings navigation, empty-state Home action, and report deep links.

- [ ] **Step 3: Verify Home and Notifications**

Run:

```powershell
npx tsc --noEmit
npm run lint
node --test tests/notification-navigation.test.mjs
```

Smoke-test unread badge refresh, notification search, mark one/all read, settings navigation, ticket action, empty state, and Android back.

- [ ] **Step 4: Commit both routes**

```powershell
git add "src/app/(tabs)/home.tsx" src/app/notifications.tsx
git commit -m "refactor: migrate home and notifications to gluestack ui"
```

### Task 8: Convert Hotlines and its bottom sheets

**Files:**
- Modify: `src/app/(tabs)/hotlines.tsx`

**Interfaces:**
- Consumes: GlueStack Avatar, BottomSheet, Button, SearchField, Heading, Text, Skeleton, Pressable, and layout components.
- Produces: a HeroUI-free hotline directory with dynamic, scrollable, keyboard-aware sheets.

- [ ] **Step 1: Migrate page-level search and agency presentation**

- Replace HeroUI SearchField/TextField with local SearchField.
- Replace Avatar, Button, Surface, Skeleton, Label, and Typography with GlueStack equivalents.
- Preserve smart search across number, agency, address, category, and description.
- Preserve 911 slide-to-call behavior and red progress feedback.
- Preserve ALECO's distinctive agency presentation, network labels, call/copy controls, and external link.

- [ ] **Step 2: Replace category and all-hotlines sheets**

- Import all sheet primitives from `@/components/ui/bottomsheet`; remove direct `BottomSheetScrollView` import from `@gorhom/bottom-sheet`.
- For category sheets use dynamic sizing with a maximum 50% viewport snap point.
- For all hotlines use full-height snap points.
- Use BottomSheetTextInput for sheet search.
- Use BottomSheetFlatList or BottomSheetSectionList for results rather than nesting a normal ScrollView.
- Preserve category tabs, filtered search, empty state, call/copy/link actions, and backdrop dismissal.

- [ ] **Step 3: Verify sheet behavior**

Run:

```powershell
npx tsc --noEmit
npm run lint
```

On Android and web verify short category lists do not occupy 50%, long lists cap and scroll, keyboard input remains visible, all-hotlines reaches full height, and every contact action works.

- [ ] **Step 4: Commit Hotlines**

```powershell
git add "src/app/(tabs)/hotlines.tsx"
git commit -m "refactor: migrate hotlines to gluestack ui"
```

---

## Phase 5: Migrate Profile and Settings

### Task 9: Convert Profile routes, account details, sheets, and settings

**Files:**
- Modify: `src/app/(tabs)/profile/index.tsx`
- Modify: `src/app/(tabs)/profile/details.tsx`
- Modify: `src/app/(tabs)/profile/push-notifications.tsx`
- Modify: `src/features/profile/components/AccountDetailsBuilder.tsx`
- Modify: `src/features/profile/components/ProfileDetailsSheetContent.tsx`

**Interfaces:**
- Consumes: GlueStack Avatar, Alert, BottomSheet, Button, Select/Menu, FormControl, Input, Skeleton, Heading, Text, ListSection, and `useAppColors`.
- Produces: the final HeroUI-free feature area, leaving only temporary root/CSS/package cleanup.

- [ ] **Step 1: Migrate Profile overview**

- Preserve the accent header, larger profile typography, avatar, account number, alerts, account entry point, app settings, theme choice, and logout.
- Replace HeroUI Select with GlueStack Menu or Select for system/light/dark.
- Keep `Uniwind.setTheme("system" | "light" | "dark")` as the source of theme changes.
- Ensure only one clear account-details route exists from each intended entry point.

- [ ] **Step 2: Migrate account details and profile editing**

- Replace ListGroup with ListSection.
- Replace BottomSheet with GlueStack BottomSheet.
- Use BottomSheetTextInput or generated Input inside sheet forms.
- Replace field errors with FormControl error text.
- Preserve avatar selection/compression/upload, profile API calls, disabled/loading state, and success/error feedback.
- Confirm every Update action opens its sheet exactly once.

- [ ] **Step 3: Migrate push-notification settings**

- Replace Alert, Button, Label, Skeleton, Surface, and Typography.
- Preserve permission state, device token registration, advisory toggles, severity choices, substation subscriptions, loading, retry, and save behavior.
- Use visible disabled state when OS notification permission prevents changes.

- [ ] **Step 4: Verify Profile**

Run:

```powershell
npx tsc --noEmit
npm run lint
```

Smoke-test overview, account details, each edit sheet, avatar update, push settings, system/light/dark themes, logout, and child-page back navigation on Android and Expo Web.

- [ ] **Step 5: Commit Profile**

```powershell
git add "src/app/(tabs)/profile" src/features/profile/components
git commit -m "refactor: migrate profile to gluestack ui"
```

---

## Phase 6: Remove HeroUI and Verify the Release

### Task 10: Remove the temporary library and run completion gates

**Files:**
- Modify: `src/app/_layout.tsx`
- Modify: `global.css`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: any source file still reported by the zero-HeroUI scan
- Modify: `tests/ui-theme-contract.test.mjs`

**Interfaces:**
- Consumes: all migrated GlueStack route groups.
- Produces: the requested final stack: GlueStack UI v5 + Expo + React Native + UniWind/Tailwind CSS v4, with no HeroUI Native.

- [ ] **Step 1: Make the zero-HeroUI test fail before cleanup**

Extend `tests/ui-theme-contract.test.mjs`:

```js
test("HeroUI Native is absent from source, styles, and dependencies", async () => {
  const files = await Promise.all([
    readFile(new URL("../global.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../src/app/_layout.tsx", import.meta.url), "utf8"),
  ]);
  const combined = files.join("\n");

  assert.doesNotMatch(combined, /heroui-native|HeroUINativeProvider/);
});
```

Run:

```powershell
node --test tests/ui-theme-contract.test.mjs
```

Expected: failure while the temporary provider, CSS import, or package remains.

- [ ] **Step 2: Remove HeroUI from the root and CSS**

- Remove `HeroUINativeProvider` import and wrapper from `src/app/_layout.tsx`.
- Keep `GluestackUIProvider` directly inside KeyboardProvider.
- Remove `@import "heroui-native/styles"` and `@source "./node_modules/heroui-native/lib"` from `global.css`.
- Remove temporary HeroUI-only aliases that are no longer referenced; retain Aleconnect semantic aliases still used by app classes.

- [ ] **Step 3: Remove the dependency**

Run:

```powershell
npm uninstall heroui-native
npm dedupe
```

- [ ] **Step 4: Prove no HeroUI usage remains**

Run:

```powershell
rg -n "heroui-native|HeroUINativeProvider" src global.css package.json
npm ls heroui-native
node --test tests/ui-theme-contract.test.mjs tests/notification-navigation.test.mjs
```

Expected: `rg` prints no matches; `npm ls heroui-native` shows an empty tree; both tests pass.

- [ ] **Step 5: Run complete static and Expo verification**

Run:

```powershell
npx tsc --noEmit
npm run lint
npx expo-doctor
npx expo export --platform web --output-dir dist
```

Expected: all commands exit `0`; Expo Doctor passes all checks; production web export completes without provider, portal, CSS, or hydration warnings.

- [ ] **Step 6: Verify native builds**

Android local development build:

```powershell
npx expo run:android
```

iOS EAS preview build from Windows:

```powershell
npx eas-cli build --platform ios --profile preview
```

Expected: both builds complete. The iOS command requires configured EAS credentials and may be run in CI if interactive credentials are unavailable locally.

- [ ] **Step 7: Run the final manual route matrix**

Verify on Android and Expo Web, in light and dark themes:

- Sign In and forced logout.
- Home and notification badge.
- Notifications search, grouping, read actions, settings, and ticket deep links.
- Complaints main, archive, filters, ticket details, full submission, map, evidence, progress, and success result.
- Hotlines search, 911 action, category sheet, full directory, and contact actions.
- Profile overview, account details, edit sheets, avatar, push settings, theme switching, and logout.
- Back navigation, safe areas, keyboard visibility, dynamic sheets, loading, empty, error, offline, disabled, required, and invalid states.

Expected: no functional regressions, clipped controls, overlapping text, hidden inputs, non-scrolling long sheets, oversized short sheets, or browser/Metro warnings.

- [ ] **Step 8: Commit final removal**

```powershell
git add src global.css package.json package-lock.json tests/ui-theme-contract.test.mjs
git commit -m "refactor: remove heroui native"
```

- [ ] **Step 9: Confirm the final diff is scoped**

Run:

```powershell
git status --short
git log --oneline -10
```

Expected: only pre-existing unrelated work remains unstaged, and the migration appears as the selective phase commits listed in this plan.
