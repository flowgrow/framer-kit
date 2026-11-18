import { describe, it, expect } from "vitest"
import { groupSlideRanges } from "../src/hooks/useSlideGroups"

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
