import {test,expect} from '@playwright/test'

for (const padding of ['0px','40px 96px 40px 32px']) for (const size of [{width:'25%',height:'60%'},{width:'175px',height:'95px'},{width:'70%',height:'45%'}]) test(`canvas last frame keeps ${size.width} × ${size.height}, padding ${padding}`,async({page})=>{
  await page.goto('/')
  await page.setContent(`<div aria-label="Canvas boundary"><div aria-label="Canvas slides" style="gap:24px;width:600px"><div id="viewport" style="position:relative;display:flex;box-sizing:border-box;width:600px;height:300px;padding:${padding};gap:24px"><div class="slide" data-framer-name="Photo 1">One</div><div class="slide" data-framer-name="Photo 2">Two</div><div class="slide last" data-framer-name="Photo 3" style="width:${size.width};height:${size.height}">Three</div><div data-kniff-ramka-settings style="position:absolute">Settings</div></div></div></div><div id="settings"></div><style>.slide{flex-shrink:0;width:50%;height:100%;background:steelblue}</style>`)
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
