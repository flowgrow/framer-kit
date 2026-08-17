import { afterEach, describe, expect, it, vi } from "vitest"

import {
  createEmblaWrapperStyle,
  EMBLA_STRUCTURAL_CSS,
  getEmblaLoopGap,
  observeEmblaLoopGap,
} from "../src/embla/styles.js"

describe("Embla structural styles", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("provides safe defaults without depending on external CSS", () => {
    expect(createEmblaWrapperStyle()).toMatchObject({
      display: "block",
      width: "100%",
      height: "100%",
      "--kniff-embla-overflow": "visible",
      "--kniff-embla-slide-size": "auto",
      "--kniff-embla-touch-action": "pan-y pinch-zoom",
    })
    expect(EMBLA_STRUCTURAL_CSS).toContain(
      "overflow: var(--kniff-embla-overflow, visible)",
    )
    expect(EMBLA_STRUCTURAL_CSS).toContain("min-width: 0")
    expect(EMBLA_STRUCTURAL_CSS).toContain(
      'data-kniff-embla-loop-gap-side="inline-end"',
    )
    expect(EMBLA_STRUCTURAL_CSS).toContain(
      "margin-inline-end: var(--kniff-embla-loop-gap, 0px)",
    )
    expect(EMBLA_STRUCTURAL_CSS).toContain("position: relative")
    expect(EMBLA_STRUCTURAL_CSS).toContain(
      'data-kniff-embla-select-on-slide-click="true"',
    )
    expect(EMBLA_STRUCTURAL_CSS).toContain("cursor: pointer")
  })

  it("accepts carousel-specific slide sizing and touch behavior", () => {
    expect(
      createEmblaWrapperStyle({
        overflow: "hidden",
        slideSize: "80%",
        touchAction: "pan-y",
      }),
    ).toMatchObject({
      "--kniff-embla-overflow": "hidden",
      "--kniff-embla-slide-size": "80%",
      "--kniff-embla-touch-action": "pan-y",
    })
  })

  it("maps responsive row and column gaps to the loop seam", () => {
    expect(
      getEmblaLoopGap({
        columnGap: "96px",
        flexDirection: "row",
        rowGap: "0px",
      }),
    ).toEqual({ gap: "96px", side: "inline-end" })

    expect(
      getEmblaLoopGap({
        columnGap: "12px",
        flexDirection: "column-reverse",
        rowGap: "24px",
      }),
    ).toEqual({ gap: "24px", side: "block-start" })
  })

  it("does not reinitialize when the observed gap is already synced", () => {
    let scheduledMeasure: FrameRequestCallback | undefined
    const onGapChange = vi.fn()
    const values = new Map([["--kniff-embla-loop-gap", "96px"]])
    const container = {
      dataset: { kniffEmblaLoopGapSide: "inline-end" },
      style: {
        getPropertyValue: (name: string) => values.get(name) ?? "",
        removeProperty: (name: string) => values.delete(name),
        setProperty: (name: string, value: string) => values.set(name, value),
      },
    }
    const viewport = {
      querySelector: () => container,
    }

    vi.stubGlobal("ResizeObserver", undefined)
    vi.stubGlobal("MutationObserver", undefined)
    vi.stubGlobal("window", {
      addEventListener: vi.fn(),
      cancelAnimationFrame: vi.fn(),
      getComputedStyle: () => ({
        columnGap: "96px",
        flexDirection: "row",
        rowGap: "96px",
      }),
      removeEventListener: vi.fn(),
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        scheduledMeasure = callback
        return 1
      },
    })

    const cleanup = observeEmblaLoopGap(
      viewport as unknown as HTMLElement,
      true,
      onGapChange,
    )

    expect(onGapChange).not.toHaveBeenCalled()
    scheduledMeasure?.(0)
    expect(onGapChange).not.toHaveBeenCalled()
    cleanup()
  })
})
