import { afterEach, expect, it, vi } from "vitest"
import worker from "../worker/index"
const assets = vi.fn(async () => new Response("production bytes"))
const env = { ASSETS: { fetch: assets } }
const request = (path = "/0.5.3/index.js?dev") => worker.fetch(new Request(`https://framer-kit.kniff.at${path}`), env)
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); vi.clearAllMocks() })
it("uses a reachable tunnel and preserves cache busting", async () => {
 const fetcher = vi.fn(async () => new Response(null, { headers: { "Content-Type": "application/javascript" } }))
 vi.stubGlobal("fetch", fetcher)
 const response = await request("/0.5.3/index.js?dev&v=42&external=react,react-dom,framer&target=es2022")
 expect(await response.text()).toBe('export * from "https://framer-kit-dev.kniff.at/index.js?v=42";\n')
 expect(response.headers.get("Cache-Control")).toBe("no-store")
 expect(assets).not.toHaveBeenCalled()
})
it.each([404, 502, 530, 302, 200])("falls back on unavailable or non-JS tunnel response %s", async status => {
 vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status, headers: { "Content-Type": "text/html" } })))
 const response = await request()
 expect(await response.text()).toBe('export * from "/0.5.3/index.js";\n')
 expect(response.headers.get("Cache-Control")).toBe("no-store")
})
it("falls back on network failure", async () => {
 vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline") }))
 expect((await request()).headers.get("X-Kniff-Source")).toBe("production")
})
it("times out a stalled tunnel", async () => {
 vi.useFakeTimers()
 vi.stubGlobal("fetch", vi.fn((_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new Error("aborted"))))))
 const pending = request()
 await vi.advanceTimersByTimeAsync(1500)
 expect((await pending).headers.get("X-Kniff-Source")).toBe("production")
})
it("keeps normal production requests immutable without probing", async () => {
 const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher)
 const response = await request("/0.5.3/index.js")
 expect(await response.text()).toBe("production bytes")
 expect(response.headers.get("Cache-Control")).toContain("immutable")
 expect(fetcher).not.toHaveBeenCalled()
})
it("does not substitute production chunks for development chunks", async () => {
 expect((await request("/0.5.3/chunk-example.js?dev")).status).toBe(400)
})
it("supports extensionless versioned aliases", async () => {
 vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline") }))
 expect(await (await request("/@kniff/framer-kit@0.5.2/ramka?dev")).text()).toBe('export * from "/0.5.2/ramka.js";\n')
})
