import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import { inspectWorktree } from "../scripts/check-agent-worktree.mjs"

function fixture(t, name = "aleconnect") {
  const root = mkdtempSync(join(tmpdir(), "aleconnect-worktree-"))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  writeFileSync(join(root, "package.json"), JSON.stringify({ name }))
  writeFileSync(join(root, "package-lock.json"), "{}")
  execFileSync("git", ["init"], { cwd: root, stdio: "pipe" })
  execFileSync("git", ["-c", "user.name=Harness test", "-c", "user.email=test@example.invalid", "commit", "--allow-empty", "-m", "fixture"], { cwd: root, stdio: "pipe" })
  return root
}

test("docs diagnostics require no app dependencies and preserve files", (t) => {
  const root = fixture(t)
  const before = readdirSync(root)
  writeFileSync(join(root, ".env.local"), "unread-secret-fixture")
  const result = inspectWorktree({ root, nodeVersion: "24.0.0" })
  assert.deepEqual(result.errors, [])
  assert.ok(result.warnings.some((message) => message.includes("sibling")))
  assert.deepEqual(readdirSync(root).sort(), [...before, ".env.local"].sort())
  assert.equal(readFileSync(join(root, ".env.local"), "utf8"), "unread-secret-fixture")
  assert.ok(!JSON.stringify(result).includes("unread-secret-fixture"))
})

test("app diagnostics reject incompatible Node and missing local tools", (t) => {
  const root = fixture(t)
  const result = inspectWorktree({ root, app: true, nodeVersion: "24.0.0" })
  assert.ok(result.errors.some((message) => message.includes("Node 22")))
  assert.equal(result.errors.filter((message) => message.includes("Missing local")).length, 2)
})

for (const name of ["aleconnect", "aleconnect-mobile", "aleconnect-lineman"]) {
  test("app diagnostics accept the local toolchain for " + name, (t) => {
    const root = fixture(t, name)
    const tools = name === "aleconnect" ? ["vite/bin/vite.js", "typescript/bin/tsc"] : ["expo/bin/cli", "typescript/bin/tsc"]
    for (const tool of tools) {
      const path = join(root, "node_modules", tool)
      mkdirSync(join(path, ".."), { recursive: true })
      writeFileSync(path, "fixture")
    }
    assert.deepEqual(inspectWorktree({ root, app: true, nodeVersion: "22.23.2" }).errors, [])
  })
}

test("an explicit sibling must be the contract owner", (t) => {
  const root = fixture(t, "aleconnect-mobile")
  const sibling = fixture(t, "aleconnect-lineman")
  assert.ok(inspectWorktree({ root, sibling }).errors.some((message) => message.includes("Expected aleconnect sibling")))
  writeFileSync(join(sibling, "package.json"), JSON.stringify({ name: "aleconnect" }))
  mkdirSync(join(sibling, "docs/agent-harness"), { recursive: true })
  writeFileSync(join(sibling, "docs/agent-harness/cross-project-contracts.md"), "contract")
  assert.deepEqual(inspectWorktree({ root, sibling }).errors, [])
})
