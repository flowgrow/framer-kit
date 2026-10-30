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
  // Changing only gap does not resize the first slide.
  for (const gap of [0, 12, 53]) {
    await page.locator('[aria-label="Canvas slides"]').evaluate((el,gap)=>{(el as HTMLElement).style.gap=gap+'px'},gap)
    await expect.poll(async()=>{const actual=await geometry();return Math.max(Math.abs(actual.gap-gap),Math.abs(actual.width-authored.width),Math.abs(actual.height-authored.height),Math.abs(actual.top))}).toBeLessThan(0.5)
  }
  await page.locator('.slide').first().evaluate(el=>{(el as HTMLElement).style.setProperty('margin-inline-start','110px','important')})
  await expect.poll(async()=>{const actual=await geometry();return Math.max(Math.abs(actual.gap-53),Math.abs(actual.width-authored.width),Math.abs(actual.height-authored.height),Math.abs(actual.top))}).toBeLessThan(0.5)
})

test('identically named canvas breakpoint frames keep independent gap and width measurements',async({page})=>{
  await page.goto('/')
  const frames=[{name:'desktop',width:600,gap:48},{name:'tablet',width:400,gap:32},{name:'phone',width:260,gap:12}]
  const markup=(frame:typeof frames[number])=>`<div id="${frame.name}" aria-label="Canvas boundary"><div aria-label="Canvas slides" style="gap:${frame.gap}px;width:${frame.width}px"><div class="viewport" style="position:relative;display:flex;box-sizing:border-box;width:100%;height:200px;padding:20px 32px;gap:inherit"><div data-framer-name="Photo 1" style="flex:none;width:50%;height:100px">One</div><div data-framer-name="Photo 2" style="flex:none;width:100px;height:100px">Two</div><div data-framer-name="Photo 3" style="flex:none;width:25%;height:100px">Three</div></div></div></div>`
  await page.setContent(frames.map(markup).join('')+'<div id="settings"></div>')
  await page.evaluate(async()=>{const {mountCanvasSettings}=await import(String('/e2e/fixture/reactLoopHarness.tsx'));await mountCanvasSettings(document.querySelector('#settings'))})
  const read=(name:string)=>page.locator(`#${name} .viewport`).evaluate(el=>{
    const slides=el.querySelectorAll<HTMLElement>('[data-framer-name]'),first=slides[0]!,last=slides[2]!
    return {gap:first.getBoundingClientRect().left-last.getBoundingClientRect().right,variableGap:parseFloat((el as HTMLElement).style.getPropertyValue('--kniff-canvas-gap')),width:parseFloat((el as HTMLElement).style.getPropertyValue('--kniff-canvas-first-width')),actualWidth:first.offsetWidth}
  })
  for(const frame of frames)await expect.poll(async()=>{const v=await read(frame.name);return Math.max(Math.abs(v.gap-frame.gap),Math.abs(v.variableGap-frame.gap),Math.abs(v.width-v.actualWidth))}).toBeLessThan(0.5)
  await page.locator('#tablet [aria-label="Canvas slides"]').evaluate(el=>{(el as HTMLElement).style.gap='65px';(el as HTMLElement).style.width='450px'})
  for(const frame of frames){const gap=frame.name==='tablet'?65:frame.gap;await expect.poll(async()=>{const v=await read(frame.name);return Math.max(Math.abs(v.gap-gap),Math.abs(v.variableGap-gap),Math.abs(v.width-v.actualWidth))}).toBeLessThan(0.5)}
  // Breakpoints can be mounted after the settings component in the editor.
  await page.evaluate(html=>document.querySelector('#settings')!.insertAdjacentHTML('beforebegin',html),markup({name:'new-phone',width:220,gap:7}))
  await expect.poll(async()=>{const v=await read('new-phone');return Math.max(Math.abs(v.gap-7),Math.abs(v.variableGap-7),Math.abs(v.width-v.actualWidth))}).toBeLessThan(0.5)
})
