import { createElement, forwardRef } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("framer", () => ({
  RenderTarget: {
    canvas: "canvas",
    current: () => "preview",
  },
}))

import { withEmbla } from "../src/embla/overrides.js"

describe("withEmbla", () => {
  it("renders the original component during SSR", () => {
    const Carousel = forwardRef<HTMLDivElement, { title: string }>(
      ({ title }, ref) => createElement("div", { ref }, title),
    )
    const WrappedCarousel = withEmbla(Carousel)

    expect(
      renderToStaticMarkup(
        createElement(WrappedCarousel, { title: "Featured work" }),
      ),
    ).toBe("<div>Featured work</div>")
  })

  it("does not expose configuration diagnostics to visitors", () => {
    const Carousel = ({ title }: { title: string }) =>
      createElement("section", null, title)
    const WrappedCarousel = withEmbla(Carousel)
    const markup = renderToStaticMarkup(
      createElement(WrappedCarousel, { title: "Featured work" }),
    )

    expect(markup).toBe("<section>Featured work</section>")
    expect(markup).not.toContain("Carousel Settings")
  })
})
