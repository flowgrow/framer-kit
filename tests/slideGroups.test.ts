import { describe, it, expect } from "vitest"
import { groupSlideRanges } from "../src/hooks/useSlideGroups"
import { planCanvasGroups } from "../src/carousel/CarouselCanvasSettings"

describe("slide groups", () => {
  it("keeps fixed groups including an incomplete tail and oversized groups", () => {
    expect(groupSlideRanges([200, 300, 400, 200, 200, 200, 150, 150], 20, 500, 3)).toEqual([
      { start: 0, end: 3, width: 940 },
      { start: 3, end: 6, width: 640 },
      { start: 6, end: 8, width: 320 },
    ])
  })
  it("packs mixed widths including gaps and isolates oversized slides", () => {
    expect(groupSlideRanges([100, 150, 200, 700, 100], 20, 300, "auto")).toEqual([
      { start: 0, end: 2, width: 270 },
      { start: 2, end: 3, width: 200 },
      { start: 3, end: 4, width: 700 },
      { start: 4, end: 5, width: 100 },
    ])
  })
  it("keeps completed groups when CMS items append", () => {
    const before = groupSlideRanges([100, 100, 100, 100], 20, 250, "auto")
    const after = groupSlideRanges([100, 100, 100, 100, 100, 100], 20, 250, "auto")
    expect(after.slice(0, 2)).toEqual(before)
  })
})

describe("canvas group layout", () => {
  it("aligns first and last groups using full group widths with loop off and edge space on", () => {
    const center = planCanvasGroups([200, 200, 200, 200, 180], 20, 1000, 2, "center", false, true)
    expect(center).toMatchObject({
      currentEnd: 2,
      leadingMargin: "calc(50% - 210px)",
      trailingMargin: "max(0px, calc(50% - 90px))",
      wrapped: [],
    })

    const start = planCanvasGroups([200, 200, 200, 200, 180], 20, 1000, 2, "start", false, true)
    expect(start).toMatchObject({
      currentEnd: 2,
      leadingMargin: "0px",
      trailingMargin: "max(0px, calc(100% - 180px))",
      wrapped: [],
    })

    const end = planCanvasGroups([200, 200, 200, 200, 180], 20, 1000, 2, "end", false, true)
    expect(end).toMatchObject({
      currentEnd: 2,
      leadingMargin: "calc(100% - 420px)",
      trailingMargin: "0px",
      wrapped: [],
    })
  })

  it("omits edge margins when loop and edge space are both off", () => {
    const plan = planCanvasGroups([200, 200, 200, 200], 20, 1000, 2, "center", false, false)
    expect(plan).toMatchObject({
      currentEnd: 2,
      leadingMargin: null,
      trailingMargin: null,
      wrapped: [],
    })
  })

  it("wraps the full previous group to the left when looping with 3+ groups", () => {
    const plan = planCanvasGroups([200, 200, 200, 200, 150, 250], 20, 1000, 2, "center", true, true)
    expect(plan).toMatchObject({
      currentEnd: 2,
      leadingMargin: "calc(50% - 210px)",
      trailingMargin: null,
      wrapped: [
        { index: 4, offset: 290 },
        { index: 5, offset: 20 },
      ],
    })
  })

  it("never wraps slides out of the first group when all slides form a single group", () => {
    const fixed = planCanvasGroups([200, 300], 20, 1000, 2, "center", true, true)
    expect(fixed).toMatchObject({
      currentEnd: 2,
      leadingMargin: "calc(50% - 260px)",
      trailingMargin: null,
      wrapped: [],
    })

    const auto = planCanvasGroups([200, 200, 200], 20, 700, "auto", "center", true, true)
    expect(auto).toMatchObject({
      currentEnd: 3,
      leadingMargin: "calc(50% - 320px)",
      trailingMargin: null,
      wrapped: [],
    })
  })

  it("balances 2-group loops by alignment so center/start keep slides on the right and end fills the left", () => {
    const center = planCanvasGroups([200, 200, 200, 200], 20, 1000, 2, "center", true, true)
    expect(center?.wrapped).toEqual([{ index: 3, offset: 20 }])

    const start = planCanvasGroups([200, 200, 200, 200], 20, 1000, 2, "start", true, true)
    expect(start?.wrapped).toEqual([{ index: 3, offset: 20 }])

    const end = planCanvasGroups([200, 200, 200, 200], 20, 1000, 2, "end", true, true)
    expect(end?.wrapped).toEqual([
      { index: 2, offset: 240 },
      { index: 3, offset: 20 },
    ])
  })

  it("uses packed Auto group widths for edge alignment and wrapping", () => {
    const plan = planCanvasGroups([100, 150, 200, 700, 100], 20, 300, "auto", "center", false, true)
    expect(plan).toMatchObject({
      currentEnd: 2,
      leadingMargin: "calc(50% - 135px)",
      trailingMargin: "max(0px, calc(50% - 50px))",
      wrapped: [],
    })
  })
})
