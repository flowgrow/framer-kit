import { test, expect } from '@playwright/test'
test('opening actual Ramka holds CSS snap automove until closing', async ({page}) => {
  await page.goto('/')
  await page.setContent('<div id="mount"></div>')
  await page.evaluate(async () => {
    const { mountRamka } = await import(String('/e2e/fixture/ramkaHarness.tsx'))
    mountRamka(document.querySelector('#mount'))
  })
  const viewport = page.locator('#ramka-viewport')
  await expect(viewport).toHaveAttribute('data-kniff-auto-move','running')
  await page.locator('[data-ramka-trigger]').first().click()
  await expect(page.locator('[data-ramka-content]')).toBeVisible()
  await expect(viewport).toHaveAttribute('data-kniff-auto-move-paused','')
  await page.waitForTimeout(700)
  const position = await viewport.evaluate(el => el.scrollLeft)
  await page.waitForTimeout(600)
  expect(await viewport.evaluate(el => el.scrollLeft)).toBe(position)
  // Keep the actual View Transition's completion pending after its native
  // animation ends. Automove must wait for Ramka's completion callback.
  const morphSupported = await page.evaluate(() => {
    if (!document.startViewTransition) return false
    const nativeStart = document.startViewTransition.bind(document)
    document.startViewTransition = ((...args: Parameters<typeof nativeStart>) => {
      const transition = nativeStart(...args)
      const gate = new Promise<void>(resolve => { (window as any).finishCloseMorph = resolve })
      const finished = transition.finished.then(() => {
        ;(window as any).closeMorphReached = true
        return gate
      })
      return new Proxy(transition, {
        get(target, key) {
          if (key === 'finished') return finished
          const value = Reflect.get(target, key, target)
          return typeof value === 'function' ? value.bind(target) : value
        },
      })
    }) as typeof document.startViewTransition
    return true
  })
  await page.keyboard.press('Escape')
  if (morphSupported) {
    await page.waitForFunction(() => (window as any).closeMorphReached)
    await expect(viewport).toHaveAttribute('data-kniff-auto-move-paused','')
    await expect(viewport).toHaveAttribute('data-kniff-auto-move','held')
    const closingPosition = await viewport.evaluate(el => el.scrollLeft)
    await page.waitForTimeout(350)
    expect(await viewport.evaluate(el => el.scrollLeft)).toBe(closingPosition)
    await page.evaluate(() => (window as any).finishCloseMorph())
  }
  await expect(viewport).not.toHaveAttribute('data-kniff-auto-move-paused','')
  await expect(viewport).toHaveAttribute('data-kniff-auto-move','running')
})
