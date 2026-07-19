import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import ts from "typescript";

test("failed refresh returns the persisted stale hotline cache", async () => {
  const source = await readFile(
    new URL("../src/services/hotlines.ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const cached = {
    fetchedAt: Date.now() - 24 * 60 * 60 * 1000 - 1,
    value: { categories: [{ id: "emergency" }] },
  };
  const module = { exports: {} };

  Function("require", "module", "exports", compiled)(
    (specifier) => {
      if (specifier === "@react-native-async-storage/async-storage") {
        return {
          __esModule: true,
          default: {
            getItem: async () => JSON.stringify(cached),
            setItem: async () => {},
          },
        };
      }
      if (specifier === "@/services/api") {
        return {
          apiRequest: async () => {
            throw new Error("offline");
          },
        };
      }
      throw new Error(`Unexpected import: ${specifier}`);
    },
    module,
    module.exports,
  );

  const result = await module.exports.fetchHotlines({ force: true });

  assert.deepEqual(result, cached.value);
});
