import type { ComponentType } from "react"
import {
  withKniffLightboxOnlyCaption as kitOnlyCaption,
  withKniffLightboxCaption as kitCaption,
  withKniffLightboxGallery as kitWithRamkaGallery,
  withKniffLightboxTrigger as kitWithRamkaTrigger,
} from "https://framer-kit-dev.kniff.at/ramka.js?dev"

export function withRamkaGallery(Component: ComponentType<any>): ComponentType<any> {
  return kitWithRamkaGallery(Component)
}

export function withRamkaTrigger(Component: ComponentType<any>): ComponentType<any> {
  return kitWithRamkaTrigger(Component)
}

export function withKniffLightboxCaption(Component: ComponentType<any>): ComponentType<any> {
  return kitCaption(Component)
}

export function withKniffLightboxOnlyCaption(Component: ComponentType<any>): ComponentType<any> {
  return kitOnlyCaption(Component)
}
