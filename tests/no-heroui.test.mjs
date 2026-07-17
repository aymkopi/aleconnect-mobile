import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? sourceFiles(entryPath) : [entryPath];
    }),
  );
  return files.flat();
}

test("HeroUI Native is absent from runtime source and dependencies", async () => {
  const files = [
    ...(await sourceFiles(path.join(root, "src"))),
    path.join(root, "global.css"),
    path.join(root, "package.json"),
  ];
  const contents = await Promise.all(files.map((file) => readFile(file, "utf8")));

  assert.doesNotMatch(contents.join("\n"), /heroui-native|HeroUINativeProvider/i);
});
