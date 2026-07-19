import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL("../src/app", import.meta.url));

async function routeFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const file = path.join(directory, entry.name);
      return entry.isDirectory()
        ? routeFiles(file)
        : entry.name.endsWith(".tsx")
          ? [file]
          : [];
    }),
  );
  return files.flat();
}

test("every Expo Router screen exports a default component", async () => {
  for (const file of await routeFiles(appRoot)) {
    const source = await readFile(file, "utf8");
    assert.match(source, /export default/, path.relative(appRoot, file));
  }
});
