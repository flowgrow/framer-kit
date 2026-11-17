import { test, expect } from "@playwright/test"
for (const canvas of [false, true])
  test(
    canvas
      ? "canvas keeps authored carousel layers"
      : "controls target the nearest boundary and respect snap limits",
    async ({ page }) => {
      await page.goto("/")
      await page.setContent('<div id="mount"></div>')
      await page.evaluate(async (canvas) => {
        const { mountContextCarousels } = await import(String("/e2e/fixture/contextCarousel.tsx"))
        mountContextCarousels(document.querySelector("#mount"), canvas)
      }, canvas)
      await expect(page.locator("[data-track]")).toHaveCount(3)
      if (canvas) {
        await expect(
          page.locator(
            "[data-kniff-boundary],[data-kniff-viewport],[data-kniff-authored-css],[data-kniff-preview-settings],[data-kniff-loop-original]",
          ),
        ).toHaveCount(0)
        return
      }
      const track = page.locator('[data-track="inner"]')
      const prev = page.locator('[data-prev="inner"]')
      const next = page.locator('[data-next="inner"]')
      await expect(prev).toHaveAttribute("aria-disabled", "true")
      await next.click()
      await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBe(240)
      await next.press("Enter")
      await expect(next).toHaveAttribute("aria-disabled", "true")
      await prev.click()
      await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBe(240)
      expect(
        await page
          .locator('[data-track="outer"],[data-track="sibling"]')
          .evaluateAll((els) => els.map((el) => el.scrollLeft)),
      ).toEqual([0, 0])
    },
  )
