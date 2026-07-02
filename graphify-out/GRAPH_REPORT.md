# Graph Report - aleconnect-mobile  (2026-06-24)

## Corpus Check
- 88 files · ~97,806 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 812 nodes · 891 edges · 72 communities (66 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5e510cd2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]

## God Nodes (most connected - your core abstractions)
1. `Uniwind — Complete Reference` - 29 edges
2. `Complete Reference` - 23 edges
3. `Native Tabs` - 21 edges
4. `WebGPU & Three.js for Expo` - 17 edges
5. `expo` - 15 edges
6. `appScrollableBottomPadding()` - 13 edges
7. `Tailwind CSS Setup for Expo with react-native-css` - 13 edges
8. `Uniwind Pro` - 13 edges
9. `useAuthSession()` - 12 edges
10. `Route Structure` - 12 edges

## Surprising Connections (you probably didn't know these)
- `ComplaintsRoute()` --calls--> `appScrollableBottomPadding()`  [EXTRACTED]
  src/app/(tabs)/complaints/index.tsx → src/components/floating-app-bar.tsx
- `HomeRoute()` --calls--> `appScrollableBottomPadding()`  [EXTRACTED]
  src/app/(tabs)/home.tsx → src/components/floating-app-bar.tsx
- `HotlinesRoute()` --calls--> `appScrollableBottomPadding()`  [EXTRACTED]
  src/app/(tabs)/hotlines.tsx → src/components/floating-app-bar.tsx
- `SignInRoute()` --calls--> `useAuthSession()`  [EXTRACTED]
  src/app/sign-in.tsx → src/hooks/use-auth-session.ts
- `useAuthSession()` --calls--> `useAuthSessionContext()`  [EXTRACTED]
  src/hooks/use-auth-session.ts → src/context/auth-session-context.ts

## Import Cycles
- 1-file cycle: `metro.config.js -> metro.config.js`

## Communities (72 total, 6 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.04
Nodes (45): dependencies, expo, expo-blur, expo-constants, expo-dev-client, expo-device, expo-font, expo-glass-effect (+37 more)

### Community 1 - "Community 1"
Cohesion: 0.10
Nodes (28): AuthSessionContext, AuthSessionContextValue, useAuthSessionContext(), BlurTargetContext, BlurTargetRef, UseAuthSessionState, apiRequest(), ApiRequestError (+20 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (35): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, googleServicesFile, package, predictiveBackGestureEnabled (+27 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (30): After (Native Tabs), Basic Usage, Before (JS Tabs), Behavior Options, Bottom Accessory (SDK 55+), Common Issues, Conditional Tabs, Custom Web Layout (+22 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (24): 1. make-webgpu-renderer.ts, 1. "X is not part of the THREE namespace", 2. fiber-canvas.tsx, 2. TypeScript Errors with Three.js, 3. Blank Screen, 4. Performance Issues, 5. Peer Dependency Errors, Animation with useFrame (+16 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (25): ActivityIndicator, Button, Complete Reference, Component Bindings, FlatList, Image, ImageBackground, InputAccessoryView (+17 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (23): Behavior, Code Style, Common route structure, Context Menus, Expo UI Guidelines, General Styling Rules, Library Preferences, Link (+15 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (22): Animated Components (`src/tw/animated.tsx`), Apple System Colors with CSS Variables, Configuration Files, CSS Component Wrappers, Custom Theme Variables, Global CSS, Image Component (`src/tw/image.tsx`), IMPORTANT: No Babel Config Needed (+14 more)

### Community 9 - "Community 9"
Cohesion: 0.10
Nodes (20): Best Practices, Customization, Customization, Date/Time Picker, Discrete Steps, Display Styles, Keyboard Types, Min/Max Dates (+12 more)

### Community 10 - "Community 10"
Cohesion: 0.19
Nodes (15): parseCachedProfile(), ConsumerProfileView, ConsumerProfileViewCachePayload, fromConsumerProfileViewCachePayload(), readBoolean(), readCoordinates(), readDate(), readString() (+7 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (19): Animated Symbols, Animation Effects, Basic Usage, Best Practices, Camera, Common Icons, Communication, Content Actions (+11 more)

### Community 12 - "Community 12"
Cohesion: 0.10
Nodes (19): AsyncFunction, Constant, Defining a Shared Object, Either Types (Union types), Enums (Enumerable), Events, Exposing via Class DSL, Function (Synchronous) (+11 more)

### Community 13 - "Community 13"
Cohesion: 0.16
Nodes (13): CategoryId, complaintCategories, ComplaintFormState, formatReportDate(), initialComplaintForm, nextTicketNumber(), recentReports, Report (+5 more)

### Community 14 - "Community 14"
Cohesion: 0.11
Nodes (18): Critical Rules, Data Selectors, FAQ, Fonts, Gradients, Interactive States, MCP Server, Platform Selectors (+10 more)

### Community 15 - "Community 15"
Cohesion: 0.13
Nodes (14): Accessing Documentation & Component Information, Component Patterns, Core Principles, CRITICAL: Native Only - Do Not Use Web Patterns, Critical Setup Requirements, Direct MDX URLs, Framework Setup (Expo - Recommended), HeroUI Native Development Guide (+6 more)

### Community 16 - "Community 16"
Cohesion: 0.13
Nodes (14): Animations, Best Practices, Common Animation Presets, Customizing Animations, Entering and Exiting Animations, Entering Animations, Exiting Animations, Gesture Animations (+6 more)

### Community 17 - "Community 17"
Cohesion: 0.13
Nodes (14): Backdrop Blur, Best Practices, Checking Availability, Fallback Pattern, Glass Buttons, Glass Card, Glass Effects (iOS 26+), Intensity (+6 more)

### Community 18 - "Community 18"
Cohesion: 0.14
Nodes (13): Array Routes for Multiple Stacks, Catch-All Routes, Complete App Structure Example, Dynamic Routes, File Conventions, Group Routes, Layout Files, Not Found Routes (+5 more)

### Community 19 - "Community 19"
Cohesion: 0.27
Nodes (9): SignInRoute(), NewComplaintRoute(), appScrollableBottomPadding(), useConsumerProfileContext(), useAuthSession(), ProfileDetailsRoute(), ProfileRoute(), HomeRoute() (+1 more)

### Community 20 - "Community 20"
Cohesion: 0.18
Nodes (8): APP_BAR_ITEMS, AppBarItem, FloatingAppBar(), FloatingAppBarProps, TabFrame, TabItemProps, FloatingTabsBar(), FloatingTabsBarProps

### Community 21 - "Community 21"
Cohesion: 0.15
Nodes (12): Basic Usage, Common Detent Values, Complete Example, Content not filling sheet, Form Sheet Screen Content, Form Sheet with Footer, Form Sheets in Expo Router, Formsheet with interactive content below (+4 more)

### Community 22 - "Community 22"
Cohesion: 0.15
Nodes (12): Debounced Search, Empty States, Filtering Patterns, Header Search Bar, Multiple Fields, Options, Search, Search Suggestions (+4 more)

### Community 23 - "Community 23"
Cohesion: 0.15
Nodes (12): Button, Components, Limitations, Mail inbox example, Menu, Notes app example, Placement, Recommendations (+4 more)

### Community 24 - "Community 24"
Cohesion: 0.15
Nodes (13): Entering & Exiting Animations, Installation, Layout Transitions, Native Insets, Overview, Pricing & Licensing, Reanimated Animations (Requires Reanimated v4.0.0+), Shadow Tree Updates (+5 more)

### Community 25 - "Community 25"
Cohesion: 0.24
Nodes (8): PushNotificationsReceiver(), PushNotificationsReceiverProps, AuthSessionProvider(), configurePushNotificationHandler(), getLastNotificationResponseAsync(), isPermissionGranted(), PermissionLike, registerForPushNotificationsAsync()

### Community 26 - "Community 26"
Cohesion: 0.17
Nodes (11): Apple Zoom Transitions, Basic Zoom, Best Practices, Combining with Link.Preview, Controlling Dismissal, Custom Alignment Rectangle, Destination Target, Disable all dismissal gestures (+3 more)

### Community 27 - "Community 27"
Cohesion: 0.17
Nodes (12): Custom Themes, Display P3 Colors support, OKLCH Colors support, Quick Setup (dark: prefix), Runtime CSS Variable Updates, Scalable Setup (CSS Variables), ScopedTheme, Theme API (+4 more)

### Community 28 - "Community 28"
Cohesion: 0.18
Nodes (10): Create a Local Module (in existing app), Create a Standalone Module (for publishing), expo-module.config.json, Module Structure Reference, Quick Start, References, What to remove for a module-only (no native view):, What to remove for a view-only (no module functions): (+2 more)

### Community 29 - "Community 29"
Cohesion: 0.20
Nodes (9): Button Gradient, Common Patterns, CSS Gradients, Frosted Glass Effect, Important Notes, Linear Gradients, Multiple Gradients, Overlay on Image (+1 more)

### Community 30 - "Community 30"
Cohesion: 0.20
Nodes (9): compilerOptions, forceConsistentCasingInFileNames, module, paths, strict, extends, include, @/* (+1 more)

### Community 31 - "Community 31"
Cohesion: 0.31
Nodes (6): AccountDetailsBuilder(), AccountDetailsBuilderProps, EditableField, ProfileDetailsSheetContent(), ProfileDetailsSheetContentProps, uploadCurrentUserAvatar()

### Community 32 - "Community 32"
Cohesion: 0.22
Nodes (8): Accessibility & Inclusion, Anti-references, Brand Personality, Design Principles, Product, Product Purpose, Register, Users

### Community 33 - "Community 33"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 34 - "Community 34"
Cohesion: 0.22
Nodes (8): Android Activity Lifecycle (in module definition), Android Lifecycle Listeners, ApplicationLifecycleListener, iOS App Lifecycle (in module definition), iOS AppDelegate Subscribers, Lifecycle Hooks Reference, Module Lifecycle (in module definition), ReactActivityLifecycleListener

### Community 35 - "Community 35"
Cohesion: 0.22
Nodes (9): Expo Router Placement, global.css, Installation, Metro Configuration, Monorepo Support, Setup, Tailwind IntelliSense (VS Code / Cursor / Windsurf), TypeScript (+1 more)

### Community 36 - "Community 36"
Cohesion: 0.25
Nodes (7): devDependencies, @types/react, typescript, main, name, private, version

### Community 37 - "Community 37"
Cohesion: 0.25
Nodes (7): Audio Playback, Audio Recording (Microphone), Camera, Media, Saving Base64 Images, Saving Media, Video Playback

### Community 38 - "Community 38"
Cohesion: 0.25
Nodes (7): AsyncFunction on Views, Defining a View, GroupView (Android), Native View Reference, PropGroup (Android), View Event Dispatching, View Lifecycle

### Community 39 - "Community 39"
Cohesion: 0.25
Nodes (8): 1. Variable-driven utilities (runtime-injected values), 2. Brand-new utilities (no Tailwind equivalent), 3. Overriding existing Tailwind utilities, Custom CSS Classes, Custom CSS & Utilities, Custom Utilities (@utility), Guidelines for Custom CSS, Mixing Custom CSS with Tailwind

### Community 40 - "Community 40"
Cohesion: 0.38
Nodes (4): ConsumerProfileContext, ConsumerProfileProvider(), useConsumerProfile(), UseConsumerProfileState

### Community 41 - "Community 41"
Cohesion: 0.29
Nodes (7): scripts, android, ios, lint, reset-project, start, web

### Community 42 - "Community 42"
Cohesion: 0.29
Nodes (6): Get a fresh project, Get started, Join the community, Learn more, Other setup steps, Welcome to your Expo app 👋

### Community 43 - "Community 43"
Cohesion: 0.29
Nodes (6): Config Plugins Reference, Key Rules, Plugin Structure, Reading Config Values in Native Code, Using in app.json, Writing a Plugin

### Community 44 - "Community 44"
Cohesion: 0.29
Nodes (6): Full SQLite for Complex Data, Key-Value Storage, React Hook for Storage, Storage, Storage with React State, When to Use What

### Community 45 - "Community 45"
Cohesion: 0.29
Nodes (7): 1. package.json, 2. metro.config.js, 3. global.css, 4. babel.config.js (Pro only), 5. TypeScript, 6. Build, Setup Diagnostics

### Community 47 - "Community 47"
Cohesion: 0.33
Nodes (5): Autolinking, expo-module.config.json, Fields, Module Configuration Reference, Resolution Order

### Community 48 - "Community 48"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 49 - "Community 49"
Cohesion: 0.33
Nodes (6): Compound Variants, Margin, Padding, Positioning, Safe Area Utilities, Setup

### Community 50 - "Community 50"
Cohesion: 0.70
Nodes (4): fetchApi(), fetchFallback(), main(), toKebabCase()

### Community 51 - "Community 51"
Cohesion: 0.60
Nodes (4): FALLBACK_THEME, fetchApi(), formatColors(), main()

### Community 52 - "Community 52"
Cohesion: 0.40
Nodes (4): CSS Functions, fontScale(multiplier?), light-dark(lightValue, darkValue), pixelRatio(multiplier?)

### Community 53 - "Community 53"
Cohesion: 0.67
Nodes (3): config, { getDefaultConfig }, { withUniwindConfig }

### Community 54 - "Community 54"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 55 - "Community 55"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 56 - "Community 56"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 57 - "Community 57"
Cohesion: 0.83
Nodes (3): fetchApi(), fetchFallback(), main()

### Community 58 - "Community 58"
Cohesion: 0.83
Nodes (3): fetchApi(), fetchFallback(), main()

### Community 59 - "Community 59"
Cohesion: 0.50
Nodes (4): Built-in Extra Utilities, Supported (all standard Tailwind), Supported vs Unsupported Classes, Unsupported (web-specific, silently ignored)

### Community 60 - "Community 60"
Cohesion: 0.50
Nodes (4): cn Utility — Class Deduplication, Setup, When cn Is NOT Needed, When cn Is Required

### Community 61 - "Community 61"
Cohesion: 0.50
Nodes (4): Comparison, Styling Third-Party Components, useResolveClassNames, withUniwind (Recommended)

### Community 62 - "Community 62"
Cohesion: 0.67
Nodes (3): avatarCompressionSteps, base64ToArrayBuffer(), compressAvatarToStrictLimit()

### Community 65 - "Community 65"
Cohesion: 0.67
Nodes (3): Correct patterns, Dynamic ClassNames, NEVER do this (Tailwind scans at build time)

## Knowledge Gaps
- **523 isolated node(s):** `FALLBACK_THEME`, `name`, `slug`, `version`, `orientation` (+518 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Uniwind — Complete Reference` connect `Community 14` to `Community 65`, `Community 35`, `Community 6`, `Community 39`, `Community 27`, `Community 45`, `Community 49`, `Community 52`, `Community 24`, `Community 59`, `Community 60`, `Community 61`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `Component Bindings` connect `Community 6` to `Community 14`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `FALLBACK_THEME`, `name`, `slug` to the rest of the system?**
  _523 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.1036036036036036 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05555555555555555 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._