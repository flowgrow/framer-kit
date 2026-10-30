import { readFile } from "node:fs/promises"
const { name, version } = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"))
for (let attempt = 0; attempt < 12; attempt++) {
  const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/${version}?verify=${Date.now()}`)
  if (response.ok && (await response.json()).version === version) {
    console.log(`Verified ${name}@${version} on npm`)
    process.exit(0)
  }
  await new Promise(resolve => setTimeout(resolve, 5000))
}
throw new Error(`${name}@${version} is not available on npm after publishing`)
