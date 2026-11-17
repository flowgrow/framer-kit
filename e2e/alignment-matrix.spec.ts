import { test, expect } from "@playwright/test"
test("blank boundary bleeds the viewport to body width", async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 700 })
  await page.goto("/")
  await page.setContent('<style>body{margin:0}</style><div id="mount"></div>')
  await page.evaluate(async () => {
    const { mountAlignment } = await import(String("/e2e/fixture/alignmentHarness.tsx"))
    mountAlignment(document.querySelector("#mount"), {
      align: "start",
      edgeSpace: true,

      bodyBoundary: true,
    })
  })
  const viewport = page.locator("#alignment-viewport")
  await expect
    .poll(() => viewport.evaluate((el) => Math.round(el.getBoundingClientRect().width)))
    .toBe(1000)
  await expect
    .poll(() => viewport.evaluate((el) => Math.round(el.getBoundingClientRect().left)))
    .toBe(-200)
  await expect
    .poll(() => viewport.evaluate((el) => el.style.getPropertyValue("--kniff-first-slide-width")))
    .toBe("180px")
})
for (const align of ["start", "center", "end"] as const)
  for (const edgeSpace of [false, true])
    test(`preview ${align} edgeSpace=${edgeSpace} every slide`, async ({ page }) => {
      await page.setViewportSize({ width: 1000, height: 700 })
      await page.goto("/")
      await page.setContent('<style>body{margin:0}</style><div id="mount"></div>')
      await page.evaluate(
        async (options) => {
          const { mountAlignment } = await import(String("/e2e/fixture/alignmentHarness.tsx"))
          mountAlignment(document.querySelector("#mount"), options)
        },
        { align, edgeSpace },
      )
      const viewport = page.locator("#alignment-viewport")
      await expect(viewport.locator("[data-slide]")).toHaveCount(5)
      const measure = () =>
        viewport.evaluate(
          (el, { align }) => {
            const css = getComputedStyle(el),
              box = el.getBoundingClientRect(),
              left = parseFloat(css.scrollPaddingLeft),
              right = parseFloat(css.scrollPaddingRight),
              factor = align === "center" ? 0.5 : align === "end" ? 1 : 0
            return {
              scroll: el.scrollLeft,
              max: el.scrollWidth - el.clientWidth,
              left,
              right,
              inner: el.clientWidth - left - right,
              slides: [...el.querySelectorAll<HTMLElement>("[data-slide]")].map((slide) => {
                const r = slide.getBoundingClientRect()
                return {
                  x: r.left - box.left,
                  width: r.width,
                  ideal: left + factor * (el.clientWidth - left - right - r.width),
                }
              }),
            }
          },
          { align },
        )

      // Edge spacing must align the first slide at scrollLeft 0 on untouched load.
      if (edgeSpace)
        await expect.poll(async () => Math.abs((await measure()).scroll)).toBeLessThan(1)
      // Assert the untouched load position before any programmatic scrolling.
      await expect
        .poll(async () => {
          const m = await measure(),
            first = m.slides[0]!
          const desired = m.scroll + first.x - first.ideal
          return Math.abs(m.scroll - Math.max(0, Math.min(m.max, desired)))
        })
        .toBeLessThan(1)
      for (let index = 0; index < 5; index++) {
        const m = await measure(),
          slide = m.slides[index]!,
          desired = m.scroll + slide.x - slide.ideal,
          expected = Math.max(0, Math.min(m.max, desired))
        await viewport.evaluate((el, left) => el.scrollTo({ left, behavior: "instant" }), expected)
        await expect.poll(async () => Math.abs((await measure()).scroll - expected)).toBeLessThan(1)
        if (edgeSpace) {
          const actual = (await measure()).slides[index]!
          expect(actual.x).toBeCloseTo(actual.ideal, 0)
        }
      }
    })
