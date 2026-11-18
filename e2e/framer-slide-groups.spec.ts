import { test, expect } from "@playwright/test"

for (const by of [1, 2, 3, 0]) {
  test(`CMS groups ${by || "auto"}: all alignments, load more and dots`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto(`/cms/default?slide-by=${by}`)
    const tracks = page.locator("[data-kniff-viewport]:visible")
    await expect(tracks).toHaveCount(3)
    for (let t = 0; t < 3; t++) {
      const track = tracks.nth(t)
      await expect(track).toHaveAttribute("data-kniff-slide-by", by ? String(by) : "auto")
      await track.scrollIntoViewIfNeeded()
      const boundary = track.locator("xpath=ancestor::*[@data-kniff-boundary][1]")
      const dots = boundary.locator("[data-kniff-dot-index]")
      await expect.poll(() => dots.count()).toBeGreaterThan(0)
      const count = () =>
        track.evaluate(
          (el) =>
            [...el.querySelector("[data-kniff-loop-original]")!.children].filter(
              (n) => !n.querySelector("[data-kniff-ignore-slide]"),
            ).length,
        )
      const initial = await count()
      // Scroll the real collection to its loader, allowing Framer to fetch its next page.
      await track.evaluate((el) => el.scrollTo({ left: el.scrollWidth, behavior: "instant" }))
      await expect.poll(count, { timeout: 20_000 }).toBeGreaterThan(initial)
      await expect
        .poll(() =>
          track.evaluate((el) => {
            const children = [
              ...el.querySelector("[data-kniff-loop-original]")!.children,
            ] as HTMLElement[]
            const slides = children.filter((n) => !n.querySelector("[data-kniff-ignore-slide]"))
            const size = Number(el.getAttribute("data-kniff-slide-by"))
            return slides.every(
              (s, i) => !size || i % size !== 0 || s.hasAttribute("data-kniff-group"),
            )
          }),
        )
        .toBe(true)
      await expect
        .poll(async () => {
          const stops = await track.evaluate((el) => {
            const box = el.getBoundingClientRect(),
              css = getComputedStyle(el)
            const left = parseFloat(css.scrollPaddingLeft) || 0,
              right = parseFloat(css.scrollPaddingRight) || 0
            const values = [...el.querySelectorAll("[data-kniff-group]")].map((s) => {
              const r = s.getBoundingClientRect(),
                c = getComputedStyle(s),
                width = r.width + (parseFloat(c.scrollMarginRight) || 0)
              const factor =
                c.scrollSnapAlign === "center" ? 0.5 : c.scrollSnapAlign === "end" ? 1 : 0
              return Math.max(
                0,
                Math.min(
                  el.scrollWidth - el.clientWidth,
                  r.left -
                    box.left +
                    el.scrollLeft -
                    left -
                    (el.clientWidth - left - right - width) * factor,
                ),
              )
            })
            return values.filter((v, i) => i === 0 || Math.abs(v - values[i - 1]!) > 1).length
          })
          return (await dots.count()) === stops
        })
        .toBe(true)
      // Dot navigation must land at the same native group snap area.
      const target = Math.min(1, (await dots.count()) - 1)
      await dots.nth(target).click()
      await expect(dots.nth(target)).toHaveAttribute("aria-current", "true")
      // Validate group bounds independently of the emitted scroll margin.
      await dots.first().click()
      await expect
        .poll(() =>
          track.evaluate((el, by) => {
            const slides = [...el.querySelector("[data-kniff-loop-original]")!.children].filter(
              (n) => !n.querySelector("[data-kniff-ignore-slide]"),
            )
            const style = getComputedStyle(el),
              box = el.getBoundingClientRect()
            const left = parseFloat(style.scrollPaddingLeft) || 0,
              right = parseFloat(style.scrollPaddingRight) || 0
            const available = el.clientWidth - left - right
            let last = Math.min(by || 1, slides.length) - 1
            if (!by)
              while (
                last + 1 < slides.length &&
                slides[last + 1]!.getBoundingClientRect().right -
                  slides[0]!.getBoundingClientRect().left <=
                  available + 0.5
              )
                last++
            const firstBox = slides[0]!.getBoundingClientRect(),
              lastBox = slides[last]!.getBoundingClientRect()
            const span = lastBox.right - firstBox.left
            const align = style.getPropertyValue("--kniff-initial-align").trim()
            const factor = align === "end" ? 1 : align === "center" ? 0.5 : 0
            const desired = Math.max(
              0,
              Math.min(
                el.scrollWidth - el.clientWidth,
                firstBox.left - box.left + el.scrollLeft - left - (available - span) * factor,
              ),
            )
            return Math.abs(el.scrollLeft - desired)
          }, by),
        )
        .toBeLessThan(3)
      await boundary.getByRole("button", { name: "Next slide", exact: true }).click()
      await expect(dots.nth(1)).toHaveAttribute("aria-current", "true")
    }
  })
}

test("fixed groups loop through four stops without shifting group membership", async ({ page }) => {
  await page.goto("/carousel/group-loop-test")
  const track = page.locator("[data-kniff-viewport]:visible").first()
  await expect(track).toHaveAttribute("data-kniff-loop-ready", "")
  const dots = page.locator("[data-kniff-dot-index]")
  await expect(dots).toHaveCount(4)
  await dots.last().click()
  await expect(dots.last()).toHaveAttribute("aria-current", "true")
  await page.getByRole("button", { name: "Next slide", exact: true }).click()
  await expect(dots.first()).toHaveAttribute("aria-current", "true")
  await expect(track.locator("[data-kniff-loop-original] > [data-kniff-group]")).toHaveCount(4)
})

test("Auto repacks measured slides after viewport resize", async ({ page }) => {
  await page.goto("/cms/default?slide-by=1")
  await page.getByText("Auto", { exact: true }).click()
  const track = page.locator("[data-kniff-viewport]:visible").first()
  await expect(track).toHaveAttribute("data-kniff-slide-by", "auto")
  const size = page.viewportSize()!
  await page.setViewportSize({ width: size.width + 80, height: size.height })
  await expect
    .poll(() =>
      track.evaluate((el) => {
        const slides = [...el.querySelector("[data-kniff-loop-original]")!.children].filter(
          (n) => !n.querySelector("[data-kniff-ignore-slide]"),
        )
        const css = getComputedStyle(el)
        const available =
          el.clientWidth -
          (parseFloat(css.scrollPaddingLeft) || 0) -
          (parseFloat(css.scrollPaddingRight) || 0)
        let start = 0
        return slides.every((slide, i) => {
          if (
            i &&
            slide.getBoundingClientRect().right - slides[start]!.getBoundingClientRect().left >
              available + 0.5
          )
            start = i
          return slide.hasAttribute("data-kniff-group") === (start === i)
        })
      }),
    )
    .toBe(true)
})

test("trackpad wheel bursts cross loop seams without mid-gesture repositioning", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Trackpad input is a desktop interaction")
  await page.goto("/carousel/default")
  const track = page.locator("[data-kniff-viewport]:visible").first()
  await expect(track).toHaveAttribute("data-kniff-loop-ready", "")
  await track.scrollIntoViewIfNeeded()
  await track.evaluate((el) => {
    ;(window as any).loopJumps = 0
    ;(window as any).midWheelJumps = 0
    let lastWheel = -Infinity
    el.addEventListener(
      "wheel",
      () => {
        lastWheel = performance.now()
      },
      { passive: true },
    )
    el.addEventListener("kniff-loop-reposition", () => {
      ;(window as any).loopJumps++
      if (performance.now() - lastWheel < 175) (window as any).midWheelJumps++
    })
  })
  const box = (await track.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  for (const direction of [-1, 1]) {
    if (direction === 1) {
      const last = page.locator("[data-kniff-dot-index]").last()
      await last.click()
      await expect(last).toHaveAttribute("aria-current", "true")
      await track.scrollIntoViewIfNeeded()
      const currentBox = (await track.boundingBox())!
      await page.mouse.move(
        currentBox.x + currentBox.width / 2,
        Math.min(currentBox.y + currentBox.height / 2, 500),
      )
    }
    const before = await page.evaluate(() => (window as any).loopJumps)
    for (let i = 0; i < 24; i++) {
      await page.mouse.wheel(direction * 180, 0)
      await page.waitForTimeout(16)
    }
    expect(await page.evaluate(() => (window as any).midWheelJumps)).toBe(0)
    await expect.poll(() => page.evaluate(() => (window as any).loopJumps)).toBeGreaterThan(before)
  }
})

test("initialized carousel stays visible and retains its images", async ({ page }) => {
  await page.goto("/carousel/default")
  const track = page.locator("[data-kniff-viewport]:visible").first()
  await expect(track).toHaveAttribute("data-kniff-loop-ready", "")
  // Framer may replace responsive SSR variants; our initialized tree must remain stable.
  expect(
    await track.evaluate(async (el) => {
      const original = el.querySelector("[data-kniff-loop-original]")!
      const images = [...original.querySelectorAll("img")]
      for (let frame = 0; frame < 30; frame++) {
        await new Promise(requestAnimationFrame)
        if (!original.isConnected || images.some((img) => !img.isConnected)) return false
        const css = getComputedStyle(el)
        if (css.visibility === "hidden" || css.display === "none" || css.opacity === "0")
          return false
      }
      return images.length > 0
    }),
  ).toBe(true)
  const first = track.locator('[data-kniff-loop-original] > [data-framer-name="Photo1"]')
  await first.click()
  await expect(page.getByRole("dialog")).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog")).toBeHidden()
})
