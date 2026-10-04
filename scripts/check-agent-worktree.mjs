import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"

// Read-only diagnostics: no install, environment-file access, service start or network call.
export const supportsAppNode = (version) => {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)
  if (!match) return false
  const [, major, minor] = match.map(Number)
  return (major === 22 && minor >= 13) || (major === 24 && minor >= 3)
}

export function inspectWorktree({ root = process.cwd(), app = false, sibling, nodeVersion = process.versions.node } = {}) {
  const errors = []
  const warnings = []
  const details = []
  let pkg
  try { pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) }
  catch { return { errors: ["Missing or invalid package.json; run from the repository root."], warnings, details } }
  const staff = pkg.name === "aleconnect"
  if (!["aleconnect", "aleconnect-mobile", "aleconnect-lineman"].includes(pkg.name)) errors.push("This check supports the three ALEConnect repositories.")
  details.push(`Repository: ${pkg.name}; Node: ${nodeVersion}`)
  try {
    const git = (args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: "pipe" }).trim()
    const branch = git(["branch", "--show-current"]) || "detached HEAD"
    const head = git(["rev-parse", "--short", "HEAD"])
    const changes = git(["status", "--porcelain=v1"])
    details.push(`Git: ${branch} at ${head}; ${changes ? changes.split(/\r?\n/).length : 0} changed paths`)
    if (changes) warnings.push("Preserve existing changes; stage only task-owned paths.")
  } catch { errors.push("Git state unavailable; confirm Git is installed and this is a valid checkout.") }
  if (!existsSync(join(root, "package-lock.json"))) errors.push("Missing package-lock.json; restore the committed lockfile before installing.")
  const siblingPath = sibling ? resolve(root, sibling) : resolve(root, "..", staff ? "aleconnect-mobile" : "aleconnect")
  const expectedOwner = staff ? "aleconnect-mobile" : "aleconnect"
  try {
    const owner = JSON.parse(readFileSync(join(siblingPath, "package.json"), "utf8"))
    if (owner.name !== expectedOwner) throw new Error("wrong repository")
    if (!existsSync(join(siblingPath, "docs/agent-harness/cross-project-contracts.md"))) throw new Error("missing contract")
    details.push(`Sibling: ${expectedOwner} available; run harness:check to verify shared contracts`)
  } catch {
    const message = `Expected ${expectedOwner} sibling unavailable; arrange sibling worktrees or pass --sibling <path>.`
    if (sibling) errors.push(message)
    else warnings.push(message)
  }
  if (staff && !existsSync(resolve(root, "..", "aleconnect-lineman", "package.json"))) warnings.push("Lineman sibling unavailable; locate it before field contract work.")
  if (app) {
    if (!supportsAppNode(nodeVersion)) errors.push("App work requires stable Node 22.13+ or 24.3+; use the validated version in .node-version for CI and Android previews.")
    try {
      const pinned = readFileSync(join(root, ".node-version"), "utf8").trim()
      if (!supportsAppNode(pinned)) errors.push("Invalid .node-version; select a supported stable LTS runtime.")
      else {
        details.push(`Validated CI runtime: ${pinned}; declared supported range: ${pkg.engines?.node ?? "not declared"}`)
        if (supportsAppNode(nodeVersion) && nodeVersion !== pinned) warnings.push(`Using compatible Node ${nodeVersion}; CI and Windows Android previews retain validated Node ${pinned}. A successful diagnostic does not prove native bundling or device acceptance.`)
      }
    } catch { errors.push("Missing .node-version; restore the committed CI runtime pin.") }
    const tools = staff ? ["vite/bin/vite.js", "typescript/bin/tsc"] : ["expo/bin/cli", "typescript/bin/tsc"]
    for (const tool of tools) if (!existsSync(join(root, "node_modules", tool))) errors.push(`Missing local ${tool}; run npm ci in this worktree using .node-version.`)
    details.push(`Declared development command: npm run ${staff ? "dev" : "start"}`)
  } else details.push("Docs/harness mode: no installed application dependencies required.")
  return { errors, warnings, details }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2)
  let app = false
  let sibling
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--app") app = true
    else if (args[i] === "--sibling" && args[i + 1] && !args[i + 1].startsWith("--")) sibling = args[++i]
    else { console.error("Usage: node scripts/check-agent-worktree.mjs [--app] [--sibling <path>]"); process.exit(2) }
  }
  const result = inspectWorktree({ app, sibling })
  for (const line of result.details) console.log(line)
  for (const line of result.warnings) console.warn(`WARN: ${line}`)
  for (const line of result.errors) console.error(`ERROR: ${line}`)
  process.exitCode = result.errors.length ? 1 : 0
}
