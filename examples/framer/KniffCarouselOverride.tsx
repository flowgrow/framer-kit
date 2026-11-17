import type { ComponentType } from "react"
import * as Kit from "https://framer-kit-dev.kniff.at/scroll-snap.js?dev"
import { withKniffLightboxGallery as kitWithRamkaGallery } from "https://framer-kit-dev.kniff.at/ramka.js?dev"

/** Apply to the actual overflow viewport carrying the slides. */
export function withKniffCarousel(Component: ComponentType<any>): ComponentType<any> {
  return Kit.withKniffCarousel(Component)
}

/** Use this instead of withRamkaGallery on a looping overflow viewport. */
export function withKniffCarouselRamka(Component: ComponentType<any>): ComponentType<any> {
  return kitWithRamkaGallery(Kit.withKniffCarousel(Component))
}

export function withKniffCarouselBoundary(Component: ComponentType<any>): ComponentType<any> {
  return Kit.withKniffCarouselBoundary(Component)
}

export function withKniffCarouselPrevious(Component: ComponentType<any>): ComponentType<any> {
  return Kit.withKniffCarouselPrevious(Component)
}

export function withKniffCarouselNext(Component: ComponentType<any>): ComponentType<any> {
  return Kit.withKniffCarouselNext(Component)
}
