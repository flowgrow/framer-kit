import type { ComponentType } from "react"
// @ts-expect-error Local HTTPS modules do not expose types to Framer.
import {
  withCmsEmbla as kitWithCmsEmbla,
  withEmbla as kitWithEmbla,
  withHideNavigationWhenNoScrollableSlides as kitWithHideNavigation,
} from "https://framer-kit-dev.kniff.at/embla.js"

export function withEmbla(
  Component: ComponentType<any>,
): ComponentType<any> {
  return kitWithEmbla(Component)
}

export function withCmsEmbla(
  Component: ComponentType<any>,
): ComponentType<any> {
  return kitWithCmsEmbla(Component)
}

export function withHideNavigationWhenNoScrollableSlides(
  Component: ComponentType<any>,
): ComponentType<any> {
  return kitWithHideNavigation(Component)
}
