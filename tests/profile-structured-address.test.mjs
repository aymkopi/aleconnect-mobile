import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("profile address mutation sends one structured owner-scoped payload", async () => {
  const [service, model, hook] = await Promise.all([
    read("src/services/profile.ts"),
    read("src/models/consumer-profile-view.ts"),
    read("src/hooks/use-consumer-profile.ts"),
  ]);

  assert.match(service, /StructuredProfileAddressInput/);
  assert.match(service, /field:\s*"address"/);
  assert.match(service, /municipalityCode/);
  assert.match(service, /barangayPsgc/);
  assert.match(service, /landmark/);
  assert.match(service, /latitude/);
  assert.match(service, /longitude/);
  assert.match(model, /readonly municipalityCode/);
  assert.match(model, /readonly barangayPsgc/);
  assert.match(model, /readonly landmark/);
  assert.match(hook, /setProfileView/);
});
