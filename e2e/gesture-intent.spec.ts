import { test, expect } from '@playwright/test'

test('vertical touch and wheel preserve automatic motion without snapping', async ({ page }) => {
  await page.goto('/')
  await page.setContent(`<style>body{margin:0;min-height:2000px}#v{margin-top:200px;width:360px;display:flex;gap:24px;overflow-x:auto;scroll-snap-type:x mandatory;overflow-anchor:none}.slide{width:240px;height:200px;flex:none;scroll-snap-align:start}</style><div id=v data-kniff-loop>${Array.from({length:21},(_,i)=>`<div class=slide ${i<9||i>=12?'data-kniff-loop-copy':''}>${i%3}</div>`).join('')}</div>`)
  await page.evaluate(async()=>{
    const v=document.querySelector<HTMLElement>('#v')!;v.scrollLeft=2376
    const m=await import(String('/src/scroll-snap/autoMove.tsx'))
    ;(window as any).disposeAuto=m.installAutoMove(v,{speed:60,direction:'left'})
  })
  await expect(page.locator('#v')).toHaveAttribute('data-kniff-auto-move','running')
  await page.waitForTimeout(200)
  const result=await page.evaluate(async()=>{
    const v=document.querySelector<HTMLElement>('#v')!, slide=v.querySelector<HTMLElement>('.slide')!
    const scroll=v.scrollLeft, left=slide.getBoundingClientRect().left
    const phases:string[]=[];const observer=new MutationObserver(()=>phases.push(v.dataset.kniffAutoMove!));observer.observe(v,{attributes:true,attributeFilter:['data-kniff-auto-move']})
    v.dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',button:0,clientX:180,clientY:100,bubbles:true}))
    const start=new Event('touchstart',{bubbles:true});Object.defineProperty(start,'touches',{value:[{clientX:180,clientY:100}]});v.dispatchEvent(start)
    v.dispatchEvent(new PointerEvent('pointermove',{pointerType:'touch',clientX:182,clientY:50,bubbles:true}))
    const move=new Event('touchmove',{bubbles:true});Object.defineProperty(move,'touches',{value:[{clientX:182,clientY:50}]});v.dispatchEvent(move)
    const intent=v.dataset.kniffTouchIntent
    v.dispatchEvent(new WheelEvent('wheel',{deltaY:100,bubbles:true}))
    window.scrollBy(0,100)
    await new Promise(r=>setTimeout(r,400))
    const beforeEnd=v.dataset.kniffAutoMove
    window.dispatchEvent(new PointerEvent('pointerup',{pointerType:'touch',clientX:182,clientY:50}))
    const end=new Event('touchend');Object.defineProperty(end,'touches',{value:[]});window.dispatchEvent(end)
    await new Promise(requestAnimationFrame)
    observer.disconnect()
    return {intent,beforeEnd,phase:v.dataset.kniffAutoMove,phases,scrollDelta:v.scrollLeft-scroll,visualDelta:slide.getBoundingClientRect().left-left,pageScroll:window.scrollY}
  })
  expect(result.intent).toBe('vertical')
  expect(result.beforeEnd).toBe('running')
  expect(result.phase).toBe('running')
  expect(result.phases).toEqual([])
  expect(result.pageScroll).toBe(100)
  expect(-result.visualDelta).toBeGreaterThan(12)
  expect(-result.visualDelta).toBeLessThan(40)
  expect(result.scrollDelta).toBeGreaterThan(12)
  expect(result.scrollDelta).toBeLessThan(40)
})

test('fractional loop seam settles once and resumes', async ({ page }) => {
  await page.goto('/')
  await page.setContent(`<style>body{margin:0}#v{width:360px;display:flex;gap:24px;overflow-x:auto;scroll-snap-type:x mandatory;transform:translateX(.13px)}.slide{width:240.13px;height:200px;flex:none;scroll-snap-align:start}</style><div id=v data-kniff-loop>${Array.from({length:21},(_,i)=>`<div class=slide ${i<9||i>=12?'data-kniff-loop-copy':''}>${i%3}</div>`).join('')}</div>`)
  await page.evaluate(async()=>{
    const v=document.querySelector<HTMLElement>('#v')!
    v.style.scrollSnapType='none';v.scrollLeft=2377;v.style.scrollSnapType='x mandatory'
    const m=await import(String('/src/scroll-snap/autoMove.tsx'))
    ;(window as any).disposeAuto=m.installAutoMove(v,{speed:60,direction:'left'})
  })
  await expect(page.locator('#v')).toHaveAttribute('data-kniff-auto-move','running')
  await page.waitForTimeout(250)
  await page.evaluate(()=>{
    const v=document.querySelector<HTMLElement>('#v')!
    v.dispatchEvent(new WheelEvent('wheel',{deltaX:-100,bubbles:true}))
    const first=v.children[9]!, origin=v.scrollLeft+first.getBoundingClientRect().left-v.getBoundingClientRect().left
    v.scrollLeft=origin-.001
  })
  await page.waitForFunction(()=>document.querySelector<HTMLElement>('#v')?.dataset.kniffAutoMove==='waiting',null,{timeout:5000})
  await expect(page.locator('#v')).toHaveAttribute('data-kniff-auto-move','running',{timeout:5000})
  await page.waitForTimeout(500)
  await expect(page.locator('#v')).toHaveAttribute('data-kniff-auto-move','running')
})
