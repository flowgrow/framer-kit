import { expect, test } from "@playwright/test"

async function setup(page: import("@playwright/test").Page, width: number, align: "start" | "center" | "end" = "start", withWrapper = true) {
  await page.setViewportSize({ width, height: 900 })
  await page.goto("/")
  await page.setContent(`<style>html,body { margin:0; }</style><style data-framer-css-ssr>
    .framer-authored-carousel { display:flex; width:100%; max-width:1000px; height:440px; box-sizing:border-box; gap:24px; padding:40px ${width >= 1200 ? "108px" : "74px"} 40px ${width >= 1200 ? "0px" : "24px"}; }
    .slide { flex:0 0 ${width >= 1200 ? "446px" : "292px"}; height:360px; }
  </style><div id="mount"></div>`)
  await page.evaluate(async ({ alignment, wrapper }) => {
    const { mountAuthoredLayout } = await import(String("/e2e/fixture/authoredLayoutHarness.tsx"))
    mountAuthoredLayout(document.querySelector("#mount")!, alignment, wrapper)
  }, { alignment: align, wrapper: withWrapper })
  await expect(page.getByTestId("viewport")).toHaveCSS("overflow-x", "auto")
}

for (const width of [1280, 390]) test(`viewport works directly inside boundary at ${width}px`, async ({ page }) => {
  await setup(page, width, "start", false)
  const viewport = page.getByTestId("viewport")
  await expect(viewport).toHaveCSS("overflow-x", "auto")
  const geometry = await viewport.evaluate(element => {
    const css = getComputedStyle(element)
    const slides = element.querySelectorAll<HTMLElement>(".slide")
    return {
      direct: element.parentElement?.getAttribute("aria-label") === "Boundary",
      gap: slides[1]!.getBoundingClientRect().left - slides[0]!.getBoundingClientRect().right,
      padding: parseFloat(css.paddingLeft),
      scrollPadding: parseFloat(css.scrollPaddingLeft),
    }
  })
  expect(geometry.direct).toBe(true)
  expect(geometry.gap).toBeCloseTo(24, 0)
  expect(geometry.padding).toBeCloseTo(width >= 1200 ? 140 : 24, 0)
  expect(geometry.scrollPadding).toBeCloseTo(geometry.padding, 0)
})

for (const width of [1280, 390]) test(`authored gap, padding and scroll padding at ${width}px`, async ({ page }) => {
  await setup(page, width)
  const geometry = await page.getByTestId("viewport").evaluate(viewport => {
    const css = getComputedStyle(viewport)
    const [first, second] = viewport.querySelectorAll<HTMLElement>(".slide")
    const a = first!.getBoundingClientRect(), b = second!.getBoundingClientRect()
    return {
      gap: b.left - a.right,
      left: parseFloat(css.paddingLeft), right: parseFloat(css.paddingRight),
      scrollLeft: parseFloat(css.scrollPaddingLeft), scrollRight: parseFloat(css.scrollPaddingRight),
      firstOffset: a.left - viewport.getBoundingClientRect().left,
    }
  })
  const gutter = width >= 1200 ? 140 : 0
  const left = (width >= 1200 ? 0 : 24) + gutter
  const right = (width >= 1200 ? 108 : 74) + gutter
  expect(geometry.gap).toBeCloseTo(24, 0)
  expect(geometry.left).toBeCloseTo(left, 0)
  expect(geometry.right).toBeCloseTo(right, 0)
  expect(geometry.scrollLeft).toBeCloseTo(left, 0)
  expect(geometry.scrollRight).toBeCloseTo(right, 0)
  expect(geometry.firstOffset).toBeCloseTo(left, 0)
})

for (const align of ["start", "center", "end"] as const) test(`snap alignment honors authored padding (${align})`, async ({ page }) => {
  await setup(page, 1280, align)
  const viewport = page.getByTestId("viewport")
  await viewport.locator(".slide").nth(1).evaluate(slide => slide.scrollIntoView({ behavior: "instant", inline: "center", block: "nearest" }))
  await expect.poll(() => viewport.evaluate(element => {
    const slide = element.querySelectorAll(".slide")[1]!.getBoundingClientRect()
    const box = element.getBoundingClientRect()
    const css = getComputedStyle(element)
    const left = parseFloat(css.scrollPaddingLeft), right = parseFloat(css.scrollPaddingRight)
    const target = css.getPropertyValue("--kniff-initial-align").trim()
    const actual = target === "start" ? slide.left : target === "end" ? slide.right : (slide.left + slide.right) / 2
    const expected = target === "start" ? box.left + left : target === "end" ? box.right - right : box.left + left + (box.width - left - right) / 2
    return Math.abs(actual - expected)
  })).toBeLessThan(2)
})
