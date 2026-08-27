import { createElement, forwardRef } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("framer", () => ({
  RenderTarget: {
    canvas: "canvas",
    current: () => "preview",
  },
}))

import {
  withRamkaGallery,
  withRamkaTrigger,
} from "../src/ramka/overrides.js"

describe("Ramka overrides", () => {
  it("renders the original gallery during SSR", () => {
    const Gallery = forwardRef<HTMLDivElement, { title: string }>(
      ({ title }, ref) => createElement("div", { ref }, title),
    )
    const WrappedGallery = withRamkaGallery(Gallery)

    expect(
      renderToStaticMarkup(
        createElement(WrappedGallery, { title: "Selected work" }),
      ),
    ).toBe("<div>Selected work</div>")
  })

  it("leaves a trigger unchanged when it has no gallery parent", () => {
    const Image = ({ src }: { src: string }) =>
      createElement("img", { src, alt: "Portrait" })
    const WrappedImage = withRamkaTrigger(Image)

    expect(
      renderToStaticMarkup(
        createElement(WrappedImage, { src: "/portrait.jpg" }),
      ),
    ).toBe('<img src="/portrait.jpg" alt="Portrait"/>')
  })
})
