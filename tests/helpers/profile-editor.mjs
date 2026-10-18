import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

export const nodes = tree => !tree || typeof tree !== "object" ? [] : Array.isArray(tree) ? tree.flatMap(nodes)
  : [tree, ...nodes(tree.props?.children), ...nodes(tree.props?.footer)];
export const field = (tree, label) => nodes(tree).find(n => n.type === "Field" && n.props.label === label);
export const button = (tree, label) => nodes(tree).find(n => n.type === "Button" && n.props.children === label);
export async function profileEditor(t, options = {}) {
  let cursor = 0, current = true, photoAttempts = 0;
  const slots = [], effects = [], calls = [], routes = [], verificationCalls = [];
  let profile = { profileId: "service-b", fullName: "Test Person", accountNumber: "222", contactNum: "09171234567",
    email: "signin@example.com", serviceAccountEmail: "home@example.com", serviceAccountEmailEditable: true,
    avatarUrl: "https://assets.example/old", serviceType: "RM", fullAddress: "Rawis, Legazpi City",
    profileEditing: { version: 1, activeReportCount: 2 }, ...options.profile };
  const react = {
    useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = typeof value === "function" ? value() : value;
      return [slots[i], next => { slots[i] = typeof next === "function" ? next(slots[i]) : next; }]; },
    useRef(value) { const i = cursor++; return slots[i] ?? (slots[i] = { current: value }); },
    useCallback(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((v,j) => !Object.is(v,slots[i].deps[j]))) slots[i] = { fn, deps }; return slots[i].fn; },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((v, j) => !Object.is(v, slots[i].deps[j])))
      effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); },
  };
  const part = (name, parts) => Object.assign(() => null, Object.fromEntries(parts.map(p => [p, name + "." + p])));
  const jsx = (type, props) => ({ type, props });
  const reload = async () => {};
  const state = await import("../../src/features/profile/profile-state.ts");
  const mocks = {
    react, "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
    "react-native": { View: "View", Linking: { openSettings: async () => calls.push(["settings"]) } },
    "expo-router": { useRouter: () => ({ canGoBack: () => true, back: () => routes.push("back"), replace: v => routes.push(v) }),
      useNavigation: () => ({ addListener: () => () => {} }), useFocusEffect: fn => react.useEffect(fn, [fn]), useLocalSearchParams: () => ({}) },
    "lucide-react-native": { Camera: "Camera", Mail: "Mail", MapPin: "MapPin", Phone: "Phone", X: "X" },
    "@/components/panelui/avatar": { Avatar: part("Avatar", ["Badge"]) },
    "@/components/panelui/file-upload": { FileUpload: part("FileUpload", ["Trigger"]) },
    "@/components/panelui/button": { Button: "Button" }, "@/components/panelui/text": { Text: "Text" },
    "@/components/panelui/dialog": { Dialog: part("Dialog", ["Content", "Title", "Description", "Footer"]) },
    "@/components/panelui/field": { Field: part("FieldGroup", ["Label"]) },
    "@/components/panelui/select": { Select: part("Select", ["Item"]) },
    "@/components/data-state": { DataState: "DataState", DataNotice: "DataNotice" },
    "@/features/reports/components/report-page": { ReportPage: "Page" },
    "@/features/maps/report-location-picker": { ReportLocationPicker: "MapPicker" },
    "@/hooks/use-scoped-read": { useScopedRead: () => ({ data: profile, busy: false, error: null, reload }) },
    "@/hooks/use-consumer-account": { useConsumerAccount: () => ({ refreshConsumerAccount: async () => {} }) },
    "@/hooks/use-auth-session": { useAuthSession: () => ({ session: { user: { email: "signin@example.com" } } }) },
    "@/hooks/use-app-colors": { useAppColors: () => ["primary", "white", "foreground"] },
    "@/services/linked-accounts": {}, "@/services/api": { getAuthToken: async () => "pinned-session",
      ApiRequestError: class extends Error { constructor(message, code) { super(message); this.code = code; } } },
    "@/services/auth": { requestAccountVerification: async (purpose, body, authToken) => {
      verificationCalls.push({ purpose, body, authToken });
      assert.equal(purpose, "profile-edit"); assert.equal(body.serviceAccountId, "service-b"); assert.equal(body.accessRevision, 7);
      if (body.action === "verify" && options.verificationError) throw Error(options.verificationError);
      return { state: body.action === "verify" ? "verified" : "verify", flowId: "profile-proof", serverNow: new Date().toISOString(),
        verificationExpiresAt: new Date(Date.now() + 300000).toISOString() };
    } },
    "@/hooks/use-consumer-profile": { clearConsumerProfileCaches: async () => calls.push(["cache"]) },
    "@/services/profile": { fetchCurrentConsumerProfileView: async () => profile,
      updateVerifiedConsumerDetails: async (...args) => { calls.push(["details", ...args]);
        if (options.detailsError) throw options.detailsError instanceof Error ? options.detailsError : Error(options.detailsError);
        profile = { ...profile, contactNum: args[0].phone ?? profile.contactNum,
          serviceAccountEmail: args[0].serviceAccountEmail ?? profile.serviceAccountEmail }; return profile; },
      uploadCurrentUserAvatar: async (...args) => { calls.push(["photo", ...args]);
        if (options.photoError && photoAttempts++ === 0) throw Error("Upload unavailable"); return "https://assets.example/new"; } },
    "@/services/reports": {}, "@/features/reports/creation-fixtures": { creationFixtureMeta: {} },
    "@/features/reports/data": { emptyComplaintMeta: { barangays: [], municipalities: [] } },
    "@/features/reports/address": { readReportCoordinates: () => null }, "@/features/reports/contract": { isWithinAlbay: () => true },
    "@/utils/avatar-image-processing": { compressAvatarToStrictLimit: async uri => { calls.push(["compress", uri]);
      return options.compress ? options.compress() : new ArrayBuffer(4); } },
    "@/lib/account-class": { formatAccountClass: value => value === "RM" ? "Residential Mainland" : value },
    "./profile-ui": { ProfileGate: "Gate", ProfileHeading: "Heading", ProfileNotice: "Notice", ProfileField: "Field",
      DetailRow: "Row", useProfileTask: () => () => current }, "./profile-fixtures": {}, "./profile-state": state,
  };
  const gateSource = await readFile(new URL("../../src/features/profile/account-password-verification.tsx", import.meta.url), "utf8");
  const gate = {};
  new Function("require", "exports", ts.transpileModule(gateSource, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText)(id => { assert.ok(id in mocks, id); return mocks[id]; }, gate);
  mocks["./account-password-verification"] = gate;
  const source = await readFile(new URL("../../src/features/profile/details-screen.tsx", import.meta.url), "utf8");
  const exports = {};
  new Function("require", "exports", ts.transpileModule(source.replace("function Details(", "export function Details("),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText)(
      id => { assert.ok(id in mocks, id); return mocks[id]; }, exports);
  const identity = { key: "identity:revision7", fixture: false, account: { sessionMode: "identity", accessRevision: 7,
    defaultServiceAccountId: "service-a", authorizedServiceAccountIds: ["service-a", "service-b"], accounts: [{ id: "service-b" }] } };
  const render = () => { cursor = 0; const tree = exports.Details({ identity, requested: "service-b", locked: false });
    while (effects.length) effects.shift()(); return tree; };
  const verify = async () => { await new Promise(resolve => setImmediate(resolve));
    // The hook's own field component is rendered by React in the application.
    let tree = render(), fields = nodes(tree).find(n => n.type === gate.AccountPasswordVerificationFields);
    fields.props.verification.setPassword("sign-in-secret"); tree = render();
    button(tree, "Verify and continue").props.onPress(); await new Promise(resolve => setImmediate(resolve)); return render(); };
  t.after(() => slots.forEach(slot => slot?.cleanup?.()));
  render();
  return { render, calls, routes, verificationCalls, verify, ApiRequestError: mocks["@/services/api"].ApiRequestError,
    setCurrent: value => { current = value; },
    start: async () => { button(render(), "Edit profile").props.onPress(); render(); return verify(); } };
}
