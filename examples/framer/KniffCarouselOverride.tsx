import type { ComponentType } from "react"
import { withKniffCarouselLoop as kitWithKniffCarouselLoop } from "https://framer-kit-dev.kniff.at/scroll-snap.js"
import { withRamkaGallery as kitWithRamkaGallery } from "https://framer-kit-dev.kniff.at/ramka.js"

/** Apply to the actual overflow viewport carrying the slides. */
export function withKniffCarouselLoop(Component: ComponentType<any>): ComponentType<any> {
  return kitWithKniffCarouselLoop(Component)
}

/** Use this instead of withRamkaGallery on a looping overflow viewport. */
export function withKniffCarouselLoopRamka(Component: ComponentType<any>): ComponentType<any> {
  return kitWithRamkaGallery(kitWithKniffCarouselLoop(Component))
}
