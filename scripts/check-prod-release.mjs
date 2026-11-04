import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

export function assertProductionRelease(version, latest, releases) {
  const parse = value => {
    if (!/^\d+\.\d+\.\d+$/.test(value)) throw new Error(`Invalid release version: ${value}`)
    return value.split('.').map(Number)
  }
  const next = parse(version), previous = parse(latest)
  const difference = next.map((value, index) => value - previous[index]).find(value => value !== 0) ?? 0
  if (difference <= 0) throw new Error(`Production is already ${latest}; increment the release version before deploying ${version}`)
  if (releases.at(-1) !== version) throw new Error(`Add ${version} as the latest worker/releases.json entry before deployment`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { name, version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const releases = JSON.parse(await readFile(new URL('../worker/releases.json', import.meta.url), 'utf8'))
  const response = await fetch('https://framer-kit.kniff.at/health')
  if (!response.ok) throw new Error('Cannot verify the deployed release; deployment stopped')
  const live = await response.json()
  assertProductionRelease(version, live.latest, releases)
  console.log(`Verified new production release ${name}@${version} (currently ${live.latest})`)
}
