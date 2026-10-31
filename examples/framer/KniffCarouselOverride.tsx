import type { ComponentType } from "react"
import { withKniffCarousel as kitWithKniffCarousel } from "https://framer-kit-dev.kniff.at/scroll-snap.js"
import { withKniffLightboxGallery as kitWithKniffLightboxGallery } from "https://framer-kit-dev.kniff.at/ramka.js"

/** Apply to the actual overflow viewport carrying the slides. */
export function withKniffCarousel(Component: ComponentType<any>): ComponentType<any> {
  return kitWithKniffCarousel(Component)
}

/** Use this instead of withKniffLightboxGallery on a looping overflow viewport. */
export function withKniffLightboxCarouselLoop(Component: ComponentType<any>): ComponentType<any> {
  return kitWithKniffLightboxGallery(kitWithKniffCarousel(Component))
}
