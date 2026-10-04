import { execFileSync } from "node:child_process"
import { appendFileSync, existsSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

export const requiresAppChecks = (paths) => paths.some((path) => !(
  path === "AGENTS.md" || path === "README.md" || path === "PRODUCT.md" ||
  path.startsWith("docs/") || path.startsWith(".agents/") || path.startsWith(".codex/") ||
  path.startsWith("graphify-out/") || path.startsWith("tests/harness/") ||
  /^tests\/agent-[^/]+\.test\.mjs$/.test(path) ||
  ["scripts/validate-agent-harness.mjs", "scripts/check-agent-worktree.mjs", "scripts/run-agent-ci.mjs"].includes(path)
))

export const selectCiBase = ({ eventName, baseSha }, { hasCommit, fetchCommit }) => {
  if (eventName === "workflow_dispatch" || !baseSha || /^0+$/.test(baseSha)) {
    return { base: undefined, fullCheck: true }
  }
  if (!/^[0-9a-f]{40}$/i.test(baseSha)) throw new Error("BASE_SHA must be a full Git commit SHA")
  if (hasCommit(baseSha)) return { base: baseSha, fullCheck: false }
  fetchCommit(baseSha)
  if (hasCommit(baseSha)) return { base: baseSha, fullCheck: false }
  console.warn("::warning::Previous commit is unavailable; running all app checks with the available parent or file-only harness validation.")
  return { base: hasCommit("HEAD~1") ? "HEAD~1" : undefined, fullCheck: true }
}

export const harnessTests = (root) => {
  const directory = existsSync(join(root, "tests/harness")) ? "tests/harness" : "tests"
  return readdirSync(join(root, directory)).filter((name) =>
    name.endsWith(".test.mjs") && (directory === "tests/harness" || name.startsWith("agent-"))
  ).sort().map((name) => directory + "/" + name)
}

export const runAgentCi = (root = process.cwd(), env = process.env) => {
  const git = (args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: "pipe", maxBuffer: 20 * 1024 * 1024 }).trim()
  const plan = selectCiBase({ eventName: env.GITHUB_EVENT_NAME, baseSha: env.BASE_SHA }, {
    hasCommit: (ref) => { try { git(["cat-file", "-e", `${ref}^{commit}`]); return true } catch { return false } },
    fetchCommit: (sha) => { try { git(["fetch", "--no-tags", "origin", sha]) } catch { /* Fall back conservatively. */ } },
  })
  let appChanged = plan.fullCheck
  if (!appChanged) {
    try { appChanged = requiresAppChecks(git(["diff", "--no-renames", "--name-only", `${plan.base}...HEAD`]).split(/\r?\n/).filter(Boolean)) }
    catch { appChanged = true }
  }
  execFileSync(process.execPath, ["scripts/validate-agent-harness.mjs", ...(plan.base ? ["--base", plan.base] : [])], { cwd: root, stdio: "inherit" })
  const tests = harnessTests(root)
  if (!tests.length) throw new Error("No harness tests found")
  const testEnvironment = { ...process.env }
  delete testEnvironment.NODE_TEST_CONTEXT
  execFileSync(process.execPath, ["--test", "--test-concurrency=1", ...tests], { cwd: root, stdio: "inherit", env: testEnvironment })
  if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `app_changed=${appChanged}\n`)
  console.log(`Harness passed; app checks ${appChanged ? "required" : "skipped for docs/harness-only changes"}.`)
  return { ...plan, appChanged }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runAgentCi()
