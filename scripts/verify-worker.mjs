import ts from "typescript"

const origin = "https://framer-kit-prod.kniff.at"
const health = await fetch(`${origin}/health`)
if (!health.ok) throw new Error(`CDN health: ${health.status}`)
const manifest = await health.json()
const visited = new Set()
const external = new Set()
async function check(url) {
  if (visited.has(url)) return
  visited.add(url)
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url}: ${response.status}`)
  if (response.headers.get("access-control-allow-origin") !== "*") throw new Error(`Missing CORS: ${url}`)
  if (!response.headers.get("content-type")?.includes("javascript")) throw new Error(`Invalid module MIME: ${url}`)
  const source = await response.text()
  if (/node_modules\/(?:react|react-dom)\/cjs/.test(source)) throw new Error(`Bundled host React: ${url}`)
  const dependencies = []
  const parsed = ts.createSourceFile(url, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  const walk = node => {
    const specifier = ts.isImportDeclaration(node) || ts.isExportDeclaration(node) ? node.moduleSpecifier
      : ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword ? node.arguments[0] : null
    if (specifier && ts.isStringLiteral(specifier)) dependencies.push(specifier.text)
    ts.forEachChild(node, walk)
  }
  walk(parsed)
  await Promise.all(dependencies.map(async name => {
    if (name.startsWith(".") || name.startsWith("/")) return check(new URL(name, url).href)
    if (!/^(react|react-dom|framer)(\/|$)/.test(name)) throw new Error(`Unexpected external: ${name}`)
    external.add(name)
  }))
}
for (const path of [`/@kniff/framer-kit@${manifest.latest}?external=react,react-dom,framer&target=es2022`, "/index.js?external=react", "/ramka.js", "/scroll-snap.js"]) await check(origin + path)
for (const [path, status] of [["/index.js?external=lodash", 400], ["/index.js?target=es5", 400], ["/@kniff/framer-kit@9.9.9", 404]]) {
  if ((await fetch(origin + path)).status !== status) throw new Error(`Incorrect validation: ${path}`)
}
const preflight = await fetch(`${origin}/index.js`, { method: "OPTIONS" })
if (preflight.status !== 204) throw new Error("CORS preflight failed")
const head = await fetch(`${origin}/${manifest.current}/index.js`, { method: "HEAD" })
if (!head.ok || await head.text()) throw new Error("HEAD failed")
console.log(`Verified ${visited.size} live ESM modules; external host imports: ${[...external].sort().join(", ")}`)
