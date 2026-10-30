import { test, expect } from '@playwright/test'

test('default preset shows peek slides, working zoom controls and thumbnail navigation', async ({page}, testInfo) => {
  await page.goto('/')
  await page.setContent('<div id="mount"></div>')
  await page.evaluate(async () => {
    const { mountRamka } = await import(String('/e2e/fixture/ramkaHarness.tsx'))
    mountRamka(document.querySelector('#mount'))
  })
  await page.locator('[data-ramka-trigger]').nth(1).click()
  const content = page.locator('[data-ramka-content]')
  await expect(content).toBeVisible()
  await expect(page.getByRole('button',{name:'Previous',exact:true})).toHaveCount(0)
  await expect(page.getByRole('button',{name:'Next',exact:true})).toHaveCount(0)
  const desktop = page.viewportSize()!.width >= 768
  const thumbs = page.getByRole('tablist', {name:'Photo thumbnails'})
  if (desktop) {
    await expect(thumbs).toBeVisible()
    await expect(thumbs.getByRole('tab')).toHaveCount(4)
    await page.waitForTimeout(700)
    const geometry = await page.locator('[data-ramka-slide]').evaluateAll(slides => slides.map(el => {const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width}}))
    expect(geometry[1]!.width).toBeLessThan(page.viewportSize()!.width)
    expect(geometry[0]!.right).toBeGreaterThan(0)
    expect(geometry[2]!.left).toBeLessThan(page.viewportSize()!.width)
    await expect(page.getByRole('button',{name:'Zoom out',exact:true})).toBeDisabled()
    await page.getByRole('button',{name:'Zoom in',exact:true}).click()
    await expect(content).toHaveAttribute('data-zoomed','')
    await expect(page.getByRole('button',{name:'Zoom out',exact:true})).toBeEnabled()
    await page.getByRole('button',{name:'Zoom out',exact:true}).click()
    await expect(content).not.toHaveAttribute('data-zoomed','')
    await thumbs.getByRole('tab').nth(2).click()
    await expect(thumbs.getByRole('tab').nth(2)).toHaveAttribute('aria-selected','true')
    await page.getByRole('button',{name:'Switch to theater layout'}).click()
    await expect(page.getByRole('button',{name:'Switch to peek layout'})).toBeVisible()
    await page.getByRole('button',{name:'Switch to peek layout'}).click()
  } else {
    await expect(thumbs).toBeHidden()
    await expect(page.getByRole('button',{name:'Close',exact:true})).toBeVisible()
  }
  await page.waitForTimeout(700)
  await page.screenshot({path:`screenshots/ramka-preset-${testInfo.project.name}.png`})
})

