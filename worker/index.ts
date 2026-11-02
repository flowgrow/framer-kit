import manifest from "./manifest.json"

interface Env { ASSETS: { fetch(request: Request): Promise<Response> } }
const externals = ["react", "react-dom", "framer"]
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Expose-Headers": "X-TypeScript-Types, X-Kniff-Build, ETag",
  "Cross-Origin-Resource-Policy": "cross-origin",
  "X-Content-Type-Options": "nosniff",
}
const entries: Record<string, string> = { "": "index.js", index: "index.js", "index.js": "index.js", ramka: "ramka.js", "ramka.js": "ramka.js", "scroll-snap": "scroll-snap.js", "scroll-snap.js": "scroll-snap.js" }

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const reply = (body: string, status = 200, extra: Record<string, string> = {}) => new Response(request.method === "HEAD" ? null : body, { status, headers: { ...headers, "Cache-Control": "no-store", ...extra } })
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...headers, "Access-Control-Max-Age": "86400" } })
    if (!["GET", "HEAD"].includes(request.method)) return reply("Method not allowed", 405, { Allow: "GET, HEAD, OPTIONS" })
    for (const key of url.searchParams.keys()) if (!["external", "target", "v"].includes(key)) return reply(`Unsupported query parameter: ${key}`, 400)
    const external = url.searchParams.get("external")
    if (external && external !== "*" && external.split(",").some(name => !externals.some(base => name === base || name.startsWith(base + "/")))) return reply("Only React, React DOM, and Framer externals are supported", 400)
    if (url.searchParams.has("target") && url.searchParams.get("target") !== "es2022") return reply("This prebuilt package targets es2022", 400)
    if (url.pathname === "/" || url.pathname === "/health") return reply(JSON.stringify({ ...manifest, externals, example: `/@kniff/framer-kit@${manifest.latest}?external=react,react-dom,framer&target=es2022` }), 200, { "Content-Type": "application/json; charset=utf-8" })

    let pathname: string
    try { pathname = decodeURIComponent(url.pathname) } catch { return reply("Invalid path", 400) }
    if (pathname.includes("\\") || pathname.split("/").some(part => part === "." || part === "..")) return reply("Invalid path", 400)
    const npm = pathname.match(/^\/@kniff\/framer-kit@([^/]+)(?:\/(.*))?$/)
    const direct = pathname.match(/^\/(\d+\.\d+\.\d+)(?:\/(.*))?$/)
    let prefix = manifest.current
    let entry: string | undefined
    if (npm || direct) {
      const match = (npm || direct)!
      if (!manifest.versions.includes(match[1]!)) return reply("Unknown package version", 404)
      prefix = match[1]!
      entry = entries[match[2] || ""]
    } else if (pathname.split("/").length === 2) entry = entries[pathname.slice(1)]

    // Aliases export canonical asset URLs so relative chunks always resolve in
    // the right version, even for esm.sh-compatible extensionless entry URLs.
    if (entry && pathname !== `/${prefix}/${entry}`) return reply(`export * from ${JSON.stringify(`/${prefix}/${entry}`)};\n`, 200, {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": npm || direct ? "public, max-age=31536000, immutable" : "no-cache",
      "X-TypeScript-Types": `/${prefix}/${entry.replace(/\.js$/, ".d.ts")}`,
      "X-Kniff-Build": prefix,
    })
    const validPrefix = [...manifest.versions, ...Object.keys(manifest.builds)].some(prefix => pathname.startsWith(`/${prefix}/`))
    if (!validPrefix || !/\.(?:js|js\.map|d\.ts)$/.test(pathname)) return reply("Not found", 404)
    const assetURL = new URL(pathname, url.origin)
    const response = await env.ASSETS.fetch(new Request(assetURL, { method: request.method }))
    if (!response.ok) return reply("Not found", 404)
    const result = new Response(request.method === "HEAD" ? null : response.body, response)
    for (const [key, value] of Object.entries(headers)) result.headers.set(key, value)
    result.headers.set("Cache-Control", "public, max-age=31536000, immutable")
    result.headers.set("Content-Type", pathname.endsWith(".js") ? "application/javascript; charset=utf-8" : pathname.endsWith(".map") ? "application/json; charset=utf-8" : "text/plain; charset=utf-8")
    if (pathname.endsWith(".js")) result.headers.set("X-TypeScript-Types", pathname.replace(/\.js$/, ".d.ts"))
    return result
  },
}
