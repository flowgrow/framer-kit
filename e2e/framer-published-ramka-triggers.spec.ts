import { expect, test } from '@playwright/test'

const routes = [
  'carousel-lightbox',
  'carousel-lightbox-loop',
  'carousel-lightbox-autoscroll',
  'carousel-lightbox-automove',
  'carousel-lightbox-automove-loop',
  'carousel-lightbox-autoscroll-loop',
  'carousel-lightbox-auto-width',
  'carousel-lightbox-aspect-ratio',
  'carousel-lightbox-no-edgespace',
]

for (const route of routes) for (const width of [1280, 390]) test(`${route} Ramka trigger opens at ${width}px`, async ({ page }) => {
  test.skip(!process.env.FRAMER_SITE_URL, 'Set FRAMER_SITE_URL to check the published integration')
  await page.setViewportSize({ width, height: 900 })
  await page.goto(`${process.env.FRAMER_SITE_URL}/prod/${route}`)
  const trigger = page.locator('[data-ramka-trigger]').filter({ visible: true }).first()
  await expect(trigger).toBeVisible()
  await trigger.click()
  await expect(page.locator('[data-ramka-content]')).toBeVisible()
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(page.locator('[data-ramka-content]')).not.toBeVisible()
})
