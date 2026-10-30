import { test, expect } from '@playwright/test'

async function setup(page: import('@playwright/test').Page, loop: boolean) {
  await page.goto('/')
  await page.setContent(`<style>#s{width:360px}#v{display:flex;gap:var(--gap,24px);overflow-x:auto;scroll-snap-type:x mandatory}.slide{flex:none;width:240px;height:100px;scroll-snap-align:start}</style><div id=s data-framer-name="Navigation Test"><div id=v ${loop ? 'data-kniff-loop' : ''}><div class=slide>A</div><div class=slide>B</div><div class=slide>C</div></div></div><div id=buttons></div>`)
  await page.evaluate(async () => {
    const { mountNavigation } = await import(String('/e2e/fixture/navigationHarness.ts'))
    ;(window as any).navigationRoot = mountNavigation(document.querySelector('#buttons')!)
  })
  await expect(page.getByRole('button', { name: 'Next slide' })).toBeEnabled()
}

for (const loop of [false, true]) test(`scrolling does not remeasure slide geometry (loop=${loop})`, async ({ page }) => {
  await setup(page, loop)
  // Let initial observer notifications settle before measuring the steady path.
  await page.waitForTimeout(150)
  const reads = await page.evaluate(async () => {
    const original = Element.prototype.getBoundingClientRect
    let count = 0
    Element.prototype.getBoundingClientRect = function () { if (this.matches('#v,.slide')) count++; return original.call(this) }
    const v = document.querySelector<HTMLElement>('#v')!
    for (let i = 0; i < 10; i++) {
      v.scrollLeft = i * 20
      v.dispatchEvent(new Event('scroll'))
      await new Promise(requestAnimationFrame)
    }
    Element.prototype.getBoundingClientRect = original
    return count
  })
  expect(reads).toBe(0)
  await expect(page.getByRole('button', { name: 'Previous slide' })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Next slide' })).toBeEnabled()
})

test('finite navigation updates at edges, after resize, and after inserting slides', async ({ page }) => {
  await setup(page, false)
  const prev = page.getByRole('button', { name: 'Previous slide' })
  const next = page.getByRole('button', { name: 'Next slide' })
  await expect(prev).toBeDisabled()
  await next.click()
  await expect(prev).toBeEnabled()
  await page.locator('#v').evaluate(v => { v.scrollLeft = v.scrollWidth })
  await expect(next).toBeDisabled()
  await page.locator('#s').evaluate(s => { s.style.width = '1000px' })
  await expect(prev).toBeDisabled()
  await expect(next).toBeDisabled()
  await page.locator('#v').evaluate(v => { const slide = document.createElement('div'); slide.className = 'slide'; slide.textContent = 'D'; v.append(slide) })
  await page.locator('#v').evaluate(v => { v.scrollLeft = 0 })
  await expect(next).toBeEnabled()
  await next.click()
  await expect(next).toBeDisabled()
  await expect(prev).toBeEnabled()
})

test('loop availability tracks becoming finite and losing its scroll range', async ({ page }) => {
  await setup(page, true)
  const prev = page.getByRole('button', { name: 'Previous slide' })
  await expect(prev).toBeEnabled()
  await page.locator('#v').evaluate(v => v.removeAttribute('data-kniff-loop'))
  await expect(prev).toBeDisabled()
  await page.locator('#v').evaluate(v => v.setAttribute('data-kniff-loop', ''))
  await expect(prev).toBeEnabled()
  await page.locator('#s').evaluate(s => { s.style.width = '1000px' })
  await expect(prev).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Next slide' })).toBeDisabled()
})

test('finite cache updates when inherited gap changes without resizing slides', async ({ page }) => {
  await setup(page, false)
  const next = page.getByRole('button', { name: 'Next slide' })
  await page.locator('#v').evaluate(v => { v.style.scrollSnapType = 'none'; v.scrollLeft = v.scrollWidth })
  await expect(next).toBeDisabled()
  await page.locator('#s').evaluate(s => s.style.setProperty('--gap', '100px'))
  await expect(next).toBeEnabled()
  await next.click()
  await expect(next).toBeDisabled()
})
