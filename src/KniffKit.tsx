import type { ComponentType } from "react"
// @ts-ignore Framer resolves shared code module URLs at runtime.
import * as KniffOverrides from "https://framer.com/m/Overrides-wfAwh2bud0hX.js"

export function withKniffContext(Component: ComponentType<any>): ComponentType<any> {
  return KniffOverrides.withKniffContext(Component)
}

export function withKniffCarouselViewport(Component: ComponentType<any>): ComponentType<any> {
  return KniffOverrides.withKniffCarouselViewport(Component)
}

export function withKniffLightboxTrigger(Component: ComponentType<any>): ComponentType<any> {
  return KniffOverrides.withKniffLightboxTrigger(Component)
}

export function withKniffCarouselPreviousButton(Component: ComponentType<any>): ComponentType<any> {
  return KniffOverrides.withKniffCarouselPreviousButton(Component)
}

export function withKniffCarouselNextButton(Component: ComponentType<any>): ComponentType<any> {
  return KniffOverrides.withKniffCarouselNextButton(Component)
}

export function withKniffCarouselHideNavigation(Component: ComponentType<any>): ComponentType<any> {
  return KniffOverrides.withKniffCarouselHideNavigation(Component)
}

export function withKniffCarouselPlayButton(Component: ComponentType<any>): ComponentType<any> {
  return KniffOverrides.withKniffCarouselPlayButton(Component)
}

export function withKniffCarouselProgress(Component: ComponentType<any>): ComponentType<any> {
  return KniffOverrides.withKniffCarouselProgress(Component)
}

export function withKniffCarouselDotsContainer(Component: ComponentType<any>): ComponentType<any> {
  return KniffOverrides.withKniffCarouselDotsContainer(Component)
}

export function withKniffCarouselDot(Component: ComponentType<any>): ComponentType<any> {
  return KniffOverrides.withKniffCarouselDot(Component)
}
