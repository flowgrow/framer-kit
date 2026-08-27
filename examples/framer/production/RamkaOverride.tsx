import type { ComponentType } from "react"
import {
  withRamkaGallery as kitWithRamkaGallery,
  withRamkaTrigger as kitWithRamkaTrigger,
} from "https://esm.sh/@kniff/framer-kit@0.2.1?external=react,react-dom,framer,framer-motion&target=es2022"

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
