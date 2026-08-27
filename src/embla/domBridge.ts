import type { EmblaCarouselType } from "embla-carousel"

const EMBLA_API_SYMBOL = Symbol.for("kniff.framer-kit.embla-api")

type EmblaApiElement = HTMLElement & {
  [EMBLA_API_SYMBOL]?: EmblaCarouselType
}

/** Exposes an Embla API on its viewport without relying on a shared bundle. */
export function attachEmblaApiToElement(
  element: HTMLElement,
  api: EmblaCarouselType,
): () => void {
  const bridgedElement = element as EmblaApiElement
  bridgedElement[EMBLA_API_SYMBOL] = api

  return () => {
    if (bridgedElement[EMBLA_API_SYMBOL] === api) {
      delete bridgedElement[EMBLA_API_SYMBOL]
    }
  }
}

/** Finds the nearest Embla viewport registered by framer-kit. */
export function getClosestEmblaApi(
  element: HTMLElement | null,
): EmblaCarouselType | undefined {
  let current: HTMLElement | null = element

  while (current) {
    const api = (current as EmblaApiElement)[EMBLA_API_SYMBOL]
    if (api) return api
    current = current.parentElement
  }

  return undefined
}
