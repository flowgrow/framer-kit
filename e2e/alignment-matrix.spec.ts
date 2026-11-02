import {test,expect} from '@playwright/test'
test('canvas breakpoint settings do not override other same-name frames',async({page})=>{
 await page.goto('/');await page.setContent('<div id="mount"></div>')
 await page.evaluate(async()=>{const {mountCanvasBreakpoints}=await import(String('/e2e/fixture/alignmentHarness.tsx'));mountCanvasBreakpoints(document.querySelector('#mount'))})
 const positions=()=>page.locator('[data-viewport]').evaluateAll(viewports=>viewports.map(el=>el.querySelector('[data-slide]')!.getBoundingClientRect().left-el.getBoundingClientRect().left))
 // Content widths exclude each breakpoint's authored padding.
 await expect.poll(positions).toEqual([20,140,160])
 await page.locator('[data-breakpoint="0"]').getByRole('button',{name:'Change alignment'}).click()
 await expect.poll(positions).toEqual([190,140,160])
 await page.locator('[data-breakpoint="1"]').getByRole('button',{name:'Change alignment'}).click()
 await expect.poll(positions).toEqual([190,260,160])
 await page.locator('[data-breakpoint="0"]').getByRole('button',{name:'Toggle edge space'}).click()
 await expect.poll(positions).toEqual([20,260,160])
})
for(const canvas of [false,true])for(const align of ['start','center','end'] as const)for(const edgeSpace of [false,true])test(`${canvas?'canvas':'preview'} ${align} edgeSpace=${edgeSpace} every slide`,async({page})=>{
 await page.setViewportSize({width:1000,height:700});await page.goto('/');await page.setContent('<style>body{margin:0}</style><div id="mount"></div>')
 await page.evaluate(async options=>{const {mountAlignment}=await import(String('/e2e/fixture/alignmentHarness.tsx'));mountAlignment(document.querySelector('#mount'),options)},{align,edgeSpace,canvas})
 const viewport=page.locator('#alignment-viewport');await expect(viewport.locator('[data-slide]')).toHaveCount(5)
 const measure=()=>viewport.evaluate((el,{align,canvas})=>{const css=getComputedStyle(el),box=el.getBoundingClientRect(),left=parseFloat(canvas?css.paddingLeft:css.scrollPaddingLeft),right=parseFloat(canvas?css.paddingRight:css.scrollPaddingRight),factor=align==='center'?.5:align==='end'?1:0;return {scroll:el.scrollLeft,max:el.scrollWidth-el.clientWidth,left,right,inner:el.clientWidth-left-right,slides:[...el.querySelectorAll<HTMLElement>('[data-slide]')].map(slide=>{const r=slide.getBoundingClientRect();return {x:r.left-box.left,width:r.width,ideal:left+factor*(el.clientWidth-left-right-r.width)}})}},{align,canvas})
 if(canvas){await expect.poll(async()=>{const m=await measure();return Math.abs(m.slides[0]!.x-(edgeSpace?m.slides[0]!.ideal:m.left))}).toBeLessThan(1);const m=await measure();for(let i=1;i<m.slides.length;i++)expect(m.slides[i]!.x-m.slides[i-1]!.x-m.slides[i-1]!.width).toBeCloseTo(24,0);return}
 // Edge spacing must align the first slide at scrollLeft 0 on untouched load.
 if(edgeSpace) await expect.poll(async()=>Math.abs((await measure()).scroll)).toBeLessThan(1)
 // Assert the untouched load position before any programmatic scrolling.
 await expect.poll(async()=>{const m=await measure(),first=m.slides[0]!;const desired=m.scroll+first.x-first.ideal;return Math.abs(m.scroll-Math.max(0,Math.min(m.max,desired)))}).toBeLessThan(1)
 for(let index=0;index<5;index++){const m=await measure(),slide=m.slides[index]!,desired=m.scroll+slide.x-slide.ideal,expected=Math.max(0,Math.min(m.max,desired));await viewport.evaluate((el,left)=>el.scrollTo({left,behavior:'instant'}),expected);await expect.poll(async()=>Math.abs((await measure()).scroll-expected)).toBeLessThan(1);if(edgeSpace){const actual=(await measure()).slides[index]!;expect(actual.x).toBeCloseTo(actual.ideal,0)}}
})
