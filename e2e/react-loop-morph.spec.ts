import { test, expect } from "@playwright/test"

async function setup(page: import("@playwright/test").Page) {
  await page.goto("/")
  await page.setContent('<div id="mount"></div>')
  await page.evaluate(async () => {
    const { mountReactLoop } = await import(String("/e2e/fixture/reactLoopHarness.tsx"))
    mountReactLoop(document.querySelector("#mount"))
  })
  await expect(page.locator("#react-loop")).toHaveAttribute("data-kniff-loop-ready", "")
  await expect(page.locator("[data-kniff-loop-copy]")).toHaveCount(6)
}

for (const navigate of [false, true])
  test(`React copy morph targets and handlers (navigate=${navigate})`, async ({ page }) => {
    await setup(page)
    const supported = await page.evaluate(() => {
      if (!document.startViewTransition) return false
      const native = document.startViewTransition.bind(document)
      ;(window as any).morphTargets = []
      const capture = (phase: string) => {
        const targets = Array.from(document.querySelectorAll<HTMLElement>("[style]"))
          .filter((el) => el.style.viewTransitionName && el.style.viewTransitionName !== "none")
          .map((el) => ({
            copy: !!el.closest("[data-kniff-loop-copy]"),
            slide: el.closest("[data-slide]")?.getAttribute("data-slide"),
            x: el.getBoundingClientRect().x,
          }))
        ;(window as any).morphTargets.push({ phase, targets })
      }
      document.startViewTransition = ((callback: any) => {
        capture("before")
        return native(async () => {
          await callback()
          capture("after")
        })
      }) as typeof document.startViewTransition
      return true
    })
    // Use the cycle immediately before the originals, then keep it stationary
    // to model a click at the loop seam before idle normalization.
    const copy = page.locator("[data-kniff-loop-copy]").nth(2).locator('[data-slide="1"]')
    await copy.evaluate((el) => {
      const viewport = document.querySelector<HTMLElement>("#react-loop")!
      viewport.addEventListener("scrollend", (e) => e.stopImmediatePropagation(), true)
      viewport.scrollLeft = (el as HTMLElement).offsetLeft
    })
    await copy.click()
    await expect(page.getByRole("button", { name: "Close", exact: true })).toBeVisible()
    await expect(page.locator("#clicks")).toHaveText("1")
    await expect(
      page.locator('[data-kniff-loop-original] [data-ramka-trigger][aria-expanded="true"]'),
    ).toHaveCount(0)
    await expect(copy).toHaveAttribute("aria-expanded", "true")
    const tabs = page.getByRole("tablist", { name: "Photo thumbnails" })
    if (page.viewportSize()!.width >= 768) await expect(tabs.getByRole("tab")).toHaveCount(4)
    await page.waitForTimeout(800)
    if (navigate) {
      await page.keyboard.press("ArrowRight")
      await expect(
        page.locator("[data-kniff-loop-copy]").nth(2).locator('[data-slide="2"]'),
      ).toHaveAttribute("data-active", "")
    }
    await page.waitForTimeout(800)
    await page.getByRole("button", { name: "Close", exact: true }).click()
    await expect(page.locator("[data-ramka-content]")).toHaveCount(0)
    if (supported) {
      const snapshots = (await page.evaluate(() => (window as any).morphTargets)) as {
        phase: string
        targets: { copy: boolean; slide: string | null; x: number }[]
      }[]
      expect(
        snapshots[0]!.targets.some((t) => t.copy && t.slide === "1" && t.x >= -1 && t.x < 360),
      ).toBe(true)
      expect(
        snapshots
          .at(-1)!
          .targets.some(
            (t) => t.copy && t.slide === (navigate ? "2" : "1") && t.x >= -1 && t.x < 360,
          ),
      ).toBe(true)
    }
  })

test("React loop toggles cleanly and repeats new slides with their live props", async ({
  page,
}) => {
  await setup(page)
  await page.locator("#add").click()
  await expect(page.locator("[data-slide]")).toHaveCount(35)
  await expect(page.locator('[data-kniff-loop-copy] [data-slide="4"]')).toHaveCount(6)
  await page.locator("#toggle-loop").click()
  await expect(page.locator("[data-kniff-loop-copy]")).toHaveCount(0)
  await expect(page.locator("[data-slide]")).toHaveCount(5)
  await page.locator("#toggle-loop").click()
  await expect(page.locator("[data-kniff-loop-copy]")).toHaveCount(6)
  await expect(page.locator("#react-loop")).toHaveAttribute("data-kniff-loop-ready", "")
})

test("morph anchors the full image to the active thumbnail crop on open and close", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "Inspects Chromium's view-transition WAAPI keyframes")
  await setup(page)
  await page.addStyleTag({
    content: `
    [data-slide] img {width:120px !important;height:180px !important;object-fit:cover;object-position:left center}
    [data-slide="1"] img {object-position:right center}
  `,
  })
  await page.evaluate(() => {
    const animate = Element.prototype.animate
    Element.prototype.animate = function (frames, options) {
      if (Array.isArray(frames) && typeof options === "object" && options.pseudoElement) {
        const phase = document.documentElement.dataset.ramkaViewTransition
        const side = phase === "opening" ? "new" : "old"
        if (options.pseudoElement === `::view-transition-${side}(lightbox-morph)`) {
          const frame = phase === "opening" ? frames[0] : frames.at(-1)
          if (typeof frame?.transform === "string")
            document.documentElement.dataset[phase + "CropX"] = String(
              new DOMMatrix(frame.transform).e,
            )
        }
      }
      return animate.call(this, frames, options)
    }
  })
  await page.locator('[data-kniff-loop-original] [data-slide="0"]').click()
  await expect(page.locator("html")).toHaveAttribute("data-opening-crop-x", "0")
  await expect(page.locator("html")).not.toHaveAttribute("data-ramka-view-transition", "opening")
  await page.keyboard.press("ArrowRight")
  await expect(page.locator('[data-kniff-loop-original] [data-slide="1"]')).toHaveAttribute(
    "data-active",
    "",
  )
  await page.getByRole("button", { name: "Close", exact: true }).click()
  // A 4:3 photo covering a 120 x 180 box has 120px of horizontal overflow.
  await expect
    .poll(async () => Number(await page.locator("html").getAttribute("data-closing-crop-x")))
    .toBeCloseTo(-120, 0)
})

test("bottom-positioned Framer image morphs vertically without a crossfade", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "Inspects Chromium's view-transition WAAPI keyframes")
  await setup(page)
  await page.addStyleTag({
    content: `[data-slide="1"] img {width:180px !important;height:80px !important;object-fit:cover;object-position:center bottom}`,
  })
  await page.evaluate(() => {
    const animate = Element.prototype.animate
    Element.prototype.animate = function (frames, options) {
      if (Array.isArray(frames) && typeof options === "object" && options.pseudoElement) {
        const phase = document.documentElement.dataset.ramkaViewTransition
        const side = phase === "opening" ? "new" : "old"
        if (options.pseudoElement === `::view-transition-${side}(lightbox-morph)`) {
          const frame = phase === "opening" ? frames[0] : frames.at(-1)
          if (typeof frame?.transform === "string")
            document.documentElement.dataset[phase + "CropY"] = String(
              new DOMMatrix(frame.transform).f,
            )
          document.documentElement.dataset[phase + "Crossfade"] = String(
            document.documentElement.hasAttribute("data-ramka-crossfade"),
          )
        }
      }
      return animate.call(this, frames, options)
    }
  })
  await page.locator('[data-kniff-loop-original] [data-slide="1"]').click()
  await expect(page.locator("html")).toHaveAttribute("data-opening-crossfade", "false")
  await expect
    .poll(async () => Number(await page.locator("html").getAttribute("data-opening-crop-y")))
    .toBeLessThan(-1)
  await page.getByRole("button", { name: "Close", exact: true }).click()
  await expect(page.locator("html")).toHaveAttribute("data-closing-crossfade", "false")
  await expect
    .poll(async () => Number(await page.locator("html").getAttribute("data-closing-crop-y")))
    .toBeLessThan(-1)
})
