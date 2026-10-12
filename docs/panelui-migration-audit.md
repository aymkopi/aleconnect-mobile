# ALEConnect Mobile: PanelUI migration audit and UI/UX rebuild preparation

Reviewed: **2026-10-05**, Asia/Manila. Mobile baseline: `bf7b2a0bde74757ce37d8db052473121c7409146` on `master`, clean at audit start.

**Recommendation:** rebuild the presentation layer with **PanelUI copied-source components**, an ALEConnect theme, and fresh screen compositions. Keep the existing consumer services and business rules behind the new UI. Treat component migration and product redesign as related workstreams with separate acceptance criteria.

This is a source and dependency audit plus preparation plan. No UI implementation, dependency installation in the app, API change, device operation, commit, push, or release was performed.

## 1. Findings and compatibility

| Finding | Evidence and implication |
| --- | --- |
| The current stack meets PanelUI's documented framework floor | Lockfile: Expo `57.0.26`, React Native `0.86.3`, React `19.2.3`, Uniwind `1.12.1`, Tailwind CSS `4.3.3`, Reanimated `4.5.1`, Worklets `0.10.1`. The selected project Node runtime is `24.21.0`. No framework upgrade is proposed for this migration. See [PanelUI installation](https://panelui.dev/docs/installation). |
| Every installed local UI family has a migration route | **21 UI directories**, imported by **32 distinct app/feature/shared files**, outside UI internals. These are import-file counts, not component instances or runtime reachability counts. Three additional flat UI modules also need review. |
| The audit includes the complete current application source inventory | An AST import/export scan covered **127 JS/TS source files** under `src`; affected implementations, configuration, dependency lock, route layouts, and service boundaries were inspected directly. Graphify led to the shared provider, sheets, lists and search; source is the authority. |
| PanelUI is compatible in style, not interchangeable in API | Compound components and semantic tokens fit the requested shadcn direction. React Native props, routing, native controls and state handling still differ from Staff's web shadcn/Base UI stack. Do not copy web components or Radix/Base UI packages into this app. |
| A broader catalogue is available | The audited npm package contains **138 component modules**. The package baseline is `panelui-native@0.105.0`, published 2026-10-02; CLI baseline is `panelui-cli@0.6.2`. See the [package metadata](https://registry.npmjs.org/panelui-native/0.105.0), [CLI metadata](https://registry.npmjs.org/panelui-cli/0.6.2), and [component catalogue](https://panelui.dev/docs/components). |
| Icon strategy needs an explicit choice | Published PanelUI uses **Hugeicons**, while this app imports Lucide in 29 source files and Feather in one profile file. PanelUI does not replace those imports automatically. See [PanelUI icons](https://panelui.dev/docs/customization/icons). |
| Faster app performance is a goal to measure | Both stacks already use Uniwind. Library marketing and smaller wrapper counts do not prove an ALEConnect speedup. Compare release startup, report form interaction, sheet opening, long-list scrolling, memory and bundle size on the same device/data. See [PanelUI performance guidance](https://panelui.dev/docs/performance). |

Current navigation has **four tabs: Home, Reports, Hotlines, Profile**. Advisories and Notifications are stack routes. This audit uses the current checkout, including account/email linking and the current offline report flow; historical redesigns are not treated as the current UI.

## 2. Complete local UI-family replacement map

All paths in this table are under `src/components/ui`. `Files` counts imports outside that directory. Unconsumed exported subparts are included to guide migration of the reusable scaffolding as well as visible screens.

**Effort:** small = mostly presentation mapping; medium = composition/prop changes; high = state, portal, keyboard or gesture behavior must be adapted.

| Current family / public parts | Files | PanelUI replacement | Migration notes | Effort |
| --- | ---: | --- | --- | --- |
| `alert`: `Alert`, `AlertText`, `AlertIcon` | 13 | [Alert](https://panelui.dev/docs/components/alert): `Alert.Content`, `.Title`, `.Description`, `.Indicator` | Map `AlertText` according to its role; translate status variants and preserve offline/error announcements. The exported `UIAlert` factory is implementation scaffolding, not a new design component. | Small |
| `avatar`: `Avatar`, `AvatarImage`, `AvatarFallback`, `AvatarFallbackText`, `AvatarBadge`, `AvatarGroup` | 2 | [Avatar](https://panelui.dev/docs/components/avatar), `.Badge`, `.Group` | Image and initials move to root `source` / `fallback` props; forward image events through `imageProps`. Review size changes and URI-change/error behavior. | Medium |
| `badge`: `Badge`, `BadgeText`, `BadgeIcon` | 1 | [Badge](https://panelui.dev/docs/components/badge) | Text is children; use icon children/composition where needed. Map status tones explicitly; do not assume GlueStack `action` values are Panel variants. | Small |
| `bottomsheet`: `BottomSheet`, `BottomSheetRef`, `BottomSheetPortal`, `BottomSheetTrigger`, `BottomSheetBackdrop`, `BottomSheetDragIndicator`, `BottomSheetContent`, `BottomSheetHeader`, `BottomSheetFooter`, `BottomSheetItem`, `BottomSheetItemText`, `BottomSheetTextInput`, `BottomSheetScrollView`, `BottomSheetFlatList`, `BottomSheetSectionList` | 5 | [BottomSheet](https://panelui.dev/docs/components/bottom-sheet): `.Trigger`, `.Content`, `.Header`, `.Body`, `.Footer`; `Input`, `Item`; native virtualized lists when required | Replace imperative refs with controlled `open` / `onOpenChange`. Portal/backdrop/grabber belong to Panel's composition. `.Body` provides scrolling; it is not a drop-in virtualized-list adapter. Gorhom snap points and keyboard inputs need behavioral review. | High |
| `button`: `Button`, `ButtonText`, `ButtonIcon`, `ButtonSpinner`, `ButtonGroup` | 24 | [Button](https://panelui.dev/docs/components/button), [ButtonGroup](https://panelui.dev/docs/components/button-group) | Text becomes children, icons become `startContent` / `endContent`, spinner becomes `loading`; `isDisabled` becomes `disabled`. Preserve destructive, icon-only and submit states. | Medium |
| `divider`: `Divider` | 1 | [Separator](https://panelui.dev/docs/components/separator) | Review orientation, inset and contrast. | Small |
| `form-control`: `FormControl`, `FormControlLabel`, `FormControlLabelText`, `FormControlLabelAstrick`, `FormControlHelper`, `FormControlHelperText`, `FormControlError`, `FormControlErrorText`, `FormControlErrorIcon` | 6 | [Field](https://panelui.dev/docs/components/field): `.Label`, `.Description`, `.Error`; [Input](https://panelui.dev/docs/components/input) / [Textarea](https://panelui.dev/docs/components/textarea) label/error props | Required marker is `required` / `isRequired` as appropriate. Map invalid/disabled states per control. `FormControl` is not equivalent to Panel's form-state manager. Exported `UIFormControl` has no product replacement. | Medium |
| `gluestack-ui-provider`: `GluestackUIProvider`, `ModeType`; native/web variants and web script | 1 | `PanelUIProvider`, `useTheme` / `useThemeMode` | Provider changes portals and toast hosting. It has no GlueStack `mode` prop; theme preference uses Uniwind/Panel hooks. Reconcile the existing gesture and keyboard root providers. | High |
| `heading`: `Heading`, native/web variants | 19 | [Typography.Heading](https://panelui.dev/docs/components/typography) | Map heading levels and sizes explicitly; preserve heading accessibility and font scaling on native and web. | Small |
| `input`: `Input`, `InputField`, `InputIcon`, `InputSlot` | 6 | [Input](https://panelui.dev/docs/components/input), [InputGroup](https://panelui.dev/docs/components/input-group): `.Prefix`, `.Input`, `.Suffix` | Root owns `value`, `onChangeText`, keyboard and secure-entry props. Decorators use slots; interactive password-reveal/clear controls need proper hit targets and labels. | Medium |
| `menu`: `Menu`, `MenuItem`, `MenuItemLabel`, `MenuSeparator` | 2 | [Menu](https://panelui.dev/docs/components/menu): `.Trigger`, `.Content`, `.Item`, `.Separator`, `.RadioGroup`, `.RadioItem` | Label becomes item composition. Theme/filter single-choice menus can use radio items. Preserve anchor, close and back behavior. Exported `UIMenu` is scaffolding. | Medium |
| `modal`: `Modal`, `ModalBackdrop`, `ModalContent`, `ModalHeader`, `ModalBody`, `ModalFooter`, `ModalCloseButton` | 2 | [Dialog](https://panelui.dev/docs/components/dialog): `.Content`, `.Title`, `.Description`, `.Footer`, `.Close`; `View` for custom header/body | Replace `isOpen` / `onClose` with `open` / `onOpenChange`. Backdrop is owned by the dialog. Camera/gallery action selection may be better as a BottomSheet in the redesign. | High |
| `pressable`: `Pressable` | 9 | `AnimatedPressable`, `Item`, or ordinary React Native `Pressable` | Use a semantic component for rows/actions. Keep ordinary Pressable where no animated feedback is appropriate. Preserve role, selected state and action labels. | Small |
| `progress`: `Progress`, `ProgressFilledTrack` | 1 | [Progress](https://panelui.dev/docs/components/progress), [Steps](https://panelui.dev/docs/components/steps) | Filled track becomes root progress props; step navigation and upload progress remain different concepts. Exported `UIProgress` is scaffolding. | Small |
| `select`: `Select`, `SelectTrigger`, `SelectInput`, `SelectIcon`, `SelectPortal`, `SelectBackdrop`, `SelectContent`, `SelectDragIndicator`, `SelectDragIndicatorWrapper`, `SelectItem`, `SelectScrollView`, `SelectVirtualizedList`, `SelectFlatList`, `SelectSectionList`, `SelectSectionHeaderText`; `select-actionsheet.tsx` | 2 | [Select](https://panelui.dev/docs/components/select): `.Item`, `.Group`; [Combobox](https://panelui.dev/docs/components/combobox) for searchable choices | Options become `Select.Item`; trigger/display/search/sheet presentation are root props. For large location lists use custom virtualization with the exposed query API, or retain an adapted location chooser. Review selected IDs, disabled options and cascading resets. | High |
| `skeleton`: `Skeleton`, `SkeletonText`, styles | 9 | [Skeleton](https://panelui.dev/docs/components/skeleton) | Text placeholder becomes appropriately sized skeleton lines. Keep one meaningful loading announcement and reduced-motion behavior. | Small |
| `spinner`: `Spinner` | 1 | [Spinner](https://panelui.dev/docs/components/spinner) | Also standardize suitable route-level `ActivityIndicator` usages. Preserve busy state; avoid redundant screen-reader announcements. | Small |
| `text`: `Text`, native/web variants and styles | 28 | Panel `Text` primitive or [Typography](https://panelui.dev/docs/components/typography) | Map size/weight/muted semantics and remove reliance on global React Native `defaultProps` for the new design system. | Medium |
| `textarea`: `Textarea`, `TextareaInput` | 1 | [Textarea](https://panelui.dev/docs/components/textarea) | Value/change/validation live on the root. Consider `autoGrow` / `showCount` only where a real length limit exists. | Medium |
| `toast`: `Toast`, `ToastTitle`, `ToastDescription`, `useToast` | 1 | [Toast](https://panelui.dev/docs/components/toast), `useToast` / `toast` | API changes: `label`, `description`, `variant`, optional `component(handle)`. Convert GlueStack `render({id})` and `action="error"` deliberately; Panel uses `destructive`. Preserve submission and foreground-push event subscriptions. | High |
| `vstack`: `VStack`, native/web variants and styles | 1 | React Native `View` with column/gap classes | No dedicated Panel VStack is needed. Preserve layout/spacing and convert any retained style helpers away from GlueStack utilities. | Small |

Extra flat UI modules:

| Current module | Usage | Replacement / action |
| --- | --- | --- |
| `list-section.tsx`: `ListSection`, `ListSectionItem` | Six app/feature files | [Frame](https://panelui.dev/docs/components/frame) or `Card` for grouped surfaces; [Item](https://panelui.dev/docs/components/item) for media/title/description/actions; Separator for dividers. Keep a small ALEConnect settings-section composition if the product needs it. |
| `search-field.tsx`: `SearchField` | Three screen files | [SearchBar](https://panelui.dev/docs/components/search-bar), or InputGroup for a simple inline filter. The app still owns query/filtering/pagination state. |
| `motion-safe-primitives.tsx`: `MotionSafeView`, `MotionSafePressable` | Select's internal action sheet | Existing helpers discard legacy animation props. Migrate that retained sheet scaffolding to Panel/RN primitives; do not forward those old props to Panel. Verify reduced motion, and disable press scaling where appropriate. |

**Preserve reusable UI folders.** Dependency removal requires converting all retained native/web modules and internal styles, including unrendered scaffolding: TypeScript still checks those files. Leaving an unused `.tsx` module importing a removed GlueStack package is not a completed migration. Keep provenance in Git and `docs/gluestack-ui-source.json`; add a Panel source manifest for the new copied components.

## 3. Custom components and repeated screen patterns

PanelUI supplies presentation primitives. These replacements still need ALEConnect composition and the existing data/state controllers.

| Current component / pattern and location | Proposed replacement | Behavior that remains owned by ALEConnect |
| --- | --- | --- |
| `FloatingAppBar`, its `TabItem`, `FloatingTabsBar` in `src/components` | Fresh **Expo Router** bottom navigation with new icons, spacing and safe-area treatment | Navigation state, nested routes, tab press/reselect events and deep links. Panel [Tabs](https://panelui.dev/docs/components/tabs) is suitable for in-screen segments, not a replacement router. |
| `ChildAppBar` | New shared `ScreenHeader`: Typography, Button; optionally [ScrollHeader](https://panelui.dev/docs/components/scroll-header) | Back fallback, route title and scroll/inset behavior. `PageHeader` is a profile/content header, not the universal navigation bar. |
| `AppToast` and its three event bridges in root layout | Panel Toast configuration / custom toast composition | Forced logout, foreground push and report completion/queue/failure events; listeners must not duplicate after provider migration. |
| `PushNotificationsReceiver` | **Retain**; connect to the new toast host | Native delivery/token/response handling. It is not a UI-library component. |
| `AdvisoryListItem`, local `AdvisorySeverityBadge` | Card or Item + Badge + Typography | Public urgency/type, interruption/restoration time distinctions, targeting-compatible display, null/omitted fields, Manila time. |
| `PublicUpdateListItem` | Card + Typography + media; [Post](https://panelui.dev/docs/components/post) only if simplified | Existing Staff-provided updates, Facebook permalink, safe media. Hide social reactions/voting without supporting contracts. |
| `PublicUpdatePhotos` | Existing Expo Image thumbnails composed with [ImageViewer](https://panelui.dev/docs/components/image-viewer) / optional Carousel | Signed/public URLs, alt text, loading failure suppression; viewer compatibility with existing image caching needs verification. |
| `ProfileAvatar` | Avatar `source` / `fallback` | Stable initials, missing/failed image handling, reset when URI changes; upload remains separate. |
| `AccountDetailsBuilder`; profile `ProfileSection`, `ProfileRow`, `IconBubble`, `QuickAction` | Frame / Item / Button / Avatar or semantic icon slot | Account labels/actions and availability. Keep an ALEConnect account row when its contract needs additional fields. |
| `ProfileEditSheetHeader` | BottomSheet.Header + close Button | Draft cancellation and close/save state. |
| `ProfileDetailsSheetContent` | Field + Input in BottomSheet.Body | Editable-field allowlist, validation, save result and disabled account conditions. |
| `ProfileAddressSheetContent` | Field + Input + searchable Select/Combobox + map action | PSGC IDs, municipality/barangay dependence, saved coordinates, manual vs verified location, account-scoped draft state. |
| `TriStateCheckbox`, `FeederCheckbox` in push preferences | [Checkbox](https://panelui.dev/docs/components/checkbox) with `checked` / `indeterminate` | Parent/child selection, compact payloads, unsupported/unavailable options, offline cache and save rules. |
| `ToggleSwitch`, `PreferenceSwitch` in push preferences | [Switch](https://panelui.dev/docs/components/switch) inside Item or horizontal Field | Preference state, pending-save/disabled states and server/device permission distinctions. |
| `EmergencySlider` in Hotlines | [SlideButton](https://panelui.dev/docs/components/slide-button) with `onComplete` plus an accessible activation path | Existing `tel:911` action, repeat/reset behavior and direct screen-reader activation. Choose the gesture only if it remains easy to use during stress. |
| `AgencyCard`, `CategoryCard`, `HotlineResults`, `HotlineSheetHeader`, `SheetSearchInput` | Card / Item / Chip / SearchBar / BottomSheet | Existing category metadata, phone normalization, dial/copy/open-link actions, query and offline cache. |
| Report `ReportInput` / `SelectField`, choice cards and account chooser | Input / Textarea / Field / Select or [RadioGroup](https://panelui.dev/docs/components/radio-group) with card variant | Existing metadata IDs, validation, account-change reset, input limits and required-field rules. |
| Manual report step header, progress and footer in `reports/new.tsx` | Steps + Progress + persistent accessible Back/Next/Submit actions | Existing four input/review stages and fifth result stage; `validateReportForm`, evidence preparation, submit lock, reference number and queue results. [Questionnaire](https://panelui.dev/docs/components/questionnaire) is an optional future flow, not automatic replacement of this controller. |
| Report attachment thumbnails/status/remove actions and camera/gallery modal | [Attachment](https://panelui.dev/docs/components/attachment) + BottomSheet + image thumbnails | Camera/library selection, permissions, file-size/type processing, local evidence cleanup and durable queue. `Attachment` does not upload files. |
| `EvidencePhotoViewer` | ImageViewer, controlled open/index, an ALEConnect evidence adapter | Initial index, processing/failed items, URI lifecycle and accessible close/back. Panel viewer registers images through triggers; it does not accept the current `photos` prop directly. |
| `ReportStatusBadge`, `ReportListGroup` | Badge + Item/Card in the existing virtualized list | Consumer status projection, report reference, address/account context, refresh and pagination. |
| `DetailRow`, `TimelineItem` in report detail | Item / Field-style read-only rows + [Timeline](https://panelui.dev/docs/components/timeline) | Real server-projected history/status/timestamps. Visual timeline state never creates a business transition. |
| `ExtendedOutageStatusCard` | Card + Badge + Timeline/Alert | Published phase/note/estimate/next-update fields and their absent-value handling. Never manufacture restoration percentages or promises. |
| Notification `NotificationRow`, `NotificationDescription`, `EmptyState`, `LoadingState` | Item + Badge + Typography + [EmptyState](https://panelui.dev/docs/components/empty-state) + Skeleton | Read/unread, auth, paging/filtering, ticket/advisory/account-link targets and forced-session invalidation. |
| Route skeletons, inline ActivityIndicator and empty/error/offline panels | Skeleton, Spinner, EmptyState, Alert with retry Button | State distinctions and existing retry/cooldown logic; cached content should not be replaced by a loading panel unnecessarily. |
| `StaticLocationMap` | **Keep initially**, restyle surrounding surface; later evaluate Panel [Map](https://panelui.dev/docs/components/map) | Existing style URL, lazy native loading, timeout/error/web fallback, texture rendering and accessible nonvisual description. |
| `AlbayLocationPickerSheet` | New BottomSheet/fields around the current picker; Panel Map is a later conditional adapter | Albay bounds/polygon validation, coordinates, location permission/accuracy, search and confirmation. Map remains dependent on native MapLibre. |

Native `View`, `ScrollView`, `FlatList`, `SectionList`, `RefreshControl`, safe-area hooks, image picker and Linking remain normal tools. Replacing a primitive UI library does not require replacing every React Native element.

## 4. Additional PanelUI opportunities

“New to this app” and “missing from GlueStack” are different. GlueStack v5 already lists Checkbox, Switch, Radio, Card, Tabs, Calendar, DateTimePicker, ImageViewer, Drawer, Slider, Table and other primitives. Those are still good Panel replacements, but not exclusive capabilities. The comparison below means **not listed as a named component in the reviewed GlueStack v5 catalogue**, not impossible to compose with GlueStack. See [GlueStack's official catalogue](https://v5.gluestack.io/ui/docs/components/all-components).

| PanelUI capability beyond the listed GlueStack primitives | ALEConnect opportunity | Adoption decision |
| --- | --- | --- |
| [Item](https://panelui.dev/docs/components/item), [Frame](https://panelui.dev/docs/components/frame), [Surface](https://panelui.dev/docs/components/surface) | Consistent settings, linked-account, report and hotline row/surface grammar | Use Item/Frame early; use Surface only where a distinct elevation role helps. |
| [Field](https://panelui.dev/docs/components/field), [InputGroup](https://panelui.dev/docs/components/input-group), [Form](https://panelui.dev/docs/form/form) | Predictable labels/help/errors; account-number and password decorators | Field/InputGroup early. Panel Form/useForm is optional: preserve current validators and queue submission controller first. |
| [SearchBar](https://panelui.dev/docs/components/search-bar), [Combobox](https://panelui.dev/docs/components/combobox), [Chip](https://panelui.dev/docs/components/chip) | Discoverable report/notification/hotline filters and searchable location choices | Use after defining shared filter/query patterns and testing large option lists. |
| [EmptyState](https://panelui.dev/docs/components/empty-state) | Clear first-use, no matches, no reports, and unavailable-data states | Use early with state-specific copy and a meaningful action. |
| [Steps](https://panelui.dev/docs/components/steps), [Timeline](https://panelui.dev/docs/components/timeline) | Report progress and status history | Use existing validation and real history as inputs. |
| [Attachment](https://panelui.dev/docs/components/attachment) | Visible evidence processing/upload failure and retry | Use early; translate existing local/transport states and show progress only when measured. |
| [SlideButton](https://panelui.dev/docs/components/slide-button), [ProgressButton](https://panelui.dev/docs/components/progress-button) | Existing emergency-call slider; deliberate actions where warranted | Evaluate SlideButton. Hold/slide gestures need accessible alternatives; ordinary submit remains a Button. |
| [ScrollHeader](https://panelui.dev/docs/components/scroll-header), [PageHeader](https://panelui.dev/docs/components/page-header) | Coherent long-page and profile headers | Design-stage candidates; keep route chrome separate. |
| [AnimatedBadge](https://panelui.dev/docs/components/animated-badge) | Foreground status refresh visibility | Optional; motion must not replace a readable status label. |
| [Sketch](https://panelui.dev/docs/components/sketch) | Optional consumer sketch of a pole/service-line problem or access landmark | Separate feature candidate after evidence/export validation; details below. |
| [Signature](https://panelui.dev/docs/components/signature) | Future acknowledgment form | Defer. Current app has no established consumer signature workflow or authority contract. |
| [Questionnaire](https://panelui.dev/docs/components/questionnaire) | Guided complaint questions | Prototype separately against category branching, account/location/evidence requirements and draft recovery. |
| [ContextMenu](https://panelui.dev/docs/components/context-menu), [Swipe](https://panelui.dev/docs/components/swipe), [SelectionMode](https://panelui.dev/docs/components/selection-mode) | Optional contextual report/notification actions | Discoverability/accessibility review first. No new bulk mutation without the appropriate server contract. |
| [OtpInput](https://panelui.dev/docs/components/otp-input), [QRCode](https://panelui.dev/docs/components/qr-code) | Future supported verification or reference sharing | Defer; do not invent OTP authentication, account verification or encoded private credentials. |
| [Support](https://panelui.dev/docs/components/support), [Feedback](https://panelui.dev/docs/components/feedback) | Future support/feedback surface | Static contact composition can reuse existing hotlines. Sending feedback/conversations needs an established destination and contract. |
| Charts / Kpi / Meter / Countdown / Planner | Possible future data-backed consumer views | Defer. Current app does not supply billing/consumption analytics or a guaranteed restoration clock. |

The rest of the catalogue is not a default installation list. AI/chat, Studio conversations, Neon integrations, Flow, editing tools, ranking/social interactions, desktop split panes and decorative scroll/motion modules are outside the current consumer workflows. Bringing them in would add product scope and often new services. PanelUI Studio is not a replacement for Staff's notification/support/data ownership.

### Sketch integration boundary

Sketch produces SVG plus drawing metadata. `SketchHandle.toPNG()` returns a temporary PNG file URI and requires optional `react-native-view-shot`; it can then feed the existing evidence preparation path. `Sketch.Sheet` defaults to native-sheet rendering when available; use `native={false}` for the consistent styled-sheet pilot. See [Sketch docs](https://panelui.dev/docs/components/sketch).

The current [evidence processor](../src/utils/evidence-image-processing.ts) converts image URIs to **WebP**, limits each prepared photo to **5,000,000 bytes**, and stores report-scoped files. Direct SVG upload is not an established path. A compatible sketch candidate would be:

1. Explicitly label the optional drawing as a consumer sketch, separate from an actual photo.
2. Export PNG while the canvas is still mounted, then run the existing WebP/size/local-storage processing.
3. Use the established queue/evidence upload path and account ownership checks.
4. Test confirm/cancel ordering, empty drawings, eraser/export fidelity, app interruption and local-file cleanup.

Embedding a drawing on a photo or adding an SVG server/media contract is additional work. Sketch alone does not provide evidence authentication, storage, uploads or photo annotation.

## 5. Dependency disposition: all current direct packages

Current direct inventory: **43 runtime dependencies + 6 development dependencies**. Versions below are resolved lockfile versions, rather than just package ranges. “Remove” means after the replacement and all retained-source/config references are resolved, not during this audit.

### UI packages to retire or consolidate

| Current dependency | Locked | Disposition |
| --- | --- | --- |
| `@gluestack-ui/core` | 5.0.15 | Replace creators/providers/overlay/toast usage with copied Panel components and foundations; remove last. |
| `@gluestack-ui/utils` | 5.0.6 | Replace `tva`, style contexts, icon and aria helpers with Panel's copied utilities and native accessibility. Convert retained `.web` and style modules before removal. |
| `@gorhom/bottom-sheet` | 5.2.14 | Remove after hotline/profile/location sheets have behavioral parity. Panel BottomSheet's implementation does not depend on Gorhom. |
| `@expo/html-elements` | 57.0.0 | Current source imports are only local Heading and Select action-sheet scaffolding. Remove direct dependency after native/web heading semantics are replaced and the complete source scan is clear. |
| `@react-native-vector-icons/feather` | 13.1.4 | One Facebook brand glyph in Profile, plus its `app.json` plugin. Replace with a permitted brand asset/icon, remove import and plugin together, then verify native configuration. |
| `lucide-react-native` | 1.51.0 | Recommended to keep for the first pilot, then consolidate to the chosen app icon policy. Remove only after all 29 import sites and Lucide-typed props are adapted. Panel's bundled icon wrappers use Hugeicons, not Lucide. |

A zero-GlueStack finish is feasible. A one-package finish is not: PanelUI still requires styling, animation and native peers, and the product requires its service/native dependencies.

### Keep: shared UI/runtime foundations

| Dependency | Locked | Why it remains |
| --- | --- | --- |
| `expo` | 57.0.26 | App/native runtime. |
| `react`, `react-dom` | 19.2.3 each | Rendering and web support. |
| `react-native` | 0.86.3 | Native host controls/runtime. |
| `react-native-web` | 0.21.2 | Existing web target; Panel web fallback still needs validation. |
| `expo-router` | 57.0.24 | Router, stack/tab state and deep links. |
| `react-native-screens` | 4.26.2 | Native navigation support; a missing direct import does not imply dispensability. |
| `uniwind` | 1.12.1 | Shared Tailwind engine; reuse the existing Metro integration. |
| `tailwindcss` | 4.3.3 | CSS/token/class compiler. |
| `react-native-reanimated` | 4.5.1 | Panel animation implementation. |
| `react-native-worklets` | 0.10.1 | Current Reanimated runtime; satisfies the audited package's floor. |
| `react-native-gesture-handler` | 2.32.0 | Sheets, slides, gestures and app root. |
| `react-native-safe-area-context` | 5.7.0 | Screen, sheet and toast insets. |
| `react-native-svg` | 15.15.4 | Icons and optional drawings/data visuals. |
| `react-native-keyboard-controller` | 1.21.9 | Current forms already use it; Panel can also use it. Reconcile provider ownership and keyboard avoidance rather than nesting duplicate providers. |
| `expo-font` | 57.0.4 | Load selected brand fonts. Current app uses Satoshi; selecting a new font is a design decision. |

### Keep: product, platform and service dependencies

| Dependency | Locked | Why PanelUI does not replace it |
| --- | --- | --- |
| `@maplibre/maplibre-react-native` | 11.4.1 | Native map renderer. Panel Map wraps it; it does not eliminate it. |
| `@turf/boolean-point-in-polygon` | 7.4.0 | Albay/barangay geometry validation. |
| `expo-location` | 57.0.20 | Permission/GPS/accuracy behavior; also optional for Panel Map controls. |
| `@react-native-async-storage/async-storage` | 2.2.0 | Consumer-scoped cache/preferences/queue state. |
| `@react-native-community/netinfo` | 12.0.1 | Online/offline behavior and refresh/sync triggers. |
| `expo-secure-store` | 57.0.4 | Private session-token storage. |
| `expo-background-task` | 57.0.21 | Durable report background synchronization. |
| `expo-task-manager` | 57.0.21 | Background task and notification task registration. |
| `expo-notifications` | 57.0.21 | Tokens, OS permissions, native delivery and notification response. |
| `expo-device` | 57.0.2 | Device-aware push behavior. |
| `expo-constants` | 57.0.20 | Runtime/application/push configuration. |
| `expo-file-system` | 57.0.7 | Private prepared evidence and cleanup. |
| `expo-image-manipulator` | 57.0.20 | Resize/compress/reformat evidence and avatars. |
| `expo-image-picker` | 57.0.20 | Camera/gallery chooser and permission handling. |
| `expo-image` | 57.0.5 | Existing image loading/caching. Verify Panel ImageViewer integration before considering any change. |
| `expo-clipboard` | 57.0.2 | Hotline/reference copy; can support Panel's clipboard hook. |
| `expo-linking` | 57.0.11 | Expo Router/deep-link infrastructure. The source also uses React Native Linking for external links/dialing. |
| `expo-dev-client` | 57.0.19 | Development-client workflow and native MapLibre capability. |
| `expo-splash-screen` | 57.0.9 | App startup/font readiness. |
| `expo-status-bar` | 57.0.1 | System chrome and edge-to-edge behavior. |
| `expo-system-ui` | 57.0.4 | Native system-surface configuration; absence of a source import is not sufficient removal evidence. |

### Keep: all development dependencies

| Dependency | Locked | Role |
| --- | --- | --- |
| `@react-native-community/cli` | 20.2.0 | Native tooling. |
| `@types/node` | 22.20.5 | Existing tooling types; any upgrade is separate from UI migration. |
| `@types/react` | 19.2.18 | React types. |
| `eslint` | 9.39.5 | Lint. |
| `eslint-config-expo` | 57.0.2 | Expo lint rules. |
| `typescript` | 6.0.3 | Strict type checking. |

Do not manually prune React Aria, styling utilities, or other transitive lockfile entries based on names. The package manager resolves them after direct dependencies change; first check whether retained dependencies still need them.

### Additions for the recommended copied-source path

The live [Panel registry](https://panelui.dev/r/index.json) dependency graph was resolved for **37 requested modules**, producing **55 registry items** including utilities, hooks and portal helpers. This is a proposed application set, not an installation already performed. Registry contents are mutable independently of the CLI version: record selected item hashes/source provenance before implementation.

| Package | Current state | Planned disposition |
| --- | --- | --- |
| `tailwind-variants` | Absent | Add as a direct dependency for copied component variants. Audited package baseline uses `^3.2.2`. |
| `tailwind-merge` | Absent | Add for copied `cn`; package baseline `^3.3.1`. |
| `clsx` | Transitive 2.1.1 only | Make direct when copied `cn` imports it; package baseline `^2.1.1`. |
| `@hugeicons/react-native` | Absent | Required by copied default icon foundations; package baseline `^1.0.16`. |
| `@hugeicons/core-free-icons` | Absent | Required by copied default icon foundations; package baseline `^4.3.0`. |
| `@react-native-masked-view/masked-view` | Transitive 0.3.2 only | Make direct: Attachment pulls in Shimmer, which needs it. Do not rely on a transitive installation. |
| `expo-linear-gradient` | Absent | Add with Expo SDK alignment; required by the proposed set's Shimmer foundation. |
| Existing Uniwind, gesture handler, Reanimated, safe-area context, SVG | Already direct | Retain; these complete the registry's required-package union. Worklets and Tailwind remain part of app/runtime setup. |
| `panelui-native` | Absent | **Not required for copied-source mode.** Package mode is a valid alternative, pinned initially to audited `0.105.0` with all required peers. |
| `panelui-cli` | Absent | Use pinned `0.6.2` as a tooling command, not a mandatory runtime dependency. Pinning CLI alone does not pin downloaded registry source. |

Optional additions are feature choices, not prerequisites for the baseline redesign:

| Optional package | Decision |
| --- | --- |
| `@expo/ui` | Already transitive at 57.0.21. Add direct only if opting into native platform rendering. Audit includes its availability so adding Panel must not silently change sheet/control behavior. |
| `expo-blur`, `expo-haptics` | Absent. Add only for approved blur/haptic behavior. Styled overlays work without blur. |
| `react-native-view-shot` | Absent. Add and verify the native build if Sketch/Signature raster export is selected. |
| `expo-glass-effect` | Optional in the full package; not part of the resolved 37-module set. No baseline addition planned. |

For the initial pilot, explicitly choose **styled rendering** for components with optional native paths. Native controls may ignore theme/class/loading props, and native sheets can keep content mounted after dismissal. This matters for unsaved profile drafts and report selection state. See [native rendering](https://panelui.dev/docs/native).

## 6. Source ownership and integration plan

Recommended [CLI mode](https://panelui.dev/docs/cli) fits a full visual rebuild: copy only needed modules and own the styling/API adaptations. Package mode reduces source maintenance but also adds the complete package dependency graph; it is appropriate if we want most components as shipped. Either mode needs behavioral and performance checks.

Stage new source under `src/components/panelui` while converting the current components. Configure separate `lib` and `hooks` aliases to avoid collision with application hooks:

```json
{
  "registry": "https://panelui.dev/r",
  "aliases": {
    "components": "@/components/panelui",
    "lib": "@/lib/panelui",
    "hooks": "@/hooks/panelui"
  },
  "css": "global.css",
  "theme": "theme.css"
}
```

The existing alias is `@/* -> ./src/*`; keep it. After reviewing the CLI's proposed configuration writes, the copied-source CSS shape should include the actual app directories:

```css
@import "tailwindcss";
@import "uniwind";
@import "./theme.css";

@source "./src/components/panelui";
@source "./src/lib/panelui";
@source "./src/hooks/panelui";
```

Keep `metro.config.js` pointed to the existing root `./global.css`. Register only the chosen theme modes; copying the documentation's `./src/global.css` path would be wrong for this repo. Define the complete Panel token set, then layer ALEConnect semantic aliases deliberately.

**Known token collision:** the current `--color-muted` is a text grey and `text-muted` appears in navigation. Panel's `muted` is a surface colour. Rewrite old text uses to `muted-foreground` before adopting Panel tokens. Existing aliases for `danger`, `surface`, `separator`, `accent-soft` and related state colours also need a single coherent mapping. Panel needs additional roles such as `skeleton`, frame surfaces and `destructive-solid-foreground`.

Use [Panel font tokens](https://panelui.dev/docs/customization/fonts) for selected font faces and weights; preserve splash readiness while loading. Use [Panel theme guidance](https://panelui.dev/docs/customization/theming) as the base and choose brand palette/radius/type scales during design. No final brand theme has been selected here.

The published provider owns the gesture root, portal and toast viewport, and can mount KeyboardProvider when the existing native controller is available. Review [the current root](../src/app/_layout.tsx) and copied provider together. Preserve `AuthSessionProvider -> ConsumerAccountProvider -> ReportQueueProvider` and push/sync bridges; move UI hosting without duplicating those providers or subscription effects.

Planning commands for a future isolated implementation, **not run by this audit**:

```powershell
npx panelui-cli@0.6.2 init --dry-run
npx panelui-cli@0.6.2 add panel-ui-provider button text input field --dry-run
```

Approve concrete generated diffs and source provenance as part of implementation review. Do not run a project generator over the current repository or accept overwrites of existing UI/config files blindly.

### Proposed 37-module application set

`panel-ui-provider`, `button`, `button-group`, `text`, `typography`, `animated-pressable`, `alert`, `avatar`, `badge`, `bottom-sheet`, `separator`, `field`, `input`, `input-group`, `menu`, `dialog`, `progress`, `select`, `skeleton`, `spinner`, `textarea`, `toast`, `item`, `frame`, `search-bar`, `checkbox`, `switch`, `radio-group`, `steps`, `timeline`, `empty-state`, `attachment`, `image-viewer`, `card`, `chip`, `combobox`, `slide-button`.

Supporting resolved items: `cn`, `portal`, `icons`, `native`, `use-direction`, `haptics`, `scrim`, `use-back-handler`, `label`, `keyboard-avoider`, `use-keyboard-avoidance`, `popover`, `use-keyboard`, `shimmer`, `controllable-state`, `use-theme`, `focus-restoration-store`, `modal-isolation-store`.

The set covers current replacements and the strongest new compositions. Add modules per accepted screen, not all at once. Map, Sketch, Form, Questionnaire, profile/scroll headers and other elective modules remain outside this baseline set until selected.

## 7. Prepare a new UI/UX system from scratch

The reset covers the theme, navigation appearance, screen layouts, content hierarchy, form presentation and interaction patterns. It retains the established product capabilities and service/state boundaries. The current [product brief](../PRODUCT.md) describes a reliable, calm, task-first utility app; it is the design brief to revisit with the user, not a requirement to preserve the present visual treatment.

### Rebuild deliverables

| Deliverable | Preparation / acceptance requirement |
| --- | --- |
| Experience brief | Prioritize reporting an issue, checking its status, reading public updates, getting help and managing linked accounts. Decide visual direction, brand continuity, language scope and Android/iOS priority before detailed screens. |
| Information architecture | Compare the current four tabs with a proposal that makes Updates more discoverable. Determine whether Advisories merits a tab or a Home/Updates entry and whether Hotlines belongs as a primary destination. Preserve current route/deep-link compatibility during any transition. |
| Token specification | Light/dark roles, ALECO brand/action/urgency colours, typography, radius, spacing, elevation, keyboard/inset and minimum target sizes. Define public report/advisory status colours with text labels. |
| Primitive gallery | Render selected components with real long labels, disabled/loading/error states, missing avatars, wrapping content and large text. Use it to settle size/icon/provider behavior before rebuilding all screens. |
| Product compositions | `AppScreen`, `ScreenHeader`, settings/account/report rows, status badge, offline/cache indicator, empty/error panel, filter bar, evidence attachment, form field, sheet and timeline. Give these one consistent grammar. |
| State matrix | Initial load, stale cached content, refresh, empty, no matches, network failure, auth expiry, account switch, permission denial, draft validation, queued submission, retry, successful submission and optional/unsupported API fields. |
| Complete screen prototypes | Design the route set below in small and large text, light/dark, narrow phones and platform keyboard states. Review a complete reporting journey before implementation of all screens. |
| Component-to-design map | Each approved design component names its copied Panel source and ALEConnect composition. If Figma is used, verify it against the selected source version instead of assuming an existing library has complete parity. |

### Route-by-route rebuild map

| Current route / surface | New presentation direction to prototype | Rules to carry forward |
| --- | --- | --- |
| `/sign-in` | Calm account/email mode form: Field/InputGroup, clear password reveal and loading/error feedback | Existing consumer-only authentication and session rules; no new registration or OTP flow. |
| `/email-setup` | Steps with clear form/review/complete states | Existing email credential setup/linking contract and validation. |
| `/home` | Clear service actions, report/status entry and readable public updates | Existing account context, public feed and refresh behavior; no invented billing data. |
| `/reports` | Report creation action and status/archive summary | Existing server-projected report data and account context. |
| `/reports/new` | Fresh step-based flow: issue -> account/location -> details/evidence -> review -> result | Existing five-state workflow, validation, account reset and durable submission. Map/evidence remain progressive tools subject to real category requirements. |
| `/reports/list` | Search/filter Chips and Item/Card rows; understandable saved/queued work states | Virtualization/paging, queue ownership, retry/delete and confirmations. |
| `/reports/[id]` | Readable summary, status, location/evidence and Timeline | Status-model compatibility, public updates, real references/time and refresh. |
| `/hotlines` | Obvious urgent call path, searchable category/contact rows and focused sheets | Existing numbers/categories, offline cache and dial/copy actions. |
| `/advisories`, `/advisory/[id]` | Clear feed/detail with interruption periods, public urgency and photos | Targeted/cached visibility, publication vs interruption/restoration dates and null fields. |
| `/notifications` | Grouped Item rows, readable unread state, search/filter and explicit empty states | Existing notification destinations, pagination and response-consumption behavior. |
| `/profile` | Consistent account identity/header, grouped settings and visible help/sign-out | Theme preference, active account and existing external destinations. |
| `/profile/details` | Read-only Item rows plus focused edit sheets | Editable field rules, avatar processing, address/coordinate integrity and saved drafts. |
| `/profile/accounts`, `/profile/link-account` | Clear linked-account list, current/default state and request feedback | Server authority, pending/approved/rejected linkage and account-session invalidation. |
| `/profile/change-password` | Focused secure fields, validation and completion feedback | Existing credential API and error handling. |
| `/profile/push-notifications` | Switch rows, grouped indeterminate Checkboxes and clear save/offline states | Consumer preference payloads, identity scoping and distinction from OS permissions. |
| Compatibility routes `/`, `/report/[id]`, `/reports/queue`, `/notification-settings`; nested layouts | Preserve/explicitly adapt routing wrappers | Existing authenticated entry, report push destinations, queue redirect and notification-settings alias; do not delete because their main screen was redesigned. |

### Delivery order

1. **Baseline and design:** capture rendered current journeys and state behavior, select visual/IA direction, review wireframes and a complete report prototype. Retain current data contracts and record measured performance baseline.
2. **Foundation pilot:** in an isolated mobile worktree, snapshot selected registry source, add a minimal component set, build theme/gallery and reconcile providers. Validate sign-in plus one sheet/form as the pilot.
3. **Shared compositions:** migrate text/actions/fields/rows/status/search/states; convert retained native/web UI scaffolding. Rebuild navigation and route chrome after the IA decision.
4. **Consumer workflows:** rebuild report flow/list/detail first, then Home/Updates/Notifications, Hotlines, Profile/linked accounts/preferences. Carry existing service controllers through the new presentation.
5. **Optional capabilities:** prototype Sketch, advanced searchable selectors, timeline animation or richer headers only where accepted. Any new server/media/verification capability needs a separate Staff/mobile contract task.
6. **Dependency retirement:** remove GlueStack and Gorhom when all source/config paths are converted; consolidate icons and remove Feather's plugin. Resolve lockfile with Expo-compatible versions and run the complete gates.
7. **Acceptance and release preparation:** verify installed Android/iOS behavior, accessibility and measured performance; prepare scoped commits/release and rollback evidence when release work is authorized.

## 8. Risks and acceptance gates

| Area | Required evidence before migration is accepted |
| --- | --- |
| Token/styling pipeline | Both themes resolve all selected tokens; correct CSS source paths; text-muted collision fixed; fonts and icons render; theme preference survives restart. |
| Provider/overlay behavior | A single working portal/toast/keyboard host; auth/account/queue state preserved; screen-reader modal isolation, Android back and focus restoration work. |
| Sheets | Profile/hotline/location close/reopen, unsaved draft cancellation, keyboard, nested gestures and scroll behavior; styled vs native choices explicit. Gorhom removal waits for this evidence. |
| Forms/accounts | Current validators, category branching, required evidence/location, account-change resets, submit locking, errors and credentials remain correct. |
| Offline/replay | Real queued/sent/failed states; account-scoped cache and evidence; sign-out/account switch never retargets old work; server replay/idempotency behavior preserved. |
| Maps | Existing style/attribution/provider setup and bounds validation retained; lazy loading, timeout, unavailable native module, web fallback, permission/accuracy, `[longitude, latitude]` conversion verified. Panel Map's default basemap must not silently replace the configured source. |
| Images/Sketch | Real image URI/signed media failures and expiry, caching, viewer indexing/close, processing/size limits and local-file lifecycle. Sketch raster integration remains unverified. |
| Navigation/push | Current and transitioned routes, nested tab state, deep links, notification taps, account-link approvals and forced logout. Native tab selection is a design/runtime decision separate from Panel Tabs. |
| Accessibility | TalkBack/VoiceOver, large text, long labels, contrast, minimum 48dp interactive targets, no colour-only status, reduced motion, accessible alternatives to slide/hold gestures. |
| Performance | Same-device release measurements of startup, sheets, report input, list scrolling, memory and bundle/native size. No comparative speed claim until measured. |
| Tooling/native | Focused regressions, full `npm test`, `npm run typecheck`, `npm run lint`, `npm run harness:check`, Expo alignment/Doctor, Android/iOS exports and relevant native builds/device checks on `.node-version`. |

Reuse relevant existing tests, including `report-queue*`, `report-multi-account`, `report-location-integrity`, `report-evidence-picker`, `evidence-image-processing`, `consumer-account*`, `auth-*`, `hotlines-*`, `profile-*`, `notification-*`, `map-*`, and `expo-router-routes`. Update source-structure/theme assertions that legitimately describe the old UI while retaining their behavior/security intent. Do not weaken contract checks merely to make the redesign pass.

Rollback should restore a coherent UI/config/package/lock snapshot, while preserving device-owned queued reports/evidence and consumer identity. Provider/native dependency changes need rebuilt clients; an OTA/source rollback is not assumed sufficient for native changes. Preserve app identifiers, signing and installed-device data throughout preparation.

## 9. Audit evidence and limits

Primary local evidence: [package manifest](../package.json), [dependency lock](../package-lock.json), [UI directory](../src/components/ui), [root layout](../src/app/_layout.tsx), [feature components](../src/features), [global tokens](../global.css), [Metro config](../metro.config.js), [runtime policy](agent-harness/runtime.md), and [product brief](../PRODUCT.md).

Published Panel source was downloaded for inspection into a temporary audit directory, without app installation. Its SHA-512 matched npm's declared integrity. Component APIs were checked against `panelui-native@0.105.0`; current docs and registry were checked separately. See [the audited tarball](https://registry.npmjs.org/panelui-native/-/panelui-native-0.105.0.tgz), [CLI documentation](https://panelui.dev/docs/cli), and [registry](https://panelui.dev/r/index.json). Package and registry source must be rechecked before implementation because the latter is live.

Representative SHA-256 hashes of fetched registry JSON:

| Item | Hash |
| --- | --- |
| `panel-ui-provider` | `dea5ec35c567e1329a64c557c644faeb85987930e2b5d78ac51e0ec26fd63fc9` |
| `button` | `9106837f33320b11e0d3e4a35020f10ceff5f162bc927ec53e5269a51a306e45` |
| `bottom-sheet` | `30b8ecc32bff989ad117e5f517e3cec144510f4158a0bf19600204dfdd553cfc` |
| `attachment` | `ed68692c1d988053fc05ed23a842bb3c0d1568b0ab1ab6ac8765b39aab24ec58` |
| `image-viewer` | `0d95a8b1ae4d11e9d975f8c3dc20eeebcb214ce973bae84d267e0bfbad9b9ade` |
| `icons` | `124bb718f425a20fea5c6a1d818c318ea2e05c0592d1bb8381df9fbc045116fb` |

**Verified:** source/component import inventory, all direct dependency dispositions, published package API/dependency inspection and integrity, proposed registry dependency closure, current product/runtime/handoff boundaries. Documentation validation results are recorded in [the task handoff](agent-harness/tasks/mobile-panelui-rebuild.md).

**Unverified:** Panel installation/compilation inside ALEConnect, runtime/native peer behavior, Android/iOS/web rendering, device accessibility, comparative speed, final visual direction and new Sketch/media features. This audit establishes a migration plan, not completed migration or visual acceptance.
