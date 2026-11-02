import { createHash } from "node:crypto"
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { resolve, join } from "node:path"
import { execFileSync } from "node:child_process"

const root = resolve(import.meta.dirname, "..")
const generated = join(root, "worker/.generated")
const assets = join(generated, "assets")
const { version } = JSON.parse(await readFile(join(root, "package.json"), "utf8"))
const releases = JSON.parse(await readFile(join(root, "worker/releases.json"), "utf8"))
if (releases.at(-1) !== version) throw new Error("package.json and worker/releases.json must name the same release")
const origin = "https://framer-kit.kniff.at"
let previous = { versions: [], builds: {} }
// Only the first deployment may skip history. Later deployments retain all
// content-addressed URLs that existing Framer pages may still import.
if (!process.argv.includes("--initial")) {
  const response = await fetch(`${origin}/health`)
  if (!response.ok) throw new Error("Cannot preserve CDN history; use --initial only for the first deployment")
  previous = await response.json()
}
const versions = [...new Set([...previous.versions, ...releases])]
await mkdir(assets, { recursive: true })
for (const [prefix, names] of Object.entries(previous.builds)) {
  if (!/^builds\/[a-f0-9]{24}$/.test(prefix)) throw new Error("Invalid historical build")
  await mkdir(join(assets, prefix), { recursive: true })
  for (const name of names) {
    if (!/^[\w.-]+\.(?:js|js\.map|d\.ts)$/.test(name)) throw new Error("Invalid historical asset")
    const response = await fetch(`${origin}/${prefix}/${name}`)
    if (!response.ok) throw new Error(`Cannot retain ${prefix}/${name}`)
    await writeFile(join(assets, prefix, name), Buffer.from(await response.arrayBuffer()))
  }
}
for (const version of versions) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Invalid release: ${version}`)
  const response = await fetch(`https://registry.npmjs.org/@kniff/framer-kit/${version}`)
  if (!response.ok) throw new Error(`Cannot fetch npm ${version}: ${response.status}`)
  const metadata = await response.json()
  if (metadata.name !== "@kniff/framer-kit" || metadata.version !== version) throw new Error("Registry package mismatch")
  const tarball = await fetch(metadata.dist.tarball)
  if (!tarball.ok) throw new Error(`Cannot download ${version}`)
  const bytes = Buffer.from(await tarball.arrayBuffer())
  const integrity = `sha512-${createHash("sha512").update(bytes).digest("base64")}`
  if (integrity !== metadata.dist.integrity) throw new Error(`Integrity mismatch for ${version}`)
  const temp = await mkdtemp(join(tmpdir(), "framer-kit-cdn-"))
  try {
    await writeFile(join(temp, "package.tgz"), bytes)
    execFileSync("tar", ["-xzf", join(temp, "package.tgz"), "-C", temp, "package/dist"])
    await cp(join(temp, "package/dist"), join(assets, version), { recursive: true })
  } finally { await rm(temp, { recursive: true, force: true }) }
}
const manifest = { latest: version, versions, current: version, builds: previous.builds }
await writeFile(join(root, "worker/manifest.json"), JSON.stringify(manifest, null, 2) + "\n")
console.log(`Prepared npm releases ${versions.join(", ")}; production entry /${version}/index.js`)
