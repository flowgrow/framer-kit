import type { ComponentType } from "react"
import {
  withRamkaGallery as kitWithKniffLightboxGallery,
  withRamkaTrigger as kitWithKniffLightboxTrigger,
} from "https://esm.sh/@kniff/framer-kit@0.3.0?external=react,react-dom,framer,framer-motion&target=es2022"

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
