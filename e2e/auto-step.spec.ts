import { expect, test } from '@playwright/test'

test('Per Slide advances one snap at a time and stops on the last slide when configured', async ({ page }) => {
  await page.goto('/')
  await page.setContent('<style>body{margin:0}#viewport{display:flex;width:300px;gap:24px;overflow-x:auto;scroll-snap-type:x mandatory}.slide{flex:none;width:200px;height:100px;scroll-snap-align:start}</style><div id="viewport"><div class="slide">1</div><div class="slide">2</div><div class="slide">3</div></div>')
  await page.evaluate(async () => {
    const { installAutoStep } = await import(String('/src/scroll-snap/autoStep.tsx'))
    ;(window as any).disposeStep = installAutoStep(document.querySelector('#viewport')!, { delay: .3, direction: 'left', stopOnLastSlide: true })
  })
  const viewport = page.locator('#viewport')
  await expect.poll(() => viewport.evaluate(el => el.scrollLeft)).toBeGreaterThan(200)
  await expect.poll(() => viewport.evaluate(el => el.scrollLeft)).toBeCloseTo(348, 0)
  await expect(viewport).toHaveAttribute('data-kniff-auto-move', 'held')
  const last = await viewport.evaluate(el => el.scrollLeft)
  await page.waitForTimeout(400)
  expect(await viewport.evaluate(el => el.scrollLeft)).toBeCloseTo(last, 0)
})

test('Per Slide holds while a lightbox is open and resumes after closing', async ({ page }) => {
  await page.goto('/')
  await page.setContent('<style>body{margin:0}#viewport{display:flex;width:300px;gap:24px;overflow-x:auto;scroll-snap-type:x mandatory}.slide{flex:none;width:200px;height:100px;scroll-snap-align:start}</style><div id="viewport"><div class="slide">1</div><div class="slide">2</div><div class="slide">3</div></div>')
  await page.evaluate(async () => {
    const { installAutoStep } = await import(String('/src/scroll-snap/autoStep.tsx'))
    ;(window as any).disposeStep = installAutoStep(document.querySelector('#viewport')!, { delay: .2, direction: 'left', stopOnLastSlide: false })
    document.querySelector('#viewport')!.setAttribute('data-kniff-auto-move-paused', '')
  })
  const viewport = page.locator('#viewport')
  await expect(viewport).toHaveAttribute('data-kniff-auto-move', 'held')
  await page.waitForTimeout(350)
  expect(await viewport.evaluate(el => el.scrollLeft)).toBe(0)
  await viewport.evaluate(el => el.removeAttribute('data-kniff-auto-move-paused'))
  await expect.poll(() => viewport.evaluate(el => el.scrollLeft)).toBeGreaterThan(200)
})
