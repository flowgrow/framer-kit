import { describe, expect, it } from "vitest"

import {
  createEmblaWrapperStyle,
  EMBLA_STRUCTURAL_CSS,
} from "../src/embla/styles.js"

describe("Embla structural styles", () => {
  it("provides safe defaults without depending on external CSS", () => {
    expect(createEmblaWrapperStyle()).toMatchObject({
      display: "block",
      width: "100%",
      height: "100%",
      "--kniff-embla-slide-size": "auto",
      "--kniff-embla-touch-action": "pan-y pinch-zoom",
    })
    expect(EMBLA_STRUCTURAL_CSS).toContain("overflow: hidden")
    expect(EMBLA_STRUCTURAL_CSS).toContain("min-width: 0")
  })

  it("accepts carousel-specific slide sizing and touch behavior", () => {
    expect(
      createEmblaWrapperStyle({
        slideSize: "80%",
        touchAction: "pan-y",
      }),
    ).toMatchObject({
      "--kniff-embla-slide-size": "80%",
      "--kniff-embla-touch-action": "pan-y",
    })
  })
})
