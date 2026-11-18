import { chromium, firefox, webkit, expect, devices } from "@playwright/test"
import { mkdir, writeFile } from "node:fs/promises"
const url = "https://philosophical-portion-666222--new-carousel-y0f6w208o.framer.app/"
const output = "/tmp/companion-checks"
await mkdir(output, { recursive: true })
const results = []
for (const name of (process.env.ENGINES || "chrome,firefox,webkit,mobile-webkit").split(",")) {
  const browser = await { chrome: chromium, firefox, webkit, "mobile-webkit": webkit }[name].launch(
    { headless: true, ...(name === "chrome" ? { channel: "chrome" } : {}) },
  )
  const context = await browser.newContext(
    name === "mobile-webkit"
      ? { ...devices["iPhone 13"] }
      : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
  )
  const page = await context.newPage()
  const result = { name, version: browser.version(), errors: [] }
  page.on("pageerror", (e) => result.errors.push(e.message))
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" })
    await page.waitForFunction(
      () => window.__COMPANION_KIT_BUILD__ === "companion-local-2026-11-18-v4",
    )
    await page.waitForFunction(() =>
      document.querySelector('[data-framer-name="CarouselXYZ"] [data-ramka-trigger]'),
    )
    await page.evaluate(() =>
      [...document.querySelectorAll("[data-ramka-trigger]")]
        .find((e) => !e.closest('[aria-hidden="true"]'))
        .scrollIntoView({ block: "center", inline: "center", behavior: "instant" }),
    )
    await page.waitForFunction(() => {
      const i = [...document.querySelectorAll("[data-ramka-trigger]")]
        .find((e) => !e.closest('[aria-hidden="true"]'))
        ?.querySelector("img")
      return i?.complete && i.naturalWidth > 0
    })
    await page.waitForTimeout(400)
    const point = await page.evaluate(() => {
      const r = [...document.querySelectorAll("[data-ramka-trigger]")]
        .find((e) => !e.closest('[aria-hidden="true"]'))
        .getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    })
    if (name === "mobile-webkit") await page.touchscreen.tap(point.x, point.y)
    else await page.mouse.click(point.x, point.y)
    const dialog = page.locator("[data-ramka-content][data-open]")
    await expect(dialog).toBeVisible()
    result.fadeDuration = await dialog.evaluate((e) =>
      getComputedStyle(e).getPropertyValue("--lightbox-vt-duration").trim(),
    )
    expect(result.fadeDuration).toBe("160ms")
    const slides = dialog.locator("[data-ramka-slides]")
    await expect(slides).toHaveAttribute("data-active-index", "0")
    result.preview = await dialog
      .locator("[data-ramka-item][data-active] [data-ramka-media]")
      .evaluate((e) => getComputedStyle(e).backgroundImage !== "none")
    await expect(dialog.locator("[data-ramka-item][data-active] img")).toHaveAttribute(
      "sizes",
      "100vw",
    )
    for (let i = 1; i < 10; i++) {
      await page.keyboard.press("ArrowRight")
      await expect(slides).toHaveAttribute("data-active-index", String(i))
      await page.waitForTimeout(550)
    }
    await page.keyboard.press("Home")
    await expect(slides).toHaveAttribute("data-active-index", "0")
    await page.waitForTimeout(600)
    if (name !== "mobile-webkit") {
      await dialog.getByRole("tab").nth(2).click()
      await expect(slides).toHaveAttribute("data-active-index", "2")
      await page.waitForTimeout(600)
      await dialog.getByRole("button", { name: "Zoom in", exact: true }).click()
      await expect(dialog).toHaveAttribute("data-zoomed", "")
      await dialog.getByRole("button", { name: "Zoom out", exact: true }).click()
      await page.waitForTimeout(500)
    }
    await page.screenshot({ path: output + "/" + name + ".png" })
    await dialog.getByRole("button", { name: "Close", exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.documentElement).overflow), {
        timeout: 3000,
      })
      .not.toBe("hidden")
    result.scrollUnlocked = await page.evaluate(
      () => getComputedStyle(document.documentElement).overflow !== "hidden",
    )
    if (!result.scrollUnlocked) throw Error("Scroll remains locked")
    result.pass = true
  } catch (e) {
    result.pass = false
    result.failure = e.message
    await page.screenshot({ path: output + "/" + name + "-failure.png" }).catch(() => {})
  }
  await browser.close()
  results.push(result)
  console.log(JSON.stringify(result))
  await writeFile(output + "/results.json", JSON.stringify(results, null, 2))
}
if (results.some((r) => !r.pass)) process.exitCode = 1
