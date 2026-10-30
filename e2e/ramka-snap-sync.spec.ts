import {test,expect} from '@playwright/test'

for (const align of ['start','center','end'] as const) test(`Ramka leaves opening position unchanged and matches arrow alignment (${align})`,async({page})=>{
  await page.goto('/')
  await page.setContent('<div id="mount"></div>')
  await page.evaluate(async align=>{
    const {mountReactLoop}=await import(String('/e2e/fixture/reactLoopHarness.tsx'))
    mountReactLoop(document.querySelector('#mount'),{align})
  },align)
  const viewport=page.locator('#react-loop')
  await expect(viewport).toHaveAttribute('data-kniff-loop-ready','')
  const initial=await viewport.evaluate(el=>{
    el.addEventListener('scrollend',e=>e.stopImmediatePropagation(),true)
    const slide=el.querySelectorAll<HTMLElement>('[data-kniff-loop-copy]')[2]!.querySelector<HTMLElement>('[data-slide="1"]')!
    el.style.scrollSnapType='none'
    el.style.scrollBehavior='auto'
    el.scrollLeft=slide.offsetLeft+37
    return el.scrollLeft
  })
  // Observe a real carousel arrow first, then open at the same unsnapped offset.
  await page.getByRole('button',{name:'Next slide',exact:true}).click()
  await expect.poll(()=>viewport.evaluate((el,initial)=>Math.abs(el.scrollLeft-initial),initial)).toBeGreaterThan(50)
  await page.waitForTimeout(650)
  const arrowPosition=await viewport.evaluate(el=>el.scrollLeft)
  const point=await viewport.evaluate((el,initial)=>{
    el.scrollTo({left:initial,behavior:'instant'})
    const slide=el.querySelectorAll<HTMLElement>('[data-kniff-loop-copy]')[2]!.querySelector<HTMLElement>('[data-slide="1"]')!
    const rect=slide.getBoundingClientRect(),box=el.getBoundingClientRect()
    return {x:Math.max(rect.left,box.left)+20,y:rect.top+rect.height/2}
  },initial)
  await page.mouse.click(point.x,point.y)
  await expect(page.getByRole('button',{name:'Close',exact:true})).toBeVisible()
  await expect(viewport).toHaveAttribute('data-kniff-auto-move-paused','')
  await page.waitForTimeout(850)
  expect(await viewport.evaluate(el=>el.scrollLeft)).toBeCloseTo(initial,0)
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('[data-kniff-loop-copy]').nth(2).locator('[data-slide="2"]')).toHaveAttribute('data-active','')
  await expect.poll(()=>viewport.evaluate(el=>el.scrollLeft)).toBeCloseTo(arrowPosition,0)
  await page.getByRole('button',{name:'Close',exact:true}).click()
  await expect(viewport).not.toHaveAttribute('data-kniff-lightbox-open','')
})

test('disabling sync still freezes motion but never repositions on lightbox navigation',async({page})=>{
  await page.goto('/')
  await page.setContent('<div id="mount"></div>')
  await page.evaluate(async()=>{
    const {mountReactLoop}=await import(String('/e2e/fixture/reactLoopHarness.tsx'))
    mountReactLoop(document.querySelector('#mount'),{autoMove:true,sync:false})
  })
  const viewport=page.locator('#react-loop')
  await expect(viewport).toHaveAttribute('data-kniff-auto-move','running')
  await page.locator('[data-kniff-loop-original] [data-slide="0"]').click()
  await expect(viewport).toHaveAttribute('data-kniff-auto-move','held')
  await page.waitForTimeout(850)
  const initial=await viewport.evaluate(el=>el.scrollLeft)
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(600)
  expect(await viewport.evaluate(el=>el.scrollLeft)).toBeCloseTo(initial,0)
  await page.getByRole('button',{name:'Close',exact:true}).click()
  await expect(viewport).toHaveAttribute('data-kniff-auto-move','running')
})
