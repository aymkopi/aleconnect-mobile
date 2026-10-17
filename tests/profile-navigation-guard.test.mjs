import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(new URL("../src/features/profile/details-screen.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("details.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let removalEffect;
function visit(node) {
  if (ts.isCallExpression(node) && node.expression.getText(ast) === "useEffect" && node.arguments[0]?.getText(ast).includes('addListener("beforeRemove"')) removalEffect = node.arguments[0].getText(ast);
  ts.forEachChild(node, visit);
}
visit(ast);
assert.ok(removalEffect, "Account information removal guard exists");
for (const scenario of [
  { view: "edit", changes: false, busy: false, blocked: false, nested: false },
  { view: "edit", changes: true, busy: false, blocked: true, nested: true },
  { view: "location", changes: false, busy: false, blocked: true, nested: true },
  { view: "review", changes: false, busy: false, blocked: true, nested: true },
  { view: "edit", changes: true, busy: true, blocked: true, nested: false },
  { view: "info", changes: true, busy: false, blocked: false, nested: false },
  { view: "saved", changes: true, busy: false, blocked: false, nested: false },
]) test("Account information removal: " + JSON.stringify(scenario), () => {
  let handler, removed = false, prevented = false, nestedCalls = 0;
  const navigation = { addListener(event, callback) { assert.equal(event, "beforeRemove"); handler = callback; return () => { removed = true; }; } };
  const exit = () => {
    if (!scenario.nested) throw new Error("Recursive router.back() would crash the native navigator");
    nestedCalls++;
  };
  const cleanup = new Function("navigation", "busy", "view", "changes", "exit", "return (" + removalEffect + ")();")(navigation, scenario.busy, scenario.view, scenario.changes, exit);
  handler({ preventDefault() { prevented = true; } });
  assert.equal(prevented, scenario.blocked);
  assert.equal(nestedCalls, Number(scenario.nested));
  cleanup();
  assert.equal(removed, true);
});

const linkSource = await readFile(new URL("../src/features/profile/link-account-screen.tsx", import.meta.url), "utf8");
const linkAst = ts.createSourceFile("link.tsx", linkSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let linkBack;
function findBack(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === "back") linkBack = node.getText(linkAst); ts.forEachChild(node, findBack); }
findBack(linkAst);
assert.ok(linkBack);
for (const scenario of [
  { view: "form", password: "secret-only", busy: false, expected: "discard" },
  { view: "form", password: "", busy: false, expected: "leave" },
  { view: "review", password: "secret", busy: false, expected: "form" },
  { view: "form", password: "secret", busy: true, expected: "blocked" },
  { view: "verify", password: "", currentPassword: "sign-in secret", busy: false, expected: "discard" },
  { view: "verify", password: "", busy: false, expected: "leave" },
]) test("Link-account Back: " + scenario.expected + "/" + scenario.password, () => {
  let outcome = "blocked", cleared = false;
  const router = { canGoBack: () => true, back: () => { outcome = "leave"; } };
  let currentCleared = false;
  const callback = new Function("busy", "view", "number", "name", "password", "currentPassword", "setPassword", "setCurrentPassword", "setView", "setDiscard", "router", linkBack + "; return back;")(scenario.busy, scenario.view, "", "", scenario.password, scenario.currentPassword ?? "", () => { cleared = true; }, () => { currentCleared = true; }, value => { outcome = value; }, () => { outcome = "discard"; }, router);
  callback();
  assert.equal(outcome, scenario.expected);
  assert.equal(cleared, !scenario.busy);
  assert.equal(currentCleared, !scenario.busy);
});
