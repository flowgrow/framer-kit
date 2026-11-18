import { chromium, firefox, webkit } from "@playwright/test"
import { mkdir, writeFile } from "node:fs/promises"
const out = process.env.PROFILE_DIR || "/tmp/companion-profile-baseline"
await mkdir(out, { recursive: true })
const url = "https://philosophical-portion-666222--new-carousel-y0f6w208o.framer.app/"
const engines = { chromium, chrome: chromium, firefox, webkit }
for (const name of (process.env.ENGINES || "chrome,firefox,webkit").split(",")) {
  const browser = await engines[name].launch({
    headless: true,
    ...(name === "chrome" ? { channel: "chrome" } : {}),
  })
  const context = await browser.newContext({
    viewport: { width: 2560, height: 1363 },
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()
  const errors = []
  page.on("pageerror", (e) => errors.push(e.message))
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })
  const result = { engine: name, version: browser.version(), runs: [], errors }
  try {
    if (process.env.EXPERIMENT === "append-adopted-sheets") {
      await page.addInitScript(() => {
        const proto = Document.prototype
        const d = Object.getOwnPropertyDescriptor(proto, "adoptedStyleSheets")
        Object.defineProperty(proto, "adoptedStyleSheets", {
          ...d,
          set(next) {
            const current = d.get.call(this)
            if (next.length > current.length && current.every((sheet, i) => sheet === next[i])) {
              current.push(...next.slice(current.length))
            } else d.set.call(this, next)
          },
        })
      })
    }
    if (
      ["ignore-css-wide-names", "warm-morph-styles", "warm-styles-only"].includes(
        process.env.EXPERIMENT,
      )
    ) {
      await page.route("**/lightbox-morph-runtime.*.mjs", async (route) => {
        const response = await route.fetch()
        const source = await response.text()
        const before = "return t!==``&&t.toLowerCase()!==`none`"
        if (!source.includes(before))
          throw Error("Morph name detector changed; refusing experiment")
        let body = source.replace(
          before,
          "return t!==``&&![" +
            ["none", "unset", "initial", "inherit", "revert", "revert-layer"]
              .map((v) => JSON.stringify(v))
              .join(",") +
            "].includes(t.toLowerCase())",
        )
        if (process.env.EXPERIMENT === "warm-styles-only") body = source
        if (["warm-morph-styles", "warm-styles-only"].includes(process.env.EXPERIMENT)) {
          body +=
            '\nexport function __profileWarm() { Je(); pe(); oe(); l("data-ramka-media-fill", () => "[data-ramka-media]:not(#_) > img:not([data-ramka-media-poster]),[data-ramka-media]:not(#_) > video,[data-ramka-media]:not(#_) > canvas{width:100%;height:100%;min-width:0;min-height:0;}"); }'
        }
        await route.fulfill({ response, body })
      })
    }
    await page.goto(url, { waitUntil: "domcontentloaded" })
    await page.waitForFunction(() => window.__COMPANION_KIT_BUILD__, {}, { timeout: 60000 })
    result.build = await page.evaluate(() => window.__COMPANION_KIT_BUILD__)
    if (result.build !== (process.env.EXPECTED_BUILD || "companion-local-2026-11-19-v8"))
      throw Error("Unexpected runtime " + result.build)
    await page.waitForFunction(() => document.querySelector('[data-framer-name="CarouselXYZ"]'))
    await page.evaluate(() =>
      document
        .querySelector('[data-framer-name="CarouselXYZ"]')
        .scrollIntoView({ block: "center" }),
    )
    await page.waitForTimeout(1800)
    if (await page.locator('[data-framer-name="Popup"]:visible').count())
      throw Error("Popup must be dismissed before measurement")
    if (["warm-morph-styles", "warm-styles-only"].includes(process.env.EXPERIMENT)) {
      await page.evaluate(async () => {
        const runtime = performance
          .getEntriesByType("resource")
          .find((e) => /lightbox-morph-runtime\..*\.mjs/.test(e.name))
        if (!runtime) throw Error("Morph runtime not found")
        const module = await import(runtime.name)
        module.__profileWarm()
      })
      await page.waitForTimeout(500)
    }
    if (process.env.RENDER_TRACE === "1")
      result.transitionNames = await page.evaluate(() => ({
        elements: [...document.querySelectorAll("*")]
          .map((e) => ({
            tag: e.tagName,
            name: e.getAttribute("data-framer-name"),
            transition: getComputedStyle(e).viewTransitionName,
          }))
          .filter((e) => e.transition && e.transition !== "none"),
        sheets: [...document.styleSheets, ...document.adoptedStyleSheets].flatMap((s) => {
          try {
            return [...s.cssRules]
              .map((r) => r.cssText)
              .filter((t) => t.includes("view-transition-name"))
          } catch {
            return []
          }
        }),
      }))
    if (process.env.EXPERIMENT === "no-root-snapshot")
      await page.addStyleTag({ content: ":root {view-transition-name:none!important}" })
    if (process.env.EXPERIMENT === "no-page-styles")
      await page.evaluate(() => {
        for (const s of document.querySelectorAll("style"))
          if (s.textContent.includes(".framer-")) s.disabled = true
      })
    if (process.env.RENDER_TRACE === "1")
      await page.addScriptTag({ path: "scripts/trace-render-work.js" })
    if (process.env.INSTRUMENT === "1")
      await page.evaluate(() => {
        window.__slow = []
        const record = (kind, e, fn) => {
          const t = performance.now()
          const v = fn()
          const ms = performance.now() - t
          if (ms > 8)
            window.__slow.push({
              kind,
              ms,
              tag: e.tagName,
              name: e.getAttribute?.("data-framer-name"),
              class: e.className?.toString().slice(0, 100),
              at: t,
            })
          return v
        }
        const orig = window.getComputedStyle
        window.getComputedStyle = function (e, ...a) {
          const css = record("getComputedStyle", e, () => orig.call(this, e, ...a))
          return new Proxy(css, {
            get(target, p) {
              const v = record("css." + String(p), e, () => Reflect.get(target, p, target))
              return typeof v === "function" ? v.bind(target) : v
            },
          })
        }
        for (const [proto, props] of [
          [Element.prototype, ["clientWidth", "clientHeight", "scrollWidth", "scrollLeft"]],
          [HTMLElement.prototype, ["offsetWidth", "offsetHeight", "offsetLeft"]],
        ])
          for (const key of props) {
            const d = Object.getOwnPropertyDescriptor(proto, key)
            if (d?.get)
              Object.defineProperty(proto, key, {
                ...d,
                get() {
                  return record(key, this, () => d.get.call(this))
                },
              })
          }
        const rect = Element.prototype.getBoundingClientRect
        Element.prototype.getBoundingClientRect = function () {
          return record("rect", this, () => rect.call(this))
        }
      })
    let cdp
    if ((name === "chromium" || name === "chrome") && process.env.TRACE === "1") {
      cdp = await context.newCDPSession(page)
      await cdp.send("Tracing.start", {
        categories:
          "devtools.timeline,v8.execute,disabled-by-default-devtools.timeline,disabled-by-default-v8.cpu_profiler,disabled-by-default-devtools.timeline.invalidationTracking",
        transferMode: "ReturnAsStream",
      })
    }
    await page.evaluate(() => {
      window.__measure = null
      const begin = (e) => {
        const m = window.__measure
        if (m && m.start === null) {
          m.start = performance.now()
          m.event = e.type
        }
      }
      document.addEventListener("click", begin, true)
      document.addEventListener("keydown", begin, true)
      window.startMeasure = (kind) => {
        const initial = document
          .querySelector("[data-ramka-slides]")
          ?.getAttribute("data-active-index")
        const m = (window.__measure = {
          kind,
          initial,
          start: null,
          frames: [],
          visible: null,
          indexChanged: null,
          loaded: null,
        })
        let last = performance.now()
        const tick = () => {
          const now = performance.now()
          if (m.start !== null) {
            m.frames.push({ at: now - m.start, gap: now - last })
            const d = document.querySelector("[data-ramka-content][data-open]")
            const slides = d?.querySelector("[data-ramka-slides]")
            const idx = slides?.getAttribute("data-active-index")
            if (d && getComputedStyle(d).visibility !== "hidden" && m.visible === null)
              m.visible = now - m.start
            if (idx && idx !== initial && m.indexChanged === null) m.indexChanged = now - m.start
            const img = d?.querySelector("[data-ramka-item][data-active] img")
            if (img?.complete && img.naturalWidth && m.loaded === null) m.loaded = now - m.start
          }
          last = now
          if (m.start === null || now - m.start < 2200) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    })
    async function measure(kind, action) {
      await page.evaluate((k) => window.startMeasure(k), kind)
      await action()
      await page.waitForFunction(() => window.__measure?.frames.at(-1)?.at >= 2200)
      const m = await page.evaluate(() => window.__measure)
      m.maxFrameGap = Math.max(...m.frames.filter((f) => f.at > 0).map((f) => f.gap))
      m.stalls = m.frames.filter((f) => f.gap > 50)
      delete m.frames
      result.runs.push(m)
      if (kind.startsWith("next") && m.indexChanged === null)
        throw Error("Navigation did not advance")
      console.log(name, JSON.stringify(m))
    }
    for (let run = 0; run < Number(process.env.RUNS || 2); run++) {
      await page.evaluate(() =>
        [...document.querySelectorAll("[data-ramka-trigger]")]
          .find((e) => !e.closest('[aria-hidden="true"]'))
          ?.scrollIntoView({ block: "center", inline: "center", behavior: "instant" }),
      )
      await page.waitForFunction(
        () => {
          const e = [...document.querySelectorAll("[data-ramka-trigger]")].find(
            (e) => !e.closest('[aria-hidden="true"]'),
          )
          const i = e?.querySelector("img")
          return i?.complete && i.naturalWidth > 0
        },
        {},
        { timeout: 60000 },
      )
      await page.waitForTimeout(150)
      const point = await page.evaluate(() => {
        const candidates = [...document.querySelectorAll("[data-ramka-trigger]")]
          .filter((e) => !e.closest('[aria-hidden="true"]'))
          .map((e) => ({ e, r: e.getBoundingClientRect() }))
          .filter(
            ({ r }) =>
              r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight,
          )
        const { r } = candidates[0]
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
      })
      await measure("open-" + run, () => page.mouse.click(point.x, point.y))
      await page.locator("[data-ramka-content][data-open]").waitFor({ state: "visible" })
      await measure("next-" + run, () => page.keyboard.press("ArrowRight"))
      await measure("previous-" + run, () => page.keyboard.press("ArrowLeft"))
      if (run === 0) await page.screenshot({ path: out + "/" + name + "-open.png" })
      await page.keyboard.press("Escape")
      await page.locator("[data-ramka-content][data-open]").waitFor({ state: "hidden" })
      await page.waitForTimeout(700)
    }
    if (cdp) {
      const finished = new Promise((r) => cdp.once("Tracing.tracingComplete", r))
      await cdp.send("Tracing.end")
      const { stream } = await finished
      let text = ""
      while (true) {
        const r = await cdp.send("IO.read", { handle: stream })
        text += r.data
        if (r.eof) break
      }
      await writeFile(out + "/chromium-trace.json", text)
    }
    if (process.env.INSTRUMENT === "1") result.slow = await page.evaluate(() => window.__slow)
    if (process.env.RENDER_TRACE === "1")
      result.renderTrace = await page.evaluate(() => window.__renderTrace)
    if (process.env.RENDER_TRACE === "1")
      result.adoptedSheets = await page.evaluate(() => ({
        markers: [...(document[Symbol.for("ramka.vt.adoptedMarkers")] || [])],
        sheets: document.adoptedStyleSheets.map((s) =>
          [...s.cssRules].map((r) => r.cssText).join("\n"),
        ),
      }))
    result.images = await page.evaluate(() =>
      [...document.querySelectorAll("[data-ramka-trigger] img")]
        .slice(0, 10)
        .map((i) => ({ src: i.currentSrc, width: i.naturalWidth })),
    )
  } catch (e) {
    process.exitCode = 1
    result.failure = e.stack
    console.log(name, "FAILED", e.message)
  } finally {
    await writeFile(out + "/" + name + ".json", JSON.stringify(result, null, 2))
    await browser.close()
  }
}
