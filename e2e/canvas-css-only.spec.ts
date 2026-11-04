import {test,expect} from '@playwright/test'

test('each canvas breakpoint retains its own first-slide measurement when another settings instance unmounts', async ({page}) => {
  await page.goto('/')
  await page.setContent(`<div aria-label="Canvas boundary">${[1200,900,390].map((width,i)=>`<div aria-label="Canvas slides" data-testid="breakpoint-${i}" style="display:flex;width:${width}px"><div data-framer-name="First" style="flex:none;width:${[400,300,200][i]}px;height:100px"></div><div data-framer-name="Second" style="flex:none;width:100px;height:100px"></div><div class="settings"></div></div>`).join('')}</div>`)
  await page.evaluate(async () => {
    const {mountCanvasSettings} = await import(String('/e2e/fixture/reactLoopHarness.tsx'))
    ;(window as any).canvasRoots = await Promise.all(Array.from(document.querySelectorAll<HTMLElement>('.settings')).map(el => mountCanvasSettings(el, 'center')))
  })
  await expect.poll(() => page.locator('[aria-label="Canvas slides"]').evaluateAll(viewports => viewports.map(v => parseFloat((v as HTMLElement).style.getPropertyValue('--kniff-canvas-first-width'))))).toEqual([400,300,200])
  await page.evaluate(() => (window as any).canvasRoots[0].unmount())
  await expect.poll(() => page.locator('[aria-label="Canvas slides"]').evaluateAll(viewports => viewports.map(v => parseFloat((v as HTMLElement).style.getPropertyValue('--kniff-canvas-first-width'))))).toEqual([NaN,300,200])
})

for (const align of ['center', 'end'] as const) test(`canvas ${align} alignment measures every breakpoint viewport`, async ({page}) => {
  await page.goto('/')
  await page.setContent(`<div aria-label="Canvas boundary">${[1200, 900, 390].map((width, i) => `<div aria-label="Canvas slides" data-testid="breakpoint-${i}" style="display:flex;width:${width}px;gap:24px"><div data-framer-name="First" style="flex:none;width:${[400, 300, 200][i]}px;height:100px">First</div><div data-framer-name="Second" style="flex:none;width:200px;height:100px">Second</div></div>`).join('')}</div><div id="settings"></div>`)
  await page.evaluate(async alignment => {
    const {mountCanvasSettings} = await import(String('/e2e/fixture/reactLoopHarness.tsx'))
    await mountCanvasSettings(document.querySelector('#settings')!, alignment)
  }, align)
  for (const [index, width, firstWidth] of [[0,1200,400],[1,900,300],[2,390,200]] as const) {
    await expect.poll(() => page.getByTestId(`breakpoint-${index}`).evaluate(viewport => {
      const first = viewport.querySelector<HTMLElement>('[data-framer-name="First"]')!
      return {measured:parseFloat(viewport.style.getPropertyValue('--kniff-canvas-first-width')),margin:parseFloat(getComputedStyle(first).marginInlineStart)}
    })).toEqual({measured:firstWidth,margin:(width-firstWidth)*(align==='center'?.5:1)})
  }
})

test('canvas alignment follows first-slide resizes and replacements', async ({page}) => {
  await page.goto('/')
  await page.setContent('<div aria-label="Canvas boundary"><div aria-label="Canvas slides" style="display:flex;width:600px;gap:24px"><div data-framer-name="First" style="flex:none;width:200px;height:100px">First</div><div data-framer-name="Second" style="flex:none;width:100px;height:100px">Second</div></div></div><div id="settings"></div>')
  await page.evaluate(async () => {
    const {mountCanvasSettings} = await import(String('/e2e/fixture/reactLoopHarness.tsx'))
    await mountCanvasSettings(document.querySelector('#settings'), 'center')
  })
  const geometry = () => page.locator('[aria-label="Canvas slides"]').evaluate(viewport => {
    const first = viewport.querySelector<HTMLElement>('[data-framer-name="First"]')!
    return {width:parseFloat((viewport as HTMLElement).style.getPropertyValue('--kniff-canvas-first-width')),margin:parseFloat(getComputedStyle(first).marginInlineStart)}
  })
  await expect.poll(geometry).toEqual({width:200,margin:200})
  await page.locator('[data-framer-name="First"]').evaluate(first => { (first as HTMLElement).style.width = '300px' })
  await expect.poll(geometry).toEqual({width:300,margin:150})
  await page.locator('[data-framer-name="First"]').evaluate(first => {
    const replacement = first.cloneNode(true) as HTMLElement
    replacement.style.width = '400px'
    first.replaceWith(replacement)
  })
  await expect.poll(geometry).toEqual({width:400,margin:100})
})

for (const padding of ['0px','40px 96px 40px 32px']) for (const size of [{width:'25%',height:'60%'},{width:'175px',height:'95px'},{width:'70%',height:'45%'}]) test(`canvas last frame keeps ${size.width} × ${size.height}, padding ${padding}`,async({page})=>{
  await page.goto('/')
  await page.setContent(`<div aria-label="Canvas boundary"><div style="gap:24px;width:600px"><div id="viewport" aria-label="Canvas slides" style="position:relative;display:flex;box-sizing:border-box;width:600px;height:300px;padding:${padding};gap:24px"><div class="slide" data-framer-name="Photo 1">One</div><div class="slide" data-framer-name="Photo 2">Two</div><div class="slide last" data-framer-name="Photo 3" style="width:${size.width};height:${size.height}">Three</div><div data-kniff-ramka-settings style="position:absolute">Settings</div></div></div></div><div id="settings"></div><style>.slide{flex-shrink:0;width:50%;height:100%;background:steelblue}</style>`)
  // Record the last frame's own authored size before canvas CSS positions it.
  const authored=await page.locator('.last').evaluate(el=>{const r=el.getBoundingClientRect();return {width:r.width,height:r.height}})
  await page.evaluate(async()=>{
    const {mountCanvasSettings}=await import(String('/e2e/fixture/reactLoopHarness.tsx'))
    await mountCanvasSettings(document.querySelector('#settings'))
  })
  await expect(page.locator('.slide')).toHaveCount(3)
  await expect(page.locator('.last')).toHaveCSS('position','absolute')
  await expect(page.locator('.last')).toHaveCSS('opacity','0.5')
  await expect(page.locator('[data-kniff-canvas-loop-last], [data-kniff-loop-copy]')).toHaveCount(0)
  const geometry=()=>page.locator('.slide').evaluateAll(slides=>{
    const first=slides[0]!.getBoundingClientRect(),last=slides.at(-1)!.getBoundingClientRect()
    return {gap:first.left-last.right,width:last.width,height:last.height,top:first.top-last.top}
  })
  await expect.poll(async()=>{const actual=await geometry();return Math.max(Math.abs(actual.gap-24),Math.abs(actual.width-authored.width),Math.abs(actual.height-authored.height),Math.abs(actual.top))}).toBeLessThan(0.5)
  await page.locator('.slide').first().evaluate(el=>{(el as HTMLElement).style.setProperty('margin-inline-start','110px','important')})
  await expect.poll(async()=>{const actual=await geometry();return Math.max(Math.abs(actual.gap-24),Math.abs(actual.width-authored.width),Math.abs(actual.height-authored.height),Math.abs(actual.top))}).toBeLessThan(0.5)
})
