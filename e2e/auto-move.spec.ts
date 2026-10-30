import { test, expect } from '@playwright/test'

async function setup(page: import('@playwright/test').Page, direction='left', loop=true, speed=30, offscreen=false) {
  await page.goto('/')
  await page.setContent(`<style>body{margin:0}#v{width:360px;display:flex;gap:24px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-padding:24px;padding:24px;box-sizing:border-box}.ssr-variant{display:contents}.slide{flex:none;width:240px;height:200px;scroll-snap-align:start;background:steelblue}</style><div id=v>${Array.from({length:loop?21:3},(_,i)=>`<div class=ssr-variant ${loop&&(i<9||i>=12)?'data-kniff-loop-copy':''}><div class=slide>${i%3}</div></div>`).join('')}</div>`)
  await page.evaluate(async ({direction,loop,speed,offscreen})=>{
    const v=document.querySelector<HTMLElement>('#v')!
    if(offscreen) v.style.marginTop='2000px'
    if(loop){ v.dataset.kniffLoop=''; v.scrollLeft=2376 }
    const module=await import(/* @vite-ignore */ String('/src/scroll-snap/autoMove.tsx'))
    ;(window as any).disposeAuto=module.installAutoMove(v,{speed,direction})
    ;(window as any).samples=[]
    const sample=(time:number)=>{(window as any).samples.push({time,x:v.scrollLeft,phase:v.dataset.kniffAutoMove});requestAnimationFrame(sample)};requestAnimationFrame(sample)
  },{direction,loop,speed,offscreen})
  if (!offscreen) await expect(page.locator('#v')).toHaveAttribute('data-kniff-auto-move',/running|waiting/)
}

test('continuous speed, seamless wraps, interruption, snap and 300ms restart',async({page})=>{
  await setup(page)
  await page.waitForTimeout(1200)
  let samples=await page.evaluate(()=>(window as any).samples) as {time:number,x:number,phase:string}[]
  const a=samples[5]!, b=samples.at(-1)!
  expect((b.x-a.x)/((b.time-a.time)/1000)).toBeGreaterThan(27)
  expect((b.x-a.x)/((b.time-a.time)/1000)).toBeLessThan(33)
  expect(Math.max(...samples.slice(1).map((s,i)=>Math.abs(s.x-samples[i]!.x)))).toBeLessThan(4)
  await page.evaluate(()=>{const v=document.querySelector<HTMLElement>('#v')!;v.dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch'}));v.dispatchEvent(new PointerEvent('pointermove',{pointerType:'touch',clientX:-30}));v.scrollLeft+=170})
  await page.waitForTimeout(400)
  expect(await page.locator('#v').getAttribute('data-kniff-auto-move')).not.toBe('running')
  await page.evaluate(()=>window.dispatchEvent(new PointerEvent('pointerup')))
  await page.waitForFunction(()=>document.querySelector<HTMLElement>('#v')?.dataset.kniffAutoMove==='waiting')
  const snapped=await page.locator('#v').evaluate(v=>v.scrollLeft)
  expect(Math.abs(snapped/264-Math.round(snapped/264))*264).toBeLessThan(2)
  await page.waitForTimeout(180)
  expect(await page.locator('#v').evaluate(v=>v.scrollLeft)).toBeCloseTo(snapped,0)
  await expect(page.locator('#v')).toHaveAttribute('data-kniff-auto-move','running')
  await page.waitForTimeout(300)
  expect(await page.locator('#v').evaluate(v=>v.scrollLeft)).toBeGreaterThan(snapped+3)
  // Force a wrap within the next few frames and measure modulo the cycle.
  await page.evaluate(()=>{(window as any).disposeAuto();const v=document.querySelector<HTMLElement>('#v')!;v.style.scrollSnapType='none';v.scrollLeft=3166})
  await page.evaluate(async()=>{const m=await import(/* @vite-ignore */ String('/src/scroll-snap/autoMove.tsx'));(window as any).disposeAuto=m.installAutoMove(document.querySelector('#v'),{speed:120,direction:'left'})})
  await page.waitForTimeout(400)
  const wrapped=await page.locator('#v').evaluate(v=>v.scrollLeft)
  expect(wrapped).toBeGreaterThan(2376);expect(wrapped).toBeLessThan(2490)
  await page.evaluate(()=>(window as any).disposeAuto())
  expect(await page.locator('#v').getAttribute('data-kniff-auto-move')).toBeNull()
})

test('reverse direction and finite edge',async({page})=>{
  await setup(page,'right',false,120)
  await page.waitForTimeout(450)
  expect(await page.locator('#v').evaluate(v=>v.scrollLeft)).toBe(0)
  await page.evaluate(()=>(window as any).disposeAuto())
})

test('wheel interruption resumes; reduced motion stays still',async({page})=>{
  await setup(page)
  await page.locator('#v').dispatchEvent('wheel',{deltaX:100})
  await page.waitForFunction(()=>document.querySelector<HTMLElement>('#v')?.dataset.kniffAutoMove==='waiting')
  await expect(page.locator('#v')).toHaveAttribute('data-kniff-auto-move','running')
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.waitForTimeout(400)
  const before=await page.locator('#v').evaluate(v=>v.scrollLeft)
  await page.waitForTimeout(400)
  expect(await page.locator('#v').evaluate(v=>v.scrollLeft)).toBe(before)
})

test('mouse down and movement do not interrupt automove or drag the carousel',async({page,isMobile})=>{
  test.skip(isMobile,'Mouse-specific behavior')
  await setup(page)
  const v=page.locator('#v'), box=(await v.boundingBox())!
  await page.mouse.move(box.x+260,box.y+100);await page.mouse.down()
  const before=await v.evaluate(el=>el.scrollLeft)
  await page.mouse.move(box.x+100,box.y+100,{steps:10})
  expect(await v.getAttribute('data-kniff-auto-move')).toBe('running')
  expect(await v.evaluate(el=>el.scrollLeft)-before).toBeLessThan(35)
  expect(await v.evaluate(el=>getComputedStyle(el).scrollSnapType)).toBe('none')
  await page.mouse.up()
})

test('desktop user scroll restores snapping on its first event; auto scroll does not',async({page,isMobile})=>{
  test.skip(isMobile,'Desktop without a touch interface')
  await setup(page)
  await page.waitForTimeout(200)
  const result=await page.locator('#v').evaluate(v=>{
    const before=getComputedStyle(v).scrollSnapType
    v.dispatchEvent(new WheelEvent('wheel',{deltaX:100}))
    const intent=getComputedStyle(v).scrollSnapType
    ;(v as HTMLElement).scrollLeft+=100
    v.dispatchEvent(new Event('scroll'))
    return {before,intent,firstScroll:getComputedStyle(v).scrollSnapType,phase:(v as HTMLElement).dataset.kniffAutoMove}
  })
  expect(result).toEqual({before:'none',intent:'none',firstScroll:'x mandatory',phase:'settling'})
  await expect(page.locator('#v')).toHaveAttribute('data-kniff-auto-move','running')
})

test('touch holds including pointercancel preserve pause until touchend',async({page})=>{
  await setup(page)
  await page.evaluate(()=>{let v=document.querySelector('#v')!;v.dispatchEvent(new Event('touchstart'));const move=new Event('touchmove');Object.defineProperty(move,'touches',{value:[{clientX:40,clientY:0}]});v.dispatchEvent(move);window.dispatchEvent(new PointerEvent('pointercancel'));(v as HTMLElement).scrollLeft+=90})
  await page.waitForTimeout(650)
  expect(await page.locator('#v').getAttribute('data-kniff-auto-move')).not.toBe('running')
  await page.evaluate(()=>{let e=new Event('touchend');Object.defineProperty(e,'touches',{value:[]});window.dispatchEvent(e)})
  await expect(page.locator('#v')).toHaveAttribute('data-kniff-auto-move','running',{timeout:5000})
})

test('settings component integrates React loop copies and automove',async({page})=>{
  await page.goto('/')
  await page.evaluate(async()=>{
    const mount=document.createElement('div');document.body.append(mount)
    const {mountReactLoop}=await import(String('/e2e/fixture/reactLoopHarness.tsx'))
    ;(window as any).settingsRoot=mountReactLoop(mount,{autoMove:true})
  })
  const viewport=page.locator('#react-loop')
  await expect(viewport).toHaveAttribute('data-kniff-loop','')
  await expect(viewport).toHaveAttribute('data-kniff-auto-move','running')
  await expect(viewport.locator(':scope > [data-kniff-loop-copy]')).toHaveCount(6)
  const before=await viewport.evaluate(v=>v.scrollLeft)
  await page.waitForTimeout(700)
  const after=await viewport.evaluate(v=>v.scrollLeft)
  expect(after-before).toBeGreaterThan(15);expect(after-before).toBeLessThan(28)
  await page.evaluate(()=>(window as any).settingsRoot.unmount())
  await expect(viewport).toHaveCount(0)
})

for (const align of ['center','end']) test(`${align} alignment settles before restart`,async({page})=>{
  await setup(page)
  await page.evaluate(async(align)=>{
    ;(window as any).disposeAuto()
    document.querySelectorAll<HTMLElement>('.slide').forEach(s=>s.style.scrollSnapAlign=align)
    const v=document.querySelector<HTMLElement>('#v')!;v.style.scrollSnapType='none';v.scrollLeft=2490
    const m=await import(String('/src/scroll-snap/autoMove.tsx'));(window as any).disposeAuto=m.installAutoMove(v,{speed:30,direction:'left'})
    v.dispatchEvent(new WheelEvent('wheel',{deltaX:90}))
  },align)
  await page.waitForFunction(()=>document.querySelector<HTMLElement>('#v')?.dataset.kniffAutoMove==='waiting')
  const error=await page.locator('#v').evaluate((v,align)=>{
    const box=v.getBoundingClientRect(),css=getComputedStyle(v),left=parseFloat(css.scrollPaddingLeft),right=parseFloat(css.scrollPaddingRight)
    return Math.min(...[...v.querySelectorAll<HTMLElement>('.slide')].map(s=>{const r=s.getBoundingClientRect();return Math.abs(r.left-box.left-left-(v.clientWidth-left-right-r.width)*(align==='center'?.5:1))}))
  },align)
  expect(error).toBeLessThan(2)
  await expect(page.locator('#v')).toHaveAttribute('data-kniff-auto-move','running')
})

test('rightward motion wraps backwards without losing movement',async({page})=>{
  await setup(page,'right',true,120)
  await page.waitForTimeout(450)
  const x=await page.locator('#v').evaluate(v=>v.scrollLeft)
  expect(x).toBeGreaterThan(3050);expect(x).toBeLessThan(3168)
})


test('touch intent defers interruption and restores snapping only for horizontal input',async({page})=>{
  await setup(page)
  await page.waitForTimeout(150)
  const result=await page.locator('#v').evaluate(v=>{
    const before=getComputedStyle(v).scrollSnapType
    v.dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',button:0}))
    const down=getComputedStyle(v).scrollSnapType
    v.dispatchEvent(new Event('touchstart'))
    const pending={snap:getComputedStyle(v).scrollSnapType,phase:(v as HTMLElement).dataset.kniffAutoMove}
    v.dispatchEvent(new PointerEvent('pointermove',{pointerType:'touch',clientX:-30}))
    const horizontal={snap:getComputedStyle(v).scrollSnapType,phase:(v as HTMLElement).dataset.kniffAutoMove}
    ;(v as HTMLElement).scrollLeft+=30;v.dispatchEvent(new Event('scroll'))
    return {before,down,pending,horizontal,native:getComputedStyle(v).scrollSnapType}
  })
  expect(result).toEqual({before:'none',down:'none',pending:{snap:'none',phase:'running'},horizontal:{snap:'none',phase:'held'},native:'x mandatory'})
})


test('desktop asynchronous wheel delivery cannot swallow the first scroll',async({page,isMobile})=>{
  test.skip(isMobile,'Desktop wheel ordering')
  await setup(page)
  await page.waitForTimeout(100)
  const result=await page.locator('#v').evaluate(v=>{
    // Compositor scrolling may update scrollLeft before dispatching wheel.
    ;(v as HTMLElement).scrollLeft+=70
    v.dispatchEvent(new WheelEvent('wheel',{deltaX:70}))
    v.dispatchEvent(new Event('scroll'))
    return {snap:getComputedStyle(v).scrollSnapType,behavior:getComputedStyle(v).scrollBehavior,phase:(v as HTMLElement).dataset.kniffAutoMove}
  })
  expect(result).toEqual({snap:'x mandatory',behavior:'smooth',phase:'settling'})
})

test('real wheel handoff uses native smooth snapping and resumes',async({page,isMobile})=>{
  test.skip(isMobile,'Desktop wheel')
  await setup(page)
  await page.waitForTimeout(1000)
  await page.locator('#v').evaluate(v=>{
    ;(window as any).wheelHandoff=[]
    v.addEventListener('scroll',()=>{if((v as HTMLElement).dataset.kniffAutoMove==='settling')(window as any).wheelHandoff.push({snap:getComputedStyle(v).scrollSnapType,behavior:getComputedStyle(v).scrollBehavior})})
  })
  await page.mouse.move(200,100);await page.mouse.wheel(55,0)
  await page.waitForFunction(()=>(window as any).wheelHandoff.length>0)
  expect(await page.evaluate(()=>(window as any).wheelHandoff[0])).toEqual({snap:'x mandatory',behavior:'smooth'})
  await expect(page.locator('#v')).toHaveAttribute('data-kniff-auto-move','running',{timeout:5000})
})


test('offscreen installation stays still, enters, leaves, and resumes without catch-up',async({page})=>{
  await setup(page,'left',true,30,true)
  const v=page.locator('#v'), initial=await v.evaluate(v=>v.scrollLeft)
  await page.waitForTimeout(500)
  expect(await v.evaluate(v=>v.scrollLeft)).toBe(initial)
  expect(await v.getAttribute('data-kniff-auto-move')).not.toBe('running')
  await v.scrollIntoViewIfNeeded()
  await expect(v).toHaveAttribute('data-kniff-auto-move','running')
  await page.waitForTimeout(300)
  expect(await v.evaluate(v=>v.scrollLeft)).toBeGreaterThan(initial+3)
  await page.evaluate(()=>window.scrollTo(0,0))
  await expect(v).toHaveAttribute('data-kniff-auto-move','held')
  const paused=await v.evaluate(v=>v.scrollLeft)
  await page.waitForTimeout(700)
  expect(await v.evaluate(v=>v.scrollLeft)).toBe(paused)
  await v.scrollIntoViewIfNeeded()
  await expect(v).toHaveAttribute('data-kniff-auto-move','running')
  await page.waitForTimeout(200)
  const resumed=await v.evaluate(v=>v.scrollLeft)
  expect(resumed-paused).toBeGreaterThan(2);expect(resumed-paused).toBeLessThan(14)
})

test('returning onscreen cannot restart while a touch is still held',async({page})=>{
  await setup(page,'left',true,30,true)
  const v=page.locator('#v')
  await v.scrollIntoViewIfNeeded();await expect(v).toHaveAttribute('data-kniff-auto-move','running')
  await v.evaluate(v=>{v.dispatchEvent(new Event('touchstart'));const move=new Event('touchmove');Object.defineProperty(move,'touches',{value:[{clientX:40,clientY:0}]});v.dispatchEvent(move)})
  await page.evaluate(()=>window.scrollTo(0,0))
  await page.waitForTimeout(200)
  await v.scrollIntoViewIfNeeded();await page.waitForTimeout(650)
  expect(await v.getAttribute('data-kniff-auto-move')).not.toBe('running')
  await page.evaluate(()=>{const e=new Event('touchend');Object.defineProperty(e,'touches',{value:[]});window.dispatchEvent(e)})
  await expect(v).toHaveAttribute('data-kniff-auto-move','running')
})


test('clipping by a scrollable ancestor also pauses movement',async({page})=>{
  await setup(page)
  const v=page.locator('#v')
  await v.evaluate(v=>{
    const wrapper=document.createElement('div');wrapper.id='clip';wrapper.style.cssText='height:250px;overflow:auto'
    v.before(wrapper);wrapper.append(v);(v as HTMLElement).style.marginTop='500px'
  })
  await expect(v).toHaveAttribute('data-kniff-auto-move','held')
  const paused=await v.evaluate(v=>v.scrollLeft)
  await page.waitForTimeout(400)
  expect(await v.evaluate(v=>v.scrollLeft)).toBe(paused)
  await page.locator('#clip').evaluate(v=>v.scrollTop=500)
  await expect(v).toHaveAttribute('data-kniff-auto-move','running')
})


for (const initiallyReduced of [false,true]) test(`reduced motion preserves native snapping after input (initial=${initiallyReduced})`,async({page,isMobile})=>{
  if (initiallyReduced) {
    await page.emulateMedia({reducedMotion:'reduce'})
    await setup(page,'left',true,30,true)
    await page.locator('#v').scrollIntoViewIfNeeded()
  } else {
    await setup(page)
    await page.emulateMedia({reducedMotion:'reduce'})
  }
  const v=page.locator('#v')
  await expect.poll(()=>v.evaluate(v=>getComputedStyle(v).scrollSnapType)).toBe('x mandatory')
  if (!isMobile) {
    const box=(await v.boundingBox())!
    await page.mouse.move(box.x+100,box.y+100);await page.mouse.wheel(100,0)
  } else await v.dispatchEvent('wheel',{deltaX:100})
  await expect.poll(()=>v.evaluate(v=>getComputedStyle(v).scrollSnapType)).toBe('x mandatory')
  await v.evaluate(v=>{v.setAttribute('tabindex','0');(v as HTMLElement).focus()})
  await page.keyboard.press('ArrowRight')
  await v.evaluate(v=>v.dispatchEvent(new Event('kniff-scroll-navigation')))
  await page.waitForTimeout(800)
  expect(await v.evaluate(v=>getComputedStyle(v).scrollSnapType)).toBe('x mandatory')
  expect(await v.getAttribute('data-kniff-auto-move')).not.toBe('running')
  const after=await v.evaluate(v=>v.scrollLeft)
  await page.waitForTimeout(450)
  expect(await v.evaluate(v=>v.scrollLeft)).toBe(after)
  await page.evaluate(()=>(window as any).disposeAuto())
})

test('lightbox pause holds through navigation and resumes after closing', async ({page}) => {
  await setup(page)
  const v = page.locator('#v')
  await expect(v).toHaveAttribute('data-kniff-auto-move','running')
  await v.evaluate(el => el.setAttribute('data-kniff-auto-move-paused',''))
  await expect(v).toHaveAttribute('data-kniff-auto-move','held')
  await v.evaluate(el => { el.scrollLeft += 60; el.dispatchEvent(new Event('kniff-scroll-navigation')) })
  await page.waitForTimeout(700)
  const held = await v.evaluate(el => el.scrollLeft)
  await page.waitForTimeout(500)
  expect(await v.evaluate(el => el.scrollLeft)).toBe(held)
  await v.evaluate(el => el.removeAttribute('data-kniff-auto-move-paused'))
  await expect(v).toHaveAttribute('data-kniff-auto-move','running')
  await page.waitForTimeout(300)
  expect(await v.evaluate(el => el.scrollLeft)).toBeGreaterThan(held + 3)
})
