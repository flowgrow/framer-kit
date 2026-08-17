import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { addPropertyControls } = vi.hoisted(() => ({
  addPropertyControls: vi.fn(),
}))

vi.mock("framer", () => ({
  addPropertyControls,
  ControlType: {
    Color: "Color",
    Enum: "Enum",
    Number: "Number",
    Object: "Object",
    Slot: "Slot",
    String: "String",
  },
  RenderTarget: {
    canvas: "canvas",
    current: () => "canvas",
  },
}))

import {
  EmblaCurrentIndex,
  EmblaDots,
  EmblaNavigationButton,
  EmblaProgressBar,
  EmblaTotalSlides,
  ThumbnailConnection,
  registerEmblaCurrentIndexPropertyControls,
  registerEmblaDotsPropertyControls,
  registerEmblaNavigationButtonPropertyControls,
  registerEmblaProgressBarPropertyControls,
  registerEmblaTotalSlidesPropertyControls,
  registerThumbnailConnectionPropertyControls,
} from "../src/embla/index.js"
import { cloneWithInnermostText } from "../src/embla/accessoryUtils.js"
import { useEmblaStore } from "../src/embla/store.js"

describe("Embla accessory components", () => {
  beforeEach(() => {
    addPropertyControls.mockClear()
    useEmblaStore.setState({
      configs: new Map(),
      emblaInstances: new Map(),
    })
  })

  it("gives dots, counters, and progress a useful Canvas preview", () => {
    const dots = renderToStaticMarkup(createElement(EmblaDots))
    const current = renderToStaticMarkup(createElement(EmblaCurrentIndex))
    const total = renderToStaticMarkup(createElement(EmblaTotalSlides))
    const progress = renderToStaticMarkup(createElement(EmblaProgressBar))

    expect(dots.match(/<button/g)).toHaveLength(4)
    expect(current).toContain(">1</div>")
    expect(total).toContain(">4</div>")
    expect(progress).toContain('value="0.25"')
  })

  it("preserves a connected slot while replacing its innermost text", () => {
    const slot = createElement(
      "div",
      { className: "counter" },
      createElement("span", null, "Slide ", createElement("b", null, "0")),
    )

    expect(renderToStaticMarkup(cloneWithInnermostText(slot, 7))).toBe(
      '<div class="counter"><span>Slide <b>7</b></span></div>',
    )
  })

  it("renders navigation without a slot and keeps the headless connector empty", () => {
    expect(
      renderToStaticMarkup(createElement(EmblaNavigationButton)),
    ).toContain("Next")
    expect(
      renderToStaticMarkup(createElement(ThumbnailConnection)),
    ).toBe("")
  })

  it("registers each Framer component explicitly and idempotently", () => {
    const register = [
      registerEmblaNavigationButtonPropertyControls,
      registerEmblaCurrentIndexPropertyControls,
      registerEmblaTotalSlidesPropertyControls,
      registerEmblaDotsPropertyControls,
      registerEmblaProgressBarPropertyControls,
      registerThumbnailConnectionPropertyControls,
    ]

    register.forEach((callback) => {
      callback()
      callback()
    })

    expect(addPropertyControls).toHaveBeenCalledTimes(register.length)
    expect(addPropertyControls.mock.calls.map(([component]) => component)).toEqual([
      EmblaNavigationButton,
      EmblaCurrentIndex,
      EmblaTotalSlides,
      EmblaDots,
      EmblaProgressBar,
      ThumbnailConnection,
    ])
  })
})
