import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("native bearer tokens use SecureStore with legacy token migration", async () => {
  const [api, appConfig, packageJson] = await Promise.all([
    read("src/services/api.ts"),
    read("app.json"),
    read("package.json"),
  ]);

  assert.match(api, /expo-secure-store/);
  assert.match(api, /Platform\.OS === "web"/);
  assert.match(api, /AsyncStorage\.removeItem\(authTokenKey\)/);
  assert.match(api, /SecureStore\.setItemAsync/);
  assert.match(api, /SecureStore\.deleteItemAsync/);
  assert.match(appConfig, /expo-secure-store/);
  assert.match(appConfig, /"allowBackup":\s*false/);
  assert.match(packageJson, /expo-secure-store/);
});
