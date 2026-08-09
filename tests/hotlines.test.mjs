import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

test("public contacts retain cached agency avatars and explicit contact groups", async () => {
  const [service, screen] = await Promise.all([
    readFile(new URL("../src/services/hotlines.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/(tabs)/hotlines.tsx", import.meta.url), "utf8"),
  ])

  assert.match(service, /hotlines_cache_v4/)
  assert.match(service, /Hotline\/Emergency/)
  assert.match(service, /Other service contacts/)
  assert.match(screen, /AvatarImage/)
  assert.match(screen, /Hotline\/Emergency/)
  assert.match(screen, /Other service contacts/)
})
