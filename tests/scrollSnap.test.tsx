import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

const environment = vi.hoisted(() => ({ target: "preview" }))
vi.mock("framer", () => ({
  addPropertyControls: vi.fn(),
  ControlType: { String: "string", Enum: "enum", Boolean: "boolean" },
  RenderTarget: { canvas: "canvas", current: () => environment.target },
}))
import { VisibleScrollOverflowSettings } from "../src/scroll-snap/index.js"

describe("scroll snap rendering", () => {
  it("renders loop-enabled CSS on the server without accessing the DOM", () => {
    environment.target = "preview"
    const html = renderToStaticMarkup(createElement(VisibleScrollOverflowSettings, { loop: true }))
    expect(html).toContain("var(--kniff-authored-padding-left, 0px)")
    expect(html).not.toContain("animation-composition:add")
    expect(html).toContain("overflow-x:auto")
  })

  it("keeps all slides editable on the canvas without applying full-width bleed", () => {
    environment.target = "canvas"
    const html = renderToStaticMarkup(createElement(VisibleScrollOverflowSettings, { loop: true }))
    expect(html).toContain("overflow:visible !important")
    expect(html).toContain("scroll-snap-align:center")
    expect(html).not.toContain("animation-composition:add")
    expect(html).not.toContain("overflow-x:auto")
  })
})
