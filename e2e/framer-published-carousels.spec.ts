import { expect, test } from "@playwright/test"

const routes = [
  "carousel",
  "carousel-lightbox",
  "carousel-lightbox-loop",
  "carousel-lightbox-autoscroll",
  "carousel-lightbox-automove",
  "carousel-lightbox-automove-loop",
  "carousel-lightbox-autoscroll-loop",
  "carousel-lightbox-auto-width",
  "carousel-lightbox-aspect-ratio",
  "carousel-lightbox-no-edgespace",
]

test("published carousel pages show a scrollable viewport and a visible image", async ({ page }) => {
  const site = process.env.FRAMER_SITE_URL
  test.skip(!site, "Set FRAMER_SITE_URL to check the published site")

  for (const route of routes) {
    await page.goto(`${site}/prod/${route}`)
    await expect.poll(async () => page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("[data-kniff-react-loop]")].some(viewport => {
        const bounds = viewport.getBoundingClientRect()
        return bounds.width > 0 && viewport.scrollWidth > viewport.clientWidth + 10 &&
          [...viewport.querySelectorAll<HTMLImageElement>("img")].some(image => {
            const rect = image.getBoundingClientRect()
            return image.complete && image.naturalWidth > 0 && rect.width > 20 && rect.height > 20 &&
              rect.right > bounds.left && rect.left < bounds.right &&
              rect.bottom > bounds.top && rect.top < bounds.bottom
          })
      }),
    ), { message: `${route} should show a scrollable carousel with an image` }).toBe(true)
    await expect(page.getByRole("button", { name: "Next slide" }).first()).toBeEnabled()
  }
})
