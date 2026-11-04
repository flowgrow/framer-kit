import { readFile } from "node:fs/promises"
import { spawnSync } from "node:child_process"

const { name, version } = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"))
const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/${version}?verify=${Date.now()}`)
if (response.status === 404) {
  // Show the package manager output instead of trusting Changesets' success log.
  const result = spawnSync("pnpm", ["publish", "--no-git-checks", "--access", "public"], { stdio: "inherit" })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
} else if (!response.ok) {
  throw new Error(`Cannot check npm release: HTTP ${response.status}`)
}
await import("./verify-release.mjs")
