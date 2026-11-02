import type { ComponentType } from "react"
import {
  withKniffLightboxGallery as kitWithKniffLightboxGallery,
  withKniffLightboxTrigger as kitWithKniffLightboxTrigger,
} from "https://framer-kit-dev.kniff.at/ramka.js"

export function withKniffLightboxGallery(
  Component: ComponentType<any>,
): ComponentType<any> {
  return kitWithKniffLightboxGallery(Component)
}

export function withKniffLightboxTrigger(
  Component: ComponentType<any>,
): ComponentType<any> {
  return kitWithKniffLightboxTrigger(Component)
}
