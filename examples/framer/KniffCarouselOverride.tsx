import type { ComponentType } from "react"
import { withKniffCarouselLoop as kitWithKniffCarouselLoop } from "https://framer-kit-dev.kniff.at/scroll-snap.js"
import { withKniffLightboxGallery as kitWithKniffLightboxGallery } from "https://framer-kit-dev.kniff.at/ramka.js"

/** Apply to the actual overflow viewport carrying the slides. */
export function withKniffCarouselLoop(Component: ComponentType<any>): ComponentType<any> {
  return kitWithKniffCarouselLoop(Component)
}

/** Use this instead of withKniffLightboxGallery on a looping overflow viewport. */
export function withKniffLightboxCarouselLoop(Component: ComponentType<any>): ComponentType<any> {
  return kitWithKniffLightboxGallery(kitWithKniffCarouselLoop(Component))
}
