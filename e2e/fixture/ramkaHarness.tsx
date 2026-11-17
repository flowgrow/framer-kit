import { withKniffCarouselBoundary, withKniffCarousel } from "../../src/scroll-snap/index"
import React, { forwardRef } from "react"
import { createRoot } from "react-dom/client"
import {
  withKniffLightboxOnlyCaption,
  withKniffLightboxGallery as withRamkaGallery,
  withKniffLightboxTrigger as withRamkaTrigger,
} from "../../src/ramka/overrides"
import { RamkaSettings } from "../../src/ramka/RamkaSettings"
import { ramkaSettingsDefaults } from "../../src/ramka/defaults"
import { installAutoMove } from "../../src/scroll-snap/autoMove"
const Frame = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => (
  <div {...props} ref={ref} />
))
const Caption = withKniffLightboxOnlyCaption(Frame)
const Gallery = withRamkaGallery(Frame)
const Trigger = withRamkaTrigger(Frame)
const Boundary = withKniffCarouselBoundary(Frame)
const Viewport = withKniffCarousel(Frame)
export function mountRamka(
  mount: HTMLElement,
  options: {
    layout?: "peek" | "theater"
    showThumbnails?: boolean
    showCaptions?: boolean
    standalone?: boolean
  } = {},
) {
  const root = createRoot(mount)
  const { standalone, ...settings } = options
  const Parent = standalone ? Frame : Boundary
  const Track = standalone ? Frame : Viewport
  root.render(
    <Gallery>
      <Parent>
        <RamkaSettings {...ramkaSettingsDefaults} {...settings} />
        <Track id="ramka-viewport" style={{ display: "flex", width: 360, overflowX: "auto" }}>
          {[0, 1, 2, 3].map((i) => (
            <Trigger key={i} style={{ flex: "0 0 240px", height: 180 }}>
              <img src={`/image.svg?ramka=${i}`} alt={`Lightbox slide ${i}`} />
              {i === 1 && (
                <Caption style={{ color: "rgb(255, 5, 5)", fontStyle: "italic" }}>
                  Room <strong style={{ color: "blue" }}>with a view</strong>
                </Caption>
              )}
            </Trigger>
          ))}
        </Track>
      </Parent>
    </Gallery>,
  )
  const install = () => {
    const viewport = document.querySelector<HTMLElement>("#ramka-viewport")
    if (!viewport) {
      requestAnimationFrame(install)
      return
    }
    installAutoMove(viewport, { speed: 30, direction: "left" })
  }
  if (!standalone) requestAnimationFrame(install)
  return root
}
