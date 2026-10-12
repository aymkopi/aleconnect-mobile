import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { compile } from "@tailwindcss/node";
import ts from "typescript";
import { tv } from "tailwind-variants";

const root = new URL("../", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
test("native font weights resolve to bundled Inter faces without synthetic font-weight", async () => {
  const css = await readFile(new URL("../global.css", import.meta.url), "utf8");
  const theme = css.match(/@theme static\s*\{[^}]+\}/)?.[0];
  assert.ok(theme, "app font theme exists");
  const compiler = await compile('@import "tailwindcss";\n' + theme, {
    base: root,
    onDependency() {},
  });
  const output = compiler.build([
    "font-normal",
    "font-medium",
    "font-semibold",
    "font-bold",
  ]);
  for (const [weight, face] of [
    ["normal", "Inter_400Regular"],
    ["medium", "Inter_500Medium"],
    ["semibold", "Inter_600SemiBold"],
    ["bold", "Inter_700Bold"],
  ]) {
    const declarations = output.match(
      new RegExp("\\.font-" + weight + "\\s*\\{([^}]+)\\}"),
    )?.[1];
    assert.ok(declarations, weight + " utility exists");
    assert.match(
      declarations,
      /font-family:/,
      weight + " selects an actual face",
    );
    assert.ok(output.includes(face), face + " is bundled");
    assert.doesNotMatch(
      declarations,
      /font-weight:/,
      weight + " does not synthesize weight",
    );
  }
});

test("Text preserves caller typography and RTL while class variants select the face", async () => {
  const source = await readFile(
    new URL("../src/components/panelui/text.tsx", import.meta.url),
    "utf8",
  );
  const exports = {};
  const mocks = {
    react: { forwardRef: (render) => render },
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }) },
    "react-native": { Text: "Text" },
    "tailwind-variants": { tv },
    "@/hooks/use-direction": { useDirection: () => "rtl" },
  };
  new Function(
    "require",
    "exports",
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
  )((id) => mocks[id] ?? {}, exports);
  const callerStyle = {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 25,
    lineHeight: 31,
  };
  const rendered = exports.Text({
    className: "font-medium",
    style: callerStyle,
    children: "Magandang umaga",
  });
  assert.equal(rendered.props.style[0].writingDirection, "rtl");
  assert.equal(
    rendered.props.style[0].fontFamily,
    undefined,
    "inline default must not override utility fonts",
  );
  assert.equal(rendered.props.style[1], callerStyle);
  assert.match(rendered.props.className, /font-medium/);
});
