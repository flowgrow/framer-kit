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
