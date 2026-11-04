import {test,expect} from '@playwright/test'

async function setup(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.setContent('<div id="mount"></div>')
  await page.evaluate(async () => {
    const {mountReactLoop}=await import(String('/e2e/fixture/reactLoopHarness.tsx'))
    mountReactLoop(document.querySelector('#mount'))
  })
  await expect(page.locator('#react-loop')).toHaveAttribute('data-kniff-loop-ready','')
  await expect(page.locator('[data-kniff-loop-copy]')).toHaveCount(6)
}

for (const navigate of [false, true]) test(`React copy morph targets and handlers (navigate=${navigate})`,async({page}) => {
  await setup(page)
  const supported = await page.evaluate(() => {
    if (!document.startViewTransition) return false
    const native = document.startViewTransition.bind(document)
    ;(window as any).morphTargets=[]
    const capture=(phase:string) => {
      const targets=Array.from(document.querySelectorAll<HTMLElement>('[style]')).filter(el=>el.style.viewTransitionName && el.style.viewTransitionName!=='none').map(el=>({copy:!!el.closest('[data-kniff-loop-copy]'),slide:el.closest('[data-slide]')?.getAttribute('data-slide'),x:el.getBoundingClientRect().x}))
      ;(window as any).morphTargets.push({phase,targets})
    }
    document.startViewTransition=((callback:any)=>{
      capture('before')
      return native(async()=>{await callback();capture('after')})
    }) as typeof document.startViewTransition
    return true
  })
  // Use the cycle immediately before the originals, then keep it stationary
  // to model a click at the loop seam before idle normalization.
  const copy=page.locator('[data-kniff-loop-copy]').nth(2).locator('[data-slide="1"]')
  await copy.evaluate(el=>{
    const viewport=document.querySelector<HTMLElement>('#react-loop')!
    viewport.addEventListener('scrollend',e=>e.stopImmediatePropagation(),true)
    viewport.scrollLeft=(el as HTMLElement).offsetLeft
  })
  await copy.click()
  await expect(page.getByRole('button',{name:'Close',exact:true})).toBeVisible()
  await expect(page.locator('#clicks')).toHaveText('1')
  await expect(page.locator('[data-kniff-loop-original] [data-ramka-trigger][aria-expanded="true"]')).toHaveCount(0)
  await expect(copy).toHaveAttribute('aria-expanded','true')
  const tabs=page.getByRole('tablist',{name:'Photo thumbnails'})
  if(page.viewportSize()!.width>=768) await expect(tabs.getByRole('tab')).toHaveCount(4)
  await page.waitForTimeout(800)
  if (navigate) {
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('[data-kniff-loop-copy]').nth(2).locator('[data-slide="2"]')).toHaveAttribute('data-active','')
  }
  await page.waitForTimeout(800)
  await page.getByRole('button',{name:'Close',exact:true}).click()
  await expect(page.locator('[data-ramka-content]')).toHaveCount(0)
  if(supported) {
    const snapshots=await page.evaluate(()=>(window as any).morphTargets) as {phase:string,targets:{copy:boolean,slide:string|null,x:number}[]}[]
    expect(snapshots[0]!.targets.some(t=>t.copy && t.slide==='1' && t.x>=-1 && t.x<360)).toBe(true)
    expect(snapshots.at(-1)!.targets.some(t=>t.copy && t.slide===(navigate ? '2' : '1') && t.x>=-1 && t.x<360)).toBe(true)
  }
})

test('React loop toggles cleanly and repeats new slides with their live props',async({page})=>{
  await setup(page)
  await page.locator('#add').click()
  await expect(page.locator('[data-slide]')).toHaveCount(35)
  await expect(page.locator('[data-kniff-loop-copy] [data-slide="4"]')).toHaveCount(6)
  await page.locator('#toggle-loop').click()
  await expect(page.locator('[data-kniff-loop-copy]')).toHaveCount(0)
  await expect(page.locator('[data-slide]')).toHaveCount(5)
  await page.locator('#toggle-loop').click()
  await expect(page.locator('[data-kniff-loop-copy]')).toHaveCount(6)
  await expect(page.locator('#react-loop')).toHaveAttribute('data-kniff-loop-ready','')
})
