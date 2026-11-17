import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

const environment = vi.hoisted(() => ({ target: "preview" }))
vi.mock("framer", () => ({
  addPropertyControls: vi.fn(),
  ControlType: { String: "string", Enum: "enum", Boolean: "boolean" },
  RenderTarget: { canvas: "canvas", current: () => environment.target },
}))
import { RamkaSettings } from "../src/ramka/RamkaSettings.js"
import { VisibleScrollOverflowSettings } from "../src/scroll-snap/index.js"

describe("scroll snap rendering", () => {
  it("renders loop-enabled CSS on the server without accessing the DOM", () => {
    environment.target = "preview"
    const html = renderToStaticMarkup(createElement(VisibleScrollOverflowSettings, { loop: true }))
    expect(html).toContain("var(--kniff-authored-padding-left, 0px)")
    expect(html).not.toContain("animation-composition:add")
    expect(html).toContain("overflow-x:auto")
    expect(html).toContain('data-kniff-preview-settings=""')
    expect(html).toContain(
      "div[data-framer-name]:has(> style[data-kniff-preview-settings]) { display:none !important; }",
    )
    expect(html).not.toContain("data-kniff-carousel-settings")
  })

  it("uses body when the boundary title is blank", () => {
    environment.target = "preview"
    const html = renderToStaticMarkup(
      createElement(VisibleScrollOverflowSettings, { boundaryID: "", loop: false }),
    )
    expect(html).toContain("body { container-type:inline-size; }")
    expect(html).toContain('body :is([aria-label="Percentage Sized Carousel"]')
    expect(html).toContain("--kniff-first-slide-width")
  })

  it("shows only the optional instruction cards on canvas", () => {
    environment.target = "canvas"
    for (const [Component, title] of [
      [VisibleScrollOverflowSettings, "Carousel Settings"],
      [RamkaSettings, "Kniff Lightbox Settings"],
    ] as const) {
      const card = renderToStaticMarkup(
        createElement(Component as typeof VisibleScrollOverflowSettings, {}),
      )
      expect(card).toContain(title)
      expect(card).not.toContain("<style")
      expect(
        renderToStaticMarkup(
          createElement(Component as typeof VisibleScrollOverflowSettings, {
            showInstructions: false,
          }),
        ),
      ).toBe("")
    }
  })
})
