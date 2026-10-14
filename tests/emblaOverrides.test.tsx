import { createElement, forwardRef } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("framer", () => ({
  ControlType: { Boolean: "Boolean", String: "String", Enum: "Enum", Number: "Number" },
  RenderTarget: {
    canvas: "canvas",
    current: () => "preview",
  },
}))

import { withEmbla } from "../src/embla/overrides.js"
import { useEmblaStore } from "../src/embla/store.js"
import { CarouselSettings, carouselSettingsDefaults } from "../src/embla/CarouselSettings.js"

describe("withEmbla", () => {
  it("emits the readiness gate from SSR settings without leaking server config", () => {
    const markup = renderToStaticMarkup(createElement(CarouselSettings, {
      ...carouselSettingsDefaults,
      carouselID: "Pending carousel",
    }))
    expect(markup).toContain('[data-kniff-embla="Pending carousel"]')
    expect(markup).toContain(':not([data-kniff-embla-ready="true"])')
    expect(markup).toContain('visibility: hidden')
    expect(markup).not.toContain('display: none')
    expect(useEmblaStore.getState().configs.has("Pending carousel")).toBe(false)
  })
  it("renders the carousel structure and slide sizing before settings register", () => {
    const Carousel = forwardRef<HTMLDivElement, Record<string, unknown>>(
      (props, ref) => createElement("div", { ...props, ref }, createElement("div", null, "Slide")),
    )
    const WrappedCarousel = withEmbla(Carousel)
    const props = { "data-framer-name": "SSR carousel", className: "framer-stack" }
    const before = renderToStaticMarkup(createElement(WrappedCarousel, props))
    expect(before).toContain('class="kniff-embla"')
    expect(before).toContain('class="kniff-embla__viewport"')
    expect(before).toContain('class="framer-stack kniff-embla__container"')
    expect(before).toContain('flex: 0 0 var(--kniff-embla-slide-size, auto)')

    const config = { options: { loop: true } }
    useEmblaStore.getState().addConfig("SSR carousel", config)
    try {
      expect(renderToStaticMarkup(createElement(WrappedCarousel, props))).toBe(before)
    } finally {
      useEmblaStore.getState().removeConfig("SSR carousel", config)
    }
  })
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
