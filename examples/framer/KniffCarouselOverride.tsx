import type { ComponentType } from "react"
import { withKniffCarousel as kitWithKniffCarousel } from "https://framer-kit-dev.kniff.at/scroll-snap.js"
import { withRamkaGallery as kitWithRamkaGallery } from "https://framer-kit-dev.kniff.at/ramka.js"

/** Apply to the actual overflow viewport carrying the slides. */
export function withKniffCarousel(Component: ComponentType<any>): ComponentType<any> {
  return kitWithKniffCarousel(Component)
}

/** Use this instead of withRamkaGallery on a looping overflow viewport. */
export function withKniffCarouselRamka(Component: ComponentType<any>): ComponentType<any> {
  return kitWithRamkaGallery(kitWithKniffCarousel(Component))
}
