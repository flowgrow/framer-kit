import type { EmblaCarouselType } from "embla-carousel"

import { getClosestEmblaApi } from "../embla/domBridge.js"

const EMBLA_VIEWPORT_SELECTOR = ".kniff-embla__viewport"

export function getEmblaSlideIndex(
  api: EmblaCarouselType,
  element: HTMLElement,
): number | undefined {
  const index = api
    .slideNodes()
    .findIndex((slide) => slide.contains(element))
  return index >= 0 ? index : undefined
}

/** Resolves a trigger to Embla's logical DOM slide order. */
export function resolveEmblaSlideIndex(
  element: HTMLElement,
): number | undefined {
  const api = getClosestEmblaApi(element)
  if (api) return getEmblaSlideIndex(api, element)

  // The DOM bridge is attached in an effect, while trigger refs are attached
  // during commit. Reading the known viewport structure keeps the first
  // resolved index deterministic even before the Embla API is available.
  const viewport = element.closest(EMBLA_VIEWPORT_SELECTOR)
  const container = viewport?.firstElementChild
  if (!container) return undefined

  const index = Array.from(container.children).findIndex((slide) =>
    slide.contains(element),
  )
  return index >= 0 ? index : undefined
}
