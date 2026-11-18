import { test, expect } from "@playwright/test"

test("Framer Fill track and intrinsic image slides stay full-sized through loop initialization and resizing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1000, height: 800 })
  await page.goto("/")
  await page.setContent('<style>body{margin:0}</style><div id="mount"></div>')
  await page.evaluate(async () => {
    const { mountIntrinsicFill } = await import(String("/e2e/fixture/alignmentHarness.tsx"))
    mountIntrinsicFill(document.querySelector("#mount"))
  })
  const track = page.locator("#intrinsic-viewport")
  await expect(track).toHaveAttribute("data-kniff-loop", "")
  for (const width of [1000, 390, 1000]) {
    await page.setViewportSize({ width, height: 800 })
    await expect
      .poll(() => track.evaluate((e) => parseFloat(getComputedStyle(e).paddingLeft)))
      .toBe(0)
    for (let sample = 0; sample < 6; sample++) {
      const sizes = await track
        .locator("[data-kniff-loop-original] [data-slide]")
        .evaluateAll((slides) =>
          slides.map((slide) => ({
            slide: slide.getBoundingClientRect().width,
            image: slide.firstElementChild!.getBoundingClientRect().width,
          })),
        )
      expect(sizes).toHaveLength(3)
      for (const size of sizes) {
        expect(size.image).toBeGreaterThan(500)
        expect(Math.abs(size.slide - size.image)).toBeLessThan(1)
      }
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)))
    }
  }
})

test("compact width rules preserve breakpoint overrides and leave non-slides alone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1000, height: 800 })
  await page.goto("/")
  await page.evaluate(async () => {
    const { mountIntrinsicFill } = await import(String("/e2e/fixture/alignmentHarness.tsx"))
    mountIntrinsicFill(
      document.querySelector("#mount"),
      `
      @media(max-width:600px){.mobile-slide{width:240px}}
    `,
    )
    const outside = document.createElement("div")
    outside.className = "intrinsic-slide"
    outside.id = "outside"
    outside.textContent = "Caption"
    document.body.append(outside)
  })
  const track = page.locator("#intrinsic-viewport")
  await expect(track).toHaveAttribute("data-kniff-loop", "")
  const slides = track.locator("[data-slide]")
  await expect
    .poll(() => slides.first().evaluate((el) => el.getBoundingClientRect().width))
    .toBeGreaterThan(500)
  await page.setViewportSize({ width: 390, height: 800 })
  await expect
    .poll(() =>
      slides.evaluateAll((nodes) =>
        nodes.every((el) => Math.abs(el.getBoundingClientRect().width - 240) < 1),
      ),
    )
    .toBe(true)
  await page.setViewportSize({ width: 1000, height: 800 })
  await expect
    .poll(() => slides.first().evaluate((el) => el.getBoundingClientRect().width))
    .toBeGreaterThan(500)
  await expect
    .poll(() => page.locator("#outside").evaluate((el) => el.getBoundingClientRect().width))
    .toBeLessThan(100)
})
