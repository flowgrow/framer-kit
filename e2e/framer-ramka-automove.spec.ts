import { test, expect } from '@playwright/test'
import { readFile, readdir } from 'node:fs/promises'

test('published Ramka pauses with the corrected Framer Automove module', async ({page}) => {
  test.skip(!process.env.FRAMER_RAMKA_TEST_URL, 'Set FRAMER_RAMKA_TEST_URL to check the published integration')
  const file = (await readdir('dist')).find(name => /^autoMove-.*\.js$/.test(name))!
  const body = await readFile(`dist/${file}`, 'utf8')
  await page.route('**/autoMove.*.mjs', route => route.fulfill({body,contentType:'text/javascript'}))
  await page.goto(process.env.FRAMER_RAMKA_TEST_URL!)
  const viewport = page.locator('[data-kniff-auto-move]')
  await expect(viewport).toHaveAttribute('data-kniff-auto-move','running')
  // Click a fully visible image, including a loop copy when one is in view.
  await page.waitForFunction(() => [...document.querySelectorAll('[data-ramka-trigger]')].some(el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight }))
  await page.evaluate(() => {
    const trigger = [...document.querySelectorAll<HTMLElement>('[data-ramka-trigger]')].find(el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight })!
    trigger.click()
  })
  await expect(page.getByRole('button',{name:'Close',exact:true})).toBeVisible()
  await expect(viewport).toHaveAttribute('data-kniff-auto-move-paused','')
  await expect(viewport).toHaveAttribute('data-kniff-auto-move','held')
  await page.waitForTimeout(800)
  const x = await viewport.evaluate(el => el.scrollLeft)
  await page.waitForTimeout(800)
  expect(await viewport.evaluate(el => el.scrollLeft)).toBe(x)
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(800)
  const next = await viewport.evaluate(el => el.scrollLeft)
  await page.waitForTimeout(800)
  expect(await viewport.evaluate(el => el.scrollLeft)).toBe(next)
  await page.getByRole('button',{name:'Close',exact:true}).click()
  await expect(viewport).not.toHaveAttribute('data-kniff-auto-move-paused','')
  await expect(viewport).toHaveAttribute('data-kniff-auto-move','running')
})
