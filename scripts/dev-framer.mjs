import { spawn } from "node:child_process"
import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import { createServer } from "node:http"
import { extname, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

const PORT = 4173
const TUNNEL_NAME = "framer-kit-dev"
const PUBLIC_URL = "https://framer-kit-dev.kniff.at"
const DIST_DIRECTORY = resolve(
  fileURLToPath(new URL("../dist", import.meta.url)),
)
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
}

function contentType(filePath) {
  if (filePath.endsWith(".d.ts")) return "text/plain; charset=utf-8"
  return MIME_TYPES[extname(filePath)] ?? "application/octet-stream"
}

const children = new Set()
let shuttingDown = false

function respond(response, statusCode, body = "") {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-cache, no-store, must-revalidate",
  })
  response.end(body)
}

const server = createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    })
    response.end()
    return
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    respond(response, 405, "Method not allowed")
    return
  }

  try {
    const pathname = decodeURIComponent(
      new URL(request.url ?? "/", `http://localhost:${PORT}`).pathname,
    )
    const filePath = resolve(DIST_DIRECTORY, `.${pathname}`)

    if (!filePath.startsWith(`${DIST_DIRECTORY}${sep}`)) {
      respond(response, 403, "Forbidden")
      return
    }

    const file = await stat(filePath)
    if (!file.isFile()) {
      respond(response, 404, "Not found")
      return
    }

    response.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Content-Length": file.size,
      "Content-Type": contentType(filePath),
    })

    if (request.method === "HEAD") response.end()
    else createReadStream(filePath).pipe(response)
  } catch (error) {
    if (error?.code === "ENOENT") respond(response, 404, "Not found")
    else {
      console.error(error)
      respond(response, 500, "Internal server error")
    }
  }
})

function shutdown(exitCode = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) child.kill("SIGTERM")
  server.close(() => process.exit(exitCode))
  setTimeout(() => process.exit(exitCode), 1000).unref()
}

function run(command, args, label) {
  const child = spawn(command, args, { stdio: "inherit" })
  children.add(child)

  child.on("error", (error) => {
    console.error(`[${label}] ${error.message}`)
    shutdown(1)
  })
  child.on("exit", (code, signal) => {
    children.delete(child)
    if (!shuttingDown) {
      console.error(
        `[${label}] stopped (${signal ?? `exit code ${code ?? 1}`})`,
      )
      shutdown(code && code !== 0 ? code : 1)
    }
  })
}

server.on("error", (error) => {
  console.error(`[server] ${error.message}`)
  shutdown(1)
})

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[server] Serving dist at http://localhost:${PORT}`)
  console.log(`[tunnel] Framer URL: ${PUBLIC_URL}/embla.js`)
  console.log(`[tunnel] Framer URL: ${PUBLIC_URL}/ramka.js`)
  run("npm", ["run", "dev"], "build")
  run(
    "cloudflared",
    [
      "tunnel",
      "--url",
      `http://localhost:${PORT}`,
      "run",
      TUNNEL_NAME,
    ],
    "tunnel",
  )
})

process.on("SIGINT", () => shutdown())
process.on("SIGTERM", () => shutdown())
