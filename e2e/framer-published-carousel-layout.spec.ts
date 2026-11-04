import { expect, test } from "@playwright/test"

for (const width of [1280, 390]) {
  test(`published carousel preserves Framer spacing at ${width}px`, async ({ page }) => {
    const site = process.env.FRAMER_SITE_URL
    test.skip(!site, "Set FRAMER_SITE_URL to check the published site")
    await page.setViewportSize({ width, height: 900 })
    await page.goto(`${site}/prod/carousel-lightbox`)

    const viewport = page.locator('[data-framer-name="Viewport1"]')
    await expect(viewport).toHaveCSS("overflow-x", "auto")
    const geometry = () => viewport.evaluate(element => {
      const css = getComputedStyle(element)
      const slides = element.querySelectorAll<HTMLElement>('[data-kniff-loop-original] [data-framer-name^="Photo"]')
      const first = slides[0]!.getBoundingClientRect()
      const second = slides[1]!.getBoundingClientRect()
      return {
        gap: second.left - first.right,
        authoredLeft: parseFloat(css.getPropertyValue("--kniff-authored-padding-left")),
        authoredRight: parseFloat(css.getPropertyValue("--kniff-authored-padding-right")),
        authoredMaxWidth: parseFloat(css.getPropertyValue("--kniff-authored-max-width")),
        paddingLeft: parseFloat(css.paddingLeft), paddingRight: parseFloat(css.paddingRight),
        scrollPaddingLeft: parseFloat(css.scrollPaddingLeft), scrollPaddingRight: parseFloat(css.scrollPaddingRight),
        firstLeft: first.left - element.getBoundingClientRect().left,
        secondLeft: second.left - element.getBoundingClientRect().left,
      }
    })
    await expect.poll(async () => {
      const g = await geometry()
      const gutter = (width - Math.min(width, g.authoredMaxWidth)) / 2
      const expectedLeft = g.authoredLeft + gutter
      const expectedRight = g.authoredRight + gutter
      return Math.max(
        Math.abs(g.gap - 24), Math.abs(g.paddingLeft - expectedLeft),
        Math.abs(g.paddingRight - expectedRight), Math.abs(g.scrollPaddingLeft - expectedLeft),
        Math.abs(g.scrollPaddingRight - expectedRight), Math.abs(g.firstLeft - expectedLeft),
      )
    }).toBeLessThan(2)

    await page.getByRole("button", { name: "Next slide" }).first().click()
    await expect.poll(async () => {
      const g = await geometry()
      const gutter = (width - Math.min(width, g.authoredMaxWidth)) / 2
      return Math.abs(g.secondLeft - g.authoredLeft - gutter)
    }).toBeLessThan(3)
  })
}
