import { expect, test } from "@playwright/test"

for (const route of ["default", "edge-space-off", "loop-off"]) {
  for (const width of [1280, 390]) {
    test(`${route}: real Framer CSS, slide sizing and navigation at ${width}px`, async ({
      page,
    }) => {
      const errors: string[] = []
      page.on("pageerror", (error) => errors.push(error.message))
      await page.setViewportSize({ width, height: 900 })
      const response = await page.goto(`/carousel/${route}`)
      expect(response?.ok()).toBe(true)
      const viewport = page.locator("[data-kniff-viewport]:visible").first()
      await expect(viewport).toHaveCSS("overflow-x", "auto")
      const slides = viewport.locator('[data-kniff-loop-original] > [data-framer-name^="Photo"]')
      await expect(slides).toHaveCount(10)
      const css = await page.locator("[data-kniff-authored-css]").allTextContents()
      expect(css.length).toBeGreaterThan(0)
      for (const text of css) {
        expect(text.length).toBeLessThan(10_000)
        expect(text).not.toMatch(/--kniff-authored-(row-gap|column-gap|padding-top|padding-bottom)/)
        expect((text.match(/:where\(/g) ?? []).length).toBeLessThanOrEqual(1)
      }
      await expect
        .poll(() =>
          slides.evaluateAll((elements) =>
            elements.every((element) => {
              const box = element.getBoundingClientRect()
              return box.width > 100 && box.height > 100
            }),
          ),
        )
        .toBe(true)
      await expect
        .poll(() =>
          viewport.evaluate((element) => {
            const style = getComputedStyle(element)
            const photos = element.querySelectorAll(
              '[data-kniff-loop-original] > [data-framer-name^="Photo"]',
            )
            const first = photos[0]!.getBoundingClientRect()
            const second = photos[1]!.getBoundingClientRect()
            return Math.abs(second.left - first.right - parseFloat(style.columnGap))
          }),
        )
        .toBeLessThan(2)
      if (route === "default") {
        // Loop initialization must select the first original, not the preceding copy's last slide.
        await expect
          .poll(() =>
            viewport.evaluate((element) => {
              const css = getComputedStyle(element),
                box = element.getBoundingClientRect()
              const first = element
                .querySelector('[data-kniff-loop-original] > [data-framer-name^="Photo"]')!
                .getBoundingClientRect()
              const left = parseFloat(css.scrollPaddingLeft) || 0
              const right = parseFloat(css.scrollPaddingRight) || 0
              const align = css.getPropertyValue("--kniff-initial-align").trim()
              const factor = align === "start" ? 0 : align === "end" ? 1 : 0.5
              return Math.abs(
                first.left +
                  first.width * factor -
                  (box.left + left + (element.clientWidth - left - right) * factor),
              )
            }),
          )
          .toBeLessThan(3)
      }
      const before = await viewport.evaluate((element) => element.scrollLeft)
      await page.getByRole("button", { name: "Next slide", exact: true }).click()
      await expect.poll(() => viewport.evaluate((element) => element.scrollLeft)).not.toBe(before)
      // The next photo must settle at the configured snap alignment.
      await expect
        .poll(() =>
          viewport.evaluate((element) => {
            const style = getComputedStyle(element)
            const box = element.getBoundingClientRect()
            const second = element
              .querySelectorAll('[data-kniff-loop-original] > [data-framer-name^="Photo"]')[1]!
              .getBoundingClientRect()
            const left = parseFloat(style.scrollPaddingLeft) || 0
            const right = parseFloat(style.scrollPaddingRight) || 0
            const align = style.getPropertyValue("--kniff-initial-align").trim()
            const factor = align === "start" ? 0 : align === "end" ? 1 : 0.5
            return Math.abs(
              second.left +
                second.width * factor -
                (box.left + left + (element.clientWidth - left - right) * factor),
            )
          }),
        )
        .toBeLessThan(3)
      expect(errors).toEqual([])
    })
  }
}
