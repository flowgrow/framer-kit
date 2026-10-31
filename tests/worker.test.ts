import { describe, expect, it, vi } from "vitest"
import worker from "../worker/index"

const request = (path: string, method = "GET") => new Request(`https://framer-kit.kniff.at${path}`, { method })
const env = { ASSETS: { fetch: vi.fn(async (_request: Request) => new Response('import React from "react";', { headers: { ETag: '"asset"' } })) } }

describe("production module Worker", () => {
  it("resolves esm.sh-style entry URLs to one immutable module graph", async () => {
    const response = await worker.fetch(request("/@kniff/framer-kit@0.5.1/ramka?external=react,react-dom,framer&target=es2022"), env)
    expect(await response.text()).toBe('export * from "/0.5.1/ramka.js";\n')
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*")
    expect(response.headers.get("X-TypeScript-Types")).toBe("/0.5.1/ramka.d.ts")
    expect(response.headers.get("Cache-Control")).toContain("immutable")
  })
  it("serves prebuilt files without embedding a second React", async () => {
    const response = await worker.fetch(request("/0.5.1/ramka.js?external=react"), env)
    expect(await response.text()).toContain('from "react"')
    expect(new URL(env.ASSETS.fetch.mock.calls.at(-1)![0]!.url).pathname).toBe("/0.5.1/ramka.js")
    expect(response.headers.get("Content-Type")).toContain("javascript")
  })
  it("rejects unsupported transformations and unknown versions", async () => {
    for (const path of ["/ramka.js?bundle", "/ramka.js?external=lodash", "/ramka.js?target=es5"]) expect((await worker.fetch(request(path), env)).status).toBe(400)
    expect((await worker.fetch(request("/@kniff/framer-kit@9.9.9"), env)).status).toBe(404)
    expect((await worker.fetch(request("/package.json"), env)).status).toBe(404)
  })
  it("supports browser preflight and HEAD without response bodies", async () => {
    expect((await worker.fetch(request("/ramka.js", "OPTIONS"), env)).status).toBe(204)
    expect(await (await worker.fetch(request("/ramka.js", "HEAD"), env)).text()).toBe("")
    expect((await worker.fetch(request("/ramka.js", "POST"), env)).status).toBe(405)
  })
})
