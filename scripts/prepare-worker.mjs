import { cp, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises"
import { resolve, join, basename } from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"

const validVersion = value => /^\d+\.\d+\.\d+$/.test(value)
const validAsset = value => /^[\w.-]+\.(?:js|js\.map|d\.ts)$/.test(value)
const entries = ["index.js", "ramka.js", "scroll-snap.js", "index.d.ts", "ramka.d.ts", "scroll-snap.d.ts"]

// Old CDN manifests have no file inventory for semantic versions. Walk their
// modules and declarations once; future deployments retain the recorded files.
async function retainAssets(prefix, names, directory, origin, fetchAsset, discover = false) {
  const pending = [...names]
  const retained = new Set()
  for (let index = 0; index < pending.length; index++) {
    const name = pending[index]
    if (!validAsset(name)) throw new Error(`Invalid historical asset: ${name}`)
    if (retained.has(name)) continue
    const url = `${origin}/${prefix}/${name}`
    const response = await fetchAsset(url)
    if (!response.ok) throw new Error(`Cannot retain ${prefix}/${name}: HTTP ${response.status}`)
    const bytes = Buffer.from(await response.arrayBuffer())
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, name), bytes)
    retained.add(name)
    if (!discover || name.endsWith(".map")) continue
    const source = bytes.toString("utf8")
    const parsed = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true)
    const walk = node => {
      const specifier = ts.isImportDeclaration(node) || ts.isExportDeclaration(node) ? node.moduleSpecifier
        : ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword ? node.arguments[0] : null
      if (specifier && ts.isStringLiteral(specifier) && specifier.text.startsWith(".")) {
        const dependency = new URL(specifier.text, url)
        if (dependency.origin !== new URL(origin).origin || !dependency.pathname.startsWith(`/${prefix}/`)) throw new Error("Historical import escapes its release")
        let asset = dependency.pathname.slice(prefix.length + 2)
        if (name.endsWith(".d.ts") && asset.endsWith(".js")) asset = asset.replace(/\.js$/, ".d.ts")
        pending.push(asset)
      }
      ts.forEachChild(node, walk)
    }
    walk(parsed)
    for (const match of source.matchAll(/\/\/[#@]\s*sourceMappingURL=([^\s]+)/g)) pending.push(match[1])
  }
  return [...retained].sort()
}

export async function prepareWorker({ root = resolve(import.meta.dirname, ".."), origin = "https://framer-kit.kniff.at", fetchAsset = fetch, initial = false } = {}) {
  const { version } = JSON.parse(await readFile(join(root, "package.json"), "utf8"))
  const releases = JSON.parse(await readFile(join(root, "worker/releases.json"), "utf8"))
  if (!validVersion(version) || releases.at(-1) !== version || releases.some(value => !validVersion(value))) throw new Error("package.json and worker/releases.json must name the same semantic release")
  let previous = { versions: [], builds: {}, files: {} }
  if (!initial) {
    const response = await fetchAsset(`${origin}/health`)
    if (!response.ok) throw new Error("Cannot preserve CDN history; deployment stopped")
    previous = await response.json()
  }
  if (previous.versions.some(value => !validVersion(value))) throw new Error("Invalid historical release")
  if (previous.versions.includes(version)) throw new Error(`Release ${version} is already deployed; increment the version`)
  if (releases.some(value => value !== version && !previous.versions.includes(value))) throw new Error("A historical release is missing from the CDN")
  const versions = [...new Set([...previous.versions, ...releases])]
  const stage = await mkdtemp(join(root, "worker/.prepare-"))
  const assets = join(stage, "assets")
  const files = {}
  try {
    for (const [prefix, names] of Object.entries(previous.builds)) {
      if (!/^builds\/[a-f0-9]{24}$/.test(prefix)) throw new Error("Invalid historical build")
      await retainAssets(prefix, names, join(assets, prefix), origin, fetchAsset)
    }
    for (const historical of previous.versions) {
      const inventory = previous.files?.[historical]
      files[historical] = await retainAssets(historical, inventory ?? entries, join(assets, historical), origin, fetchAsset, !inventory)
    }
    const dist = join(root, "dist")
    const names = (await readdir(dist)).filter(validAsset).sort()
    if (entries.some(name => !names.includes(name))) throw new Error("Build dist before preparing the Worker")
    await mkdir(join(assets, version), { recursive: true })
    for (const name of names) await cp(join(dist, name), join(assets, version, basename(name)))
    files[version] = names
    const manifest = { latest: version, versions, current: version, builds: previous.builds, files }
    await rm(join(root, "worker/.generated"), { recursive: true, force: true })
    await rename(stage, join(root, "worker/.generated"))
    await writeFile(join(root, "worker/manifest.json"), JSON.stringify(manifest, null, 2) + "\n")
    console.log(`Prepared direct build ${version}; retained CDN releases ${previous.versions.join(", ") || "none"}`)
    return manifest
  } finally {
    await rm(stage, { recursive: true, force: true })
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await prepareWorker({ initial: process.argv.includes("--initial") })
