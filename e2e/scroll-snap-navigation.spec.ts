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

test('a button targets the nearest visible viewport when IDs repeat', async ({ page }) => {
  await page.goto('/')
  await page.setContent(`<style>.sizing{width:360px;margin-bottom:80px}.viewport{display:flex;gap:24px;overflow-x:auto;scroll-snap-type:x mandatory}.slide{flex:none;width:240px;height:100px;scroll-snap-align:start}</style><div id=first class=sizing data-framer-name="Navigation Test"><div id=first-v class=viewport><div class=slide>A</div><div class=slide>B</div><div class=slide>C</div></div></div><div id=second class=sizing data-framer-name="Navigation Test"><div id=second-v class=viewport><div class=slide>A</div><div class=slide>B</div><div class=slide>C</div></div></div><div id=buttons></div>`)
  await page.evaluate(async () => {
    const { mountNavigation } = await import(String('/e2e/fixture/navigationHarness.ts'))
    ;(window as any).navigationRoot = mountNavigation(document.querySelector('#buttons')!)
  })
  await page.getByRole('button', { name: 'Next slide' }).click()
  await expect.poll(() => page.locator('#second-v').evaluate(v => v.scrollLeft)).toBeGreaterThan(0)
  expect(await page.locator('#first-v').evaluate(v => v.scrollLeft)).toBe(0)
})

test('a button can target the overflow viewport directly', async ({ page }) => {
  await page.goto('/')
  await page.setContent('<style>#v{display:flex;width:360px;gap:24px;overflow-x:auto;scroll-snap-type:x mandatory}.slide{flex:none;width:240px;height:100px;scroll-snap-align:start}</style><div id="v" data-framer-name="Navigation Test" data-kniff-react-loop><div class="slide">A</div><div class="slide">B</div><div class="slide">C</div></div><div id="buttons"></div>')
  await page.evaluate(async () => {
    const { mountNavigation } = await import(String('/e2e/fixture/navigationHarness.ts'))
    mountNavigation(document.querySelector('#buttons')!)
  })
  await page.getByRole('button', { name: 'Next slide' }).click()
  await expect.poll(() => page.locator('#v').evaluate(v => v.scrollLeft)).toBeGreaterThan(0)
})

test('a button below its viewport stays with its own carousel section', async ({ page }) => {
  await page.goto('/')
  await page.setContent('<style>.section{width:360px}.viewport{display:flex;width:360px;gap:24px;overflow-x:auto;scroll-snap-type:x mandatory}.slide{flex:none;width:240px;height:100px;scroll-snap-align:start}.buttons{margin-top:24px;height:44px}.section+ .section{margin-top:8px}</style><section class="section"><div id="first-v" class="viewport" data-framer-name="Navigation Test" data-kniff-react-loop><div class="slide">A</div><div class="slide">B</div><div class="slide">C</div></div><div id="first-buttons" class="buttons"></div></section><section class="section"><div id="second-v" class="viewport" data-framer-name="Navigation Test" data-kniff-react-loop><div class="slide">A</div><div class="slide">B</div><div class="slide">C</div></div><div id="second-buttons" class="buttons"></div></section>')
  await page.evaluate(async () => {
    const { mountNavigation } = await import(String('/e2e/fixture/navigationHarness.ts'))
    mountNavigation(document.querySelector('#first-buttons')!)
    mountNavigation(document.querySelector('#second-buttons')!)
  })
  await page.getByRole('button', { name: 'Next slide' }).first().click()
  await expect.poll(() => page.locator('#first-v').evaluate(v => v.scrollLeft)).toBeGreaterThan(0)
  expect(await page.locator('#second-v').evaluate(v => v.scrollLeft)).toBe(0)
})

test('a button reselects its viewport on activation after its section changes', async ({ page }) => {
  await page.goto('/')
  await page.setContent('<style>.viewport{display:flex;width:360px;gap:24px;overflow-x:auto;scroll-snap-type:x mandatory}.slide{flex:none;width:240px;height:100px;scroll-snap-align:start}</style><section id="first"><div id="first-v" class="viewport" data-framer-name="Navigation Test" data-kniff-react-loop><div class="slide">A</div><div class="slide">B</div><div class="slide">C</div></div></section><section id="second"><div id="second-v" class="viewport" data-framer-name="Navigation Test" data-kniff-react-loop><div class="slide">A</div><div class="slide">B</div><div class="slide">C</div></div><div id="buttons"></div></section>')
  await page.evaluate(async () => {
    const { mountNavigation } = await import(String('/e2e/fixture/navigationHarness.ts'))
    mountNavigation(document.querySelector('#buttons')!)
  })
  await expect(page.getByRole('button', { name: 'Next slide' })).toBeEnabled()
  await page.evaluate(() => {
    document.querySelector('#first')!.append(document.querySelector('#buttons')!)
    document.querySelector<HTMLButtonElement>('#buttons button[aria-label="Next slide"]')!.click()
  })
  await expect.poll(() => page.locator('#first-v').evaluate(v => v.scrollLeft)).toBeGreaterThan(0)
  expect(await page.locator('#second-v').evaluate(v => v.scrollLeft)).toBe(0)
})

test('a breakpoint switch rebinds availability and stops the old movement', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 })
  await page.goto('/')
  await page.setContent(`<style>.sizing{width:360px}.viewport{display:flex;gap:24px;overflow-x:auto;scroll-snap-type:x mandatory}.slide{flex:none;width:240px;height:100px;scroll-snap-align:start}@media(max-width:699px){#desktop{display:none}}@media(min-width:700px){#phone{display:none}}</style><div id=desktop class=sizing data-framer-name="Navigation Test"><div id=desktop-v class=viewport><div class=slide>A</div><div class=slide>B</div><div class=slide>C</div></div></div><div id=phone class=sizing data-framer-name="Navigation Test"><div id=phone-v class=viewport><div class=slide>A</div><div class=slide>B</div><div class=slide>C</div></div></div><div id=buttons></div>`)
  await page.evaluate(async () => {
    const { mountNavigation } = await import(String('/e2e/fixture/navigationHarness.ts'))
    ;(window as any).navigationRoot = mountNavigation(document.querySelector('#buttons')!)
  })
  const next = page.getByRole('button', { name: 'Next slide' })
  await expect(next).toBeEnabled()
  await page.locator('#desktop-v').evaluate(v => { v.scrollLeft = v.scrollWidth })
  await expect(next).toBeDisabled()
  await page.locator('#desktop-v').evaluate(v => { v.scrollLeft = 0 })
  await expect(next).toBeEnabled()
  await next.click()
  await page.setViewportSize({ width: 500, height: 700 })
  await expect(next).toBeEnabled()
  const oldPosition = await page.locator('#desktop-v').evaluate(v => v.scrollLeft)
  await page.waitForTimeout(250)
  expect(await page.locator('#desktop-v').evaluate(v => v.scrollLeft)).toBe(oldPosition)
  await next.click()
  await expect.poll(() => page.locator('#phone-v').evaluate(v => v.scrollLeft)).toBeGreaterThan(0)
})
