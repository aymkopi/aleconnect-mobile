import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8")

test("Public Updates uses the additive endpoint and private cache", async () => {
  const service = await read("src/services/public-updates.ts")
  assert.match(service, /\/api\/mobile\/public-updates/)
  assert.match(service, /public_updates_cache_v1/)
  assert.match(service, /5 \* 60 \* 1000/)
  assert.match(service, /24 \* 60 \* 60 \* 1000/)
  assert.match(service, /ApiRequestError/)
  assert.match(service, /fetchActiveAdvisories/)
})
