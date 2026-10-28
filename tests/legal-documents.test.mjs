import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("bundled legal documents preserve the selected application text without company review notes", async () => {
  const documents = JSON.parse(await readFile(new URL("../src/features/legal/legal-documents.json", import.meta.url), "utf8"));
  const expected = {
    privacy: ["Privacy Policy", 130, 16, "6e3cf71bc0db9960a75571323ae7e1c6f2e1cd3fc7636b38bc52d82dd7f500d6"],
    terms: ["Terms of Use", 99, 21, "8e74718bbd0daa78213fb9cd8e1f0d943a73d3240d37406f9357f3e5d5fdc3ca"],
  };
  assert.deepEqual(Object.keys(documents).sort(), ["privacy", "terms"]);
  for (const [key, [title, count, sections, digest]] of Object.entries(expected)) {
    const document = documents[key];
    assert.equal(document.title, title);
    assert.equal(document.blocks.length, count);
    assert.deepEqual(document.blocks.filter(block => block.type === "heading").map(block => Number(block.text.match(/^\d+/)?.[0])), Array.from({ length: sections }, (_, index) => index + 1));
    const text = document.blocks.map(block => {
      assert.ok(["heading", "subheading", "paragraph", "bullet"].includes(block.type));
      assert.ok(block.text.trim());
      return block.text;
    }).join("\n");
    assert.equal(createHash("sha256").update(text).digest("hex"), digest, "The selected legal text changed; confirm the replacement version before updating this digest.");
    assert.doesNotMatch(text, /Part Three|\[Insert|\[Confirm|before publication|in this draft/i);
  }
});

test("closing the legal reader returns once and never navigates again on route blur", async () => {
  const source = await readFile(new URL("../src/features/legal/legal-document-screen.tsx", import.meta.url), "utf8");
  const documents = JSON.parse(await readFile(new URL("../src/features/legal/legal-documents.json", import.meta.url), "utf8"));
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  for (const [focused, canGoBack, returnToReport, expected] of [
    [true, true, true, ["back"]],
    [false, true, true, []],
    [true, false, true, ["/reports"]],
    [true, false, false, ["/profile"]],
  ]) {
    const calls = [];
    const exports = {};
    const jsx = (type, props) => ({ type, props });
    const modules = {
      "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
      react: { useRef: value => ({ current: value }), useState: value => [value, () => {}], useCallback: callback => callback, useEffect: () => {} },
      "react-native": { Platform: { OS: "android" } },
      "expo-router": { Stack: { Screen: "Screen" }, useNavigation: () => ({ isFocused: () => focused }), useRouter: () => ({ canGoBack: () => canGoBack, back: () => calls.push("back"), replace: path => calls.push(path) }) },
      "@/components/panelui/bottom-sheet": { BottomSheet: { Content: "Content", Header: "Header", Body: "Body", Footer: "Footer" } },
      "@/components/panelui/button": { Button: "Button" },
      "@/components/panelui/text": { Text: "Text" },
      "./legal-documents.json": documents,
    };
    vm.runInNewContext(compiled, { exports, require: id => { assert.ok(id in modules, id); return modules[id]; } });
    const screen = exports.LegalDocumentScreen({ kind: "terms", returnToReport });
    assert.equal(screen.props.children[0].props.options.presentation, "card", "Native navigation must keep the root sheet portal in the same window.");
    const sheet = screen.props.children[1];
    sheet.props.onOpenChange(true);
    assert.deepEqual(calls, []);
    sheet.props.onOpenChange(false);
    sheet.props.onOpenChange(false);
    assert.deepEqual(calls, expected);
  }
});
