import type { ComponentType } from "react"
import {
  withEmbla as kitWithEmbla,
  withHideNavigationWhenNoScrollableSlides as kitWithHideNavigation,
} from "https://esm.sh/@kniff/framer-kit@0.2.1?external=react,react-dom,framer,framer-motion&target=es2022"

export function withEmbla(
  Component: ComponentType<any>,
): ComponentType<any> {
  return kitWithEmbla(Component)
}

export function withHideNavigationWhenNoScrollableSlides(
  Component: ComponentType<any>,
): ComponentType<any> {
  return kitWithHideNavigation(Component)
}
