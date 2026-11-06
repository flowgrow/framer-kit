import { createElement, forwardRef } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("framer", () => ({
  ControlType: { Boolean: "boolean", Number: "number", Color: "color" },
  RenderTarget: {
    canvas: "canvas",
    current: () => "preview",
  },
}))

import {
  withKniffLightboxGallery,
  withKniffLightboxTrigger,
} from "../src/ramka/overrides.js"
import { RamkaSettings } from "../src/ramka/RamkaSettings.js"
import { ramkaSettingsDefaults } from "../src/ramka/defaults.js"

describe("Ramka overrides", () => {
  it("hides the Framer settings wrapper in preview", () => {
    const html = renderToStaticMarkup(createElement(RamkaSettings, ramkaSettingsDefaults))
    expect(html).toContain('data-kniff-ramka-wrapper-style=""')
    expect(html).toContain('div[data-framer-name]:has(> style[data-kniff-ramka-wrapper-style]) { display:none !important; }')
    expect(html).toContain('data-kniff-ramka-settings=""')
  })

  it("renders the original gallery during SSR", () => {
    const Gallery = forwardRef<HTMLDivElement, { title: string }>(
      ({ title }, ref) => createElement("div", { ref }, title),
    )
    const WrappedGallery = withKniffLightboxGallery(Gallery)

    expect(
      renderToStaticMarkup(
        createElement(WrappedGallery, { title: "Selected work" }),
      ),
    ).toBe("<div>Selected work</div>")
  })

  it("leaves a trigger unchanged when it has no gallery parent", () => {
    const Image = ({ src }: { src: string }) =>
      createElement("img", { src, alt: "Portrait" })
    const WrappedImage = withKniffLightboxTrigger(Image)

    expect(
      renderToStaticMarkup(
        createElement(WrappedImage, { src: "/portrait.jpg" }),
      ),
    ).toBe('<img src="/portrait.jpg" alt="Portrait"/>')
  })
})
