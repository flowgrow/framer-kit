import {test,expect} from '@playwright/test'

for(const canvas of [false,true])for(const align of ['start','center','end'] as const)for(const edgeSpace of [false,true])test(`${canvas?'canvas':'preview'} padded wrapper ${align} edgeSpace=${edgeSpace}`,async({page})=>{
 await page.setViewportSize({width:1200,height:700});await page.goto('/');await page.setContent('<style>body{margin:0}</style><div id="mount"></div>')
 await page.evaluate(async options=>{const {mountAlignment}=await import(String('/e2e/fixture/alignmentHarness.tsx'));mountAlignment(document.querySelector('#mount'),options)},{align,edgeSpace,canvas,paddingWrapper:true})
 const viewport=page.locator('#alignment-viewport')
 await expect(viewport.locator('[data-slide]')).toHaveCount(5)
 for(const width of [1200,900,390,1200]){
  await page.setViewportSize({width,height:700})
  const padding=width<810?24:width<1200?48:0,contentWidth=Math.min(600,width-padding*2),left=(width-contentWidth)/2,right=left+64
  const geometry=()=>viewport.evaluate((el,{align,canvas})=>{const box=el.getBoundingClientRect(),css=getComputedStyle(el),left=parseFloat(canvas?css.paddingLeft:css.scrollPaddingLeft),right=parseFloat(canvas?css.paddingRight:css.scrollPaddingRight),factor=align==='start'?0:align==='end'?1:.5;return {left:box.left+left,right:innerWidth-box.right+right,width:box.width,scroll:el.scrollLeft,max:el.scrollWidth-el.clientWidth,slides:[...el.querySelectorAll<HTMLElement>('[data-slide]')].map(slide=>{const r=slide.getBoundingClientRect();return {x:r.left,width:r.width,ideal:box.left+left+factor*(el.clientWidth-left-right-r.width)}})}},{align,canvas})
  await expect.poll(async()=>{const m=await geometry();return Math.max(Math.abs(m.left-left),Math.abs(m.right-right),Math.abs(m.slides[0]!.width-(contentWidth-64)/2))}).toBeLessThan(1)
  if(canvas){await expect.poll(async()=>{const m=await geometry();return Math.abs(m.slides[0]!.x-(edgeSpace?m.slides[0]!.ideal:left))}).toBeLessThan(1);continue}
  await expect(viewport).toHaveCSS('width',`${width}px`)
  for(let index=0;index<5;index++){
   const m=await geometry(),slide=m.slides[index]!,expected=Math.max(0,Math.min(m.max,m.scroll+slide.x-slide.ideal))
   await viewport.evaluate((el,left)=>el.scrollTo({left,behavior:'instant'}),expected)
   await expect.poll(async()=>Math.abs((await geometry()).scroll-expected)).toBeLessThan(1)
   if(edgeSpace){const actual=(await geometry()).slides[index]!;expect(Math.abs(actual.x-actual.ideal)).toBeLessThan(1)}
  }
 }
})
