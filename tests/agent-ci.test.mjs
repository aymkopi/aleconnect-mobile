import assert from "node:assert/strict"
import test from "node:test"
import { execFileSync } from "node:child_process"
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { requiresAppChecks, selectCiBase, runAgentCi } from "../scripts/run-agent-ci.mjs"

const sha = "a".repeat(40)
test("docs and harness edits skip app checks; mixed and unknown paths require them", () => {
  assert.equal(requiresAppChecks(["AGENTS.md", "docs/agent-harness/tasks/a.md", ".agents/skills/a/SKILL.md", "scripts/run-agent-ci.mjs", "tests/agent-ci.test.mjs"]), false)
  for (const path of ["src/app.tsx", "api/data.ts", "package-lock.json", ".github/workflows/agent-harness.yml", "app.json", "android/build.gradle", "scripts/deploy.mjs", "tests/report.test.ts", "unknown-file"]) {
    assert.equal(requiresAppChecks(["docs/README.md", path]), true, path)
  }
})
test("PR and push use the available event base without fetching", () => {
  for (const eventName of ["push", "pull_request"]) {
    assert.deepEqual(selectCiBase({ eventName, baseSha: sha }, { hasCommit: () => true, fetchCommit: () => assert.fail("unexpected fetch") }), { base: sha, fullCheck: false })
  }
})
test("missing previous commit is fetched before comparison", () => {
  let fetched = false
  const plan = selectCiBase({ eventName: "push", baseSha: sha }, { hasCommit: () => fetched, fetchCommit: (value) => { assert.equal(value, sha); fetched = true } })
  assert.deepEqual(plan, { base: sha, fullCheck: false })
})
test("unreachable previous commit forces full checks even if a parent exists", () => {
  const plan = selectCiBase({ eventName: "push", baseSha: sha }, { hasCommit: (value) => value === "HEAD~1", fetchCommit: () => {} })
  assert.deepEqual(plan, { base: "HEAD~1", fullCheck: true })
})
test("root, manual and zero-base events force full checks", () => {
  for (const options of [{ eventName: "workflow_dispatch", baseSha: sha }, { eventName: "push", baseSha: "0".repeat(40) }, { eventName: "push" }]) {
    assert.deepEqual(selectCiBase(options, { hasCommit: () => assert.fail("unexpected lookup") }), { base: undefined, fullCheck: true })
  }
  assert.deepEqual(selectCiBase({ eventName: "push", baseSha: sha }, { hasCommit: () => false, fetchCommit: () => {} }), { base: undefined, fullCheck: true })
})
test("invalid base fails instead of silently weakening validation", () => {
  assert.throws(() => selectCiBase({ eventName: "push", baseSha: "--help" }, {}), /full Git commit SHA/)
})

test("real Git diffs publish app decisions only after validation succeeds", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "aleconnect-agent-ci-"))
  t.after(() => rm(root, { recursive: true, force: true }))
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: "pipe" }).trim()
  git("init")
  git("config", "user.name", "Harness CI test")
  git("config", "user.email", "ci-test@example.invalid")
  await mkdir(join(root, "scripts"))
  await mkdir(join(root, "tests"))
  await mkdir(join(root, "docs"))
  await writeFile(join(root, "scripts/validate-agent-harness.mjs"), "process.exitCode = 0\n")
  await writeFile(join(root, "tests/agent-fixture.test.mjs"), "import test from 'node:test'; test('fixture', () => {})\n")
  git("add", ".")
  git("commit", "-m", "fixture")
  const baseSha = git("rev-parse", "HEAD")
  await writeFile(join(root, "docs/a.md"), "Documentation\n")
  git("add", ".")
  git("commit", "-m", "docs")
  const output = join(root, "output")
  assert.equal(runAgentCi(root, { GITHUB_EVENT_NAME: "push", BASE_SHA: baseSha, GITHUB_OUTPUT: output }).appChanged, false)
  assert.equal(await readFile(output, "utf8"), "app_changed=false\n")
  await writeFile(join(root, "app.json"), "{}\n")
  git("add", "app.json")
  git("commit", "-m", "product")
  assert.equal(runAgentCi(root, { GITHUB_EVENT_NAME: "push", BASE_SHA: baseSha, GITHUB_OUTPUT: output }).appChanged, true)
  assert.equal(await readFile(output, "utf8"), "app_changed=false\napp_changed=true\n")
  const productBase = git("rev-parse", "HEAD")
  git("mv", "app.json", "docs/app.json")
  git("commit", "-m", "move product file into docs")
  assert.equal(runAgentCi(root, { GITHUB_EVENT_NAME: "push", BASE_SHA: productBase, GITHUB_OUTPUT: output }).appChanged, true)
  const expectedOutput = "app_changed=false\napp_changed=true\napp_changed=true\n"
  assert.equal(await readFile(output, "utf8"), expectedOutput)
  await writeFile(join(root, "scripts/validate-agent-harness.mjs"), "process.exitCode = 1\n")
  assert.throws(() => runAgentCi(root, { GITHUB_EVENT_NAME: "workflow_dispatch", GITHUB_OUTPUT: output }))
  assert.equal(await readFile(output, "utf8"), expectedOutput)
  await writeFile(join(root, "scripts/validate-agent-harness.mjs"), "process.exitCode = 0\n")
  await writeFile(join(root, "tests/agent-fixture.test.mjs"), "import test from 'node:test'; test('fixture failure', () => { throw new Error('expected failure') })\n")
  assert.throws(() => runAgentCi(root, { GITHUB_EVENT_NAME: "workflow_dispatch", GITHUB_OUTPUT: output }))
  assert.equal(await readFile(output, "utf8"), expectedOutput)
})
