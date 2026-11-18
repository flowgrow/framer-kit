import { chromium, webkit, firefox, expect } from "@playwright/test"
import { writeFile } from "node:fs/promises"
const wheelDelta = Number(process.env.WHEEL_DELTA || 100)
for (const name of (process.env.ENGINES || "webkit,chrome,firefox").split(",")) {
  const browser = await { chrome: chromium, webkit, firefox }[name].launch({
    headless: true,
    ...(name === "chrome" ? { channel: "chrome" } : {}),
  })
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    hasTouch: process.env.PULL === "1",
  })
  await page.goto("https://philosophical-portion-666222--new-carousel-y0f6w208o.framer.app/", {
    waitUntil: "networkidle",
  })
  await page.waitForTimeout(1200)
  const trigger = page.locator('[data-ramka-trigger]:not([aria-hidden="true"] *)').first()
  await trigger.scrollIntoViewIfNeeded()
  await page.waitForTimeout(800)
  await trigger.click()
  const dialog = page.locator("[data-ramka-content][data-open]")
  await expect(dialog).toBeVisible()
  await page.waitForTimeout(800)
  for (let i = 0; i < Number(process.env.NAV || 3); i++) {
    await page.keyboard.press("ArrowRight")
    await page.waitForTimeout(500)
  }
  const active = await dialog.locator("[data-ramka-slides]").getAttribute("data-active-index")
  await page.evaluate(() => {
    const v = document.querySelector('[data-framer-name="CarouselXYZ"][data-kniff-viewport]')
    window.__handoff = []
    const start = performance.now()
    window.__handoffStart = start
    let cycle = 0
    const o = v.querySelector("[data-kniff-loop-original]")
    const c = v.querySelector("[data-kniff-loop-original] ~ [data-kniff-loop-copy]")
    const firstVisible = (root) =>
      [...root.querySelectorAll("[data-ramka-trigger]")].find(
        (e) => e.getBoundingClientRect().width > 0,
      )
    if (c && o)
      cycle = firstVisible(c).getBoundingClientRect().x - firstVisible(o).getBoundingClientRect().x
    window.__cycle = cycle
    function tick() {
      window.__handoff.push({
        t: performance.now() - start,
        x: v.scrollLeft,
        freeze: v.hasAttribute("data-kniff-lightbox-open"),
        snap: getComputedStyle(v).scrollSnapType,
      })
      if (performance.now() - start < 5000) requestAnimationFrame(tick)
    }
    tick()
  })
  if (process.env.PULL === "1") {
    const box = await dialog.locator("[data-ramka-item][data-active] img").boundingBox()
    const cdp = await page.context().newCDPSession(page)
    const x = box.x + box.width / 2
    const y = box.y + Math.min(box.height / 2, 200)
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] })
    for (let k = 1; k <= 12; k++) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y: y + k * 25 }],
      })
      await page.waitForTimeout(16)
    }
    await expect(dialog).toHaveAttribute("data-pulling", "")
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] })
  } else await page.keyboard.press("Escape")
  if (process.env.PULL === "1" || process.env.WHEEL === "1") {
    await page.waitForTimeout(Number(process.env.GESTURE_DELAY || 50))
    const v = await page
      .locator('[data-framer-name="CarouselXYZ"][data-kniff-viewport]')
      .first()
      .boundingBox()
    await page.mouse.move(v.x + v.width / 2, v.y + v.height / 2)
    await page.evaluate(() => {
      window.__wheelStart = performance.now() - window.__handoffStart
    })
    for (let j = 0; j < 8; j++) {
      await page.mouse.wheel(wheelDelta, 0)
      await page.waitForTimeout(30)
    }
    await page.evaluate(() => {
      window.__wheelEnd = performance.now() - window.__handoffStart
    })
  }
  await page.waitForTimeout(2700)
  await expect(dialog).toBeHidden()
  const data = await page.evaluate(() => ({
    frames: window.__handoff,
    cycle: window.__cycle,
    wheelStart: window.__wheelStart,
    wheelEnd: window.__wheelEnd,
  }))
  const frames = data.frames
  const deltas = frames
    .slice(1)
    .map((f, i) => {
      let d = f.x - frames[i].x
      if (data.cycle) d -= Math.round(d / data.cycle) * data.cycle
      return { t: f.t, d, freeze: f.freeze }
    })
    .filter((x) => Math.abs(x.d) > 1)
  console.log(
    JSON.stringify({
      name,
      active,
      cycle: data.cycle,
      start: frames[0],
      end: frames.at(-1),
      deltas,
    }),
  )
  await writeFile("/tmp/companion-handoff-" + name + ".json", JSON.stringify(data))
  const opposing = deltas.filter(
    (d) => d.t >= data.wheelStart && d.t <= data.wheelEnd && d.d * Math.sign(wheelDelta) < -2,
  )
  await browser.close()
  expect(opposing, "Carousel must not pull back against fresh wheel input").toEqual([])
}
