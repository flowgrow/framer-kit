import { test, expect } from '@playwright/test'

test('per-slide waits, snaps one slide at a time, pauses and resumes',async({page})=>{
  await page.goto('/')
  await page.evaluate(async()=>{
    const mount=document.createElement('div');document.body.append(mount)
    const {mountReactLoop}=await import(String('/e2e/fixture/reactLoopHarness.tsx'))
    ;(window as any).root=mountReactLoop(mount,{autoMove:'per-slide'})
  })
  const viewport=page.locator('#react-loop')
  await expect(viewport).toHaveAttribute('data-kniff-auto-move','running')
  const initial=await viewport.evaluate(v=>v.scrollLeft)
  await page.waitForTimeout(700)
  expect(await viewport.evaluate(v=>v.scrollLeft)).toBeCloseTo(initial,0)
  await expect.poll(()=>viewport.evaluate(v=>v.scrollLeft),{timeout:4500}).toBeGreaterThan(initial+250)
  await page.waitForTimeout(600)
  const snapped=await viewport.evaluate(v=>v.scrollLeft)
  expect(snapped-initial).toBeCloseTo(264,0)
  await viewport.evaluate(v=>v.setAttribute('data-kniff-auto-move-paused',''))
  await page.waitForTimeout(3300)
  expect(await viewport.evaluate(v=>v.scrollLeft)).toBeCloseTo(snapped,0)
  await viewport.evaluate(v=>v.removeAttribute('data-kniff-auto-move-paused'))
  await expect(viewport).toHaveAttribute('data-kniff-auto-move','running')
  await expect.poll(()=>viewport.evaluate(v=>v.scrollLeft),{timeout:4500}).toBeGreaterThan(snapped+250)
})

test('off mode never installs automatic motion',async({page})=>{
  await page.goto('/')
  await page.evaluate(async()=>{
    const mount=document.createElement('div');document.body.append(mount)
    const {mountReactLoop}=await import(String('/e2e/fixture/reactLoopHarness.tsx'))
    mountReactLoop(mount,{autoMove:'off'})
  })
  const viewport=page.locator('#react-loop')
  await expect(viewport).toHaveAttribute('data-kniff-loop-ready','')
  expect(await viewport.getAttribute('data-kniff-auto-move')).toBeNull()
})

for(const direction of ['left','right'] as const) test(`per-slide loop keeps advancing across seams (${direction})`,async({page})=>{
  await page.goto('/')
  await page.evaluate(async(direction)=>{
    const mount=document.createElement('div');document.body.append(mount)
    const {mountReactLoop}=await import(String('/e2e/fixture/reactLoopHarness.tsx'))
    mountReactLoop(mount,{autoMove:'off'})
  },direction)
  const viewport=page.locator('#react-loop')
  await expect(viewport).toHaveAttribute('data-kniff-loop-ready','')
  await page.evaluate(async(direction)=>{
    const viewport=document.querySelector<HTMLElement>('#react-loop')!
    const {installAutoMove}=await import(String('/src/scroll-snap/autoMove.tsx'))
    ;(window as any).dispose=installAutoMove(viewport,{mode:'per-slide',interval:650,speed:30,direction})
    ;(window as any).positions=[]
    viewport.addEventListener('scrollend',()=>{(window as any).positions.push(viewport.scrollLeft)})
  },direction)
  await page.waitForTimeout(7500)
  const positions=await page.evaluate(()=>(window as any).positions) as number[]
  expect(positions.length).toBeGreaterThan(7)
  expect(new Set(positions.map(x=>Math.round(x/264))).size).toBeGreaterThan(3)
  await expect(viewport).toHaveAttribute('data-kniff-auto-move','running')
})
