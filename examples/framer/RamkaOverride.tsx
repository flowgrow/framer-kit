import type { ComponentType } from "react"
import {
  withRamkaGallery as kitWithRamkaGallery,
  withRamkaTrigger as kitWithRamkaTrigger,
} from "https://framer-kit-dev.kniff.at/ramka.js"

export function withRamkaGallery(
  Component: ComponentType<any>,
): ComponentType<any> {
  return kitWithRamkaGallery(Component)
}

export function withRamkaTrigger(
  Component: ComponentType<any>,
): ComponentType<any> {
  return kitWithRamkaTrigger(Component)
}
