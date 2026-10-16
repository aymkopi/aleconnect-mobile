import { readFileSync } from "node:fs";
import ts from "typescript";
import { claimManualRefresh } from "../src/utils/manual-refresh.ts";

const source = ts.transpileModule(readFileSync(new URL("../src/hooks/use-manual-refresh.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
let harnessId = 0;
export function manualRefreshHarness(react, { now = Date.now, onToast = () => {} } = {}) {
  const exports = {}, prefix = `harness-${++harnessId}:`;
  const modules = {
    react: { useCallback: (fn) => fn, ...react },
    "@/components/panelui/toast": { toast: { show: onToast } },
    "@/utils/manual-refresh": { claimManualRefresh: key => claimManualRefresh(prefix + key, now()) },
  };
  new Function("require", "exports", source)(id => modules[id], exports);
  return exports;
}
