import type { ComponentType } from "react"
// @ts-ignore Framer resolves remote HTTPS modules without TypeScript declarations.
import { withKniffCarouselLoop as kitWithKniffCarouselLoop } from "https://framer-kit-prod.kniff.at/builds/3c1b881ec7a2c897d33b20e0/index.js?external=react,react-dom,framer&target=es2022"
// @ts-ignore Framer resolves remote HTTPS modules without TypeScript declarations.
import { withKniffLightboxGallery as kitWithKniffLightboxGallery } from "https://framer-kit-prod.kniff.at/builds/3c1b881ec7a2c897d33b20e0/index.js?external=react,react-dom,framer&target=es2022"

/** Apply to the actual overflow viewport carrying the slides. */
export function withKniffCarouselLoop(Component: ComponentType<any>): ComponentType<any> {
  return kitWithKniffCarouselLoop(Component)
}

/** Use this instead of withKniffLightboxGallery on a looping overflow viewport. */
export function withKniffLightboxCarouselLoop(Component: ComponentType<any>): ComponentType<any> {
  return kitWithKniffLightboxGallery(kitWithKniffCarouselLoop(Component))
}

// @ts-ignore Framer resolves remote HTTPS modules without TypeScript declarations.
import { withKniffLightboxTrigger as kitWithKniffLightboxTrigger } from "https://framer-kit-prod.kniff.at/builds/3c1b881ec7a2c897d33b20e0/index.js?external=react,react-dom,framer&target=es2022"
export function withKniffLightboxGallery(Component: ComponentType<any>): ComponentType<any> { return kitWithKniffLightboxGallery(Component) }
export function withKniffLightboxTrigger(Component: ComponentType<any>): ComponentType<any> { return kitWithKniffLightboxTrigger(Component) }
