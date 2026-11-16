import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("framer", () => ({
  RenderTarget: { canvas: "canvas", current: () => "preview" },
  cssCollector: { getStyles: () => [] },
}))

import { withCarouselPaddingProvider } from "../src/carousel/paddingProvider.tsx"

describe("carousel padding provider", () => {
  it("passes authored outer padding to the viewport CSS", () => {
    const Frame = ({ children, ...props }: any) => createElement("div", props, children)
    const Provider = withCarouselPaddingProvider(Frame)
    const html = renderToStaticMarkup(createElement(Provider, { style: { paddingLeft: 24, paddingRight: 32 } }))
    expect(html).toContain("--kniff-provider-padding-left:24px")
    expect(html).toContain("--kniff-provider-padding-right:32px")
  })
})
